import { useState, useEffect, useCallback } from 'react'
import { API_BASE, getWsUrl } from '../config'

const API = API_BASE

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
    const ws = new WebSocket(getWsUrl())
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

export async function triggerSOS(lat, lng, user_name = 'Demo User', blood_type = 'O+', contact_phone = null, contact_name = null, include_112 = true) {
  const body = { lat, lng, user_name, blood_type, include_112 }
  if (contact_phone) body.contact_phone = contact_phone
  if (contact_name) body.contact_name = contact_name
  const r = await fetch(`${API}/sos/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return r.json()
}

export async function reverseGeocode(lat, lng) {
  const r = await fetch(`${API}/geocode/reverse?lat=${lat}&lng=${lng}`)
  const d = await r.json()
  return d.address || `${lat}, ${lng}`
}

export async function dispatchAmbulance(origin, dest, hospitalOrProviderName = null, vehicleNumber = null) {
  const body = {}
  if (origin) { body.origin_lat = origin.lat; body.origin_lng = origin.lng }
  if (dest) { body.dest_lat = dest.lat; body.dest_lng = dest.lng }
  if (hospitalOrProviderName) body.hospital_or_provider_name = hospitalOrProviderName
  if (vehicleNumber) body.vehicle_number = vehicleNumber
  const r = await fetch(`${API}/ambulance/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return r.json()
}

export async function verifyAmbulanceVote(logId, lat, lng, vote, userId = 'anonymous') {
  const r = await fetch(`${API}/ambulance/verify-vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ambulance_log_id: logId, user_id: userId, lat, lng, vote }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : data?.detail?.[0]?.msg || 'Failed to submit vote')
  return data
}

export async function getAmbulanceVerificationStatus(logId) {
  const r = await fetch(`${API}/ambulance/${logId}/verification-status`)
  return r.json()
}

export async function getRoute(originLat, originLng, destLat, destLng) {
  const r = await fetch(
    `${API}/safe-travel/route?origin_lat=${originLat}&origin_lng=${originLng}&dest_lat=${destLat}&dest_lng=${destLng}`,
    { method: 'POST' }
  )
  return r.json()
}

export async function reportDeviation(user_name, lat, lng, expected_route, contact_phone = null, contact_name = null) {
  const body = { user_name, lat, lng, expected_route }
  if (contact_phone) body.contact_phone = contact_phone
  if (contact_name) body.contact_name = contact_name
  await fetch(`${API}/safe-travel/deviation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
