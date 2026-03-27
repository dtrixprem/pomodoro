import { AnimatePresence, motion } from 'framer-motion'
import { STAGE_META } from '../constants/stages'

function StageFeedback({ stage, motivationLine }) {
  const stageMeta = STAGE_META[stage]

  return (
    <div className="glass-panel rounded-3xl p-6 text-center">
      <span className="inline-flex rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-900">
        {stageMeta.label}
      </span>
      <p className="mt-3 text-base font-medium text-purple-950">{stageMeta.message}</p>

      <AnimatePresence mode="wait">
        <motion.p
          key={motivationLine}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="mt-4 text-sm text-purple-900/85"
        >
          {motivationLine}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

export default StageFeedback
