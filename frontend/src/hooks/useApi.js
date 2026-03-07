import { useState, useEffect, useCallback } from 'react'

const API = '/api'

export function useLiveStats() {
  const [stats, setStats] = useState({})
  useEffect(() => {
    const fetchStats = () => {
      fetch(`${API}/stats`)
        .then((r) => r.json())
        .then(setStats)
        .catch(() => {})
    }
    fetchStats()
    const t = setInterval(fetchStats, 5000)
    return () => clearInterval(t)
  }, [])
  return stats
}

export function useDemoMode() {
  const [demoMode, setDemoMode] = useState(false)
  useEffect(() => {
    if (!demoMode) return
    const run = () => {
      fetch(`${API}/demo/run`, { method: 'POST' }).catch(() => {})
    }
    run()
    const t = setInterval(run, 30000)
    return () => clearInterval(t)
  }, [demoMode])
  return { demoMode, setDemoMode }
}

export function useTrafficWebSocket(setTraffic) {
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = window.location.port === '5173' ? '8000' : window.location.port
    const ws = new WebSocket(`${proto}//${host}:${port}/ws`)
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'traffic') setTraffic(data.payload)
      } catch (_) {}
    }
    ws.onclose = () => {
      // Fallback: poll REST
      const poll = () => fetch(`${API}/traffic`).then((r) => r.json()).then((d) => setTraffic(d)).catch(() => {})
      poll()
      const t = setInterval(poll, 5000)
      return () => clearInterval(t)
    }
    return () => ws.close()
  }, [setTraffic])
}

export async function triggerSOS(lat, lng, user_name = 'Demo User', blood_type = 'O+') {
  const r = await fetch(`${API}/sos/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, user_name, blood_type }),
  })
  return r.json()
}

export async function reverseGeocode(lat, lng) {
  const r = await fetch(`${API}/geocode/reverse?lat=${lat}&lng=${lng}`)
  const d = await r.json()
  return d.address || `${lat}, ${lng}`
}

export async function dispatchAmbulance(origin, dest) {
  const body = {}
  if (origin) { body.origin_lat = origin.lat; body.origin_lng = origin.lng }
  if (dest) { body.dest_lat = dest.lat; body.dest_lng = dest.lng }
  const r = await fetch(`${API}/ambulance/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return r.json()
}

export async function getRoute(originLat, originLng, destLat, destLng) {
  const r = await fetch(
    `${API}/safe-travel/route?origin_lat=${originLat}&origin_lng=${originLng}&dest_lat=${destLat}&dest_lng=${destLng}`,
    { method: 'POST' }
  )
  return r.json()
}

export async function reportDeviation(user_name, lat, lng, expected_route) {
  await fetch(`${API}/safe-travel/deviation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_name, lat, lng, expected_route }),
  })
}
