import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getDatabase, ref, set, get } from 'firebase/database'

// Firebase web config (public). For production, move to env vars.
const firebaseConfig = {
  apiKey: 'AIzaSyAW1NX7kJKowK5iqFZEscKDTaQnHnHbJCM',
  authDomain: 'urbanshield-4660d.firebaseapp.com',
  databaseURL: 'https://urbanshield-4660d-default-rtdb.firebaseio.com',
  projectId: 'urbanshield-4660d',
  storageBucket: 'urbanshield-4660d.firebasestorage.app',
  messagingSenderId: '397845282874',
  appId: '1:397845282874:web:d54963b509974257e6f503',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getDatabase(app)

export async function saveUserProfile(uid, profile) {
  await set(ref(db, `users/${uid}`), { ...profile, updatedAt: Date.now() })
}

export async function getUserProfile(uid) {
  const snap = await get(ref(db, `users/${uid}`))
  return snap.exists() ? snap.val() : null
}

