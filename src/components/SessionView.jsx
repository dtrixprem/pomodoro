import { useEffect, useMemo, useState } from 'react'
import Confetti from 'react-confetti'
import { motion } from 'framer-motion'
import AmbientMotionLayer from './AmbientMotionLayer'
import CompletionModal from './CompletionModal'
import ConfirmationModal from './ConfirmationModal'
import ProductivityRain from './ProductivityRain'
import ThemeVideoBackground from './ThemeVideoBackground'
import TimerCircle from './TimerCircle'
import { watchGroupSessions } from '../services/groupService'
import { usePomodoroStore } from '../store/usePomodoroStore'

function SessionView() {
  const remainingSeconds = usePomodoroStore((state) => state.remainingSeconds)
  const progress = usePomodoroStore((state) => state.progress)
  const status = usePomodoroStore((state) => state.status)
  const selectedSound = usePomodoroStore((state) => state.selectedSound)
  const motivationLine = usePomodoroStore((state) => state.motivationLine)
  const streak = usePomodoroStore((state) => state.streak)
  const xp = usePomodoroStore((state) => state.xp)
  const sessionMode = usePomodoroStore((state) => state.sessionMode)
  const currentGroupId = usePomodoroStore((state) => state.currentGroupId)
  const userProfile = usePomodoroStore((state) => state.userProfile)
  const showCompletion = usePomodoroStore((state) => state.showCompletion)
  const pauseSession = usePomodoroStore((state) => state.pauseSession)
  const resumeSession = usePomodoroStore((state) => state.resumeSession)
  const quitSession = usePomodoroStore((state) => state.quitSession)
  const closeCompletion = usePomodoroStore((state) => state.closeCompletion)

  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [activeUsers, setActiveUsers] = useState([])

  const progressLabel = useMemo(() => `${Math.round(progress * 100)}%`, [progress])
  const themeClass = `theme-${selectedSound}`

  useEffect(() => {
    if (sessionMode !== 'group' || !currentGroupId) {
      setActiveUsers([])
      return undefined
    }

    let unsubscribe = () => {}

    try {
      unsubscribe = watchGroupSessions(
        currentGroupId,
        (rows) => {
          const active = rows
            .filter((row) => row.status === 'running')
            .map((row) => ({ userId: row.userId, username: row.username }))

          const uniqueUsers = Array.from(new Map(active.map((user) => [user.userId, user])).values())
          setActiveUsers(uniqueUsers)
        },
        (error) => console.error(error),
      )
    } catch (error) {
      console.error(error)
      setActiveUsers([])
    }

    return () => unsubscribe()
  }, [currentGroupId, sessionMode])

  const activeCount = activeUsers.length
  const currentUserActive = activeUsers.some((user) => user.userId === userProfile.id)

  const handleTryQuit = () => {
    if (status === 'completed') {
      quitSession()
      return
    }
    setShowExitConfirm(true)
  }

  const handleQuitAnyway = () => {
    setShowExitConfirm(false)
    quitSession()
  }

  const handleStartAnother = () => {
    closeCompletion()
    quitSession()
  }

  return (
    <section className={`animated-gradient ${themeClass} relative h-screen overflow-hidden`}>
      <ThemeVideoBackground themeId={selectedSound} overlayClassName="bg-black/42 backdrop-blur-sm" />
      <AmbientMotionLayer />
      <ProductivityRain />

      {showCompletion && (
        <Confetti
          recycle={false}
          numberOfPieces={320}
          gravity={0.2}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      )}

      <div className="absolute inset-0 bg-black/22" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 h-screen overflow-hidden px-4 py-4 md:px-6 md:py-5"
      >
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-between overflow-hidden">
          <div className="glass-panel shrink-0 rounded-3xl border border-white/15 px-5 py-4 shadow-lg md:px-6 md:py-5">
            <p className="text-xs uppercase tracking-wide text-purple-200">Progress</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full transition-[width,background-color] duration-700"
                  style={{
                    width: progressLabel,
                    backgroundImage: 'linear-gradient(to right, #bfa4ff, #7f99ec)',
                  }}
                />
              </div>
              <p className="text-sm font-semibold text-purple-200">{progressLabel}</p>
            </div>
            <motion.p
              key={motivationLine}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-3 text-center text-lg text-white/80 md:text-xl"
            >
              {motivationLine}
            </motion.p>

            {sessionMode === 'group' && (
              <div className="mt-3 rounded-2xl border border-emerald-200/20 bg-emerald-300/8 px-3 py-2 text-sm text-emerald-100">
                <p>{activeCount} people focusing right now.</p>
                {!currentUserActive && <p className="mt-1 text-amber-100">{userProfile.username} is warming up...</p>}
                {activeCount >= 2 && <p className="mt-1">Most people in your group are still going.</p>}
              </div>
            )}
          </div>

          <div className="flex flex-1 items-center justify-center py-2 md:py-3">
            <TimerCircle
              remainingSeconds={remainingSeconds}
              progress={progress}
              accentColor="#b8a2ff"
              glowColor="var(--accent-soft)"
            />
          </div>

          <div className="glass-panel shrink-0 rounded-3xl border border-white/10 px-4 py-3 shadow-lg md:px-6 md:py-4">
            <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3">
              {status === 'running' ? (
                <button
                  type="button"
                  onClick={pauseSession}
                  className="glass-button text-sm"
                >
                  Pause
                </button>
              ) : status === 'paused' ? (
                <button
                  type="button"
                  onClick={resumeSession}
                  className="glass-button border-white/35 bg-white/16 text-sm shadow-[0_0_14px_var(--accent-soft)]"
                >
                  Resume
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleTryQuit}
                className="glass-button text-sm"
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <ConfirmationModal
        open={showExitConfirm}
        progressLabel={progressLabel}
        onContinue={() => setShowExitConfirm(false)}
        onQuit={handleQuitAnyway}
      />

      <CompletionModal
        open={showCompletion}
        streak={streak}
        xp={xp}
        onClose={closeCompletion}
        onStartAnother={handleStartAnother}
      />
    </section>
  )
}

export default SessionView
