import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { triggerSOS, reverseGeocode } from '../hooks/useApi'

const BANGALORE_CENTER = [12.9716, 77.5946]
const HOLD_MS = 3000
const CANCEL_WINDOW_MS = 5000

export default function SilentSOS({ demoMode }) {
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('idle') // idle | countdown | sent
  const [deliveryStatus, setDeliveryStatus] = useState({ '112': false, whatsapp: false, sms: false })
  const [address, setAddress] = useState('')
  const [sosHistory, setSosHistory] = useState([])
  const holdTimerRef = useRef(null)
  const cancelTimerRef = useRef(null)

  useEffect(() => {
    fetch('/api/sos/history').then((r) => r.json()).then(setSosHistory).catch(() => {})
  }, [])

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = window.location.port === '5173' ? '8000' : window.location.port
    const ws = new WebSocket(`${proto}//${host}:${port}/ws`)
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'sos_trigger') setSosHistory((prev) => [{ id: data.payload.sos_id, lat: data.payload.lat, lng: data.payload.lng, status: 'active', created_at: new Date().toISOString() }, ...prev])
      } catch (_) {}
    }
    return () => ws.close()
  }, [])

  const handlePressStart = () => {
    setHolding(true)
    setProgress(0)
    const start = Date.now()
    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.min(100, (elapsed / HOLD_MS) * 100))
      if (elapsed >= HOLD_MS) {
        clearInterval(holdTimerRef.current)
        setPhase('countdown')
        setHolding(false)
        cancelTimerRef.current = setTimeout(() => confirmSOS(), CANCEL_WINDOW_MS)
      }
    }, 50)
  }

  const handlePressEnd = () => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current)
    setHolding(false)
    setProgress(0)
  }

  const cancelCountdown = () => {
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current)
    setPhase('idle')
  }

  const confirmSOS = async () => {
    setPhase('sent')
    setDeliveryStatus({ '112': false, whatsapp: false, sms: false })
    let lat = 12.9716
    let lng = 77.5946
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        })
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch (_) {}
    }
    const addr = await reverseGeocode(lat, lng)
    setAddress(addr)
    setDeliveryStatus((s) => ({ ...s, '112': true }))
    await new Promise((r) => setTimeout(r, 400))
    setDeliveryStatus((s) => ({ ...s, whatsapp: true }))
    await new Promise((r) => setTimeout(r, 400))
    setDeliveryStatus((s) => ({ ...s, sms: true }))
    try {
      await triggerSOS(lat, lng, 'Demo User', 'O+')
      setSosHistory((prev) => [{ id: Date.now(), lat, lng, status: 'active', created_at: new Date().toISOString(), address: addr }, ...prev])
    } catch (_) {}
  }

  const statusColor = (status) => (status === 'active' ? '#dc2626' : status === 'responding' ? '#ea580c' : '#22c55e')

  return (
    <div className="h-full flex flex-col md:flex-row">
      <div className="p-4 md:w-96 shrink-0 bg-white border-b md:border-b-0 md:border-r border-navy/10">
        <h1 className="text-lg font-semibold text-accent mb-4">Silent SOS (mobile-friendly)</h1>
        <div className="flex flex-col items-center gap-4">
          <button
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onTouchCancel={handlePressEnd}
            className="w-32 h-32 rounded-full bg-danger text-white font-bold text-2xl flex items-center justify-center select-none touch-manipulation active:scale-95 transition-transform"
          >
            SOS
          </button>
          {holding && (
            <div className="w-full max-w-[200px] h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-accent transition-all duration-50" style={{ width: `${progress}%` }} />
            </div>
          )}
          {phase === 'countdown' && (
            <div className="text-center">
              <p className="text-sm text-navy/80">SOS will trigger in 5 seconds</p>
              <button onClick={cancelCountdown} className="mt-2 text-sm text-accent underline">Cancel</button>
            </div>
          )}
          {phase === 'sent' && (
            <>
              <p className="text-sm font-medium text-success">112 Alert Sent</p>
              <div className="w-full space-y-2">
                <h3 className="text-xs font-mono text-accent">Alert Delivery Status</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className={deliveryStatus['112'] ? 'text-green-600' : ''}>{deliveryStatus['112'] ? '✓' : '○'} 112 Alert</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={deliveryStatus.whatsapp ? 'text-green-600' : ''}>{deliveryStatus.whatsapp ? '✓' : '○'} WhatsApp</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={deliveryStatus.sms ? 'text-green-600' : ''}>{deliveryStatus.sms ? '✓' : '○'} SMS</span>
                </div>
              </div>
              {address && (
                <div className="mt-3 p-3 bg-gray-50 rounded text-xs">
                  🆘 Demo User — SOS. Location: {address}. Time: {new Date().toLocaleTimeString()}. Click to track: [mock link]
                </div>
              )}
              <p className="text-xs text-navy/60 mt-2">SMS sent to +91XXXXXXXX: SOS from Demo User at {address || 'location'}</p>
            </>
          )}
        </div>
        <p className="text-xs text-navy/60 mt-4">Hold the SOS button for 3 seconds to activate.</p>
      </div>

      <div className="flex-1 min-h-[300px]">
        <MapContainer center={BANGALORE_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
          <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {sosHistory.map((e) => (
            <CircleMarker
              key={e.id}
              center={[e.lat, e.lng]}
              radius={10}
              pathOptions={{ fillColor: statusColor(e.status), color: '#0A0F1E', weight: 2, fillOpacity: 0.9 }}
            >
              <Popup>
                <div className="text-xs">
                  <div>Time: {e.created_at?.slice(0, 19)}</div>
                  <div>Location: {e.lat?.toFixed(4)}, {e.lng?.toFixed(4)}</div>
                  <div>Status: {e.status}</div>
                  {e.address && <div>{e.address}</div>}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
