import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet.heat'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import { getRoute, reportDeviation, triggerSOS } from '../hooks/useApi'
import { API_BASE, getWsUrl } from '../config'

const BANGALORE_CENTER = [12.9716, 77.5946]
const DEVIATION_METERS = 0.002 // ~200m in deg approx
const STATIONARY_THRESHOLD_MS = 10 * 60 * 1000 // 10 min
const STATIONARY_RESPONSE_MS = 10 * 1000 // 10 s to respond before auto-SOS
const AMBULANCE_PROXIMITY_KM = 0.5 // ~500m

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Point-to-segment distance (approx km) - Haversine
function pointToRouteDistanceKm(plat, plng, routeCoords) {
  if (!routeCoords?.length) return Infinity
  let min = Infinity
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [a0, a1] = routeCoords[i]
    const [b0, b1] = routeCoords[i + 1]
    const d = _haversineKm(plat, plng, (a0 + b0) / 2, (a1 + b1) / 2)
    if (d < min) min = d
  }
  return min
}
function _haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dlat = (lat2 - lat1) * Math.PI / 180
  const dlng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dlat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dlng/2)**2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function MapClickHandler({ onMapClick, disabled }) {
  useMapEvents({
    click: (e) => {
      if (disabled) return
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Mock incident points for night risk (30 points around Bengaluru)
const INCIDENT_POINTS = (() => {
  const out = []
  for (let i = 0; i < 30; i++) {
    out.push([
      12.97 + (Math.random() - 0.5) * 0.15,
      77.59 + (Math.random() - 0.5) * 0.2,
      0.5 + Math.random() * 0.5,
    ])
  }
  return out
})()

function JourneyMarker({ position }) {
  if (!position) return null
  return (
    <CircleMarker
      center={position}
      radius={8}
      pathOptions={{ fillColor: '#00897B', color: '#0A0F1E', weight: 2, fillOpacity: 1 }}
    />
  )
}

function HeatmapLayer({ visible, points }) {
  const map = useMap()
  const layerRef = useRef(null)
  useEffect(() => {
    if (!L.heatLayer || !points?.length) return
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }
    if (!visible) return
    const heat = L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 17 })
    heat.addTo(map)
    layerRef.current = heat
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current)
    }
  }, [visible, map, points])
  return null
}

