import { AnimatePresence, motion } from 'framer-motion'
import { useUrbanShield } from '../../Layout'

const TYPE_STYLES = {
  ambulance: 'border-orange-400/60 bg-orange-500/10 text-orange-200',
  sos: 'border-red-400/60 bg-red-500/10 text-red-200',
  deviation: 'border-yellow-400/60 bg-yellow-500/10 text-yellow-100',
  driver: 'border-sky-400/60 bg-sky-500/10 text-sky-200',
  info: 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200',
}

export default function AlertPanel() {
  const { alerts, setAlerts } = useUrbanShield()

  const dismiss = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="pointer-events-none fixed top-16 right-4 z-[1000] flex flex-col gap-2 max-w-xs">
      <AnimatePresence>
        {alerts.map((a) => (
          <motion.div
            key={a.id}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto border rounded-lg px-3 py-2 text-xs shadow-lg ${
              TYPE_STYLES[a.type] || TYPE_STYLES.info
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold mb-0.5">{a.title}</div>
                <div className="text-[11px] opacity-80">{a.message}</div>
              </div>
              <button
                onClick={() => dismiss(a.id)}
                className="text-[10px] opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

