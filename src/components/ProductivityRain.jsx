import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'

const PARTICLE_COUNT = 36

function ProductivityRain() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        width: Math.random() > 0.65 ? 2 : 1,
        height: 6 + Math.random() * 6,
        duration: 5.5 + Math.random() * 4,
        delay: Math.random() * 5,
        opacity: 0.05 + Math.random() * 0.05,
      })),
    [],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute top-[-12%] rounded-full bg-white/10"
          style={{
            left: `${particle.left}%`,
            width: `${particle.width}px`,
            height: `${particle.height}px`,
            opacity: particle.opacity,
          }}
          animate={{ y: ['0vh', '118vh'], opacity: [particle.opacity, 0] }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}

export default memo(ProductivityRain)