export default function SafeTravel({ demoMode }) {
  const [destination, setDestination] = useState('')
  const [contactName, setContactName] = useState('Trusted Contact')
  const [contactPhone, setContactPhone] = useState('+91XXXXXXXX')
  const [origin, setOrigin] = useState(null)
  const [destCoords, setDestCoords] = useState(null)
  const [route, setRoute] = useState(null)
  const [journeyStarted, setJourneyStarted] = useState(false)
  const [journeyPosition, setJourneyPosition] = useState(null)
  const [etaSeconds, setEtaSeconds] = useState(0)
  const [deviationAlert, setDeviationAlert] = useState(null)
  const [checkInPrompt, setCheckInPrompt] = useState(false)
  const [nightRiskVisible, setNightRiskVisible] = useState(false)
  const [routeWarning, setRouteWarning] = useState(false)
  const [stationaryPrompt, setStationaryPrompt] = useState(false)
  const [ambulanceAlert, setAmbulanceAlert] = useState(false)
  const [ambulanceData, setAmbulanceData] = useState(null)
  const routeCoordsRef = useRef([])
  const journeyIndexRef = useRef(0)
  const checkInTimerRef = useRef(null)
  const stationaryTimerRef = useRef(null)
  const stationaryResponseTimerRef = useRef(null)
  const lastPositionTimeRef = useRef(Date.now())
  const wsRef = useRef(null)

  const defaultDestCoords = { lat: 12.9352, lng: 77.6245 }

  const handleMapClick = async (lat, lng) => {
    setDestCoords({ lat, lng })
    try {
      const r = await fetch(`${API_BASE}/geocode/reverse?lat=${lat}&lng=${lng}`)
      const d = await r.json()
      if (d?.address) setDestination(d.address)
    } catch (_) {
      setDestination(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    }
  }

  const startJourney = async () => {
    let lat = 12.9716
    let lng = 77.5946
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }))
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch (_) {}
    }
    lastPositionTimeRef.current = Date.now()
    setOrigin({ lat, lng })
    const dest = destCoords || defaultDestCoords
    setDestCoords(dest)
    try {
      const r = await getRoute(lat, lng, dest.lat, dest.lng)
      setRoute(r)
      routeCoordsRef.current = r?.coordinates || []
      setEtaSeconds(Math.round(r?.duration_seconds || 600))
      setJourneyStarted(true)
      setJourneyPosition([lat, lng])
      journeyIndexRef.current = 0
      const nearIncident = INCIDENT_POINTS.some(
        (p) => (p[0] - lat) ** 2 + (p[1] - lng) ** 2 < 0.0001
      )
      setRouteWarning(nearIncident)
    } catch (_) {
      setRoute({ coordinates: [[lat, lng], [dest.lat, dest.lng]], duration_seconds: 600 })
      routeCoordsRef.current = [[lat, lng], [dest.lat, dest.lng]]
      setJourneyStarted(true)
      setJourneyPosition([lat, lng])
      setEtaSeconds(600)
    }
  }

  const simulateJourney = () => {
    const coords = routeCoordsRef.current
    if (!coords.length) return
    lastPositionTimeRef.current = Date.now()
    const idx = Math.min(journeyIndexRef.current + 2, coords.length - 1)
    journeyIndexRef.current = idx
    setJourneyPosition([coords[idx][0], coords[idx][1]])
    if (idx >= coords.length - 1) {
      setCheckInPrompt(true)
      checkInTimerRef.current = setTimeout(() => {
        setDeviationAlert({ type: 'escalate', message: 'No response — escalating to SOS protocol' })
      }, 10000)
    }
  }

  const simulateDeviation = () => {
    const coords = routeCoordsRef.current
    if (!coords.length || !journeyPosition) return
    const offLat = journeyPosition[0] + DEVIATION_METERS * (Math.random() > 0.5 ? 1 : -1)
    const offLng = journeyPosition[1] + DEVIATION_METERS * (Math.random() > 0.5 ? 1 : -1)
    setJourneyPosition([offLat, offLng])
    reportDeviation('Demo User', offLat, offLng, 'Planned route', contactPhone, contactName)
    setDeviationAlert({
      message: `DEVIATION ALERT: Demo User has gone off route. Last known: ${journeyPosition[0].toFixed(4)}, ${journeyPosition[1].toFixed(4)}. Expected: route. Current: ${offLat.toFixed(4)}, ${offLng.toFixed(4)}`,
    })
  }

  const handleCheckIn = async (safe) => {
    if (checkInTimerRef.current) clearTimeout(checkInTimerRef.current)
    setCheckInPrompt(false)
    if (!safe) {
      setDeviationAlert({ type: 'sos', message: 'User pressed NO / SOS — initiating SOS to trusted contacts + 112' })
      const [lat, lng] = journeyPosition || [12.9716, 77.5946]
      try {
        await triggerSOS(lat, lng, 'Demo User', 'O+', contactPhone, contactName, true)
      } catch (_) {}
    }
  }

  const handleStationaryResponse = async (sendSOS) => {
    if (stationaryResponseTimerRef.current) clearTimeout(stationaryResponseTimerRef.current)
    stationaryResponseTimerRef.current = null
    setStationaryPrompt(false)
    if (sendSOS) {
      const [lat, lng] = journeyPosition || [12.9716, 77.5946]
      try {
        await triggerSOS(lat, lng, 'Demo User', 'O+', contactPhone, contactName, true)
        setDeviationAlert({ type: 'sos', message: 'SOS sent to trusted contacts + 112' })
      } catch (_) {}
    } else {
      lastPositionTimeRef.current = Date.now()
    }
  }

  useEffect(() => {
    if (!journeyStarted || checkInPrompt || stationaryPrompt) return
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastPositionTimeRef.current
      if (elapsed >= STATIONARY_THRESHOLD_MS) {
        if (stationaryResponseTimerRef.current) clearTimeout(stationaryResponseTimerRef.current)
        setStationaryPrompt(true)
        stationaryResponseTimerRef.current = setTimeout(async () => {
          const [lat, lng] = journeyPosition || [12.9716, 77.5946]
          try {
            await triggerSOS(lat, lng, 'Demo User', 'O+', contactPhone, contactName, false)
            setDeviationAlert({ type: 'sos', message: 'No response — SOS sent to trusted contacts only' })
          } catch (_) {}
          setStationaryPrompt(false)
          stationaryResponseTimerRef.current = null
        }, STATIONARY_RESPONSE_MS)
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [journeyStarted, checkInPrompt, stationaryPrompt, journeyPosition, contactPhone, contactName])

  useEffect(() => {
    fetch(`${API_BASE}/ambulance/active`).then((r) => r.json()).then((d) => d && setAmbulanceData(d)).catch(() => {})
    const ws = new WebSocket(getWsUrl())
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'ambulance_dispatch') setAmbulanceData(data.payload)
      } catch (_) {}
    }
    wsRef.current = ws
    return () => ws.close()
  }, [])

  useEffect(() => {
    if (!journeyStarted || !journeyPosition || !ambulanceData?.route?.coordinates) return
    const dist = pointToRouteDistanceKm(journeyPosition[0], journeyPosition[1], ambulanceData.route.coordinates)
    setAmbulanceAlert(dist <= AMBULANCE_PROXIMITY_KM)
  }, [journeyStarted, journeyPosition, ambulanceData])

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-navy/10 bg-white flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Destination (e.g. Koramangala)"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="border border-navy/20 rounded px-3 py-2 text-sm w-48"
        />
        <input
          type="text"
          placeholder="Contact name"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className="border border-navy/20 rounded px-3 py-2 text-sm w-40"
        />
        <input
          type="text"
          placeholder="Contact phone"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          className="border border-navy/20 rounded px-3 py-2 text-sm w-36"
        />
        <button
          onClick={startJourney}
          className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90"
        >
          Start Journey
        </button>
        {journeyStarted && (
          <>
            <button onClick={simulateJourney} className="px-3 py-2 bg-navy/10 rounded-lg text-sm">Simulate Journey</button>
            <button onClick={simulateDeviation} className="px-3 py-2 bg-warn/20 text-navy rounded-lg text-sm">Simulate Deviation</button>
            <button
              onClick={() => {
                setStationaryPrompt(true)
                if (stationaryResponseTimerRef.current) clearTimeout(stationaryResponseTimerRef.current)
                stationaryResponseTimerRef.current = setTimeout(async () => {
                  const [lat, lng] = journeyPosition || [12.9716, 77.5946]
                  try {
                    await triggerSOS(lat, lng, 'Demo User', 'O+', contactPhone, contactName, false)
                    setDeviationAlert({ type: 'sos', message: 'No response — SOS sent to trusted contacts only' })
                  } catch (_) {}
                  setStationaryPrompt(false)
                  stationaryResponseTimerRef.current = null
                }, STATIONARY_RESPONSE_MS)
              }}
              className="px-3 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm"
            >
              Test Stationary Alert
            </button>
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={nightRiskVisible} onChange={(e) => setNightRiskVisible(e.target.checked)} />
          Night Risk Heatmap
        </label>
      </div>

      {routeWarning && nightRiskVisible && (
        <div className="px-4 py-2 bg-warn/20 text-navy text-sm border-b border-warn/30">
          ⚠️ Night Risk: Your route passes through an area with reported incidents. Consider alternate route.
        </div>
      )}

      {deviationAlert && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200 text-sm">
          ⚠️ {deviationAlert.message}
        </div>
      )}

      {checkInPrompt && (
        <div className="px-4 py-3 bg-accent/10 border-b border-accent/30 flex items-center gap-4">
          <span>Have you reached safely?</span>
          <button onClick={() => handleCheckIn(true)} className="px-3 py-1 bg-green-600 text-white rounded">YES</button>
          <button onClick={() => handleCheckIn(false)} className="px-3 py-1 bg-red-600 text-white rounded">NO / SOS</button>
        </div>
      )}

      {stationaryPrompt && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center gap-4">
          <span className="font-medium">You&apos;ve been stationary for 10 min. Traffic, break, or need help?</span>
          <span className="text-xs text-amber-700">(No response in 10s → SOS to trusted contacts only)</span>
          <button onClick={() => handleStationaryResponse(false)} className="px-3 py-1 bg-slate-500 text-white rounded">I&apos;m fine (traffic/break)</button>
          <button onClick={() => handleStationaryResponse(true)} className="px-3 py-1 bg-red-600 text-white rounded">Send SOS (contacts + 112)</button>
        </div>
      )}

      {ambulanceAlert && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-orange-500 text-white px-4 py-3 rounded-lg shadow-lg font-medium animate-pulse">
          Ambulance approaching on your route — move to the left
        </div>
      )}

      <div className="flex-1 min-h-[300px] relative">
        <p className="text-xs text-navy/60 px-4 py-1 bg-slate-50 border-b border-navy/5">
          Click on the map to pin your destination before starting the journey
        </p>
        <MapContainer center={BANGALORE_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
          <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onMapClick={handleMapClick} disabled={journeyStarted} />
          <HeatmapLayer visible={nightRiskVisible} points={INCIDENT_POINTS} />
          {origin && (
            <CircleMarker
              center={[origin.lat, origin.lng]}
              radius={6}
              pathOptions={{ fillColor: '#22c55e', color: '#0A0F1E', weight: 2, fillOpacity: 1 }}
            >
              <Popup>Start</Popup>
            </CircleMarker>
          )}
          {destCoords && !journeyStarted && (
            <Marker position={[destCoords.lat, destCoords.lng]}>
              <Popup>Destination — click map to change</Popup>
            </Marker>
          )}
          {destCoords && journeyStarted && (
            <CircleMarker
              center={[destCoords.lat, destCoords.lng]}
              radius={8}
              pathOptions={{ fillColor: '#dc2626', color: '#0A0F1E', weight: 2, fillOpacity: 1 }}
            >
              <Popup>Destination</Popup>
            </CircleMarker>
          )}
          {route?.coordinates?.length > 0 && (
            <Polyline positions={route.coordinates} pathOptions={{ color: '#00897B', weight: 5 }} />
          )}
          <JourneyMarker position={journeyPosition} />
        </MapContainer>
        {journeyStarted && etaSeconds > 0 && (
          <div className="absolute top-4 left-4 bg-white/95 rounded-lg px-3 py-2 text-sm shadow">
            ETA: {Math.floor(etaSeconds / 60)}:{String(etaSeconds % 60).padStart(2, '0')}
          </div>
        )}
      </div>
    </div>
  )
}
