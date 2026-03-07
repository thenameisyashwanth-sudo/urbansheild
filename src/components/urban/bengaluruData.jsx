// components/urban/bengaluruData.jsx
// Bengaluru-specific mock data and simulation helpers

export const BENGALURU_CENTER = [12.9716, 77.5946]

export const ROAD_SEGMENTS = [
  {
    id: 1,
    name: 'MG Road',
    capacity: 70,
    maxSpeed: 40,
    start: [12.9756, 77.6063],
    end: [12.9716, 77.5963],
  },
  {
    id: 2,
    name: 'Outer Ring Road - Marathahalli',
    capacity: 90,
    maxSpeed: 50,
    start: [12.9594, 77.6972],
    end: [12.9694, 77.6872],
  },
  {
    id: 3,
    name: 'Silk Board Junction',
    capacity: 80,
    maxSpeed: 35,
    start: [12.9172, 77.6233],
    end: [12.9182, 77.6243],
  },
  {
    id: 4,
    name: 'Whitefield Main Road',
    capacity: 75,
    maxSpeed: 45,
    start: [12.9698, 77.7499],
    end: [12.9598, 77.7399],
  },
  {
    id: 5,
    name: 'Koramangala 80 Feet Road',
    capacity: 60,
    maxSpeed: 40,
    start: [12.9352, 77.6245],
    end: [12.9452, 77.6145],
  },
  {
    id: 6,
    name: 'Indiranagar 100 Feet Road',
    capacity: 55,
    maxSpeed: 40,
    start: [12.9789, 77.6402],
    end: [12.9689, 77.6502],
  },
  {
    id: 7,
    name: 'Hebbal Flyover',
    capacity: 85,
    maxSpeed: 50,
    start: [13.0352, 77.5933],
    end: [13.0252, 77.6033],
  },
  {
    id: 8,
    name: 'Bannerghatta Road',
    capacity: 65,
    maxSpeed: 45,
    start: [12.8854, 77.5972],
    end: [12.8954, 77.5872],
  },
  {
    id: 9,
    name: 'KR Puram - Tin Factory',
    capacity: 80,
    maxSpeed: 40,
    start: [13.0123, 77.6987],
    end: [13.0023, 77.6887],
  },
  {
    id: 10,
    name: 'Jayanagar 4th Block',
    capacity: 50,
    maxSpeed: 35,
    start: [12.9256, 77.5934],
    end: [12.9156, 77.6034],
  },
]

export const HOSPITALS = [
  { id: 'victoria', name: 'Victoria Hospital', lat: 12.9589, lng: 77.5865 },
  { id: 'manipal', name: 'Manipal Hospital', lat: 12.9342, lng: 77.6102 },
  { id: 'fortis', name: 'Fortis Bannerghatta', lat: 12.8776, lng: 77.5972 },
]

export const VEHICLE_TYPES = [
  { type: 'bike', weight: 35, color: '#22c55e' },
  { type: 'car', weight: 30, color: '#3b82f6' },
  { type: 'auto', weight: 15, color: '#eab308' },
  { type: 'truck', weight: 10, color: '#a855f7' },
  { type: 'bus', weight: 8, color: '#f97316' },
  { type: 'ambulance', weight: 2, color: '#ef4444' },
]

export const CRIME_HOTSPOTS = Array.from({ length: 30 }).map((_, i) => ({
  id: `hotspot_${i}`,
  lat: BENGALURU_CENTER[0] + (Math.random() - 0.5) * 0.15,
  lng: BENGALURU_CENTER[1] + (Math.random() - 0.5) * 0.2,
  weight: 0.5 + Math.random() * 0.5,
}))

export const INTERVENTIONS = [
  { id: 'streetlight', label: 'Streetlights', costLakhs: 2, impactScore: 0.8 },
  { id: 'ambulance_point', label: 'Ambulance Point', costLakhs: 15, impactScore: 1.0 },
  { id: 'traffic_officer', label: 'Traffic Officer / week', costLakhs: 0.5, impactScore: 0.4 },
]

export function getCongestionColor(idx) {
  if (idx < 0.3) return 'green'
  if (idx < 0.6) return 'yellow'
  return 'red'
}

function pickWeightedVehicleType() {
  const total = VEHICLE_TYPES.reduce((sum, v) => sum + v.weight, 0)
  let r = Math.random() * total
  for (const v of VEHICLE_TYPES) {
    if ((r -= v.weight) <= 0) return v.type
  }
  return 'car'
}

function lerpLatLng([lat1, lng1], [lat2, lng2], t) {
  return [lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t]
}

export function generateVehicles(count) {
  const n = count ?? 50 + Math.floor(Math.random() * 50)
  const out = []
  for (let i = 0; i < n; i++) {
    const seg = ROAD_SEGMENTS[Math.floor(Math.random() * ROAD_SEGMENTS.length)]
    const t = Math.random()
    const [lat, lng] = lerpLatLng(seg.start, seg.end, t)
    const type = pickWeightedVehicleType()
    const max = seg.maxSpeed || 40
    const speed = Math.random() * (max * 0.7 - max * 0.3) + max * 0.3
    out.push({
      id: `v_${seg.id}_${i}`,
      type,
      lat,
      lng,
      speed,
      segmentId: seg.id,
      segmentName: seg.name,
      ts: Date.now(),
    })
  }
  return out
}

export function calculateSignalTime(mix, total) {
  if (!total) return 30
  const w =
    mix.bike * 2 +
    mix.car * 4 +
    mix.auto * 3 +
    mix.truck * 9 +
    mix.bus * 7 +
    mix.ambulance * 8
  return Math.round((w / total) * 10)
}

export function calculateCongestion(vehicles) {
  const bySeg = new Map()
  for (const seg of ROAD_SEGMENTS) {
    bySeg.set(seg.id, [])
  }
  for (const v of vehicles) {
    if (bySeg.has(v.segmentId)) bySeg.get(v.segmentId).push(v)
  }
  const result = []
  for (const seg of ROAD_SEGMENTS) {
    const vs = bySeg.get(seg.id) || []
    const count = vs.length
    const avgSpeed = count ? vs.reduce((s, v) => s + v.speed, 0) / count : seg.maxSpeed
    const utilization = count / seg.capacity
    const speedFactor = 1 - avgSpeed / seg.maxSpeed
    const idx = Math.max(0, utilization * Math.max(speedFactor, 0.05))
    const mix = { bike: 0, car: 0, auto: 0, truck: 0, bus: 0, ambulance: 0 }
    vs.forEach((v) => {
      if (mix[v.type] != null) mix[v.type] += 1
    })
    result.push({
      segmentId: seg.id,
      name: seg.name,
      vehicles: count,
      avgSpeed: Math.round(avgSpeed),
      capacity: seg.capacity,
      index: idx,
      color: getCongestionColor(idx),
      mix,
      recommendedGreen: calculateSignalTime(mix, count),
    })
  }
  return result
}

export function generateTrafficSimulation() {
  const vehicles = generateVehicles()
  const congestion = calculateCongestion(vehicles)
  return { vehicles, congestion }
}

