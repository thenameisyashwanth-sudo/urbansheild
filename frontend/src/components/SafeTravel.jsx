import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet.heat'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'
import { getRoute, reportDeviation, triggerSOS } from '../hooks/useApi'

const BANGALORE_CENTER = [12.9716, 77.5946]
const DEVIATION_METERS = 0.002 // ~200m in deg approx

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
  const routeCoordsRef = useRef([])
  const journeyIndexRef = useRef(0)
  const checkInTimerRef = useRef(null)

  const defaultDestCoords = { lat: 12.9352, lng: 77.6245 }

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
      setDeviationAlert({ type: 'sos', message: 'User pressed NO / SOS — initiating SOS protocol' })
      const [lat, lng] = journeyPosition || [12.9716, 77.5946]
      try {
        await triggerSOS(lat, lng, 'Demo User', 'O+', contactPhone, contactName)
      } catch (_) {}
    }
  }

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

      <div className="flex-1 min-h-[300px] relative">
        <MapContainer center={BANGALORE_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
          <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <HeatmapLayer visible={nightRiskVisible} points={INCIDENT_POINTS} />
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
