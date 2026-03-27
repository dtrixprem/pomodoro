import { useEffect } from 'react'
import { usePomodoroStore } from '../store/usePomodoroStore'

export const useTimerEngine = () => {
  const status = usePomodoroStore((state) => state.status)
  const tick = usePomodoroStore((state) => state.tick)
  const stage = usePomodoroStore((state) => state.stage)
  const reconcileElapsedTime = usePomodoroStore((state) => state.reconcileElapsedTime)
  const rotateMotivationLine = usePomodoroStore((state) => state.rotateMotivationLine)

  // On first load, calculate elapsed wall-clock time to preserve timer continuity after refresh.
  useEffect(() => {
    reconcileElapsedTime()
  }, [reconcileElapsedTime])

  useEffect(() => {
    if (status !== 'running') return undefined

    const timerId = window.setInterval(() => {
      tick(1)
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [status, tick])

  // Rotate motivational lines while staying in the same stage to keep feedback fresh.
  useEffect(() => {
    if (status !== 'running') return undefined

    const motivationId = window.setInterval(() => {
      rotateMotivationLine()
    }, 18000)

    return () => window.clearInterval(motivationId)
  }, [status, stage, rotateMotivationLine])
}
