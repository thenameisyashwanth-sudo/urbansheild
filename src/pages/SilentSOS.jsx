import { useState } from 'react'
import { useUrbanShield } from '../Layout'

export default function SilentSOS() {
  const { setAlerts, sosCount, setSosCount } = useUrbanShield()
  const [phase, setPhase] = useState('idle') // idle | holding | confirm
  const [holdProgress, setHoldProgress] = useState(0)

  const trigger = () => {
    setSosCount((c) => c + 1)
    setAlerts((prev) => [
      {
        id: Date.now(),
        type: 'sos',
        title: 'Silent SOS Triggered',
        message: 'Demo user has triggered an SOS alert in Bengaluru.',
        ts: new Date(),
      },
      ...prev,
    ])
  }

  const startHold = () => {
    if (phase !== 'idle') return
    setPhase('holding')
    setHoldProgress(0)
    const start = Date.now()
    const id = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, (elapsed / 3000) * 100)
      setHoldProgress(pct)
      if (elapsed >= 3000) {
        clearInterval(id)
        setPhase('confirm')
      }
    }, 50)
  }

  const cancel = () => {
    setPhase('idle')
    setHoldProgress(0)
  }

  const confirm = () => {
    setPhase('idle')
    setHoldProgress(0)
    trigger()
  }

  return (
    <div className="h-full flex items-center justify-center bg-app">
      <div className="bg-card rounded-2xl border border-borderSoft px-8 py-10 max-w-md w-full text-center space-y-4">
        <h1 className="text-base font-semibold text-textPrimary mb-2">Silent SOS</h1>
        <p className="text-xs text-textSecondary mb-4">
          Hold the button for 3 seconds to silently trigger an SOS to control room.
        </p>
        <button
          onMouseDown={startHold}
          onMouseUp={cancel}
          onMouseLeave={cancel}
          onTouchStart={startHold}
          onTouchEnd={cancel}
          className="w-32 h-32 rounded-full bg-dangerStrong text-white font-semibold text-lg flex items-center justify-center mx-auto shadow-lg active:scale-95 transition"
        >
          SOS
        </button>
        {phase === 'holding' && (
          <div className="w-40 h-2 bg-cardDeep rounded-full mx-auto overflow-hidden mt-3">
            <div
              className="h-full bg-dangerStrong transition-all"
              style={{ width: `${holdProgress}%` }}
            />
          </div>
        )}
        {phase === 'confirm' && (
          <div className="space-y-2 mt-3 text-xs">
            <p className="text-textSecondary">Trigger SOS?</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={confirm}
                className="px-3 py-1.5 rounded-lg bg-dangerStrong text-white text-[11px]"
              >
                Yes, send
              </button>
              <button
                onClick={cancel}
                className="px-3 py-1.5 rounded-lg bg-cardDeep text-textSecondary text-[11px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="text-[11px] text-textSecondary mt-4">
          SOS alerts today:{' '}
          <span className="font-mono text-textPrimary">
            {sosCount}
          </span>
        </div>
      </div>
    </div>
  )
}

