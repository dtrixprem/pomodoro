import { AnimatePresence, motion } from 'framer-motion'

function ConfirmationModal({ open, progressLabel, onContinue, onQuit }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6 backdrop-blur-lg"
        >
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            className="glass-panel w-full max-w-md space-y-4 rounded-xl p-6"
          >
            <h3 className="text-xl font-semibold text-white">You’re already {progressLabel} in.</h3>
            <p className="text-sm text-white/80">
              Stopping now will feel worse than finishing.
            </p>
            <div className="flex gap-3">
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
