import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
import { auth, googleProvider } from '../../firebase'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { useUrbanShield } from '../../Layout'

function Stat({ label, value }) {
  return (
    <div className="flex flex-col text-[10px] sm:text-xs">
      <span className="text-textSecondary uppercase tracking-wide">{label}</span>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="font-mono text-textPrimary"
      >
        {value}
      </motion.span>
    </div>
  )
}

export default function TopHeader() {
  const { vehicles, congestionData, sosCount, ambulanceCount, demoMode, setDemoMode } =
    useUrbanShield()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  const login = async () => {
    await signInWithPopup(auth, googleProvider)
  }

  const logout = async () => {
    await signOut(auth)
  }

  const activeVehicles = vehicles.length
  const avgCongestion = congestionData.length
    ? congestionData.reduce((s, c) => s + c.index, 0) / congestionData.length
    : 0

  return (
    <header className="flex items-center h-14 px-4 sm:px-6 border-b border-borderSoft bg-shell shrink-0 gap-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
          <Shield size={18} />
        </div>
        <div className="leading-tight">
          <div className="text-xs font-mono text-textSecondary">UrbanShield</div>
          <div className="text-sm font-semibold text-textPrimary">2.0</div>
        </div>
      </div>

      <div className="hidden md:flex gap-6 ml-6">
        <Stat label="Active Vehicles" value={activeVehicles} />
        <Stat label="SOS Today" value={sosCount} />
        <Stat label="Avg Congestion" value={`${(avgCongestion * 100).toFixed(0)}%`} />
        <Stat label="Ambulance Dispatches" value={ambulanceCount} />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={() => setDemoMode(!demoMode)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${
            demoMode
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-borderSoft bg-cardDeep text-textSecondary'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              demoMode ? 'bg-accent animate-pulse' : 'bg-borderSoft'
            }`}
          />
          Demo Mode
        </button>

        {user ? (
          <div className="flex items-center gap-2 text-xs">
            <div className="w-7 h-7 rounded-full bg-cardDeep flex items-center justify-center text-[11px] text-textPrimary">
              {user.displayName?.[0] || 'U'}
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-textPrimary text-[11px]">
                {user.displayName || user.email}
              </span>
              <span className="text-[10px] text-textSecondary">City Admin</span>
            </div>
            <button
              onClick={logout}
              className="text-[10px] text-textSecondary hover:text-textPrimary ml-1"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            className="px-3 py-1.5 rounded-full bg-card text-xs text-textPrimary border border-borderSoft hover:bg-cardDeep"
          >
            Sign in with Google
          </button>
        )}
      </div>
    </header>
  )
}

