import { AnimatePresence, motion } from 'framer-motion'

function CompletionModal({ open, streak, xp, onClose, onStartAnother }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 16, scale: 0.94 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 10, scale: 0.95 }}
            className="glass-panel w-full max-w-lg rounded-3xl p-7"
          >
            <h3 className="text-2xl font-semibold text-purple-200">Most people give up. You didn’t.</h3>
            <p className="mt-3 text-sm text-white/75">You kept a promise to yourself.</p>
            <p className="mt-1 text-sm text-white/75">That’s discipline. That’s rare.</p>

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

            <div className="mt-6 flex gap-3">
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
