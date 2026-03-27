import { motion } from 'framer-motion'

function AmbientMotionLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute left-[8%] top-[12%] h-40 w-40 rounded-full bg-white/12 blur-3xl"
        animate={{ y: [0, -6, 0], x: [0, 4, 0], opacity: [0.12, 0.18, 0.12] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[8%] top-[74%] h-44 w-44 rounded-full bg-indigo-200/10 blur-3xl"
        animate={{ y: [0, 7, 0], x: [0, -5, 0], opacity: [0.1, 0.16, 0.1] }}
        transition={{ duration: 23, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

export default AmbientMotionLayer
