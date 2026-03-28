import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, hasFirebaseConfig } from '../lib/firebase'

const GROUP_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const randomCode = (length = 6) => {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes)
    .map((byte) => GROUP_CODE_CHARS[byte % GROUP_CODE_CHARS.length])
    .join('')
}

const toDate = (value) => {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  return new Date(value)
}

const normalizeSession = (id, raw) => ({
  id,
  ...raw,
  startedAt: toDate(raw.startedAt),
  completedAt: toDate(raw.completedAt),
  createdAt: toDate(raw.createdAt),
  updatedAt: toDate(raw.updatedAt),
})

const makeGroupInviteLink = (groupId) => `${window.location.origin}/join?group=${groupId}`

const ensureFirebase = () => {
  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values to your environment.')
  }
}

const displayName = (user) => String(user?.name || user?.username || 'User').trim() || 'User'

const addSystemMessage = async (groupId, text) => {
  await addDoc(collection(db, 'groupMessages'), {
    groupId,
    type: 'system',
    text,
    createdAt: serverTimestamp(),
  })
}

export const createGroup = async ({ name, admin }) => {
  ensureFirebase()

  const adminName = displayName(admin)

  const groupId = randomCode(6)
  const groupRef = doc(db, 'groups', groupId)
  const userRef = doc(db, 'users', admin.id)

  await runTransaction(db, async (transaction) => {
    transaction.set(groupRef, {
      id: groupId,
      name,
      adminId: admin.id,
      members: [admin.id],
      sessions: [],
      leaderboard: [
        {
          userId: admin.id,
          name: adminName,
          username: adminName,
          totalFocusMinutes: 0,
          sessionsCompleted: 0,
          xp: 0,
          updatedAt: new Date().toISOString(),
        },
      ],
      groupSession: {
        status: 'idle',
        creatorId: admin.id,
        startedAt: null,
        endedAt: null,
        updatedAt: new Date().toISOString(),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    transaction.set(
      userRef,
      {
        id: admin.id,
        name: adminName,
        username: adminName,
        groupIds: arrayUnion(groupId),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  })

  return {
    id: groupId,
    inviteLink: makeGroupInviteLink(groupId),
  }
}

export const joinGroup = async ({ groupId, user }) => {
  ensureFirebase()

  const userName = displayName(user)

  const groupRef = doc(db, 'groups', groupId)
  const userRef = doc(db, 'users', user.id)

  await runTransaction(db, async (transaction) => {
    const groupSnapshot = await transaction.get(groupRef)
    if (!groupSnapshot.exists()) {
      throw new Error('Group not found. Check invite code and try again.')
    }

    const groupData = groupSnapshot.data()
    const members = groupData.members || []
    const leaderboard = groupData.leaderboard || []

    const hasMember = members.includes(user.id)
    const hasLeaderboardEntry = leaderboard.some((entry) => entry.userId === user.id)

    transaction.update(groupRef, {
      members: hasMember ? members : [...members, user.id],
      leaderboard: hasLeaderboardEntry
        ? leaderboard
        : [
            ...leaderboard,
            {
              userId: user.id,
              name: userName,
              username: userName,
              totalFocusMinutes: 0,
              sessionsCompleted: 0,
              xp: 0,
              updatedAt: new Date().toISOString(),
            },
          ],
      updatedAt: serverTimestamp(),
    })

    transaction.set(
      userRef,
      {
        id: user.id,
        name: userName,
        username: userName,
        groupIds: arrayUnion(groupId),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  })
}

export const watchGroup = (groupId, onData, onError) => {
  ensureFirebase()

  const groupRef = doc(db, 'groups', groupId)
  return onSnapshot(
    groupRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null)
        return
      }

      onData({ id: snapshot.id, ...snapshot.data() })
    },
    onError,
  )
}

export const watchGroupSessions = (groupId, onData, onError) => {
  ensureFirebase()

  const sessionsRef = collection(db, 'sessions')
  const sessionsQuery = query(
    sessionsRef,
    where('groupId', '==', groupId),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    sessionsQuery,
    (snapshot) => {
      const rows = snapshot.docs.map((row) => normalizeSession(row.id, row.data()))
      onData(rows)
    },
    onError,
  )
}

export const startGroupSession = async ({ groupId, user, durationMinutes }) => {
  ensureFirebase()

  const userName = displayName(user)

  const sessionRef = doc(collection(db, 'sessions'))
  const groupRef = doc(db, 'groups', groupId)

  await runTransaction(db, async (transaction) => {
    const groupSnapshot = await transaction.get(groupRef)
    if (!groupSnapshot.exists()) {
      throw new Error('Group not found for this session.')
    }

    transaction.set(sessionRef, {
      id: sessionRef.id,
      groupId,
      userId: user.id,
      name: userName,
      username: userName,
      durationMinutes,
      startedAt: serverTimestamp(),
      completedAt: null,
      status: 'running',
      xpEarned: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    const groupData = groupSnapshot.data()
    const currentSession = groupData.groupSession || {}

    transaction.update(groupRef, {
      sessions: arrayUnion(sessionRef.id),
      groupSession: {
        status: 'running',
        creatorId: currentSession.creatorId || user.id,
        startedAt: currentSession.startedAt || new Date().toISOString(),
        endedAt: null,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: serverTimestamp(),
    })
  })

  return sessionRef.id
}

export const endGroupSession = async ({ groupId }) => {
  ensureFirebase()

  const groupRef = doc(db, 'groups', groupId)
  await updateDoc(groupRef, {
    groupSession: {
      status: 'ended',
      endedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    updatedAt: serverTimestamp(),
  })
}

export const joinSessionPresence = async ({ groupId, user, sessionId }) => {
  ensureFirebase()

  const userName = displayName(user)

  const participantRef = doc(db, 'sessionParticipants', `${groupId}_${user.id}`)
  const existingSnapshot = await getDoc(participantRef)

  await setDoc(participantRef, {
    id: `${groupId}_${user.id}`,
    groupId,
    userId: user.id,
    name: userName,
    username: userName,
    sessionId,
    isActive: true,
    updatedAt: serverTimestamp(),
    joinedAt: serverTimestamp(),
  })

  if (!existingSnapshot.exists()) {
    await addSystemMessage(groupId, `${userName} joined the session`)
  }
}

export const leaveSessionPresence = async ({ groupId, userId }) => {
  ensureFirebase()

  const participantRef = doc(db, 'sessionParticipants', `${groupId}_${userId}`)
  const participantSnapshot = await getDoc(participantRef)
  const participantData = participantSnapshot.exists() ? participantSnapshot.data() : null

  await deleteDoc(participantRef)

  if (participantData?.name || participantData?.username) {
    await addSystemMessage(groupId, `${participantData.name || participantData.username} left the session`)
  }

  const participantsQuery = query(
    collection(db, 'sessionParticipants'),
    where('groupId', '==', groupId),
    where('isActive', '==', true),
    limit(1),
  )

  const remaining = await getDocs(participantsQuery)
  if (remaining.empty) {
    await endGroupSession({ groupId })
  }
}

export const watchSessionParticipants = (groupId, onData, onError) => {
  ensureFirebase()

  const participantQuery = query(
    collection(db, 'sessionParticipants'),
    where('groupId', '==', groupId),
    where('isActive', '==', true),
  )

  return onSnapshot(
    participantQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map((row) => ({
          id: row.id,
          ...row.data(),
        })),
      )
    },
    onError,
  )
}

export const sendGroupMessage = async ({ groupId, user, message }) => {
  ensureFirebase()

  const userName = displayName(user)

  const text = String(message || '').trim()
  if (!text) return

  await addDoc(collection(db, 'groupMessages'), {
    groupId,
    userId: user.id,
    name: userName,
    username: userName,
    type: 'user',
    text,
    createdAt: serverTimestamp(),
  })
}

export const watchGroupMessages = (groupId, onData, onError) => {
  ensureFirebase()

  const chatQuery = query(
    collection(db, 'groupMessages'),
    where('groupId', '==', groupId),
    orderBy('createdAt', 'asc'),
  )

  return onSnapshot(
    chatQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map((row) => ({
          id: row.id,
          ...row.data(),
          createdAt: toDate(row.data().createdAt),
        })),
      )
    },
    onError,
  )
}

export const completeGroupSession = async ({
  groupId,
  sessionId,
  user,
  durationMinutes,
  xpEarned,
}) => {
  ensureFirebase()

  const userName = displayName(user)

  const sessionRef = doc(db, 'sessions', sessionId)
  const groupRef = doc(db, 'groups', groupId)
  const userRef = doc(db, 'users', user.id)

  await runTransaction(db, async (transaction) => {
    const [groupSnapshot, userSnapshot, sessionSnapshot] = await Promise.all([
      transaction.get(groupRef),
      transaction.get(userRef),
      transaction.get(sessionRef),
    ])

    if (!groupSnapshot.exists()) {
      throw new Error('Group not found while completing session.')
    }

    if (!sessionSnapshot.exists()) {
      throw new Error('Session not found while completing session.')
    }

    const sessionData = sessionSnapshot.data()
    if (sessionData.status === 'completed') {
      return
    }

    const groupData = groupSnapshot.data()
    const leaderboard = groupData.leaderboard || []
    const entryIndex = leaderboard.findIndex((entry) => entry.userId === user.id)
    const baseEntry =
      entryIndex >= 0
        ? leaderboard[entryIndex]
        : {
            userId: user.id,
          name: userName,
          username: userName,
            totalFocusMinutes: 0,
            sessionsCompleted: 0,
            xp: 0,
          }

    const nextEntry = {
      ...baseEntry,
      name: userName,
      username: userName,
      totalFocusMinutes: (baseEntry.totalFocusMinutes || 0) + durationMinutes,
      sessionsCompleted: (baseEntry.sessionsCompleted || 0) + 1,
      xp: (baseEntry.xp || 0) + xpEarned,
      updatedAt: new Date().toISOString(),
    }

    const nextLeaderboard = [...leaderboard]
    if (entryIndex >= 0) {
      nextLeaderboard[entryIndex] = nextEntry
    } else {
      nextLeaderboard.push(nextEntry)
    }

    nextLeaderboard.sort((a, b) => b.totalFocusMinutes - a.totalFocusMinutes || b.xp - a.xp)

    const userData = userSnapshot.exists()
      ? userSnapshot.data()
      : {
          totalFocusMinutes: 0,
          sessionsCompleted: 0,
          xp: 0,
        }

    transaction.update(sessionRef, {
      status: 'completed',
      xpEarned,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    transaction.set(
      userRef,
      {
        id: user.id,
        name: userName,
        username: userName,
        totalFocusMinutes: (userData.totalFocusMinutes || 0) + durationMinutes,
        sessionsCompleted: (userData.sessionsCompleted || 0) + 1,
        xp: (userData.xp || 0) + xpEarned,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    transaction.update(groupRef, {
      leaderboard: nextLeaderboard,
      updatedAt: serverTimestamp(),
    })
  })
}

export const getInviteLink = (groupId) => makeGroupInviteLink(groupId)
