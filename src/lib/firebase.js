import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const hasFirebaseConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
].every(Boolean)

let app = null
let db = null
let auth = null
let googleProvider = null
let analytics = null

const initializeAnalyticsIfSupported = async (firebaseApp, measurementId) => {
  if (import.meta.env.DEV) return
  if (!measurementId || typeof window === 'undefined') return

  try {
    const supported = await isSupported()
    if (supported) {
      analytics = getAnalytics(firebaseApp)
    }
  } catch {
    analytics = null
  }
}

if (hasFirebaseConfig) {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  auth = getAuth(app)
  googleProvider = new GoogleAuthProvider()

  void initializeAnalyticsIfSupported(app, firebaseConfig.measurementId)
}

export { app, db, auth, googleProvider, analytics, hasFirebaseConfig }
