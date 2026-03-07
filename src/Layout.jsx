import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import TopHeader from './components/urban/TopHeader'
import AlertPanel from './components/urban/AlertPanel'
import { generateTrafficSimulation } from './components/urban/bengaluruData'

const UrbanShieldContext = createContext(null)

export function useUrbanShield() {
  const ctx = useContext(UrbanShieldContext)
  if (!ctx) throw new Error('useUrbanShield must be used within UrbanShield provider')
  return ctx
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [vehicles, setVehicles] = useState([])
  const [congestionData, setCongestionData] = useState([])
  const [alerts, setAlerts] = useState([])
  const [sosCount, setSosCount] = useState(0)
  const [ambulanceCount, setAmbulanceCount] = useState(0)
  const [demoMode, setDemoMode] = useState(false)

  // traffic simulation every 5s
  useEffect(() => {
    const tick = () => {
      const sim = generateTrafficSimulation()
      setVehicles(sim.vehicles)
      setCongestionData(sim.congestion)
    }
    tick()
    const id = setInterval(tick, 5000)
    return () => clearInterval(id)
  }, [])

  // demo mode: combined events every 30s
  useEffect(() => {
    if (!demoMode) return
    const fireDemo = () => {
      setSosCount((c) => c + 1)
      setAmbulanceCount((c) => c + 1)
      setAlerts((prev) => [
        {
          id: Date.now(),
          type: 'sos',
          title: 'Demo SOS',
          message: 'Demo SOS alert triggered near Silk Board.',
          ts: new Date(),
        },
        ...prev.slice(0, 10),
      ])
    }
    fireDemo()
    const id = setInterval(fireDemo, 30000)
    return () => clearInterval(id)
  }, [demoMode])

  const value = useMemo(
    () => ({
      vehicles,
      congestionData,
      alerts,
      setAlerts,
      sosCount,
      setSosCount,
      ambulanceCount,
      setAmbulanceCount,
      demoMode,
      setDemoMode,
    }),
    [vehicles, congestionData, alerts, sosCount, ambulanceCount, demoMode],
  )

  const navItems = [
    { to: '/', label: 'Traffic Intelligence', icon: '🚦' },
    { to: '/emergency', label: 'Emergency Corridor', icon: '🚑' },
    { to: '/sos', label: 'Silent SOS', icon: '🆘' },
    { to: '/safe-travel', label: 'Safe Travel', icon: '🛡️' },
    { to: '/planner', label: 'City Planner', icon: '🗺️' },
  ]

  return (
    <UrbanShieldContext.Provider value={value}>
      <div className="h-screen w-screen flex flex-col bg-app text-textPrimary">
        <TopHeader />
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside
            className={`flex flex-col bg-shell border-r border-borderSoft transition-all duration-200 ${
              collapsed ? 'w-14' : 'w-60'
            }`}
          >
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="flex items-center justify-center h-10 border-b border-borderSoft text-textSecondary hover:text-textPrimary"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <nav className="flex-1 overflow-y-auto py-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                      isActive ? 'bg-card text-white' : 'text-textSecondary hover:bg-cardDeep/60'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 bg-app overflow-hidden relative">{children}</main>

          <AlertPanel />
        </div>
      </div>
    </UrbanShieldContext.Provider>
  )
}

