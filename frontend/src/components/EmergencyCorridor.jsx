import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap, CircleMarker, Polyline, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

const BANGALORE_CENTER = [12.9716, 77.5946]

function AmbulanceRoute({ route, ambulancePosition, etaSeconds, setEtaSeconds }) {
  const map = useMap()
  const routeRef = useRef(null)
  useEffect(() => {
    if (!route?.coordinates?.length) return
    if (routeRef.current) map.removeLayer(routeRef.current)
    const latlngs = route.coordinates.map((c) => [c[0], c[1]])
    const poly = L.polyline(latlngs, { color: '#f97316', weight: 6 })
    poly.addTo(map)
    routeRef.current = poly
    return () => { if (routeRef.current) map.removeLayer(routeRef.current) }
  }, [route, map])

  useEffect(() => {
    if (etaSeconds <= 0) return
    const t = setInterval(() => setEtaSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [etaSeconds])

  return null
}

function DriverAlert({ show, message }) {
  if (!show) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-warn text-navy px-4 py-3 rounded-lg shadow-lg font-medium animate-pulse">
      ⚠️ {message}
    </div>
  )
}

export default function EmergencyCorridor({ demoMode }) {
  const [ambulance, setAmbulance] = useState(null)
  const [etaSeconds, setEtaSeconds] = useState(0)
  const [emergencyLog, setEmergencyLog] = useState([])
  const [alerts, setAlerts] = useState([])
  const [driverAlert, setDriverAlert] = useState(false)
  const wsRef = useRef(null)

  const loadLog = () => fetch('/api/emergency-log').then((r) => r.json()).then(setEmergencyLog)
  const loadAlerts = () => fetch('/api/alerts').then((r) => r.json()).then(setAlerts)

  useEffect(() => {
    loadLog()
    loadAlerts()
  }, [])

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = window.location.port === '5173' ? '8000' : window.location.port
    const ws = new WebSocket(`${proto}//${host}:${port}/ws`)
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'ambulance_dispatch') {
          setAmbulance(data.payload)
          setEtaSeconds(Math.round((data.payload.eta_minutes || 10) * 60))
          setDriverAlert(true)
          setTimeout(() => setDriverAlert(false), 8000)
          loadLog()
          loadAlerts()
        }
      } catch (_) {}
    }
    wsRef.current = ws
    return () => ws.close()
  }, [])

  const handleDispatch = async () => {
    try {
      const r = await fetch('/api/ambulance/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const d = await r.json()
      setAmbulance(d)
      setEtaSeconds(Math.round((d.eta_minutes || 10) * 60))
      setDriverAlert(true)
      setTimeout(() => setDriverAlert(false), 8000)
      loadLog()
      loadAlerts()
    } catch (_) {}
  }

  const route = ambulance?.route
  const roadNames = ambulance?.road_names?.join(', ') || ambulance?.road_names || 'Route'

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-navy/10 bg-white">
        <h1 className="text-lg font-semibold text-accent">Emergency Corridor — Ambulance Dispatch</h1>
        <button
          onClick={handleDispatch}
          className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90"
        >
          Ambulance Dispatch
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 min-h-[300px] relative">
          <MapContainer center={BANGALORE_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {route?.coordinates?.length > 0 && (
              <Polyline positions={route.coordinates} pathOptions={{ color: '#f97316', weight: 6 }} />
            )}
            {ambulance?.origin && (
              <CircleMarker center={[ambulance.origin.lat, ambulance.origin.lng]} radius={8} pathOptions={{ color: '#0A0F1E', fillColor: '#22c55e', fillOpacity: 1 }} />
            )}
            {ambulance?.destination && (
              <CircleMarker center={[ambulance.destination.lat, ambulance.destination.lng]} radius={10} pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1 }} />
            )}
          </MapContainer>
          {ambulance && (
            <div className="absolute top-4 left-4 bg-white/95 border border-navy/10 rounded-lg p-3 shadow text-sm">
              <div className="font-mono text-accent font-semibold">ETA: {Math.floor(etaSeconds / 60)}:{String(etaSeconds % 60).padStart(2, '0')}</div>
              <div className="text-navy/70">{ambulance.origin?.name} → {ambulance.destination?.name}</div>
            </div>
          )}
        </div>

        <aside className="w-96 shrink-0 border-l border-navy/10 bg-white overflow-auto p-4">
          <h2 className="font-mono font-semibold text-accent mb-2">🚨 Alerts Panel (WhatsApp/SMS sim)</h2>
          {ambulance && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded text-sm">
              🚨 AMBULANCE ALERT: Route from {ambulance.origin?.name} to {ambulance.destination?.name}. ETA: {ambulance.eta_minutes} min. Clear: {roadNames}
            </div>
          )}
          <div className="space-y-2 max-h-48 overflow-auto">
            {alerts.slice(0, 10).map((a) => (
              <div key={a.id} className="text-xs p-2 bg-gray-50 rounded border border-gray-100">
                <span className="font-mono text-accent">{a.channel}</span> — {a.title}
              </div>
            ))}
          </div>
          <h2 className="font-mono font-semibold text-accent mt-4 mb-2">Emergency Log</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-navy/10">
                <th className="text-left py-1">Time</th>
                <th className="text-left py-1">Kind</th>
                <th className="text-left py-1">ETA</th>
                <th className="text-left py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {emergencyLog.slice(0, 15).map((e) => (
                <tr key={e.id} className="border-b border-navy/5">
                  <td className="py-1">{e.created_at?.slice(11, 19)}</td>
                  <td>{e.kind}</td>
                  <td>{e.eta_minutes != null ? `${e.eta_minutes} min` : '—'}</td>
                  <td>{e.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      </div>

      <DriverAlert show={driverAlert} message="Ambulance approaching — move to the left" />
    </div>
  )
}
