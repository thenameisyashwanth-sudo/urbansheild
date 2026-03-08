import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap, CircleMarker, Polyline, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { API_BASE, getWsUrl } from '../config'
import { verifyAmbulanceVote, getAmbulanceVerificationStatus } from '../hooks/useApi'

const BANGALORE_CENTER = [12.9716, 77.5946]

function AmbulanceRoute({ route, ambulancePosition, etaSeconds, setEtaSeconds }) {
  const map = useMap()
  const routeRef = useRef(null)
  useEffect(() => {
    if (!route?.coordinates?.length) return
    if (routeRef.current) map.removeLayer(routeRef.current)
    const latlngs = route.coordinates.map((c) => [c[0], c[1]])
    const poly = L.polyline(latlngs, { color: '#f97316', weight: 6 })
    poly.addTo(map)
    routeRef.current = poly
    return () => { if (routeRef.current) map.removeLayer(routeRef.current) }
  }, [route, map])

  useEffect(() => {
    if (etaSeconds <= 0) return
    const t = setInterval(() => setEtaSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [etaSeconds])

  return null
}

function DriverAlert({ show, message }) {
  if (!show) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-warn text-navy px-4 py-3 rounded-lg shadow-lg font-medium animate-pulse">
      ⚠️ {message}
    </div>
  )
}

export default function EmergencyCorridor({ demoMode }) {
  const [ambulance, setAmbulance] = useState(null)
  const [etaSeconds, setEtaSeconds] = useState(0)
  const [emergencyLog, setEmergencyLog] = useState([])
  const [alerts, setAlerts] = useState([])
  const [driverAlert, setDriverAlert] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [hospitalName, setHospitalName] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [voteError, setVoteError] = useState('')
  const [userVoted, setUserVoted] = useState(false)
  const wsRef = useRef(null)

  const loadLog = () => fetch(`${API_BASE}/emergency-log`).then((r) => r.json()).then(setEmergencyLog)
  const loadAlerts = () => fetch(`${API_BASE}/alerts`).then((r) => r.json()).then(setAlerts)

  useEffect(() => {
    loadLog()
    loadAlerts()
  }, [])

  useEffect(() => {
    if (ambulance?.log_id) {
      getAmbulanceVerificationStatus(ambulance.log_id).then(setVerificationStatus).catch(() => {})
    }
  }, [ambulance?.log_id])

  const ambulanceLogIdRef = useRef(ambulance?.log_id)
  ambulanceLogIdRef.current = ambulance?.log_id

  useEffect(() => {
    const ws = new WebSocket(getWsUrl())
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'ambulance_dispatch') {
          setAmbulance(data.payload)
          setVerificationStatus(data.payload.verification_status ? {
            verification_status: data.payload.verification_status,
            yes_votes: 0,
            no_votes: 0,
            total_votes: 0,
            no_percent: 0,
          } : { verification_status: 'pending', yes_votes: 0, no_votes: 0, total_votes: 0, no_percent: 0 })
          setUserVoted(false)
          setEtaSeconds(Math.round((data.payload.eta_minutes || 10) * 60))
          setDriverAlert(true)
          setTimeout(() => setDriverAlert(false), 8000)
          loadLog()
          loadAlerts()
        }
        if (data.type === 'ambulance_verification_update' && ambulanceLogIdRef.current === data.payload?.log_id) {
          setVerificationStatus((prev) => prev ? { ...prev, ...data.payload } : data.payload)
        }
      } catch (_) {}
    }
    wsRef.current = ws
    return () => ws.close()
  }, [])

  const handleDispatchClick = () => setShowRegisterModal(true)

  const handleDispatch = async () => {
    setShowRegisterModal(false)
    try {
      const body = {}
      if (hospitalName.trim()) body.hospital_or_provider_name = hospitalName.trim()
      if (vehicleNumber.trim()) body.vehicle_number = vehicleNumber.trim()
      const r = await fetch(`${API_BASE}/ambulance/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      setAmbulance(d)
      setVerificationStatus({ verification_status: 'pending', yes_votes: 0, no_votes: 0, total_votes: 0, no_percent: 0 })
      setUserVoted(false)
      setEtaSeconds(Math.round((d.eta_minutes || 10) * 60))
      setDriverAlert(true)
      setTimeout(() => setDriverAlert(false), 8000)
      loadLog()
      loadAlerts()
    } catch (_) {}
  }

  const handleVerifyVote = async (vote) => {
    if (!ambulance?.log_id || userVoted) return
    setVoteError('')
    try {
      const lat = ambulance?.origin?.lat ?? 12.97
      const lng = ambulance?.origin?.lng ?? 77.59
      await verifyAmbulanceVote(ambulance.log_id, lat, lng, vote)
      setUserVoted(true)
      getAmbulanceVerificationStatus(ambulance.log_id).then(setVerificationStatus).catch(() => {})
    } catch (e) {
      setVoteError(e?.message || 'Failed to submit vote')
    }
  }

  const route = ambulance?.route
  const roadNames = ambulance?.road_names?.join(', ') || ambulance?.road_names || 'Route'

  return (
    <div className="h-full flex flex-col">
      {/* Registration modal: hospital/provider name + vehicle number (accepted as-is) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50" onClick={() => setShowRegisterModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-navy mb-2">Register as Ambulance</h3>
            <p className="text-sm text-navy/70 mb-4">Enter your ambulance details. We accept whatever you provide — crowdsourced verification will confirm authenticity.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Hospital or Private Provider Name</label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="e.g. Apollo Hospital / Private Ambulance XYZ"
                  className="input-base w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Vehicle Number</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. KA-01-AB-1234"
                  className="input-base w-full text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowRegisterModal(false)} className="flex-1 px-4 py-2 border border-navy/20 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleDispatch} className="flex-1 px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90">Dispatch</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-4 border-b border-cyber-border bg-cyber-card">
        <h1 className="text-lg font-semibold text-accent">Emergency Corridor — Ambulance Dispatch</h1>
        <button
          onClick={handleDispatchClick}
          className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90"
        >
          Ambulance Dispatch
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 min-h-[300px] relative">
          <MapContainer center={BANGALORE_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
            />
            {route?.coordinates?.length > 0 && (
              <Polyline positions={route.coordinates} pathOptions={{ color: '#f97316', weight: 6 }} />
            )}
            {ambulance?.origin && (
              <CircleMarker center={[ambulance.origin.lat, ambulance.origin.lng]} radius={8} pathOptions={{ color: '#0A0F1E', fillColor: '#22c55e', fillOpacity: 1 }} />
            )}
            {ambulance?.destination && (
              <CircleMarker center={[ambulance.destination.lat, ambulance.destination.lng]} radius={10} pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1 }} />
            )}
          </MapContainer>
          {ambulance && (
            <div className="absolute top-4 left-4 bg-white/95 border border-navy/10 rounded-lg p-3 shadow text-sm space-y-1">
              <div className="font-mono text-accent font-semibold">ETA: {Math.floor(etaSeconds / 60)}:{String(etaSeconds % 60).padStart(2, '0')}</div>
              <div className="text-navy/70">{ambulance.origin?.name} → {ambulance.destination?.name}</div>
              {(ambulance.hospital_or_provider_name || ambulance.vehicle_number) && (
                <div className="text-xs text-navy/60 pt-1 border-t border-navy/10">
                  {ambulance.hospital_or_provider_name && <div>{ambulance.hospital_or_provider_name}</div>}
                  {ambulance.vehicle_number && <div className="font-mono">{ambulance.vehicle_number}</div>}
                </div>
              )}
              {verificationStatus && (
                <div className="text-xs pt-1">
                  <span className={`font-medium ${
                    verificationStatus.verification_status === 'crowdsource_verified' ? 'text-green-600' :
                    verificationStatus.verification_status === 'disputed' ? 'text-amber-600' :
                    'text-navy/70'
                  }`}>
                    {verificationStatus.verification_status === 'crowdsource_verified' && '✓ Verified by users'}
                    {verificationStatus.verification_status === 'disputed' && '⚠ Disputed — Vision AI check pending'}
                    {verificationStatus.verification_status === 'pending' && 'Verification pending'}
                  </span>
                  {verificationStatus.total_votes > 0 && (
                    <span className="ml-1 text-navy/50">
                      ({verificationStatus.yes_votes}✓ / {verificationStatus.no_votes}✗)
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="w-96 shrink-0 border-l border-cyber-border bg-cyber-card overflow-auto p-4 text-content">
          <h2 className="font-mono font-semibold text-accent mb-2">🚨 Alerts Panel (WhatsApp/SMS sim)</h2>
          {ambulance && (
            <>
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded text-sm text-navy">
                🚨 AMBULANCE ALERT: Route from {ambulance.origin?.name} to {ambulance.destination?.name}. ETA: {ambulance.eta_minutes} min. Clear: {roadNames}
                {(ambulance.hospital_or_provider_name || ambulance.vehicle_number) && (
                  <div className="mt-2 text-xs text-navy/70">
                    {ambulance.hospital_or_provider_name && <div>Provider: {ambulance.hospital_or_provider_name}</div>}
                    {ambulance.vehicle_number && <div>Vehicle: {ambulance.vehicle_number}</div>}
                  </div>
                )}
              </div>
              {/* Crowdsourced verification: "Is this really an ambulance?" */}
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded text-sm text-navy">
                <div className="font-medium text-navy mb-2">Is this really an ambulance?</div>
                <p className="text-xs text-navy/60 mb-2">Your answer helps verify authenticity. &gt;20% &quot;No&quot; triggers CCTV/Vision AI check.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerifyVote('yes')}
                    disabled={userVoted}
                    className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleVerifyVote('no')}
                    disabled={userVoted}
                    className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    No
                  </button>
                </div>
                {userVoted && <p className="text-xs text-green-600 mt-2">Thanks, your vote has been recorded.</p>}
                {voteError && <p className="text-xs text-red-600 mt-2">{voteError}</p>}
              </div>
            </>
          )}
          <div className="space-y-2 max-h-48 overflow-auto">
            {alerts.slice(0, 10).map((a) => (
              <div key={a.id} className="text-xs p-2 bg-gray-50 rounded border border-gray-100 text-navy">
                <span className="font-mono text-accent">{a.channel}</span> — {a.title}
              </div>
            ))}
          </div>
          <h2 className="font-mono font-semibold text-accent mt-4 mb-2">Emergency Log</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-navy/10">
                <th className="text-left py-1">Time</th>
                <th className="text-left py-1">Kind</th>
                <th className="text-left py-1">ETA</th>
                <th className="text-left py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {emergencyLog.slice(0, 15).map((e) => (
                <tr key={e.id} className="border-b border-navy/5">
                  <td className="py-1">{e.created_at?.slice(11, 19)}</td>
                  <td>{e.kind}</td>
                  <td>{e.eta_minutes != null ? `${e.eta_minutes} min` : '—'}</td>
                  <td>{e.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      </div>

      <DriverAlert show={driverAlert} message="Ambulance approaching — move to the left" />
    </div>
  )
}
