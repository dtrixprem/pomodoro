import { motion } from 'framer-motion'
import { Howler } from 'howler'
import SoundSelector from './SoundSelector'
import { usePomodoroStore } from '../store/usePomodoroStore'

const PRESETS = [25, 40, 60]

function TimeSetup() {
  const durationMinutes = usePomodoroStore((state) => state.durationMinutes)
  const currentGroupId = usePomodoroStore((state) => state.currentGroupId)
  const setDurationMinutes = usePomodoroStore((state) => state.setDurationMinutes)
  const startSession = usePomodoroStore((state) => state.startSession)
  const goToGroupDashboard = usePomodoroStore((state) => state.goToGroupDashboard)
  const selectedSound = usePomodoroStore((state) => state.selectedSound)

  const handleStartSession = async (mode = 'solo') => {
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
    await startSession({ mode, groupId: currentGroupId })
  }

  return (
    <section className={`theme-${selectedSound} animated-gradient relative flex h-screen items-center justify-center overflow-hidden px-6 py-10`}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(242,233,158,0.1),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 grid w-full max-w-4xl gap-5 md:grid-cols-2"
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

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleStartSession('solo')}
              className="cta-button text-sm"
            >
              Start Solo
            </button>
            <button
              type="button"
              onClick={() => handleStartSession('group')}
              disabled={!currentGroupId}
              className="glass-button text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start Group Session
            </button>
          </div>

          {!currentGroupId && (
            <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-3">
              <p className="text-sm text-white/80">Join or create a study group to sync sessions.</p>
              <button
                type="button"
                onClick={goToGroupDashboard}
                className="glass-button mt-2 text-xs"
              >
                Open Group Dashboard
              </button>
            </div>
          )}
        </div>

        <SoundSelector />
      </motion.div>
    </section>
  )
}

export default TimeSetup
