import { motion } from 'framer-motion'
import { formatSeconds } from '../utils/time'

const RADIUS = 120
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function TimerCircle({ remainingSeconds, progress, accentColor = 'var(--accent)', glowColor = 'var(--accent-soft)' }) {
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  return (
    <motion.div
      animate={{ scale: [1, 1.015, 1] }}
      transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
      className="relative"
    >
      <svg viewBox="0 0 280 280" className="h-64 w-64 -rotate-90 md:h-80 md:w-80">
        <circle
          cx="140"
          cy="140"
          r={RADIUS}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="16"
          fill="transparent"
        />
        <circle
          cx="140"
          cy="140"
          r={RADIUS}
          stroke={accentColor}
          strokeWidth="18"
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-900 ease-linear"
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="glass-panel flex h-40 w-40 items-center justify-center rounded-full border border-white/20 text-4xl font-semibold tracking-tight text-white shadow-[0_0_30px_rgba(100,200,255,0.2)] md:h-52 md:w-52 md:text-6xl"
          style={{ boxShadow: `0 0 30px rgba(100,200,255,0.2), 0 0 0 10px ${glowColor}` }}
        >
          {formatSeconds(remainingSeconds)}
        </div>
      </div>
    </motion.div>
  )
}

export default TimerCircle
