import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

let authInteractionInFlight = false
let devHostWarned = false
let redirectDiagnosticsPromise = null
let redirectDiagnosticsDone = false

const REDIRECT_PENDING_KEY = 'pomodoro.auth.redirectPending'

const mapUser = (user) => {
  if (!user) return null

  return {
    uid: user.uid,
    name: user.displayName || 'User',
    email: user.email || '',
    photoURL: user.photoURL || '',
  }
}

const warnIfUsingLoopbackHost = () => {
  if (devHostWarned) return
  if (typeof window === 'undefined') return

  if (window.location.hostname === '127.0.0.1') {
    console.warn('================================================================================')
    console.warn('[auth][dev-warning] You are using 127.0.0.1. Use http://localhost instead.')
    console.warn('[auth][dev-warning] Firebase Auth may drop cookies/session crossing localhost and 127.0.0.1.')
    console.warn('================================================================================')
  }

  devHostWarned = true
}

export const watchAuthState = (onUser, onError) => {
  warnIfUsingLoopbackHost()

  if (!auth) {
    console.warn('[auth] watchAuthState: auth is not configured')
    onUser(null)
    return () => {}
  }

  console.info('[auth] watchAuthState: subscribing to Firebase auth state')

  return onAuthStateChanged(
    auth,
    (user) => {
      const mapped = mapUser(user)
      console.info('[auth] watchAuthState event:', mapped ? { uid: mapped.uid, email: mapped.email } : null)
      onUser(mapped)
    },
    onError,
  )
}

export const signInWithGoogle = async ({ selectAccount = false } = {}) => {
  warnIfUsingLoopbackHost()

  if (!auth || !googleProvider) {
    throw new Error('Firebase Auth is not configured.')
  }

  if (authInteractionInFlight) return
  authInteractionInFlight = true

  console.info('[auth] signInWithGoogle called', { selectAccount })

  if (selectAccount) {
    googleProvider.setCustomParameters({ prompt: 'select_account' })
  } else {
    googleProvider.setCustomParameters({})
  }

  try {
    try {
      window.sessionStorage.setItem(REDIRECT_PENDING_KEY, '1')
    } catch {
      // Ignore storage failures; redirect auth can still proceed.
    }

    console.info('[auth] starting redirect login...')
    await signInWithRedirect(auth, googleProvider)
  } finally {
    console.info('[auth] signInWithGoogle finished (redirect should continue flow)')
    authInteractionInFlight = false
  }
}

export const completeRedirectSignIn = async () => {
  warnIfUsingLoopbackHost()

  if (!auth) return

  if (redirectDiagnosticsDone) return
  if (redirectDiagnosticsPromise) {
    await redirectDiagnosticsPromise
    return
  }

  redirectDiagnosticsPromise = (async () => {
    let shouldCheckRedirect = true

    try {
      shouldCheckRedirect = window.sessionStorage.getItem(REDIRECT_PENDING_KEY) === '1'
    } catch {
      shouldCheckRedirect = true
    }

    if (!shouldCheckRedirect) {
      console.info('[auth] skipping redirect result check (no redirect pending flag)')
      return
    }

    console.info('[auth] checking redirect result...')
    try {
      const result = await getRedirectResult(auth)
      const mapped = mapUser(result?.user || null)
      console.info('[auth] redirect result:', mapped ? { uid: mapped.uid, email: mapped.email } : null)
    } catch (error) {
      const code = error?.code || ''
      const knownRedirectCodes = ['auth/web-storage-unsupported', 'auth/redirect-cancelled-by-user']

      if (knownRedirectCodes.includes(code)) {
        console.warn('[auth] redirect diagnostic warning:', code, error)
        return
      }

      console.error('[auth] redirect diagnostic error:', error)
    } finally {
      try {
        window.sessionStorage.removeItem(REDIRECT_PENDING_KEY)
      } catch {
        // Ignore storage failures.
      }
    }
  })()

  try {
    await redirectDiagnosticsPromise
  } finally {
    redirectDiagnosticsDone = true
    redirectDiagnosticsPromise = null
  }
}

export const logoutUser = async () => {
  if (!auth) return
  console.info('[auth] logoutUser called')
  await signOut(auth)
}
