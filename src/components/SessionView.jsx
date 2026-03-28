import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Confetti from 'react-confetti'
import { motion } from 'framer-motion'
import CompletionModal from './CompletionModal'
import ConfirmationModal from './ConfirmationModal'
import QuizModePanel from './QuizModePanel'
import ThemeVideoBackground from './ThemeVideoBackground'
import TimerCircle from './TimerCircle'
import {
  joinSessionPresence,
  reactToGroupMessage,
  sendGroupMessage,
  uploadGroupFile,
  watchGroup,
  watchGroupMessages,
  watchSessionParticipants,
} from '../services/groupService'
import { usePomodoroStore } from '../store/usePomodoroStore'

const REACTION_BUTTONS = [
  { key: 'like', label: '👍' },
  { key: 'love', label: '❤️' },
  { key: 'fire', label: '🔥' },
]

const withTimeout = (promise, timeoutMs, timeoutMessage) =>
  new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)

    promise
      .then((value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      })
  })

const initialsFromName = (value = '') => {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'U'
  return parts[0][0]?.toUpperCase() || 'U'
}

const formatFileSize = (value = 0) => {
  if (!Number.isFinite(value) || value <= 0) return '0 KB'
  const mb = value / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  return `${Math.max(1, Math.round(value / 1024))} KB`
}

const encodeCloudinaryPublicId = (publicId = '') =>
  String(publicId)
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')

const extractCloudNameFromUrl = (url = '') => {
  const match = String(url || '').match(/res\.cloudinary\.com\/([^/]+)/i)
  return match?.[1] ? String(match[1]).trim() : ''
}

const buildCloudinaryDeliveryUrl = ({ cloudName, resourceType, version, publicId, format }) => {
  const safeCloudName = String(cloudName || '').trim()
  const safePublicId = encodeCloudinaryPublicId(publicId)
  if (!safeCloudName || !safePublicId) return ''

  const normalizedResourceType = resourceType === 'image' ? 'image' : 'raw'
  const versionPath = version ? `v${version}/` : ''
  const lowerPublicId = safePublicId.toLowerCase()
  const formatSuffix =
    normalizedResourceType === 'raw' && format && !lowerPublicId.endsWith(`.${String(format).toLowerCase()}`)
      ? `.${format}`
      : ''

  return `https://res.cloudinary.com/${encodeURIComponent(safeCloudName)}/${normalizedResourceType}/upload/${versionPath}${safePublicId}${formatSuffix}`
}

const resolveAttachmentUrl = (file) => {
  const rawUrl = String(file?.url || '').trim()
  if (!rawUrl) return ''
  if (file?.provider !== 'cloudinary') return rawUrl

  const cloudName =
    String(file?.cloudName || '').trim().toLowerCase() ||
    extractCloudNameFromUrl(rawUrl).toLowerCase()
  const publicId = String(file?.publicId || '').trim()
  if (!cloudName || !publicId) return rawUrl

  const resourceType = file?.resourceType || (file?.kind === 'image' ? 'image' : 'raw')
  return (
    buildCloudinaryDeliveryUrl({
      cloudName,
      resourceType,
      version: file?.version,
      publicId,
      format: file?.format,
    }) || rawUrl
  )
}

const toForcedDownloadUrl = (url, fileName = 'file') => {
  const rawUrl = String(url || '').trim()
  if (!rawUrl) return ''

  // Cloudinary supports attachment delivery via `fl_attachment`.
  // Using bare `fl_attachment` is more compatible than filename-specific variants.
  if (rawUrl.includes('res.cloudinary.com') && rawUrl.includes('/upload/')) {
    return rawUrl.replace('/upload/', '/upload/fl_attachment/')
  }

  return rawUrl
}

