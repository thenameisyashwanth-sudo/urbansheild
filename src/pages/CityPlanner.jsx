import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { INTERVENTIONS } from '../components/urban/bengaluruData'

const SAMPLE_ZONES = [
  { id: '1-Central', gapScore: 0.9, note: 'High SOS density, weak lighting.' },
  { id: '2-East', gapScore: 0.8, note: 'Ambulance response slow in Whitefield.' },
  { id: '4-North', gapScore: 0.75, note: 'Peak congestion near Hebbal.' },
  { id: '3-South', gapScore: 0.7, note: 'Deviations near Bannerghatta Road.' },
  { id: '5-West', gapScore: 0.6, note: 'Mixed congestion + SOS.' },
]

export default function CityPlanner() {
  const [budget, setBudget] = useState(20)

  const allocation = computeAllocation(budget)

  return (
    <div className="flex h-full gap-4 p-4 bg-app">
      <div className="flex-1 bg-card rounded-xl border border-borderSoft p-4 space-y-4">
        <h1 className="text-sm sm:text-base font-semibold text-textPrimary">
          City Planner — Resource Optimisation
        </h1>
        <div className="flex items-center gap-4 text-xs text-textSecondary">
          <span>Budget (₹ lakhs)</span>
          <input
            type="range"
            min={5}
            max={50}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="flex-1"
          />
          <span className="font-mono text-textPrimary">₹{budget}L</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={allocation.bars}>
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} />
              <YAxis stroke="#9CA3AF" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#0F1629', border: '1px solid #1F2937', fontSize: 11 }}
              />
              <Bar dataKey="count" fill="#14B8A6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="w-80 bg-card rounded-xl border border-borderSoft p-4 text-xs space-y-3">
        <h2 className="text-sm font-semibold text-textPrimary">Top Gap Zones</h2>
        {SAMPLE_ZONES.map((z) => (
          <div key={z.id} className="bg-cardDeep/60 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-textPrimary text-[11px] font-semibold">{z.id}</span>
              <span className="text-[11px] text-textSecondary">
                Gap {Math.round(z.gapScore * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-textSecondary">{z.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function computeAllocation(budget) {
  const out = []
  let remaining = budget

  const sorted = [...INTERVENTIONS].sort((a, b) => b.impactScore - a.impactScore)
  for (const item of sorted) {
    const maxCount = Math.floor(remaining / item.costLakhs)
    if (maxCount <= 0) continue
    const count = Math.max(1, maxCount)
    remaining -= count * item.costLakhs
    out.push({
      id: item.id,
      name: item.label,
      count,
    })
    if (remaining <= 0) break
  }

  return {
    bars: out.map((o) => ({ name: o.name, count: o.count })),
  }
}

