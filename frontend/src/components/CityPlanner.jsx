import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet.heat'
import { MapContainer, TileLayer, useMap, CircleMarker } from 'react-leaflet'
import { API_BASE } from '../config'

const BANGALORE_CENTER = [12.9716, 77.5946]

function HeatmapLayer({ points }) {
  const map = useMap()
  const layerRef = useRef(null)
  useEffect(() => {
    if (!L.heatLayer || !points?.length) return
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }
    const heat = L.heatLayer(points, { radius: 30, blur: 20, maxZoom: 17 })
    heat.addTo(map)
    layerRef.current = heat
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current)
    }
  }, [map, points])
  return null
}

export default function CityPlanner({ demoMode }) {
  const [timeFilter, setTimeFilter] = useState(7)
  const [incidents, setIncidents] = useState([])
  const [zones, setZones] = useState({ zones: [], top_gap_ids: [] })
  const [budgetLakhs, setBudgetLakhs] = useState(20)
  const [allocation, setAllocation] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/planner/incidents?days=${timeFilter}`)
      .then((r) => r.json())
      .then(setIncidents)
      .catch(() => setIncidents([]))
  }, [timeFilter])

  useEffect(() => {
    fetch(`${API_BASE}/planner/zones`)
      .then((r) => r.json())
      .then(setZones)
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/planner/budget?available_lakhs=${budgetLakhs}`)
      .then((r) => r.json())
      .then(setAllocation)
      .catch(() => {})
  }, [budgetLakhs])

  const heatPoints = Array.isArray(incidents) ? incidents : []
  const topGapIds = zones.top_gap_ids || []
  const zoneList = zones.zones || []

  const recommendations = [
    'Zone 4-North: High SOS density, no streetlights within 500m. Recommended: Add 3 streetlights on MG Road stretch.',
    'Zone 2-East: Ambulance avg response time 11 min. Nearest 108 station 9km away. Recommended: Standby ambulance point near Whitefield.',
    'Zone 1-Central: Peak congestion 8–10am daily. Recommended: Deploy 2 additional traffic officers at Silk Board and KR Puram intersections.',
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card flex flex-wrap items-center gap-4">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-accent">City Planner — Resource Optimisation</h1>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(Number(e.target.value))}
          className="input-base"
        >
          <option value={1}>Today</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          Budget (₹ lakhs):
          <input
            type="number"
            min={1}
            max={100}
            value={budgetLakhs}
            onChange={(e) => setBudgetLakhs(Number(e.target.value))}
            className="input-base w-24 text-right"
          />
        </label>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 min-h-[300px]">
          <MapContainer center={BANGALORE_CENTER} zoom={11} className="h-full w-full" scrollWheelZoom>
            <TileLayer attribution="© OpenStreetMap" url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" />
            <HeatmapLayer points={heatPoints} />
            {topGapIds.slice(0, 3).map((id, i) => {
              const lat = 12.97 + (i - 1) * 0.03
              const lng = 77.59 + (i - 1) * 0.02
              return (
                <CircleMarker
                  key={id}
                  center={[lat, lng]}
                  radius={15}
                  pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.6, weight: 2 }}
                />
              )
            })}
          </MapContainer>
        </div>

        <aside className="w-96 shrink-0 border-l border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card overflow-auto p-4">
          <h2 className="font-mono font-semibold text-slate-800 dark:text-accent mb-2">Ranked Recommendations</h2>
          <ul className="space-y-2 text-sm mb-6">
            {recommendations.map((r, i) => (
              <li key={i} className="p-2 bg-slate-100 dark:bg-cyber-card rounded border border-slate-200 dark:border-cyber-border text-slate-700 dark:text-content/90">{r}</li>
            ))}
          </ul>
          <h2 className="font-mono font-semibold text-slate-800 dark:text-accent mb-2">Budget Simulation (₹ {budgetLakhs}L)</h2>
          {allocation?.allocation?.length > 0 && (
            <div className="space-y-2 mb-4">
              {allocation.allocation.map((a, i) => (
                <div key={i} className="flex justify-between text-sm text-slate-700 dark:text-content/90">
                  <span>{a.intervention} × {a.count}</span>
                  <span className="font-mono">₹{a.cost}L</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-1">
            {allocation?.interventions?.map((int) => (
              <div key={int.id} className="flex items-center gap-2 text-xs text-slate-700 dark:text-content/90">
                <div
                  className="h-4 rounded bg-accent/30"
                  style={{
                    width: `${Math.min(100, (int.cost_lakhs / 20) * 100)}%`,
                  }}
                />
                <span>{int.name}: ₹{int.cost_lakhs}L — {int.impact}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
