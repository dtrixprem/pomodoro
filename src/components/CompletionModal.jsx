import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'

const COMPLETION_LINES = [
  "You finished. That's discipline.",
  'You kept your word to yourself.',
  "Well done. Most people wouldn't.",
  'This is how progress is built.',
]

function CompletionModal({ open, streak, xp, onClose, onStartAnother }) {
  const messageLine = useMemo(
    () => COMPLETION_LINES[Math.floor(Math.random() * COMPLETION_LINES.length)],
    [open],
  )

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 16, scale: 0.94 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 10, scale: 0.95 }}
            className="glass-panel w-full max-w-lg rounded-3xl p-5 sm:p-7"
          >
            <h3 className="text-xl font-semibold text-center leading-relaxed text-white sm:text-2xl">{messageLine}</h3>
            <p className="mt-3 text-sm text-center leading-relaxed text-white">This is how progress is built.</p>

            <div className="mt-6 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl border border-white/20 bg-white/8 p-4 backdrop-blur-2xl">
                <p className="text-xs uppercase tracking-wide text-white/75">Streak</p>
                <p className="mt-1 text-2xl font-bold text-white">{streak}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/8 p-4 backdrop-blur-2xl">
                <p className="text-xs uppercase tracking-wide text-white/75">XP</p>
                <p className="mt-1 text-2xl font-bold text-white">{xp}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onStartAnother}
                className="flex-1 rounded-full bg-linear-to-r from-purple-300 to-indigo-300 px-4 py-2.5 text-sm font-semibold text-black transition hover:scale-105"
              >
                Start Another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="glass-button flex-1 text-sm"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default CompletionModal
