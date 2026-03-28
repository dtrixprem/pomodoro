import { useEffect } from 'react'
import GroupPage from './components/GroupPage'
import LandingScreen from './components/LandingScreen'
import ProfileMenu from './components/ProfileMenu'
import SessionView from './components/SessionView'
import TimeSetup from './components/TimeSetup'
import { useAmbientSound } from './hooks/useAmbientSound'
import { useTimerEngine } from './hooks/useTimerEngine'
import {
  completeRedirectSignIn,
  logoutUser,
  signInWithGoogle,
  watchAuthState,
} from './services/authService'
import { usePomodoroStore } from './store/usePomodoroStore'

function App() {
  const activeView = usePomodoroStore((state) => state.activeView)
  const authUser = usePomodoroStore((state) => state.authUser)
  const bootstrapUserProfile = usePomodoroStore((state) => state.bootstrapUserProfile)
  const setAuthUser = usePomodoroStore((state) => state.setAuthUser)
  const clearAuthUser = usePomodoroStore((state) => state.clearAuthUser)
  const joinStudyGroup = usePomodoroStore((state) => state.joinStudyGroup)

  useTimerEngine()
  useAmbientSound()

  useEffect(() => {
    bootstrapUserProfile()
  }, [bootstrapUserProfile])

  useEffect(() => {
    const unsubscribe = watchAuthState(
      (user) => {
        if (user) {
          console.info('[app-auth] auth state user -> setAuthUser', {
            uid: user.uid,
            email: user.email,
          })
          setAuthUser(user)
          bootstrapUserProfile()
        } else {
          console.info('[app-auth] auth state null -> clearAuthUser')
          clearAuthUser()
        }
      },
      (error) => console.error('[app-auth] watchAuthState error', error),
    )

    completeRedirectSignIn()
      .then(() => {
        console.info('[app-auth] redirect diagnostic complete')
      })
      .catch((error) => {
        console.error('[app-auth] redirect login error', error)
      })

    return () => unsubscribe()
  }, [bootstrapUserProfile, clearAuthUser, setAuthUser])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const groupFromQuery = params.get('group')
    const isJoinPath = window.location.pathname === '/join'

    if (!groupFromQuery) return

    joinStudyGroup(groupFromQuery)

    if (isJoinPath) {
      window.history.replaceState({}, '', '/')
    }
  }, [joinStudyGroup])

  const handleLogin = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error(error)
    }
  }

  const handleSwitchAccount = async () => {
    try {
      await signInWithGoogle({ selectAccount: true })
    } catch (error) {
      console.error(error)
    }
  }

  const handleLogout = async () => {
    try {
      await logoutUser()
      clearAuthUser()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute right-4 top-4 z-50 md:right-6 md:top-6">
        <ProfileMenu
          authUser={authUser}
          onLogin={handleLogin}
          onSwitchAccount={handleSwitchAccount}
          onLogout={handleLogout}
        />
      </div>
      <div className="min-h-screen">
        {activeView === 'landing' && <LandingScreen />}
        {activeView === 'setup' && <TimeSetup />}
        {activeView === 'session' && <SessionView />}
        {activeView === 'group' && <GroupPage />}
      </div>
    </main>
  )
}

export default App
