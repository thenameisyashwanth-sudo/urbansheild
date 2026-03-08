import { useState } from 'react'
import { Shield, User, MapPin, Calendar, Home, Phone, Hash } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import Globe3DDemo from '../components/ui/3d-globe-demo'
import { StatefulButton } from '../components/ui/stateful-button'

export default function Login() {
  const { user, profile, signInWithGoogle, saveProfile } = useAuth()
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    displayName: '',
    city: '',
    dob: '',
    address: '',
    phone: '',
    age: '',
  })

  const onGoogleLogin = async () => {
    setErr('')
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      setErr(e?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const onProfileSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await saveProfile({
        displayName: form.displayName || user?.displayName || user?.email?.split('@')[0],
        city: form.city,
        dob: form.dob,
        address: form.address,
        phone: form.phone,
        age: form.age ? parseInt(form.age, 10) : null,
        email: user?.email,
        photoURL: user?.photoURL,
        createdAt: Date.now(),
      })
    } catch (e) {
      setErr(e?.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  const updateForm = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-cyber-bg text-slate-900 dark:text-content flex">
      {/* Left: 3D Globe */}
      <div className="hidden lg:flex flex-1 min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-transparent to-transparent dark:from-cyber-bg z-10 pointer-events-none" />
        <div className="w-full h-full opacity-90">
          <Globe3DDemo />
        </div>
        {/* Unique divider: gradient glow seam */}
        <div className="absolute right-0 top-0 bottom-0 w-px z-20">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/40 to-transparent opacity-60" />
          <div className="absolute inset-0 bg-accent/20 w-[2px] blur-sm" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-24 rounded-full bg-accent/50 blur-md animate-pulse" />
        </div>
        <div className="absolute bottom-6 left-6 z-20 text-accent/80 text-sm font-mono">
          UrbanShield — Global Smart City Safety
        </div>
      </div>

      {/* Right: Auth */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 max-w-xl mx-auto">
        <div className="w-full">
          <div className="flex flex-col items-center gap-4 mb-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-cyber-purple flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.3)]">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-accent to-cyber-purple bg-clip-text text-transparent">
                UrbanShield
              </h1>
              <p className="text-slate-600 dark:text-content/70 text-sm lg:text-base">
                Smart City Safety Platform
              </p>
            </div>
          </div>

          {!user ? (
            <>
              <p className="text-slate-600 dark:text-content/80 mb-6">
                Sign in to access traffic intelligence, SOS, emergency corridor, and safe travel features.
              </p>
              <StatefulButton
                onClick={onGoogleLogin}
                disabled={loading}
                className="w-full justify-center bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md"
              >
                <span className="flex items-center justify-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  </span>
                  <span>Sign in with Google</span>
                </span>
              </StatefulButton>
            </>
          ) : !profile ? (
            <form onSubmit={onProfileSubmit} className="space-y-4">
              <h2 className="text-lg font-semibold text-accent mb-4 text-center">Complete your profile</h2>
              <div className="space-y-3">
                <label className="block text-sm text-slate-700 dark:text-content/70">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-content/40" />
                  <input
                    value={form.displayName}
                    onChange={(e) => updateForm('displayName', e.target.value)}
                    placeholder="Your name"
                    className="input-base w-full pl-11 pr-4 py-2.5"
                  />
                </div>
                <label className="block text-sm text-slate-700 dark:text-content/70">City</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-content/40" />
                  <input
                    value={form.city}
                    onChange={(e) => updateForm('city', e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="input-base w-full pl-11 pr-4 py-2.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-content/70">Date of Birth</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-content/40" />
                      <input
                        type="date"
                        value={form.dob}
                        onChange={(e) => updateForm('dob', e.target.value)}
                        className="input-base w-full pl-11 pr-4 py-2.5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-content/70">Age</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-content/40" />
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={form.age}
                        onChange={(e) => updateForm('age', e.target.value)}
                        placeholder="25"
                        className="input-base w-full pl-11 pr-4 py-2.5"
                      />
                    </div>
                  </div>
                </div>
                <label className="block text-sm text-slate-700 dark:text-content/70">Address</label>
                <div className="relative">
                  <Home className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-content/40" />
                  <textarea
                    value={form.address}
                    onChange={(e) => updateForm('address', e.target.value)}
                    placeholder="Street, area, PIN"
                    rows={2}
                    className="input-base w-full pl-11 pr-4 py-2.5 resize-none"
                  />
                </div>
                <label className="block text-sm text-slate-700 dark:text-content/70">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-content/40" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    placeholder="+91 XXXXXXXXXX"
                    className="input-base w-full pl-11 pr-4 py-2.5"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-xl bg-accent/20 border border-accent text-accent font-medium hover:bg-accent/30 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all disabled:opacity-50"
              >
                Save & Continue
              </button>
            </form>
          ) : null}

          {err && <div className="mt-4 text-sm text-danger">{err}</div>}
        </div>

        <p className="mt-8 text-xs text-content/50 text-center">
          Your data is stored securely in Firebase. Emergency contacts and SOS features require a complete profile.
        </p>
      </div>
    </div>
  )
}
