import { useEffect } from 'react'
import GroupPage from './components/GroupPage'
import LandingScreen from './components/LandingScreen'
import SessionView from './components/SessionView'
import TimeSetup from './components/TimeSetup'
import { useAmbientSound } from './hooks/useAmbientSound'
import { useTimerEngine } from './hooks/useTimerEngine'
import { usePomodoroStore } from './store/usePomodoroStore'

function App() {
  const activeView = usePomodoroStore((state) => state.activeView)
  const bootstrapUserProfile = usePomodoroStore((state) => state.bootstrapUserProfile)
  const joinStudyGroup = usePomodoroStore((state) => state.joinStudyGroup)

  useTimerEngine()
  useAmbientSound()

  useEffect(() => {
    bootstrapUserProfile()
  }, [bootstrapUserProfile])

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

  return (
    <main className="relative min-h-screen overflow-hidden">
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
