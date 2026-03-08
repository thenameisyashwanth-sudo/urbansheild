import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider, getUserProfile, saveUserProfile } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          const p = await getUserProfile(u.uid)
          setProfile(p)
        } catch {
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const value = useMemo(() => {
    return {
      user,
      profile,
      setProfile,
      loading,
      async signInWithGoogle() {
        return signInWithPopup(auth, googleProvider)
      },
      async signOut() {
        return signOut(auth)
      },
      async saveProfile(data) {
        if (!user?.uid) return
        await saveUserProfile(user.uid, data)
        setProfile(data)
      },
    }
  }, [user, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

