import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { MOTIVATION_LINES } from '../constants/motivation'
import { AMBIENT_SOUNDS } from '../constants/sounds'
import { STAGE } from '../constants/stages'
import {
  completeGroupSession,
  createGroup,
  endGroupSession,
  getInviteLink,
  joinSessionPresence,
  joinGroup,
  leaveSessionPresence,
  startGroupSession,
} from '../services/groupService'
import { clampProgress, getStageByProgress } from '../utils/stage'
import { secondsFromMinutes } from '../utils/time'

const DEFAULT_MINUTES = 25
const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_SOUND_ID = 'rain'

const createUserId = () => {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const fallback = Math.floor(Math.random() * 100000)
  return `user_${Date.now()}_${fallback}`
}

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
      activeView: 'setup',
      userProfile: {
        id: createUserId(),
        name: '',
      },
      currentGroupId: '',
      currentGroupName: '',
      inviteLink: '',
      collaborationError: '',
      collaborationStatus: 'idle',
      sessionMode: 'solo',
      currentGroupSessionId: '',
      isGroupCreator: false,
      groupActiveUsers: [],
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

      setUserName: (name) => {
        const nextName = String(name || '').slice(0, 24)
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            id: state.userProfile?.id || createUserId(),
            name: nextName,
          },
          collaborationError: '',
        }))
      },

      // Backward compatibility for existing calls while moving to name-based identity.
      setUsername: (name) => get().setUserName(name),

      goToSetup: () => set({ activeView: 'setup' }),

      goToGroupDashboard: () => set({ activeView: 'group' }),

      setGroupActiveUsers: (activeUsers) => set({ groupActiveUsers: activeUsers }),

      createStudyGroup: async (groupName, options = {}) => {
        const { openDashboard = true } = options
        const trimmedName = String(groupName || '').trim().slice(0, 40)
        if (!trimmedName) return null

        const { userProfile } = get()
        if (!String(userProfile?.name || '').trim()) {
          set({
            collaborationStatus: 'error',
            collaborationError: 'Please enter your name to continue.',
          })
          return null
        }

        set({ collaborationStatus: 'working', collaborationError: '' })

        try {
          const result = await createGroup({ name: trimmedName, admin: userProfile })
          set({
            currentGroupId: result.id,
            currentGroupName: trimmedName,
            inviteLink: result.inviteLink,
            isGroupCreator: true,
            activeView: openDashboard ? 'group' : get().activeView,
            collaborationStatus: 'success',
          })
          return result
        } catch (error) {
          set({
            collaborationStatus: 'error',
            collaborationError: error?.message || 'Could not create group.',
          })
          return null
        }
      },

      joinStudyGroup: async (groupCodeOrLink, options = {}) => {
        const { openDashboard = true } = options
        const rawValue = String(groupCodeOrLink || '').trim()
        if (!rawValue) return null

        const resolvedCode = rawValue.includes('group=')
          ? new URL(rawValue, window.location.origin).searchParams.get('group') || ''
          : rawValue

        const groupId = resolvedCode.toUpperCase()
        if (!groupId) return null

        const { userProfile } = get()
        if (!String(userProfile?.name || '').trim()) {
          set({
            collaborationStatus: 'error',
            collaborationError: 'Please enter your name to continue.',
          })
          return null
        }

        set({ collaborationStatus: 'working', collaborationError: '' })

        try {
          await joinGroup({ groupId, user: userProfile })
          set({
            currentGroupId: groupId,
            inviteLink: getInviteLink(groupId),
            isGroupCreator: false,
            activeView: openDashboard ? 'group' : get().activeView,
            collaborationStatus: 'success',
          })
          return groupId
        } catch (error) {
          set({
            collaborationStatus: 'error',
            collaborationError: error?.message || 'Could not join group.',
          })
          return null
        }
      },

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

      startSession: async ({ mode = 'solo', groupId = '' } = {}) => {
        const { totalSeconds, durationMinutes, currentGroupId, userProfile } = get()
        const resolvedGroupId = groupId || currentGroupId
        let groupSessionId = ''

        if (!String(userProfile?.name || '').trim()) {
          set({
            collaborationStatus: 'error',
            collaborationError: 'Please enter your name to continue.',
          })
          return
        }

        if (mode === 'group' && resolvedGroupId) {
          try {
            groupSessionId = await startGroupSession({
              groupId: resolvedGroupId,
              user: userProfile,
              durationMinutes,
            })

            await joinSessionPresence({
              groupId: resolvedGroupId,
              user: userProfile,
              sessionId: groupSessionId,
            })
          } catch (error) {
            set({ collaborationError: error?.message || 'Could not start group session.' })
          }
        }

        set({
          activeView: 'session',
          status: 'running',
          remainingSeconds: totalSeconds,
          progress: 0,
          stage: STAGE.IGNITION,
          motivationLine: pickRandomLine(STAGE.IGNITION),
          lastTickAt: Date.now(),
          showCompletion: false,
          sessionMode: mode,
          currentGroupSessionId: groupSessionId,
        })
      },

      pauseSession: () => set({ status: 'paused', lastTickAt: null }),
      resumeSession: () => set({ status: 'running', lastTickAt: Date.now() }),

      rotateMotivationLine: () => {
        const { stage, motivationLine } = get()
        set({ motivationLine: pickRandomLine(stage, motivationLine) })
      },

      quitSession: () => {
        const {
          totalSeconds,
          sessionMode,
          currentGroupId,
          userProfile,
        } = get()

        if (sessionMode === 'group' && currentGroupId) {
          leaveSessionPresence({
            groupId: currentGroupId,
            userId: userProfile.id,
          }).catch((error) => {
            set({ collaborationError: error?.message || 'Could not update participant status.' })
          })
        }

        set({
          activeView: 'setup',
          status: 'idle',
          remainingSeconds: totalSeconds,
          progress: 0,
          stage: STAGE.IGNITION,
          motivationLine: pickRandomLine(STAGE.IGNITION),
          lastTickAt: null,
          showCompletion: false,
          sessionMode: 'solo',
          currentGroupSessionId: '',
        })
      },

      endGroupSessionAsCreator: async () => {
        const { currentGroupId } = get()
        if (!currentGroupId) return

        try {
          await endGroupSession({ groupId: currentGroupId })
        } catch (error) {
          set({ collaborationError: error?.message || 'Could not end group session for everyone.' })
        }

        get().quitSession()
      },

      closeCompletion: () => set({ showCompletion: false }),

      completeSession: () => {
        let sessionPayload = null

        set((state) => {
          const streak = getStreakUpdate(state.lastCompletedAt, state.streak)
          const streakBonus = Math.max(0, streak - 1) * 5
          const earnedXp = 25 + streakBonus

          sessionPayload = {
            mode: state.sessionMode,
            groupId: state.currentGroupId,
            sessionId: state.currentGroupSessionId,
            durationMinutes: state.durationMinutes,
            user: state.userProfile,
            earnedXp,
          }

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

        if (
          sessionPayload &&
          sessionPayload.mode === 'group' &&
          sessionPayload.groupId &&
          sessionPayload.sessionId
        ) {
          completeGroupSession({
            groupId: sessionPayload.groupId,
            sessionId: sessionPayload.sessionId,
            user: sessionPayload.user,
            durationMinutes: sessionPayload.durationMinutes,
            xpEarned: sessionPayload.earnedXp,
          }).catch((error) => {
            set({ collaborationError: error?.message || 'Could not sync group leaderboard update.' })
          })
        }
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
        userProfile: state.userProfile,
        currentGroupId: state.currentGroupId,
        currentGroupName: state.currentGroupName,
        inviteLink: state.inviteLink,
        collaborationError: state.collaborationError,
        collaborationStatus: state.collaborationStatus,
        sessionMode: state.sessionMode,
        currentGroupSessionId: state.currentGroupSessionId,
        isGroupCreator: state.isGroupCreator,
      }),
      merge: (persistedState, currentState) => {
        const hydrated = { ...currentState, ...(persistedState || {}) }
        const persistedProfile = hydrated.userProfile || {}
        const nameFromLegacy = persistedProfile.name || persistedProfile.username || ''
        const isSessionStatus = ['running', 'paused', 'completed'].includes(hydrated.status)
        const nextActiveView = isSessionStatus
          ? 'session'
          : hydrated.activeView || 'setup'

        return {
          ...hydrated,
          activeView: nextActiveView,
          userProfile: {
            id: persistedProfile.id || createUserId(),
            name: String(nameFromLegacy || '').slice(0, 24),
          },
        }
      },
    },
  ),
)
