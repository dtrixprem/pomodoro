import { motion } from 'framer-motion'
import { AMBIENT_SOUNDS } from '../constants/sounds'
import { usePomodoroStore } from '../store/usePomodoroStore'

function SoundSelector() {
  const selectedSound = usePomodoroStore((state) => state.selectedSound)
  const setSelectedSound = usePomodoroStore((state) => state.setSelectedSound)

  return (
    <div className="glass-panel rounded-3xl p-6">
      <h3 className="text-lg font-semibold text-purple-200">Ambience</h3>
      <p className="mt-1 text-sm text-white/75">Pick the vibe for this session.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        {AMBIENT_SOUNDS.map((sound) => (
          <motion.button
            type="button"
            key={sound.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelectedSound(sound.id)}
            className={`glass-button px-4 py-2 text-sm font-medium ${
              selectedSound === sound.id
                ? 'border-white/35 bg-white/16 text-purple-200 shadow-[0_0_14px_var(--accent-soft)]'
                : 'text-white/85'
            }`}
          >
            {sound.label}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export default SoundSelector
