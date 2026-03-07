import { useState } from 'react'
import { Shield, LogIn } from 'lucide-react'
import BackgroundLinesDemo from '../components/BackgroundLinesDemo'
import { useAuth } from '../auth/AuthProvider'

export default function Login() {
  const { signInWithGoogle } = useAuth()
  const [err, setErr] = useState('')

  const onLogin = async () => {
    setErr('')
    try {
      await signInWithGoogle()
    } catch (e) {
      setErr(e?.message || 'Login failed')
    }
  }

  return (
    <BackgroundLinesDemo
      title={<>UrbanShield <br /> Smart City Safety</>}
      subtitle="Traffic intelligence + SOS + emergency corridor — built for Indian cities."
    >
      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          onClick={onLogin}
          className="px-5 py-3 rounded-xl bg-accent text-white font-semibold flex items-center gap-2 hover:bg-accent/90 shadow-lg shadow-black/10"
        >
          <LogIn size={18} />
          Sign in with Google
        </button>
        {err && <div className="text-xs text-red-500 max-w-md text-center">{err}</div>}
        <div className="text-xs text-neutral-600 dark:text-neutral-400">
          Admin features unlock after login.
        </div>
      </div>
    </BackgroundLinesDemo>
  )
}

