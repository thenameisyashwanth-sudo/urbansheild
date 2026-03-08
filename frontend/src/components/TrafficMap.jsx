import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, useMap, CircleMarker, Polyline, Popup } from 'react-leaflet'
import { useTrafficWebSocket } from '../hooks/useApi'
import { API_BASE } from '../config'

const BANGALORE_CENTER = [12.9716, 77.5946]
const VEHICLE_COLORS = {
  bike: '#22c55e',
  car: '#3b82f6',
  auto: '#eab308',
  truck: '#a855f7',
  bus: '#ef4444',
  ambulance: '#dc2626',
}

function VehicleMarkers({ vehicles }) {
  if (!vehicles?.length) return null
  return vehicles.map((v) => (
    <CircleMarker
      key={v.id}
      center={[v.lat, v.lng]}
      radius={v.type === 'ambulance' ? 8 : 5}
      pathOptions={{
        fillColor: VEHICLE_COLORS[v.type] || '#64748b',
        color: '#0A0F1E',
        weight: 1,
        fillOpacity: 0.9,
        className: v.type === 'ambulance' ? 'ambulance-dot' : '',
      }}
    >
      <Popup>
        <span className="font-mono text-xs">{v.type}</span> {v.speed_kmh} km/h — {v.segment_name}
      </Popup>
    </CircleMarker>
  ))
}

function RoadSegments({ segmentStats }) {
  if (!segmentStats?.length) return null
  const segments = [
    [12.9756, 77.6063, 12.9716, 77.5963],
    [12.9594, 77.6972, 12.9694, 77.6872],
    [12.9172, 77.6233, 12.9182, 77.6243],
    [12.9698, 77.7499, 12.9598, 77.7399],
    [12.9352, 77.6245, 12.9452, 77.6145],
    [12.9789, 77.6402, 12.9689, 77.6502],
    [13.0352, 77.5933, 13.0252, 77.6033],
    [12.8854, 77.5972, 12.8954, 77.5872],
    [13.0123, 77.6987, 13.0023, 77.6887],
    [12.9256, 77.5934, 12.9156, 77.6034],
  ]
  const colorMap = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' }
  return segmentStats.slice(0, 10).map((s, i) => {
    const seg = segments[i]
    if (!seg) return null
    const color = colorMap[s.color] || '#64748b'
    return (
      <Polyline
        key={s.segment_id}
        positions={[[seg[0], seg[1]], [seg[2], seg[3]]]}
        pathOptions={{ color, weight: 6, opacity: 0.8 }}
      />
    )
  })
}

export default function TrafficMap({ demoMode }) {
  const [traffic, setTraffic] = useState(null)
  useTrafficWebSocket(setTraffic)

  useEffect(() => {
    fetch(`${API_BASE}/traffic`).then((r) => r.json()).then(setTraffic).catch(() => {})
  }, [])

  const vehicles = traffic?.vehicles ?? []
  const segmentStats = traffic?.segment_stats ?? []
  const topCongested = traffic?.top_congested ?? []

  return (
    <div className="h-full flex">
      {/* Sidebar: Top 5 congested + Signal recommendations */}
      <aside className="w-80 shrink-0 border-r border-cyber-border bg-cyber-card overflow-auto p-4 text-content">
        <h2 className="font-mono font-semibold text-accent mb-3">Top 5 Congested Segments</h2>
        <ul className="space-y-2 mb-6">
          {topCongested.map((s, i) => (
            <li key={s.segment_id} className="flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded bg-cyber-border/50 flex items-center justify-center font-mono text-xs text-accent">{i + 1}</span>
              <span className="flex-1 truncate">{s.name}</span>
              <span className={`w-3 h-3 rounded-full ${
                s.color === 'green' ? 'bg-green-500' : s.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </li>
          ))}
        </ul>
        <h2 className="font-mono font-semibold text-accent mb-3">Signal Recommendation</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-cyber-border">
                <th className="text-left py-2">Road</th>
                <th className="text-right py-2">Congestion</th>
                <th className="text-right py-2">Green (s)</th>
              </tr>
            </thead>
            <tbody>
              {segmentStats.filter((s) => s.congestion_index >= 0.3).slice(0, 8).map((s) => (
                <tr key={s.segment_id} className="border-b border-cyber-border/50">
                  <td className="py-1.5 truncate max-w-[120px]">{s.name}</td>
                  <td className="text-right">{(s.congestion_index * 100).toFixed(0)}%</td>
                  <td className="text-right font-mono">{s.recommended_green_seconds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-content/60 mt-2">Vehicle mix: bike/car/auto/truck/bus — weighted green time</p>
      </aside>

      {/* Map */}
      <div className="flex-1 min-h-[400px]">
        <MapContainer
          center={BANGALORE_CENTER}
          zoom={12}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          />
          <RoadSegments segmentStats={segmentStats} />
          <VehicleMarkers vehicles={vehicles} />
        </MapContainer>
      </div>
    </div>
  )
}
