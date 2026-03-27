import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { MOTIVATION_LINES } from '../constants/motivation'
import { AMBIENT_SOUNDS } from '../constants/sounds'
import { STAGE } from '../constants/stages'
import { clampProgress, getStageByProgress } from '../utils/stage'
import { secondsFromMinutes } from '../utils/time'

const DEFAULT_MINUTES = 25
const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_SOUND_ID = 'rain'

const sanitizeSoundId = (soundId) => {
  if (AMBIENT_SOUNDS.some((sound) => sound.id === soundId)) {
    return soundId
  }

  // Backward compatibility with previously persisted value.
  if (soundId === 'fireplace') {
    return 'fire'
  }

  return DEFAULT_SOUND_ID
}

const pickRandomLine = (stage, currentLine = '') => {
  const lines = MOTIVATION_LINES[stage]
  if (!lines?.length) return ''

  const choices = lines.filter((line) => line !== currentLine)
  const source = choices.length ? choices : lines

  return source[Math.floor(Math.random() * source.length)]
}

const getStreakUpdate = (lastCompletedAt, currentStreak) => {
  if (!lastCompletedAt) return 1

  const now = new Date()
  const last = new Date(lastCompletedAt)

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime()

  if (today === lastDay) return currentStreak
  if (today - lastDay === DAY_MS) return currentStreak + 1
  return 1
}

export const usePomodoroStore = create(
  persist(
    (set, get) => ({
      activeView: 'landing',
      durationMinutes: DEFAULT_MINUTES,
      totalSeconds: secondsFromMinutes(DEFAULT_MINUTES),
      remainingSeconds: secondsFromMinutes(DEFAULT_MINUTES),
      progress: 0,
      stage: STAGE.IGNITION,
      status: 'idle',
      selectedSound: DEFAULT_SOUND_ID,
      soundEnabled: true,
      bgMusicEnabled: true,
      volume: 0.5,
      streak: 0,
      xp: 0,
      lastCompletedAt: null,
      motivationLine: pickRandomLine(STAGE.IGNITION),
      lastTickAt: null,
      showCompletion: false,

      goToSetup: () => set({ activeView: 'setup' }),

      setDurationMinutes: (minutes) => {
        const safeMinutes = Number.isFinite(minutes)
          ? Math.min(120, Math.max(5, Math.round(minutes)))
          : DEFAULT_MINUTES
        const totalSeconds = secondsFromMinutes(safeMinutes)

        set((state) => ({
          durationMinutes: safeMinutes,
          totalSeconds,
          remainingSeconds:
            state.status === 'running' || state.status === 'paused'
              ? state.remainingSeconds
              : totalSeconds,
        }))
      },

      setSelectedSound: (soundId) => set({ selectedSound: sanitizeSoundId(soundId) }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleBackgroundMusic: () => set((state) => ({ bgMusicEnabled: !state.bgMusicEnabled })),
      setVolume: (value) => set({ volume: Math.min(0.6, Math.max(0.4, value)) }),

      startSession: () => {
        const { totalSeconds } = get()
        set({
          activeView: 'session',
          status: 'running',
          remainingSeconds: totalSeconds,
          progress: 0,
          stage: STAGE.IGNITION,
          motivationLine: pickRandomLine(STAGE.IGNITION),
          lastTickAt: Date.now(),
          showCompletion: false,
        })
      },

      pauseSession: () => set({ status: 'paused', lastTickAt: null }),
      resumeSession: () => set({ status: 'running', lastTickAt: Date.now() }),

      rotateMotivationLine: () => {
        const { stage, motivationLine } = get()
        set({ motivationLine: pickRandomLine(stage, motivationLine) })
      },

      quitSession: () => {
        const { totalSeconds } = get()
        set({
          activeView: 'setup',
          status: 'idle',
          remainingSeconds: totalSeconds,
          progress: 0,
          stage: STAGE.IGNITION,
          motivationLine: pickRandomLine(STAGE.IGNITION),
          lastTickAt: null,
          showCompletion: false,
        })
      },

      closeCompletion: () => set({ showCompletion: false }),

      completeSession: () => {
        set((state) => {
          const streak = getStreakUpdate(state.lastCompletedAt, state.streak)
          const earnedXp = state.durationMinutes * 10

          return {
            status: 'completed',
            progress: 1,
            remainingSeconds: 0,
            stage: STAGE.FINAL,
            motivationLine: pickRandomLine(STAGE.FINAL),
            lastTickAt: null,
            showCompletion: true,
            streak,
            xp: state.xp + earnedXp,
            lastCompletedAt: new Date().toISOString(),
          }
        })
      },

      tick: (deltaSeconds = 1) => {
        const { status, totalSeconds, remainingSeconds, completeSession } = get()
        if (status !== 'running') return

        const nextRemaining = Math.max(0, remainingSeconds - deltaSeconds)
        const nextProgress = clampProgress((totalSeconds - nextRemaining) / totalSeconds)
        const nextStage = getStageByProgress(nextProgress)

        set((state) => ({
          remainingSeconds: nextRemaining,
          progress: nextProgress,
          stage: nextStage,
          motivationLine:
            state.stage !== nextStage
              ? pickRandomLine(nextStage, state.motivationLine)
              : state.motivationLine,
          lastTickAt: Date.now(),
        }))

        if (nextRemaining === 0) {
          completeSession()
        }
      },

      reconcileElapsedTime: () => {
        const { status, lastTickAt, tick } = get()
        if (status !== 'running' || !lastTickAt) return

        const elapsedSeconds = Math.floor((Date.now() - lastTickAt) / 1000)
        if (elapsedSeconds > 0) {
          tick(elapsedSeconds)
        }
      },
    }),
    {
      name: 'adaptive-pomodoro-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeView: state.activeView,
        durationMinutes: state.durationMinutes,
        totalSeconds: state.totalSeconds,
        remainingSeconds: state.remainingSeconds,
        progress: state.progress,
        stage: state.stage,
        status: state.status,
        selectedSound: state.selectedSound,
        soundEnabled: state.soundEnabled,
        bgMusicEnabled: state.bgMusicEnabled,
        volume: state.volume,
        streak: state.streak,
        xp: state.xp,
        lastCompletedAt: state.lastCompletedAt,
        motivationLine: state.motivationLine,
        lastTickAt: state.lastTickAt,
        showCompletion: state.showCompletion,
      }),
    },
  ),
)
