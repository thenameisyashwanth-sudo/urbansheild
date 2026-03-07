// scripts/seedFirebase.js
// Run once: node scripts/seedFirebase.js
// Seeds Firebase Realtime DB with mock traffic + vehicle data

import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  databaseURL: 'https://YOUR_PROJECT-default-rtdb.firebaseio.com',
  projectId: 'YOUR_PROJECT_ID',
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

const INTERSECTIONS = [
  { id: 'int_001', name: 'MG Road & Brigade Rd', lat: 12.9716, lng: 77.5946 },
  { id: 'int_002', name: 'Silk Board Junction',  lat: 12.9177, lng: 77.6228 },
  { id: 'int_003', name: 'Hebbal Flyover',        lat: 13.0358, lng: 77.5970 },
  { id: 'int_004', name: 'KR Puram Bridge',       lat: 13.0050, lng: 77.6942 },
  { id: 'int_005', name: 'Marathahalli Bridge',   lat: 12.9591, lng: 77.6974 },
]

const VEHICLE_TYPES = ['bike', 'car', 'auto', 'truck', 'bus']

function randomCongestion() {
  return Math.floor(Math.random() * 100)
}

function randomVehicleCounts() {
  return {
    bike:  Math.floor(Math.random() * 80 + 20),
    car:   Math.floor(Math.random() * 60 + 10),
    auto:  Math.floor(Math.random() * 40 + 5),
    truck: Math.floor(Math.random() * 20),
    bus:   Math.floor(Math.random() * 10),
  }
}

function signalTiming(counts) {
  // seconds per vehicle type to clear
  const clearTime = { bike: 2.5, car: 4.5, auto: 3.5, truck: 9, bus: 7 }
  const total = Object.entries(counts).reduce((s, [k, v]) => s + v * clearTime[k], 0)
  return Math.min(Math.round(total / 10), 90) // cap at 90s
}

async function seed() {
  for (const int of INTERSECTIONS) {
    const congestion = randomCongestion()
    const vehicles = randomVehicleCounts()
    await set(ref(db, `intersections/${int.id}`), {
      ...int,
      congestion,
      vehicles,
      recommendedSignalTime: signalTiming(vehicles),
      lastUpdated: Date.now(),
      ambulanceActive: false,
    })
  }

  // Seed recent vehicle classification events
  const events = []
  for (let i = 0; i < 20; i++) {
    events.push({
      id: `evt_${i}`,
      type: VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)],
      intersection: INTERSECTIONS[Math.floor(Math.random() * INTERSECTIONS.length)].id,
      confidence: (Math.random() * 20 + 80).toFixed(1),
      timestamp: Date.now() - i * 8000,
      platePartial: `KA${Math.floor(Math.random()*99).toString().padStart(2,'0')}`,
    })
  }
  await set(ref(db, 'classificationEvents'), events)

  console.log('✅ Seeded Firebase with mock traffic data')
  process.exit(0)
}

seed()
