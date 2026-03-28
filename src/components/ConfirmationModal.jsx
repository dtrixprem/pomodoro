import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'

const EARLY_EXIT_LINES = [
  "You're already this far in. Don't quit now.",
  'Stopping now will feel worse than finishing.',
  "Stay. You're closer than you think.",
]

function ConfirmationModal({ open, progressLabel, onContinue, onQuit }) {
  const warningLine = useMemo(
    () => EARLY_EXIT_LINES[Math.floor(Math.random() * EARLY_EXIT_LINES.length)],
    [open],
  )

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-lg"
        >
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            className="glass-panel w-full max-w-md space-y-4 rounded-xl p-5 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-center leading-relaxed text-white sm:text-xl">You're already {progressLabel} in.</h3>
            <p className="text-sm text-center leading-relaxed text-white">
              {warningLine}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onContinue}
                className="flex-1 rounded-full bg-linear-to-r from-purple-300 to-indigo-300 px-4 py-2.5 text-sm font-semibold text-black transition hover:scale-105"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={onQuit}
                className="glass-button flex-1 text-sm"
              >
                Quit Anyway
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default ConfirmationModal
