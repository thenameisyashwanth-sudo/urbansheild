import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import TrafficMap from './components/TrafficMap'
import EmergencyCorridor from './components/EmergencyCorridor'
import SilentSOS from './components/SilentSOS'
import SafeTravel from './components/SafeTravel'
import CityPlanner from './components/CityPlanner'
import { useLiveStats, useDemoMode } from './hooks/useApi'
import { useAuth } from './auth/AuthProvider'
import { useTheme } from './hooks/useTheme'
import Login from './pages/Login'

const NAV = [
  { path: '/', label: 'Traffic Intelligence', icon: '🚦' },
  { path: '/emergency', label: 'Emergency Corridor', icon: '🚑' },
  { path: '/sos', label: 'Silent SOS', icon: '🆘' },
  { path: '/safe-travel', label: 'Safe Travel', icon: '🛡️' },
  { path: '/planner', label: 'City Planner', icon: '🗺️' },
]

export default function App() {
  const stats = useLiveStats()
  const { demoMode, setDemoMode } = useDemoMode()
  const location = useLocation()
  const { user, loading, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-content dark:bg-navy text-navy dark:text-content">
        <div className="text-sm font-mono opacity-70">Loading…</div>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <div className="flex flex-col h-screen bg-content dark:bg-navy text-navy dark:text-content overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center h-14 px-4 border-b border-navy/10 dark:border-white/10 bg-white dark:bg-surface shrink-0 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">U</div>
          <span className="font-mono font-semibold text-accent">UrbanShield 2.0</span>
        </div>
        <div className="hidden sm:flex gap-6 text-sm text-navy/80 dark:text-content/80">
          <span>Active Vehicles: <strong>{stats.active_vehicles ?? '—'}</strong></span>
          <span>SOS Today: <strong>{stats.sos_alerts_today ?? '—'}</strong></span>
          <span>Avg Congestion: <strong>{stats.avg_congestion_pct ?? '—'}%</strong></span>
          <span>Ambulance Dispatches: <strong>{stats.ambulance_dispatches ?? '—'}</strong></span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-3 py-2 rounded-lg text-sm bg-navy/5 dark:bg-white/10 hover:bg-navy/10 dark:hover:bg-white/15"
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="rounded border-accent text-accent"
            />
            Demo Mode
          </label>
          <button
            onClick={signOut}
            className="px-3 py-2 rounded-lg text-sm bg-navy/5 dark:bg-white/10 hover:bg-navy/10 dark:hover:bg-white/15"
            title={user?.email || 'Sign out'}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-navy text-white shrink-0 flex flex-col py-3">
          {NAV.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent text-white' : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              <span>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-content dark:bg-navy">
          <Routes>
            <Route path="/" element={<TrafficMap demoMode={demoMode} />} />
            <Route path="/emergency" element={<EmergencyCorridor demoMode={demoMode} />} />
            <Route path="/sos" element={<SilentSOS demoMode={demoMode} />} />
            <Route path="/safe-travel" element={<SafeTravel demoMode={demoMode} />} />
            <Route path="/planner" element={<CityPlanner demoMode={demoMode} />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
