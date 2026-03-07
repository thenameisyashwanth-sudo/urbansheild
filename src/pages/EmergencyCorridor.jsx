import { useEffect, useState } from 'react'
import CityMap from '../components/urban/CityMap'
import { useUrbanShield } from '../Layout'
import { HOSPITALS, ROAD_SEGMENTS } from '../components/urban/bengaluruData'

function randomSegmentPoint() {
  const seg = ROAD_SEGMENTS[Math.floor(Math.random() * ROAD_SEGMENTS.length)]
  const t = Math.random()
  const [lat1, lng1] = seg.start
  const [lat2, lng2] = seg.end
  return {
    lat: lat1 + (lat2 - lat1) * t,
    lng: lng1 + (lng2 - lng1) * t,
    name: seg.name,
  }
}

export default function EmergencyCorridor() {
  const { vehicles, congestionData, setAlerts, setAmbulanceCount } = useUrbanShield()
  const [route, setRoute] = useState(null)
  const [eta, setEta] = useState(0)

  const dispatch = () => {
    const origin = randomSegmentPoint()
    const dest = HOSPITALS[Math.floor(Math.random() * HOSPITALS.length)]
    const steps = 40
    const coords = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      coords.push([
        origin.lat + (dest.lat - origin.lat) * t,
        origin.lng + (dest.lng - origin.lng) * t,
      ])
    }
    setRoute({ origin, dest, coords, idx: 0 })
    setEta(10)
    setAmbulanceCount((c) => c + 1)
    setAlerts((prev) => [
      {
        id: Date.now(),
        type: 'ambulance',
        title: 'Ambulance Dispatch',
        message: `Route from ${origin.name} to ${dest.name}. ETA ~10 min.`,
        ts: new Date(),
      },
      ...prev,
    ])
  }

  useEffect(() => {
    if (!route) return
    const timer = setInterval(() => {
      setRoute((r) => {
        if (!r) return r
        const next = r.idx + 1
        if (next >= r.coords.length) return null
        return { ...r, idx: next }
      })
      setEta((e) => Math.max(0, e - 0.25))
    }, 500)
    return () => clearInterval(timer)
  }, [route])

  const ambVehicles =
    route && route.coords[route.idx]
      ? [
          {
            id: 'ambulance_active',
            type: 'ambulance',
            lat: route.coords[route.idx][0],
            lng: route.coords[route.idx][1],
            speed: 45,
            segmentId: 0,
            segmentName: 'Emergency Corridor',
          },
        ]
      : []

  return (
    <div className="flex h-full gap-4 p-4 bg-app">
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-sm sm:text-base font-semibold text-textPrimary">
            Emergency Corridor
          </h1>
          <button
            onClick={dispatch}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-xs font-semibold text-white shadow-lg"
          >
            Dispatch Ambulance
          </button>
        </div>
        <div className="flex-1">
          <CityMap vehicles={[...vehicles, ...ambVehicles]} congestionData={congestionData} />
        </div>
      </div>

      <div className="w-80 space-y-3 hidden xl:block">
        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-orange-400/40 rounded-xl p-4 text-xs">
          <div className="text-textPrimary font-semibold mb-1">Active Dispatch</div>
          {route ? (
            <>
              <div className="text-textSecondary mb-1">
                {route.origin.name} → {route.dest.name}
              </div>
              <div className="text-[11px] text-textSecondary">ETA: {eta.toFixed(1)} min</div>
            </>
          ) : (
            <div className="text-textSecondary">No active ambulance corridor.</div>
          )}
        </div>
      </div>
    </div>
  )
}