const triggerDirectDownload = ({ url, fileName }) => {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName || 'download'
  anchor.target = '_blank'
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

const downloadFileAsBlob = async ({ url, fileName }) => {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'omit',
    mode: 'cors',
  })
  if (!response.ok) {
    throw new Error(`Download request failed with status ${response.status}.`)
  }

  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName || 'download'
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000)
}

const ParticipantsStrip = memo(function ParticipantsStrip({ activeUsers }) {
  if (activeUsers.length === 0) {
    return <p className="text-xs text-white/60">No active participants yet.</p>
  }

  return (
    <ul className="flex gap-2 overflow-x-auto pb-1">
      {activeUsers.map((participant) => (
        <li
          key={participant.userId}
          className="relative shrink-0"
          title={participant.name || participant.username || 'User'}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white">
            {initialsFromName(participant.name || participant.username || '')}
          </div>
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-400" />
        </li>
      ))}
    </ul>
  )
})

const ChatMessageItem = memo(function ChatMessageItem({ message, currentUserId, onReactToMessage, onDownloadFile, reactingMessageId }) {
  if (message.type === 'system') {
    return <p className="text-center text-[11px] text-white/60">{message.text}</p>
  }

  const file = message.attachment || null
  const fileUrl = resolveAttachmentUrl(file)
  const isImage = file?.kind === 'image'
  const hasFile = Boolean(fileUrl)
  const isOwnMessage = message.userId === currentUserId
  const reactions = message.reactions || {}
  const currentReaction = message?.reactionByUsers?.[currentUserId] || ''
  const canReact = Boolean(message.id) && !String(message.id).startsWith('local-')

  return (
    <div className={`flex min-w-0 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[82%] items-start gap-2 sm:max-w-[75%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white">
          {initialsFromName(message.name || message.username || '')}
        </div>
        <div className={`min-w-0 ${isOwnMessage ? 'text-right' : ''}`}>
          <p className="text-[11px] text-white/80">{isOwnMessage ? 'You' : message.name || message.username || 'User'}</p>

          {Boolean(message.text) && (
            <p
              className={`mt-1 wrap-break-word rounded-xl px-3 py-2 text-xs text-white/95 backdrop-blur-md ${
                isOwnMessage ? 'bg-white/15' : 'bg-white/10'
              }`}
            >
              {message.text}
            </p>
          )}

          {hasFile && (
            <div className={`mt-1 rounded-xl px-3 py-2 text-xs text-white/95 backdrop-blur-md ${isOwnMessage ? 'bg-white/15' : 'bg-white/10'}`}>
              {isImage ? (
                <a href={fileUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
                  <img
                    src={fileUrl}
                    alt={file.name || 'Shared image'}
                    className="max-h-38 w-full object-cover"
                    loading="lazy"
                  />
                </a>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15 text-base">
                    {file.kind === 'pdf' ? 'PDF' : file.kind === 'text' ? 'TXT' : 'FILE'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-white">{file.name || 'Shared file'}</p>
                    <p className="text-[11px] text-white/65">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              )}

              <div className={`mt-2 flex gap-2 ${isOwnMessage ? 'justify-end' : ''}`}>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] text-white transition hover:bg-white/20"
                >
                  View
                </a>
                <button
                  type="button"
                  onClick={() => onDownloadFile(file)}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] text-white transition hover:bg-white/20"
                >
                  Download
                </button>
              </div>
            </div>
          )}

          <div className={`mt-2 flex gap-1 ${isOwnMessage ? 'justify-end' : ''}`}>
            {REACTION_BUTTONS.map((reaction) => {
              const count = Number(reactions?.[reaction.key] || 0)
              const isSelected = currentReaction === reaction.key
              return (
                <button
                  key={`${message.id}-${reaction.key}`}
                  type="button"
                  onClick={() => onReactToMessage(message.id, reaction.key)}
                  disabled={!canReact || reactingMessageId === message.id}
                  className={`rounded-full border px-2 py-1 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-55 ${
                    isSelected
                      ? 'border-white/45 bg-white/20 text-white'
                      : 'border-white/20 bg-white/10 text-white/75 hover:bg-white/20'
                  }`}
                >
                  {reaction.label} {count > 0 ? count : ''}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
})

const ChatMessagesList = memo(function ChatMessagesList({ messages, currentUserId, onReactToMessage, onDownloadFile, reactingMessageId, chatEndRef }) {
  if (messages.length === 0) {
    return (
      <>
        <p className="text-xs text-white/60">No messages yet.</p>
        <div ref={chatEndRef} />
      </>
    )
  }

  return (
    <>
      {messages.map((message) => (
        <ChatMessageItem
          key={message.id}
          message={message}
          currentUserId={currentUserId}
          onReactToMessage={onReactToMessage}
          onDownloadFile={onDownloadFile}
          reactingMessageId={reactingMessageId}
        />
      ))}
      <div ref={chatEndRef} />
    </>
  )
})

const LeftCollabPanel = memo(function LeftCollabPanel({ groupId, quizState, isCreator, currentUser, activeUsers }) {
  return (
    <aside className="glass-panel h-full min-h-0 w-[20rem] rounded-3xl border border-white/15 bg-black/25 2xl:w-88">
      <div className="flex h-full flex-col p-4 gap-5">
        <div className="flex-1">
          <QuizModePanel
            className="h-full"
            groupId={groupId}
            quizState={quizState}
            isCreator={isCreator}
            currentUser={currentUser}
            activeUsers={activeUsers}
          />
        </div>
      </div>
    </aside>
  )
})

const GroupSidePanel = memo(function GroupSidePanel({
  mobile = false,
  groupName,
  inviteCode,
  copiedCode,
  onCopyCode,
  inviteLink,
  activeUsers,
  activeCount,
  chatMessages,
  chatInput,
  onChatInputChange,
  onSendMessage,
  onChatSubmit,
  onChatInputKeyDown,
  onPickFile,
  isSendingMessage,
  isUploadingFile,
  uploadProgress,
  chatFeedback,
  currentUser,
  onReactToMessage,
  onDownloadFile,
  reactingMessageId,
  chatEndRef,
}) {
  const fileInputId = mobile ? 'group-chat-file-mobile' : 'group-chat-file-desktop'

  return (
    <aside
      className={`glass-panel flex h-full min-h-0 flex-col rounded-3xl bg-black/25 ${
        mobile ? 'w-full p-3 sm:p-4' : 'w-[20rem] p-4 xl:w-88'
      }`}
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="rounded-2xl bg-black/20 p-4">
          <h3 className="text-base font-semibold text-white">{groupName || 'Focus Group'}</h3>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2 font-mono text-xs text-white">{inviteCode}</div>
            <button
              type="button"
              onClick={onCopyCode}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white transition hover:bg-white/20"
            >
              Copy
            </button>
          </div>
          {copiedCode && <p className="mt-1 text-[11px] text-emerald-200">Copied!</p>}
          {inviteLink && <p className="mt-2 truncate text-[11px] text-white/55">{inviteLink}</p>}
        </div>

        <div className="rounded-2xl bg-black/20 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Participants</p>
            <p className="text-[11px] text-emerald-100">{activeCount} live</p>
          </div>
          <ParticipantsStrip activeUsers={activeUsers} />
        </div>

        <div className="min-h-0 flex-1 rounded-2xl bg-black/20">
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 px-3 py-2">
              <p className="text-sm font-semibold text-white">Live Chat</p>
            </div>

            <div className="chat-scrollbar flex-1 overflow-y-auto px-3 py-2 space-y-3">
              <ChatMessagesList
                messages={chatMessages}
                currentUserId={currentUser?.id}
                onReactToMessage={onReactToMessage}
                onDownloadFile={onDownloadFile}
                reactingMessageId={reactingMessageId}
                chatEndRef={chatEndRef}
              />
            </div>

            <div className="shrink-0 p-4">
              <form onSubmit={onChatSubmit} className="relative">
                <input
                  id={fileInputId}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  onChange={onPickFile}
                  className="hidden"
                />

                <label
                  htmlFor={fileInputId}
                  className={`absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-white/85 transition hover:text-white ${
                    isUploadingFile ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                  }`}
                  title="Attach file"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 3v12" />
                    <path d="m17 8-5-5-5 5" />
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  </svg>
                </label>

                <input
                  value={chatInput}
                  onChange={onChatInputChange}
                  onKeyDown={onChatInputKeyDown}
                  placeholder="Type a message..."
                  className={`w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 pr-13 text-sm text-white placeholder:text-white/55 transition-opacity ${
                    isSendingMessage ? 'opacity-80' : 'opacity-100'
                  } pl-13`}
                />
                <button
                  type="button"
                  onClick={onSendMessage}
                  disabled={!chatInput.trim() || isSendingMessage}
                  aria-label="Send message"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-white/85 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isSendingMessage ? (
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <span aria-hidden="true" className="text-sm">➤</span>
                  )}
                </button>
              </form>

              {(isUploadingFile || chatFeedback) && (
                <p className="mt-2 text-[11px] text-white/70">
                  {isUploadingFile ? `Uploading... ${uploadProgress}%` : chatFeedback}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
})

function SessionView() {
  const remainingSeconds = usePomodoroStore((state) => state.remainingSeconds)
  const progress = usePomodoroStore((state) => state.progress)
  const status = usePomodoroStore((state) => state.status)
  const selectedSound = usePomodoroStore((state) => state.selectedSound)
  const motivationLine = usePomodoroStore((state) => state.motivationLine)
  const streak = usePomodoroStore((state) => state.streak)
  const xp = usePomodoroStore((state) => state.xp)
  const sessionMode = usePomodoroStore((state) => state.sessionMode)
  const currentGroupId = usePomodoroStore((state) => state.currentGroupId)
  const inviteLink = usePomodoroStore((state) => state.inviteLink)
  const userProfile = usePomodoroStore((state) => state.userProfile)
  const showCompletion = usePomodoroStore((state) => state.showCompletion)
  const pauseSession = usePomodoroStore((state) => state.pauseSession)
  const resumeSession = usePomodoroStore((state) => state.resumeSession)
  const quitSession = usePomodoroStore((state) => state.quitSession)
  const endGroupSessionAsCreator = usePomodoroStore((state) => state.endGroupSessionAsCreator)
  const closeCompletion = usePomodoroStore((state) => state.closeCompletion)

  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [activeUsers, setActiveUsers] = useState([])
  const [groupData, setGroupData] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [optimisticMessages, setOptimisticMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [chatFeedback, setChatFeedback] = useState('')
  const [reactingMessageId, setReactingMessageId] = useState('')
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const chatEndRef = useRef(null)
  const notificationAudioRef = useRef(null)
  const seenChatMessageIdsRef = useRef(new Set())
  const hasChatHydratedRef = useRef(false)

  const progressLabel = useMemo(() => `${Math.round(progress * 100)}%`, [progress])
  const isGroupSession = sessionMode === 'group' && Boolean(currentGroupId)
  const currentGroupSessionId = usePomodoroStore((state) => state.currentGroupSessionId)

  useEffect(() => {
    if (!isGroupSession) {
      setActiveUsers([])
      return undefined
    }

    let unsubscribeParticipants = () => {}
    let unsubscribeGroup = () => {}
    let unsubscribeChat = () => {}

    try {
      unsubscribeParticipants = watchSessionParticipants(
        currentGroupId,
        (rows) => {
          setActiveUsers(rows)
        },
        (error) => console.error(error),
      )

      unsubscribeGroup = watchGroup(
        currentGroupId,
        (payload) => {
          setGroupData(payload)
          if (payload?.groupSession?.status === 'ended') {
            quitSession()
          }
        },
        (error) => console.error(error),
      )

      unsubscribeChat = watchGroupMessages(
        currentGroupId,
        (rows) => {
          setChatMessages(rows)
          setOptimisticMessages((previous) =>
            previous.filter(
              (pending) => !rows.some((saved) => Boolean(saved.clientId) && saved.clientId === pending.clientId),
            ),
          )
        },
        (error) => console.error(error),
      )
    } catch (error) {
      console.error(error)
      setActiveUsers([])
      setChatMessages([])
      setOptimisticMessages([])
    }

    return () => {
      unsubscribeParticipants()
      unsubscribeGroup()
      unsubscribeChat()
    }
  }, [currentGroupId, isGroupSession, quitSession])

  useEffect(() => {
    if (!isGroupSession || !currentGroupSessionId || !currentGroupId) return
    if (!userProfile?.id || !String(userProfile?.name || '').trim()) return

    joinSessionPresence({
      groupId: currentGroupId,
      user: userProfile,
      sessionId: currentGroupSessionId,
    }).catch((error) => {
      console.error(error)
    })
  }, [currentGroupId, currentGroupSessionId, isGroupSession, userProfile])

  useEffect(() => {
    const audio = new Audio('/sounds/notification.mp3')
    audio.preload = 'auto'
    audio.volume = 0.55
    notificationAudioRef.current = audio

    return () => {
      audio.pause()
      notificationAudioRef.current = null
    }
  }, [])

  useEffect(() => {
    seenChatMessageIdsRef.current = new Set()
    hasChatHydratedRef.current = false
  }, [currentGroupId])

  const activeCount = activeUsers.length
  const currentUserActive = activeUsers.some((user) => user.userId === userProfile.id)
  const isCreator = groupData?.groupSession?.creatorId === userProfile.id
  const inviteCode = currentGroupId || '------'
  const quizState = groupData?.groupSession?.quiz || null
  const displayedChatMessages = useMemo(() => {
    if (!optimisticMessages.length) return chatMessages

    const syncedClientIds = new Set(chatMessages.map((message) => message.clientId).filter(Boolean))
    const pendingOnly = optimisticMessages.filter((message) => !syncedClientIds.has(message.clientId))

    return [...chatMessages, ...pendingOnly]
  }, [chatMessages, optimisticMessages])

  useEffect(() => {
    if (!isGroupSession) return

    const knownIds = seenChatMessageIdsRef.current
    const currentIds = chatMessages
      .map((message) => String(message?.id || '').trim())
      .filter(Boolean)

    if (!hasChatHydratedRef.current) {
      currentIds.forEach((id) => knownIds.add(id))
      hasChatHydratedRef.current = true
      return
    }

    let shouldPlayNotification = false
    for (const message of chatMessages) {
      const messageId = String(message?.id || '').trim()
      if (!messageId || knownIds.has(messageId)) continue

      const fromAnotherUser = message?.userId && message.userId !== userProfile.id
      const isSystemMessage = message?.type === 'system'
      if (fromAnotherUser && !isSystemMessage) {
        shouldPlayNotification = true
      }
      knownIds.add(messageId)
    }

    if (!shouldPlayNotification) return

    const audio = notificationAudioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {
      // Ignore blocked autoplay errors until user interacts with the page.
    })
  }, [chatMessages, isGroupSession, userProfile.id])

  const handleReactToMessage = useCallback(async (messageId, reactionKey) => {
    try {
      setReactingMessageId(messageId)
      await reactToGroupMessage({ messageId, reactionKey, userId: userProfile.id })
    } catch (error) {
      console.error(error)
      setChatFeedback(error?.message || 'Something went wrong. Try again.')
      window.setTimeout(() => setChatFeedback(''), 2400)
    } finally {
      setReactingMessageId('')
    }
  }, [userProfile.id])

  const handleDownloadFile = useCallback(async (file) => {
    const sourceUrl = resolveAttachmentUrl(file)
    const forcedUrl = toForcedDownloadUrl(sourceUrl, file?.name)
    if (!sourceUrl) return

    try {
      await downloadFileAsBlob({
        url: sourceUrl,
        fileName: file?.name || 'shared-file',
      })
      setChatFeedback('Download started')
      window.setTimeout(() => setChatFeedback(''), 1800)
    } catch (error) {
      console.error(error)

      try {
        // Fallback 1: try Cloudinary forced-attachment URL as blob.
        await downloadFileAsBlob({
          url: forcedUrl || sourceUrl,
          fileName: file?.name || 'shared-file',
        })
        setChatFeedback('Download started')
      } catch (forcedError) {
        console.error(forcedError)

        try {
          // Fallback 2: direct trigger in a new tab so app view does not get replaced.
          triggerDirectDownload({
            url: sourceUrl,
            fileName: file?.name || 'shared-file',
          })
          setChatFeedback('Download started')
        } catch (fallbackError) {
          console.error(fallbackError)
          setChatFeedback('Unable to download file right now.')
        }
      }

      window.setTimeout(() => setChatFeedback(''), 2400)
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayedChatMessages])

  const handleCopyCode = useCallback(async () => {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopiedCode(true)
      window.setTimeout(() => setCopiedCode(false), 1400)
    } catch (error) {
      console.error(error)
    }
  }, [inviteCode])

  const handleSendMessage = useCallback(async () => {
    const text = chatInput.trim()
    if (!text || !currentGroupId || isSendingMessage) return

    const clientId = `${userProfile.id}-${Date.now()}`
    const localMessage = {
      id: `local-${clientId}`,
      clientId,
      type: 'user',
      userId: userProfile.id,
      name: userProfile.name || 'You',
      text,
      createdAt: new Date(),
    }

    setOptimisticMessages((previous) => [...previous, localMessage])
    setChatInput('')
    setIsSendingMessage(true)

    try {
      await sendGroupMessage({
        groupId: currentGroupId,
        user: userProfile,
        message: text,
        clientId,
      })
    } catch (error) {
      setOptimisticMessages((previous) => previous.filter((message) => message.clientId !== clientId))
      setChatInput(text)
      console.error(error)
      setChatFeedback('Something went wrong. Try again.')
      window.setTimeout(() => setChatFeedback(''), 2400)
    } finally {
      setIsSendingMessage(false)
    }
  }, [chatInput, currentGroupId, isSendingMessage, userProfile])

  const handlePickFile = useCallback(
    async (event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file || !currentGroupId || isUploadingFile) return

      const clientId = `${userProfile.id}-file-${Date.now()}`
      setIsUploadingFile(true)
      setUploadProgress(0)
      setChatFeedback('Uploading...')

      try {
        const attachment = await withTimeout(
          uploadGroupFile({
            groupId: currentGroupId,
            sessionId: currentGroupSessionId || 'active',
            user: userProfile,
            file,
            onProgress: (percent) => setUploadProgress(percent),
          }),
          45000,
          'Upload timed out. Try again.',
        )

        setUploadProgress(100)

        const localMessage = {
          id: `local-${clientId}`,
          clientId,
          type: 'user',
          userId: userProfile.id,
          name: userProfile.name || 'You',
          text: '',
          attachment,
          createdAt: new Date(),
        }
        setOptimisticMessages((previous) => [...previous, localMessage])

        await withTimeout(
          sendGroupMessage({
            groupId: currentGroupId,
            user: userProfile,
            message: '',
            clientId,
            attachment,
          }),
          15000,
          'Upload finished, but sharing timed out. Try again.',
        )

        setChatFeedback('File shared')
      } catch (error) {
        console.error(error)
        setChatFeedback(error?.message || 'File too large or unsupported')
        setUploadProgress(0)
      } finally {
        setIsUploadingFile(false)
        window.setTimeout(() => {
          setUploadProgress(0)
          setChatFeedback('')
        }, 2400)
      }
    },
    [currentGroupId, currentGroupSessionId, isUploadingFile, userProfile],
  )

  const handleChatSubmit = useCallback(
    (event) => {
      event.preventDefault()
      void handleSendMessage()
    },
    [handleSendMessage],
  )

  const handleChatInputChange = useCallback((event) => {
    setChatInput(event.target.value)
  }, [])

  const handleChatInputKeyDown = useCallback(
    (event) => {
      if (event.key !== 'Enter' || event.shiftKey) return
      event.preventDefault()
      void handleSendMessage()
    },
    [handleSendMessage],
  )

  const handleTryQuit = () => {
    if (status === 'completed') {
      quitSession()
      return
    }
    setShowExitConfirm(true)
  }

  const handleQuitAnyway = () => {
    setShowExitConfirm(false)
    quitSession()
  }

  const handleStartAnother = () => {
    closeCompletion()
    quitSession()
  }

  const handleEndSession = async () => {
    await endGroupSessionAsCreator()
  }

  return (
    <section className={`theme-${selectedSound} relative min-h-dvh overflow-x-hidden bg-cover bg-center`}>
      <ThemeVideoBackground themeId={selectedSound} overlayClassName="bg-black/55 backdrop-blur-sm" />

      {showCompletion && (
        <Confetti
          recycle={false}
          numberOfPieces={320}
          gravity={0.2}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 min-h-dvh px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 lg:h-dvh lg:overflow-hidden"
      >
        <div className="mx-auto flex min-h-full w-full max-w-440 gap-3 lg:h-full lg:gap-4 lg:overflow-hidden xl:gap-5">
          {isGroupSession && (
            <div className="hidden h-full min-h-0 xl:block">
              <LeftCollabPanel
                groupId={currentGroupId}
                quizState={quizState}
                isCreator={isCreator}
                currentUser={userProfile}
                activeUsers={activeUsers}
              />
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:justify-between lg:gap-0 lg:overflow-hidden">
            <div className="glass-panel shrink-0 rounded-3xl border border-white/15 px-4 py-3 shadow-lg sm:px-5 sm:py-4 md:px-6 md:py-5">
              <p className="text-xs uppercase tracking-wide text-purple-200">Progress</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full transition-[width,background-color] duration-700"
                    style={{
                      width: progressLabel,
                      backgroundImage: 'linear-gradient(to right, #bfa4ff, #7f99ec)',
                    }}
                  />
                </div>
                <p className="text-sm font-semibold text-purple-200">{progressLabel}</p>
              </div>
              <motion.p
                key={motivationLine}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="mt-3 text-center text-base leading-relaxed text-white sm:text-lg md:text-xl"
              >
                {motivationLine}
              </motion.p>

              {isGroupSession && (
                <div className="mt-3 rounded-2xl border border-emerald-200/20 bg-emerald-300/8 px-3 py-2 text-sm text-emerald-100">
                  <p>{activeCount} people focusing right now.</p>
                  {!currentUserActive && <p className="mt-1 text-amber-100">{userProfile.name || 'You'} are warming up...</p>}
                  {activeCount >= 2 && <p className="mt-1">Most people in your group are still going.</p>}
                </div>
              )}
            </div>

            <div className="flex flex-1 items-center justify-center py-1.5 sm:py-2 md:py-3">
              <TimerCircle
                remainingSeconds={remainingSeconds}
                progress={progress}
                accentColor="#b8a2ff"
                glowColor="var(--accent-soft)"
              />
            </div>

            <div className="glass-panel shrink-0 rounded-3xl border border-white/10 px-3 py-3 shadow-lg sm:px-4 md:px-6 md:py-4">
              <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3">
                {status === 'running' ? (
                  <button
                    type="button"
                    onClick={pauseSession}
                    className="glass-button text-sm"
                  >
                    Pause
                  </button>
                ) : status === 'paused' ? (
                  <button
                    type="button"
                    onClick={resumeSession}
                    className="glass-button border-white/35 bg-white/16 text-sm shadow-[0_0_14px_var(--accent-soft)]"
                  >
                    Resume
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleTryQuit}
                  className="glass-button text-sm"
                >
                  Stop
                </button>

                {isGroupSession && isCreator && (
                  <button
                    type="button"
                    onClick={handleEndSession}
                    className="glass-button border-rose-200/45 bg-rose-300/20 text-sm text-rose-100"
                  >
                    End Session
                  </button>
                )}

                {isGroupSession && (
                  <button
                    type="button"
                    onClick={() => setMobilePanelOpen(true)}
                    className="glass-button text-sm lg:hidden"
                  >
                    Open Group Panel
                  </button>
                )}
              </div>
            </div>
          </div>

          {isGroupSession && (
            <div className="hidden h-full min-h-0 lg:block">
              <GroupSidePanel
                groupName={groupData?.name}
                inviteCode={inviteCode}
                copiedCode={copiedCode}
                onCopyCode={handleCopyCode}
                inviteLink={inviteLink}
                activeUsers={activeUsers}
                activeCount={activeCount}
                chatMessages={displayedChatMessages}
                chatInput={chatInput}
                onChatInputChange={handleChatInputChange}
                onSendMessage={handleSendMessage}
                onChatSubmit={handleChatSubmit}
                onChatInputKeyDown={handleChatInputKeyDown}
                onPickFile={handlePickFile}
                isSendingMessage={isSendingMessage}
                isUploadingFile={isUploadingFile}
                uploadProgress={uploadProgress}
                chatFeedback={chatFeedback}
                currentUser={userProfile}
                onReactToMessage={handleReactToMessage}
                onDownloadFile={handleDownloadFile}
                reactingMessageId={reactingMessageId}
                chatEndRef={chatEndRef}
              />
            </div>
          )}
        </div>
      </motion.div>

      {isGroupSession && mobilePanelOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobilePanelOpen(false)}
            aria-label="Close group panel"
          />
          <div className="absolute bottom-0 left-0 right-0 h-[82dvh] rounded-t-3xl p-2.5 sm:h-[78dvh] sm:p-3">
            <GroupSidePanel
              mobile
              groupName={groupData?.name}
              inviteCode={inviteCode}
              copiedCode={copiedCode}
              onCopyCode={handleCopyCode}
              inviteLink={inviteLink}
              activeUsers={activeUsers}
              activeCount={activeCount}
              chatMessages={displayedChatMessages}
              chatInput={chatInput}
              onChatInputChange={handleChatInputChange}
              onSendMessage={handleSendMessage}
              onChatSubmit={handleChatSubmit}
              onChatInputKeyDown={handleChatInputKeyDown}
              onPickFile={handlePickFile}
              isSendingMessage={isSendingMessage}
              isUploadingFile={isUploadingFile}
              uploadProgress={uploadProgress}
              chatFeedback={chatFeedback}
              currentUser={userProfile}
              onReactToMessage={handleReactToMessage}
              onDownloadFile={handleDownloadFile}
              reactingMessageId={reactingMessageId}
              chatEndRef={chatEndRef}
            />
          </div>
        </div>
      )}

      <ConfirmationModal
        open={showExitConfirm}
        progressLabel={progressLabel}
        onContinue={() => setShowExitConfirm(false)}
        onQuit={handleQuitAnyway}
      />

      <CompletionModal
        open={showCompletion}
        streak={streak}
        xp={xp}
        onClose={closeCompletion}
        onStartAnother={handleStartAnother}
      />
    </section>
  )
}

export default SessionView
