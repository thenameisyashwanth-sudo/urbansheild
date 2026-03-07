import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

// Firebase config for UrbanShield 2.0 (frontend-only auth)
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
