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
      <svg viewBox="0 0 280 280" className="h-52 w-52 -rotate-90 sm:h-64 sm:w-64 md:h-72 md:w-72 lg:h-80 lg:w-80">
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
          className="glass-panel timer-core flex h-[8.8rem] w-[8.8rem] items-center justify-center rounded-full border border-white/20 text-3xl font-semibold tracking-tight text-white shadow-[0_0_30px_rgba(100,200,255,0.2)] sm:h-40 sm:w-40 sm:text-4xl md:h-48 md:w-48 md:text-5xl lg:h-52 lg:w-52 lg:text-6xl"
          style={{ boxShadow: `0 0 30px rgba(100,200,255,0.2), 0 0 0 10px ${glowColor}` }}
        >
          {formatSeconds(remainingSeconds)}
        </div>
      </div>
    </motion.div>
  )
}

export default TimerCircle
