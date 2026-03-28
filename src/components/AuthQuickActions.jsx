import { logoutUser, signInWithGoogle } from '../services/authService'
import { usePomodoroStore } from '../store/usePomodoroStore'

function AuthQuickActions({ compact = false }) {
  const authUser = usePomodoroStore((state) => state.authUser)
  const setAuthUser = usePomodoroStore((state) => state.setAuthUser)
  const clearAuthUser = usePomodoroStore((state) => state.clearAuthUser)

  const handleLogin = async () => {
    try {
      console.info('[ui-auth] Login with Google clicked')
      const user = await signInWithGoogle()
      if (user) setAuthUser(user)
    } catch (error) {
      console.error('[ui-auth] Login with Google failed', error)
    }
  }

  const handleSwitchAccount = async () => {
    try {
      console.info('[ui-auth] Switch Account clicked')
      const user = await signInWithGoogle({ selectAccount: true })
      if (user) setAuthUser(user)
    } catch (error) {
      console.error('[ui-auth] Switch Account failed', error)
    }
  }

  const handleLogout = async () => {
    try {
      console.info('[ui-auth] Logout clicked')
      await logoutUser()
      clearAuthUser()
    } catch (error) {
      console.error('[ui-auth] Logout failed', error)
    }
  }

  if (!authUser) {
    return (
      <button type="button" onClick={handleLogin} className="glass-button text-xs">
        Login with Google
      </button>
    )
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'items-center'}`}>
      <button type="button" onClick={handleSwitchAccount} className="glass-button text-xs">
        Switch Account
      </button>
      <button type="button" onClick={handleLogout} className="glass-button text-xs">
        Logout
      </button>
    </div>
  )
}

export default AuthQuickActions
