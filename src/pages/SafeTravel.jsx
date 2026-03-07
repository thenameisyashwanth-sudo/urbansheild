import { useState } from 'react'
import CityMap from '../components/urban/CityMap'
import { useUrbanShield } from '../Layout'

export default function SafeTravel() {
  const { vehicles, setAlerts } = useUrbanShield()
  const [nightMode, setNightMode] = useState(true)

  const simulateDeviation = () => {
    setAlerts((prev) => [
      {
        id: Date.now(),
        type: 'deviation',
        title: 'Route Deviation',
        message: 'Demo user has deviated from the planned route near Whitefield.',
        ts: new Date(),
      },
      ...prev,
    ])
  }

  return (
    <div className="flex h-full gap-4 p-4 bg-app">
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-sm sm:text-base font-semibold text-textPrimary">Safe Travel Mode</h1>
          <div className="flex items-center gap-2 text-xs text-textSecondary">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={nightMode}
                onChange={(e) => setNightMode(e.target.checked)}
              />
              Night risk overlay
            </label>
            <button
              onClick={simulateDeviation}
              className="px-3 py-1.5 rounded-lg bg-cardDeep text-[11px] text-textSecondary hover:text-textPrimary"
            >
              Simulate Deviation
            </button>
          </div>
        </div>
        <div className="flex-1">
          <CityMap vehicles={vehicles} congestionData={[]} />
        </div>
      </div>

      <div className="w-80 hidden xl:block bg-card rounded-xl border border-borderSoft p-4 text-xs text-textSecondary space-y-2">
        <h2 className="text-sm font-semibold text-textPrimary mb-1">Night Risk Overlay</h2>
        <p>
          Crime hotspot overlay highlights historical incident clusters around Bengaluru.
          Deviations from the planned route inside high-risk corridors will escalate into SOS.
        </p>
      </div>
    </div>
  )
}

