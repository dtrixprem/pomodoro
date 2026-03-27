import LandingScreen from './components/LandingScreen'
import SessionView from './components/SessionView'
import TimeSetup from './components/TimeSetup'
import { useAmbientSound } from './hooks/useAmbientSound'
import { useTimerEngine } from './hooks/useTimerEngine'
import { usePomodoroStore } from './store/usePomodoroStore'

function App() {
  const activeView = usePomodoroStore((state) => state.activeView)

  useTimerEngine()
  useAmbientSound()

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="min-h-screen">
        {activeView === 'landing' && <LandingScreen />}
        {activeView === 'setup' && <TimeSetup />}
        {activeView === 'session' && <SessionView />}
      </div>
    </main>
  )
}

export default App
