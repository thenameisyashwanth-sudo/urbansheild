import CityMap from '../components/urban/CityMap'
import CongestionSidebar from '../components/urban/CongestionSidebar'
import SignalTable from '../components/urban/SignalTable'
import { useUrbanShield } from '../Layout'

export default function TrafficIntelligence() {
  const { vehicles, congestionData } = useUrbanShield()

  return (
    <div className="flex h-full gap-4 p-4 bg-app">
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-sm sm:text-base font-semibold text-textPrimary">
            Traffic Intelligence — Bengaluru
          </h1>
          <div className="flex flex-wrap gap-2 text-[10px] text-textSecondary">
            <span className="px-2 py-1 rounded-full bg-cardDeep">🚲 Bike</span>
            <span className="px-2 py-1 rounded-full bg-cardDeep">🚗 Car</span>
            <span className="px-2 py-1 rounded-full bg-cardDeep">🛺 Auto</span>
            <span className="px-2 py-1 rounded-full bg-cardDeep">🚚 Truck</span>
            <span className="px-2 py-1 rounded-full bg-cardDeep">🚌 Bus</span>
            <span className="px-2 py-1 rounded-full bg-cardDeep">🚑 Ambulance</span>
          </div>
        </div>
        <div className="flex-1">
          <CityMap vehicles={vehicles} congestionData={congestionData} />
        </div>
      </div>

      <div className="w-80 space-y-4 hidden xl:block">
        <CongestionSidebar congestion={congestionData} />
        <SignalTable congestion={congestionData} />
      </div>
    </div>
  )
}

