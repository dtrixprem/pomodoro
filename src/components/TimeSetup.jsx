import { motion } from 'framer-motion'
import { Howler } from 'howler'
import { useState } from 'react'
import SoundSelector from './SoundSelector'
import { usePomodoroStore } from '../store/usePomodoroStore'

const PRESETS = [25, 40, 60]

function TimeSetup() {
  const authUser = usePomodoroStore((state) => state.authUser)
  const goToLanding = usePomodoroStore((state) => state.goToLanding)
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

  const handleStartSession = async () => {
    let resolvedGroupId = currentGroupId

    if (sessionType === 'create-group') {
      const result = await createStudyGroup(groupName, { openDashboard: false })
      resolvedGroupId = result?.id || ''
    }

    if (sessionType === 'join-group') {
      const joinedGroup = await joinStudyGroup(joinCode, { openDashboard: false })
      resolvedGroupId = joinedGroup || ''
    }

    const mode = sessionType === 'solo' ? 'solo' : 'group'

    // Explicitly resume the WebAudio context after user click (browser autoplay policy).
    try {
      if (Howler.ctx?.state !== 'running') {
        await Howler.ctx?.resume()
      }
      console.log('[audio] user interaction unlocked audio context')
    } catch (error) {
      console.log('[audio] failed to unlock audio context', error)
    }

    console.log('[timer] start clicked: starting timer + ambient + bg music')
    await startSession({ mode, groupId: resolvedGroupId })
  }

  const backgroundImage = `url('${import.meta.env.BASE_URL}images/bgimg.png')`

  return (
    <section
      className={`theme-${selectedSound} relative flex h-screen items-center justify-center overflow-hidden bg-cover bg-center px-6 py-10`}
      style={{ backgroundImage }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <button
        type="button"
        onClick={goToLanding}
        aria-label="Back"
        className="glass-button absolute left-4 top-4 z-20 h-9 w-9 p-0 text-sm md:left-6 md:top-6"
      >
        <svg viewBox="0 0 20 20" fill="none" className="mx-auto h-4 w-4" aria-hidden="true">
          <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 grid w-full max-w-6xl gap-5 md:grid-cols-2"
      >
        <div className="glass-panel rounded-3xl p-8">
          <h2 className="text-3xl font-semibold text-purple-200">Set your focus time</h2>
          <p className="mt-2 text-sm text-white/75">Choose a preset or fine-tune with the slider.</p>

          <div className="mt-6 flex gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDurationMinutes(preset)}
                className={`glass-button text-sm ${
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

        <div className="glass-panel rounded-3xl p-8">
          <h3 className="text-2xl font-semibold text-white">Session Type</h3>
          <p className="mt-2 text-sm text-white/75">Choose how you want to focus today.</p>

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
              disabled={!authUser && sessionType !== 'solo'}
              className="cta-button w-full text-sm"
            >
              {sessionType === 'solo'
                ? 'Start Solo Session'
                : sessionType === 'create-group'
                  ? 'Create and Start Group Session'
                  : 'Join and Start Group Session'}
            </button>
          </div>

          {!authUser && sessionType !== 'solo' && (
            <p className="mt-3 text-sm text-amber-100">
              Login with Google from the top-right profile button to use group sessions.
            </p>
          )}

          {collaborationError && <p className="mt-4 text-sm text-rose-200">{collaborationError}</p>}
        </div>
      </motion.div>
    </section>
  )
}

export default TimeSetup
