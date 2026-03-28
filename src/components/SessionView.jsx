import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Confetti from 'react-confetti'
import { motion } from 'framer-motion'
import CompletionModal from './CompletionModal'
import ConfirmationModal from './ConfirmationModal'
import ThemeVideoBackground from './ThemeVideoBackground'
import TimerCircle from './TimerCircle'
import {
  sendGroupMessage,
  watchGroup,
  watchGroupMessages,
  watchSessionParticipants,
} from '../services/groupService'
import { usePomodoroStore } from '../store/usePomodoroStore'

const initialsFromName = (value = '') => {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'U'
  return parts[0][0]?.toUpperCase() || 'U'
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

const ChatMessageItem = memo(function ChatMessageItem({ message }) {
  if (message.type === 'system') {
    return <p className="text-center text-[11px] text-white/60">{message.text}</p>
  }

  return (
    <div className="flex items-start gap-2 min-w-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white">
        {initialsFromName(message.name || message.username || '')}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-white/80">{message.name || message.username || 'User'}</p>
        <p className="mt-1 wrap-break-word rounded-xl bg-white/10 px-3 py-2 text-xs text-white/95 backdrop-blur-md">
          {message.text}
        </p>
      </div>
    </div>
  )
})

const ChatMessagesList = memo(function ChatMessagesList({ messages, chatEndRef }) {
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
        <ChatMessageItem key={message.id} message={message} />
      ))}
      <div ref={chatEndRef} />
    </>
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
  onSendChat,
  onChatInputKeyDown,
  chatEndRef,
}) {
  return (
    <aside
      className={`glass-panel flex h-full min-h-0 flex-col rounded-3xl border border-white/15 bg-black/25 ${
        mobile ? 'w-full p-3' : 'w-70 p-3 md:w-80'
      }`}
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="rounded-2xl border border-white/12 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-wide text-white/60">Group</p>
          <h3 className="text-base font-semibold text-white">{groupName || 'Focus Group'}</h3>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 rounded-md bg-white/10 px-3 py-1 font-mono text-xs text-white">{inviteCode}</div>
            <button type="button" onClick={onCopyCode} className="glass-button px-2 py-1 text-xs">
              Copy
            </button>
          </div>
          {copiedCode && <p className="mt-1 text-[11px] text-emerald-200">Copied!</p>}
          {inviteLink && <p className="mt-1 truncate text-[11px] text-white/55">{inviteLink}</p>}
        </div>

        <div className="rounded-2xl border border-white/12 bg-black/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Participants</p>
            <p className="text-[11px] text-emerald-100">{activeCount} live</p>
          </div>
          <ParticipantsStrip activeUsers={activeUsers} />
        </div>

        <div className="min-h-0 flex-1 rounded-2xl border border-white/12 bg-black/20">
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-white/10 px-3 py-2">
              <p className="text-sm font-semibold text-white">Live Chat</p>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              <ChatMessagesList messages={chatMessages} chatEndRef={chatEndRef} />
            </div>

            <div className="shrink-0 border-t border-white/10 p-3">
              <form onSubmit={onSendChat}>
                <input
                  value={chatInput}
                  onChange={onChatInputChange}
                  onKeyDown={onChatInputKeyDown}
                  placeholder="Type a message..."
                  className="w-full rounded-full bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/55"
                />
              </form>
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
  const [chatInput, setChatInput] = useState('')
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const chatEndRef = useRef(null)

  const progressLabel = useMemo(() => `${Math.round(progress * 100)}%`, [progress])
  const isGroupSession = sessionMode === 'group' && Boolean(currentGroupId)

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

          if (rows.length === 0) {
            quitSession()
          }
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
        (rows) => setChatMessages(rows),
        (error) => console.error(error),
      )
    } catch (error) {
      console.error(error)
      setActiveUsers([])
      setChatMessages([])
    }

    return () => {
      unsubscribeParticipants()
      unsubscribeGroup()
      unsubscribeChat()
    }
  }, [currentGroupId, isGroupSession, quitSession])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const activeCount = activeUsers.length
  const currentUserActive = activeUsers.some((user) => user.userId === userProfile.id)
  const isCreator = groupData?.groupSession?.creatorId === userProfile.id
  const inviteCode = currentGroupId || '------'

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

  const handleSendChat = useCallback(async (event) => {
    event.preventDefault()
    if (!chatInput.trim() || !currentGroupId) return

    try {
      await sendGroupMessage({
        groupId: currentGroupId,
        user: userProfile,
        message: chatInput,
      })
      setChatInput('')
    } catch (error) {
      console.error(error)
    }
  }, [chatInput, currentGroupId, userProfile])

  const handleChatInputChange = useCallback((event) => {
    setChatInput(event.target.value)
  }, [])

  const handleChatInputKeyDown = useCallback(
    (event) => {
      if (event.key !== 'Enter' || event.shiftKey) return
      event.preventDefault()
      handleSendChat(event)
    },
    [handleSendChat],
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
    <section className={`theme-${selectedSound} relative h-screen overflow-hidden bg-cover bg-center`}>
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
        className="relative z-10 h-screen overflow-hidden px-4 py-4 md:px-6 md:py-5"
      >
        <div className="mx-auto flex h-full w-full max-w-7xl gap-4 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col justify-between overflow-hidden">
            <div className="glass-panel shrink-0 rounded-3xl border border-white/15 px-5 py-4 shadow-lg md:px-6 md:py-5">
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
                className="mt-3 text-center text-lg text-white/80 md:text-xl"
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

            <div className="flex flex-1 items-center justify-center py-2 md:py-3">
              <TimerCircle
                remainingSeconds={remainingSeconds}
                progress={progress}
                accentColor="#b8a2ff"
                glowColor="var(--accent-soft)"
              />
            </div>

            <div className="glass-panel shrink-0 rounded-3xl border border-white/10 px-4 py-3 shadow-lg md:px-6 md:py-4">
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
                    className="glass-button text-sm md:hidden"
                  >
                    Open Group Panel
                  </button>
                )}
              </div>
            </div>
          </div>

          {isGroupSession && (
            <div className="hidden h-full min-h-0 md:block">
              <GroupSidePanel
                groupName={groupData?.name}
                inviteCode={inviteCode}
                copiedCode={copiedCode}
                onCopyCode={handleCopyCode}
                inviteLink={inviteLink}
                activeUsers={activeUsers}
                activeCount={activeCount}
                chatMessages={chatMessages}
                chatInput={chatInput}
                onChatInputChange={handleChatInputChange}
                onSendChat={handleSendChat}
                onChatInputKeyDown={handleChatInputKeyDown}
                chatEndRef={chatEndRef}
              />
            </div>
          )}
        </div>
      </motion.div>

      {isGroupSession && mobilePanelOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobilePanelOpen(false)}
            aria-label="Close group panel"
          />
          <div className="absolute bottom-0 left-0 right-0 h-[74vh] rounded-t-3xl p-3">
            <GroupSidePanel
              mobile
              groupName={groupData?.name}
              inviteCode={inviteCode}
              copiedCode={copiedCode}
              onCopyCode={handleCopyCode}
              inviteLink={inviteLink}
              activeUsers={activeUsers}
              activeCount={activeCount}
              chatMessages={chatMessages}
              chatInput={chatInput}
              onChatInputChange={handleChatInputChange}
              onSendChat={handleSendChat}
              onChatInputKeyDown={handleChatInputKeyDown}
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
