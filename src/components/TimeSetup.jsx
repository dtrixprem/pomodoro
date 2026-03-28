import { motion } from 'framer-motion'
import { Howler } from 'howler'
import { useCallback, useState } from 'react'
import ProductivityRain from './ProductivityRain'
import SoundSelector from './SoundSelector'
import { usePomodoroStore } from '../store/usePomodoroStore'

const PRESETS = [25, 40, 60]

function TimeSetup() {
  const userProfile = usePomodoroStore((state) => state.userProfile)
  const setUserName = usePomodoroStore((state) => state.setUserName)
  const durationMinutes = usePomodoroStore((state) => state.durationMinutes)
  const currentGroupId = usePomodoroStore((state) => state.currentGroupId)
  const createStudyGroup = usePomodoroStore((state) => state.createStudyGroup)
  const joinStudyGroup = usePomodoroStore((state) => state.joinStudyGroup)
  const collaborationError = usePomodoroStore((state) => state.collaborationError)
  const setDurationMinutes = usePomodoroStore((state) => state.setDurationMinutes)
  const startSession = usePomodoroStore((state) => state.startSession)
  const selectedSound = usePomodoroStore((state) => state.selectedSound)
  const [sessionType, setSessionType] = useState('solo')
  const [groupName, setGroupName] = useState('Study Circle')
  const [joinCode, setJoinCode] = useState('')
  const [showNameWarning, setShowNameWarning] = useState(false)
  const [loading, setLoading] = useState(null)
  const [actionFeedback, setActionFeedback] = useState(null)

  const trimmedName = String(userProfile?.name || '').trim()
  const requiresGroupName = sessionType !== 'create-group' || String(groupName || '').trim()
  const requiresJoinCode = sessionType !== 'join-group' || String(joinCode || '').trim()
  const canStart = Boolean(trimmedName) && Boolean(requiresGroupName) && Boolean(requiresJoinCode)

  const showActionFeedback = useCallback((type, message) => {
    setActionFeedback({ type, message })
    window.setTimeout(() => setActionFeedback(null), 2600)
  }, [])

  const handleStartSession = async () => {
    if (!trimmedName) {
      setShowNameWarning(true)
      return
    }

    let resolvedGroupId = currentGroupId

    try {
      if (sessionType === 'create-group') {
        setLoading('create')
        const result = await createStudyGroup(groupName, { openDashboard: false })
        resolvedGroupId = result?.id || ''
        showActionFeedback(result ? 'success' : 'error', result ? 'Group created successfully.' : 'Something went wrong. Try again.')
      }

      if (sessionType === 'join-group') {
        setLoading('join')
        const joinedGroup = await joinStudyGroup(joinCode, { openDashboard: false })
        resolvedGroupId = joinedGroup || ''
        showActionFeedback(joinedGroup ? 'success' : 'error', joinedGroup ? 'Joined session.' : 'Something went wrong. Try again.')
      }

      const mode = sessionType === 'solo' ? 'solo' : 'group'
      setLoading('start')

      // Explicitly resume the WebAudio context after user click (browser autoplay policy).
      if (Howler.ctx?.state !== 'running') {
        await Howler.ctx?.resume()
      }
      console.log('[audio] user interaction unlocked audio context')

      console.log('[timer] start clicked: starting timer + ambient + bg music')
      await startSession({ mode, groupId: resolvedGroupId })
      showActionFeedback('success', 'Session started.')
    } catch (error) {
      console.log('[audio] failed to unlock audio context', error)
      showActionFeedback('error', 'Something went wrong. Try again.')
    } finally {
      setLoading(null)
    }
  }

  const backgroundImage = `url('${import.meta.env.BASE_URL}images/bgimg.png')`

  return (
    <section
      className={`theme-${selectedSound} relative flex min-h-dvh items-start justify-center overflow-x-hidden overflow-y-auto bg-cover bg-center px-3 py-4 sm:px-5 sm:py-8 lg:items-center`}
      style={{ backgroundImage }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="pointer-events-none absolute inset-0 z-1 opacity-70">
        <ProductivityRain />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 grid w-full max-w-7xl gap-4 md:grid-cols-2 md:gap-5 lg:gap-6"
      >
        <div className="glass-panel rounded-3xl p-4 sm:p-6 lg:p-8">
          <h2 className="text-2xl font-semibold text-purple-200 sm:text-3xl">Set your focus time</h2>
          <p className="mt-2 text-sm text-white/75">Choose a preset or fine-tune with the slider.</p>

          <div className="mt-6 flex flex-wrap gap-2.5 sm:gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDurationMinutes(preset)}
                className={`glass-button min-w-23 text-sm ${
                  durationMinutes === preset
                    ? 'border-white/35 bg-white/16 shadow-[0_0_14px_var(--accent-soft)]'
                    : 'text-white/85'
                }`}
              >
                {preset} min
              </button>
            ))}
          </div>

          <div className="mt-8">
            <label htmlFor="minutes" className="text-xs font-semibold uppercase tracking-wide text-white/75">
              Custom Minutes: {durationMinutes}
            </label>
            <input
              id="minutes"
              type="range"
              min="5"
              max="90"
              step="1"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
              className="mt-2 w-full accent-indigo-300"
            />
          </div>

          <div className="mt-8 rounded-2xl border border-white/15 bg-black/20 p-4">
            <SoundSelector embedded />
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-4 sm:p-6 lg:p-8">
          <h3 className="text-xl font-semibold text-white sm:text-2xl">Session Type</h3>
          <p className="mt-2 text-sm text-white/75">Choose how you want to focus today.</p>

          <div className="mt-5">
            <label className="text-xs uppercase tracking-wide text-white/70">Your Name</label>
            <input
              value={userProfile?.name || ''}
              onChange={(event) => {
                setUserName(event.target.value)
                if (event.target.value.trim()) {
                  setShowNameWarning(false)
                }
              }}
              className="mt-2 w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white"
              placeholder="Enter your name"
            />
          </div>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => setSessionType('solo')}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                sessionType === 'solo'
                  ? 'border-purple-200/60 bg-white/18 text-white'
                  : 'border-white/20 bg-black/20 text-white/85'
              }`}
            >
              <p className="font-semibold">Start Solo Session</p>
            </button>

            <button
              type="button"
              onClick={() => setSessionType('create-group')}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                sessionType === 'create-group'
                  ? 'border-purple-200/60 bg-white/18 text-white'
                  : 'border-white/20 bg-black/20 text-white/85'
              }`}
            >
              <p className="font-semibold">Create Group Session</p>
            </button>

            <button
              type="button"
              onClick={() => setSessionType('join-group')}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                sessionType === 'join-group'
                  ? 'border-purple-200/60 bg-white/18 text-white'
                  : 'border-white/20 bg-black/20 text-white/85'
              }`}
            >
              <p className="font-semibold">Join Group Session</p>
            </button>
          </div>

          {sessionType === 'create-group' && (
            <div className="mt-4">
              <label className="text-xs uppercase tracking-wide text-white/70">Group Name</label>
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white"
                placeholder="Exam Prep Team"
              />
            </div>
          )}

          {sessionType === 'join-group' && (
            <div className="mt-4">
              <label className="text-xs uppercase tracking-wide text-white/70">Invite Code</label>
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white"
                placeholder="ABC123"
              />
            </div>
          )}

          <div className="mt-8">
            <button
              type="button"
              onClick={handleStartSession}
              disabled={!canStart || Boolean(loading)}
              className="cta-button flex w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading && <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
              {loading === 'create'
                ? 'Creating...'
                : loading === 'join'
                  ? 'Joining...'
                  : loading === 'start'
                    ? 'Starting...'
                    : sessionType === 'solo'
                      ? 'Start Solo Session'
                      : sessionType === 'create-group'
                        ? 'Create and Start Group Session'
                        : 'Join and Start Group Session'}
            </button>
          </div>

          {actionFeedback && (
            <p
              className={`mt-3 text-sm transition-opacity duration-300 ${
                actionFeedback.type === 'error' ? 'text-rose-200' : 'text-white/70'
              }`}
            >
              {actionFeedback.message}
            </p>
          )}

          {!trimmedName && showNameWarning && (
            <p className="mt-3 text-sm text-amber-100">Please enter your name to continue.</p>
          )}

          {collaborationError && <p className="mt-4 text-sm text-rose-200">{collaborationError}</p>}
        </div>
      </motion.div>
    </section>
  )
}

export default TimeSetup
