import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  increment,
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
const MAX_FILE_BYTES = 15 * 1024 * 1024
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain']
const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.txt']
const CLOUDINARY_UPLOAD_ENDPOINT = 'https://api.cloudinary.com/v1_1'

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
const normalizeAnswer = (value) => String(value || '').trim().toLowerCase()

const ensureCreatorPermission = (groupData, creatorId) => {
  const ownerId = groupData?.groupSession?.creatorId || groupData?.adminId
  if (!ownerId || ownerId !== creatorId) {
    throw new Error('Only the session creator can perform this action.')
  }
}

const getFileKind = (type, name = '') => {
  if (type.startsWith('image/')) return 'image'
  if (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'pdf'
  if (type === 'text/plain' || name.toLowerCase().endsWith('.txt')) return 'text'
  return 'file'
}

const encodeCloudinaryPublicId = (publicId = '') =>
  String(publicId)
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')

const buildCloudinaryDeliveryUrl = ({ cloudName, resourceType, version, publicId, format }) => {
  const safeCloudName = String(cloudName || '').trim()
  const safePublicId = encodeCloudinaryPublicId(publicId)
  if (!safeCloudName || !safePublicId) return ''

  const versionPath = version ? `v${version}/` : ''
  const lowerPublicId = safePublicId.toLowerCase()
  const formatSuffix =
    resourceType === 'raw' && format && !lowerPublicId.endsWith(`.${String(format).toLowerCase()}`)
      ? `.${format}`
      : ''

  return `https://res.cloudinary.com/${encodeURIComponent(safeCloudName)}/${resourceType}/upload/${versionPath}${safePublicId}${formatSuffix}`
}

const sanitizeFileName = (value) => String(value || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')

const getCloudinaryConfig = () => {
  const cloudName = String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim().toLowerCase()
  const uploadPreset = String(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim()

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary upload is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.')
  }

  return { cloudName, uploadPreset }
}

const clearGroupSharedFiles = async ({ groupId }) => {
  const chatSnapshot = await getDocs(query(collection(db, 'groupMessages'), where('groupId', '==', groupId)))
  const fileRows = chatSnapshot.docs.filter((row) => Boolean(row.data()?.attachment))

  await Promise.allSettled(
    fileRows.map(async (row) => deleteDoc(row.ref)),
  )
}

export const uploadGroupFile = async ({ groupId, sessionId, user, file, onProgress }) => {
  ensureFirebase()
  const { cloudName, uploadPreset } = getCloudinaryConfig()

  if (!file) {
    throw new Error('No file selected.')
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File too large or unsupported.')
  }

  const mimeType = String(file.type || '').toLowerCase()
  const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw'
  const fileName = String(file.name || '').toLowerCase()
  const hasAllowedExtension = ALLOWED_FILE_EXTENSIONS.some((extension) => fileName.endsWith(extension))
  const hasAllowedMime = ALLOWED_FILE_TYPES.includes(mimeType)

  if (!hasAllowedMime && !hasAllowedExtension) {
    throw new Error('File too large or unsupported.')
  }

  const safeName = sanitizeFileName(file.name)
  const sessionFolder = sessionId || 'active'
  const publicId = `groupChatFiles/${groupId}/${sessionFolder}/${Date.now()}_${user.id}_${safeName}`
  const uploadUrl = `${CLOUDINARY_UPLOAD_ENDPOINT}/${encodeURIComponent(cloudName)}/${resourceType}/upload`

  if (onProgress) {
    onProgress(0)
  }

  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('upload_preset', uploadPreset)
    form.append('public_id', publicId)
    form.append('folder', `groupChatFiles/${groupId}/${sessionFolder}`)

    const request = new XMLHttpRequest()
    request.open('POST', uploadUrl)

    request.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return
      const percent = Math.round((event.loaded / event.total) * 100)
      onProgress(percent)
    }

    request.onerror = () => {
      reject(new Error('Upload failed due to network error.'))
    }

    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error('Cloudinary upload failed. Check preset and cloud name.'))
        return
      }

      try {
        const payload = JSON.parse(request.responseText)
        if (onProgress) {
          onProgress(100)
        }

        const deliveryUrl =
          buildCloudinaryDeliveryUrl({
            cloudName,
            resourceType,
            version: payload.version,
            publicId: payload.public_id,
            format: payload.format,
          }) || payload.secure_url

        resolve({
          name: file.name,
          size: file.size,
          mimeType,
          kind: getFileKind(mimeType, file.name),
          url: deliveryUrl,
          provider: 'cloudinary',
          publicId: payload.public_id,
          cloudName,
          resourceType,
          version: payload.version || null,
          format: payload.format || null,
        })
      } catch {
        reject(new Error('Cloudinary upload failed.'))
      }
    }

    request.send(form)
  })
}

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

  await clearGroupSharedFiles({ groupId })

  const groupRef = doc(db, 'groups', groupId)
  await updateDoc(groupRef, {
    groupSession: {
      status: 'ended',
      endedAt: new Date().toISOString(),
      quiz: {
        active: false,
        mode: 'open',
        question: null,
        currentResponder: null,
        scores: {},
        stats: {},
        names: {},
        responses: {},
        revealAnswer: false,
        lastResult: null,
      },
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

export const sendGroupMessage = async ({ groupId, user, message, clientId, attachment = null }) => {
  ensureFirebase()

  const userName = displayName(user)

  const text = String(message || '').trim()
  if (!text && !attachment) return

  const payload = {
    groupId,
    userId: user.id,
    name: userName,
    username: userName,
    type: 'user',
    text,
    createdAt: serverTimestamp(),
  }

  if (attachment) {
    payload.attachment = attachment
  }

  if (clientId) {
    payload.clientId = clientId
  }

  await addDoc(collection(db, 'groupMessages'), payload)
}

export const watchGroupMessages = (groupId, onData, onError) => {
  ensureFirebase()

  const chatQuery = query(collection(db, 'groupMessages'), where('groupId', '==', groupId))

  return onSnapshot(
    chatQuery,
    (snapshot) => {
      const rows = snapshot.docs
        .map((row) => ({
          id: row.id,
          ...row.data(),
          createdAt: toDate(row.data().createdAt),
        }))
        .sort((a, b) => {
          const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
          const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
          return timeA - timeB
        })

      onData(rows)
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

export const reactToGroupMessage = async ({ messageId, reactionKey, userId }) => {
  ensureFirebase()

  const allowed = ['like', 'love', 'fire']
  if (!allowed.includes(reactionKey)) {
    throw new Error('Unsupported reaction type.')
  }

  if (!userId) {
    throw new Error('User is required to react.')
  }

  const messageRef = doc(db, 'groupMessages', messageId)
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(messageRef)
    if (!snapshot.exists()) {
      throw new Error('Message not found.')
    }

    const payload = snapshot.data() || {}
    const reactionByUsers = payload.reactionByUsers || {}
    const previousReactionKey = reactionByUsers[userId] || null

    const reactions = payload.reactions || {}

    // Keep only one active reaction per user, but allow switching to another emoji.
    const nextReactions = { ...reactions }
    if (previousReactionKey && previousReactionKey !== reactionKey) {
      const previousCount = Number(nextReactions[previousReactionKey] || 0)
      nextReactions[previousReactionKey] = Math.max(0, previousCount - 1)
    }

    if (previousReactionKey !== reactionKey) {
      nextReactions[reactionKey] = Number(nextReactions[reactionKey] || 0) + 1
    }

    transaction.update(messageRef, {
      reactions: nextReactions,
      reactionByUsers: {
        ...reactionByUsers,
        [userId]: reactionKey,
      },
      updatedAt: serverTimestamp(),
    })
  })
}

export const setQuizAnswerMode = async ({ groupId, creatorId, mode }) => {
  ensureFirebase()

  const safeMode = mode === 'open' ? 'open' : 'selected'
  const groupRef = doc(db, 'groups', groupId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(groupRef)
    if (!snapshot.exists()) {
      throw new Error('Group not found.')
    }

    const groupData = snapshot.data()
    ensureCreatorPermission(groupData, creatorId)

    const quiz = groupData?.groupSession?.quiz || {}
    if (!quiz.active) {
      throw new Error('Quiz mode is not active.')
    }

    transaction.update(groupRef, {
      'groupSession.quiz': {
        ...quiz,
        mode: safeMode,
        currentResponder: safeMode === 'open' ? null : quiz.currentResponder || null,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: serverTimestamp(),
    })
  })
}

export const startQuizMode = async ({ groupId, creatorId }) => {
  ensureFirebase()

  const groupRef = doc(db, 'groups', groupId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(groupRef)
    if (!snapshot.exists()) {
      throw new Error('Group not found.')
    }

    const groupData = snapshot.data()
    ensureCreatorPermission(groupData, creatorId)

    const previousQuiz = groupData?.groupSession?.quiz || {}
    transaction.update(groupRef, {
      'groupSession.quiz': {
        active: true,
        mode: 'open',
        question: null,
        currentResponder: null,
        scores: {},
        stats: {},
        names: {},
        responses: {},
        revealAnswer: false,
        lastResult: null,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: serverTimestamp(),
    })
  })
}

export const stopQuizMode = async ({ groupId, creatorId }) => {
  ensureFirebase()

  const groupRef = doc(db, 'groups', groupId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(groupRef)
    if (!snapshot.exists()) {
      throw new Error('Group not found.')
    }

    const groupData = snapshot.data()
    ensureCreatorPermission(groupData, creatorId)
    transaction.update(groupRef, {
      'groupSession.quiz': {
        active: false,
        mode: 'open',
        question: null,
        currentResponder: null,
        scores: {},
        stats: {},
        names: {},
        responses: {},
        revealAnswer: false,
        lastResult: null,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: serverTimestamp(),
    })
  })
}

export const setQuizQuestion = async ({ groupId, creatorId, prompt, answer, options = [], timerSeconds = 15 }) => {
  ensureFirebase()

  const cleanPrompt = String(prompt || '').trim().slice(0, 240)
  const cleanAnswer = String(answer || '').trim().slice(0, 120)

  if (!cleanPrompt || !cleanAnswer) {
    throw new Error('Question and answer are required.')
  }

  const groupRef = doc(db, 'groups', groupId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(groupRef)
    if (!snapshot.exists()) {
      throw new Error('Group not found.')
    }

    const groupData = snapshot.data()
    ensureCreatorPermission(groupData, creatorId)

    const quiz = groupData?.groupSession?.quiz || {}
    if (!quiz.active) {
      throw new Error('Quiz mode is not active.')
    }

    transaction.update(groupRef, {
      'groupSession.quiz': {
        ...quiz,
        mode: 'open',
        question: {
          prompt: cleanPrompt,
          answer: cleanAnswer,
          createdAt: new Date().toISOString(),
        },
        responses: {},
        revealAnswer: false,
        lastResult: null,
        currentResponder: null,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: serverTimestamp(),
    })
  })
}

export const setQuizResponder = async ({ groupId, creatorId, userId, name }) => {
  ensureFirebase()

  const groupRef = doc(db, 'groups', groupId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(groupRef)
    if (!snapshot.exists()) {
      throw new Error('Group not found.')
    }

    const groupData = snapshot.data()
    ensureCreatorPermission(groupData, creatorId)

    const quiz = groupData?.groupSession?.quiz || {}
    if (!quiz.active) {
      throw new Error('Quiz mode is not active.')
    }

    transaction.update(groupRef, {
      'groupSession.quiz': {
        ...quiz,
        currentResponder: {
          userId,
          name: String(name || 'User'),
        },
        updatedAt: new Date().toISOString(),
      },
      updatedAt: serverTimestamp(),
    })
  })
}

export const submitQuizAnswer = async ({ groupId, userId, name, answer }) => {
  ensureFirebase()

  const groupRef = doc(db, 'groups', groupId)
  const answerText = String(answer || '').trim().slice(0, 240)
  if (!answerText) {
    throw new Error('Answer cannot be empty.')
  }

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(groupRef)
    if (!snapshot.exists()) {
      throw new Error('Group not found.')
    }

    const groupData = snapshot.data()
    const quiz = groupData?.groupSession?.quiz || {}

    if (!quiz.active) {
      throw new Error('Quiz mode is not active.')
    }

    const question = quiz?.question || {}
    if (!question?.prompt) {
      throw new Error('No active question.')
    }

    const deadlineAt = question?.deadlineAt ? new Date(question.deadlineAt).getTime() : null
    if (deadlineAt && Date.now() > deadlineAt) {
      throw new Error('Time is up for this question.')
    }

    const responses = { ...(quiz.responses || {}) }
    if (responses[userId]?.questionCreatedAt === question.createdAt) {
      throw new Error('You already answered this question.')
    }

    const expected = normalizeAnswer(question?.answer)
    const provided = normalizeAnswer(answerText)
    const isCorrect = Boolean(expected) && expected === provided

    const scores = { ...(quiz.scores || {}) }
    const stats = { ...(quiz.stats || {}) }
    const names = { ...(quiz.names || {}) }
    names[userId] = String(name || 'User')
    responses[userId] = {
      answer: answerText,
      isCorrect,
      at: new Date().toISOString(),
      questionCreatedAt: question.createdAt,
    }

    if (isCorrect) {
      scores[userId] = (scores[userId] || 0) + 1
    }

    const previousStats = stats[userId] || { correct: 0, wrong: 0 }
    stats[userId] = {
      correct: (previousStats.correct || 0) + (isCorrect ? 1 : 0),
      wrong: (previousStats.wrong || 0) + (isCorrect ? 0 : 1),
    }

    transaction.update(groupRef, {
      'groupSession.quiz': {
        ...quiz,
        mode: 'open',
        scores,
        stats,
        names,
        responses,
        currentResponder: null,
        lastResult: {
          userId,
          name: String(name || 'User'),
          answer: answerText,
          correctAnswer: question.answer,
          questionCreatedAt: question.createdAt,
          isCorrect,
          at: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      },
      updatedAt: serverTimestamp(),
    })
  })
}
