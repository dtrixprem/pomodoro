import { useEffect, useMemo, useState } from 'react'
import AuthQuickActions from './AuthQuickActions'
import InviteModal from './InviteModal'
import Leaderboard from './Leaderboard'
import MemberList from './MemberList'
import { buildLeaderboardByPeriod } from '../utils/leaderboard'
import { watchGroup, watchGroupSessions } from '../services/groupService'
import { usePomodoroStore } from '../store/usePomodoroStore'

function GroupPage() {
  const authUser = usePomodoroStore((state) => state.authUser)
  const userProfile = usePomodoroStore((state) => state.userProfile)
  const currentGroupId = usePomodoroStore((state) => state.currentGroupId)
  const inviteLink = usePomodoroStore((state) => state.inviteLink)
  const collaborationError = usePomodoroStore((state) => state.collaborationError)
  const collaborationStatus = usePomodoroStore((state) => state.collaborationStatus)
  const createStudyGroup = usePomodoroStore((state) => state.createStudyGroup)
  const joinStudyGroup = usePomodoroStore((state) => state.joinStudyGroup)
  const setUsername = usePomodoroStore((state) => state.setUsername)
  const setGroupActiveUsers = usePomodoroStore((state) => state.setGroupActiveUsers)
  const startSession = usePomodoroStore((state) => state.startSession)
  const goToSetup = usePomodoroStore((state) => state.goToSetup)
  const goToLanding = usePomodoroStore((state) => state.goToLanding)

  const [usernameDraft, setUsernameDraft] = useState(userProfile.username)
  const [newGroupName, setNewGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [groupData, setGroupData] = useState(null)
  const [sessions, setSessions] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [period, setPeriod] = useState('all')

  useEffect(() => {
    if (!currentGroupId) {
      setGroupData(null)
      setSessions([])
      setGroupActiveUsers([])
      return undefined
    }

    let unsubGroup = () => {}
    let unsubSessions = () => {}

    try {
      unsubGroup = watchGroup(
        currentGroupId,
        (payload) => setGroupData(payload),
        (error) => console.error(error),
      )

      unsubSessions = watchGroupSessions(
        currentGroupId,
        (rows) => {
          setSessions(rows)
          const active = rows
            .filter((session) => session.status === 'running')
            .map((session) => ({ userId: session.userId, username: session.username }))
          setGroupActiveUsers(active)
        },
        (error) => console.error(error),
      )
    } catch (error) {
      console.error(error)
      setGroupData(null)
      setSessions([])
      setGroupActiveUsers([])
    }

    return () => {
      unsubGroup()
      unsubSessions()
    }
  }, [currentGroupId, setGroupActiveUsers])

  const members = useMemo(() => {
    if (!groupData) return []

    const fromLeaderboard = (groupData.leaderboard || []).map((row) => ({
      userId: row.userId,
      username: row.username,
    }))

    const fromActiveSessions = sessions
      .filter((session) => session.status === 'running')
      .map((session) => ({
        userId: session.userId,
        username: session.username,
      }))

    const merged = [...fromLeaderboard, ...fromActiveSessions]
    const map = new Map()
    merged.forEach((row) => {
      map.set(row.userId, row)
    })

    return Array.from(map.values())
  }, [groupData, sessions])

  const activeUsers = useMemo(
    () =>
      sessions
        .filter((session) => session.status === 'running')
        .map((session) => ({ userId: session.userId, username: session.username })),
    [sessions],
  )

  const leaderboardRows = useMemo(() => buildLeaderboardByPeriod(sessions, period), [sessions, period])

  const handleCreateGroup = async (event) => {
    event.preventDefault()
    await createStudyGroup(newGroupName)
    setNewGroupName('')
  }

  const handleJoinGroup = async (event) => {
    event.preventDefault()
    await joinStudyGroup(joinCode)
    setJoinCode('')
  }

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    await setUsername(usernameDraft)
  }

  const activeCount = activeUsers.length

  return (
    <section className="theme-rain animated-gradient min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-3">
        <div className="glass-panel rounded-3xl p-5 md:col-span-1">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button type="button" className="glass-button text-xs" onClick={goToLanding}>
              Back to Home
            </button>
            <AuthQuickActions compact />
          </div>

          <h2 className="text-2xl font-semibold text-white">Group Dashboard</h2>
          <p className="mt-1 text-sm text-white/75">Collaborative focus with live accountability.</p>

          <form className="mt-4 space-y-2" onSubmit={handleSaveProfile}>
            <label className="text-xs uppercase tracking-wide text-white/70">Username</label>
            <input
              value={usernameDraft}
              onChange={(event) => setUsernameDraft(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white"
              placeholder="Enter display name"
            />
            <button type="submit" className="glass-button text-sm">
              Save Profile
            </button>
          </form>

          <form className="mt-5 space-y-2" onSubmit={handleCreateGroup}>
            <label className="text-xs uppercase tracking-wide text-white/70">Create Group</label>
            <input
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white"
              placeholder="Group name"
            />
            <button
              type="submit"
              disabled={!authUser}
              className="glass-button text-sm disabled:cursor-not-allowed disabled:opacity-55"
            >
              Create Group
            </button>
          </form>

          <form className="mt-5 space-y-2" onSubmit={handleJoinGroup}>
            <label className="text-xs uppercase tracking-wide text-white/70">Join Group</label>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white"
              placeholder="Group code or invite link"
            />
            <button
              type="submit"
              disabled={!authUser}
              className="glass-button text-sm disabled:cursor-not-allowed disabled:opacity-55"
            >
              Join
            </button>
          </form>

          {!authUser && (
            <p className="mt-4 text-sm text-amber-100">
              Login with Google from the top-right profile button to manage group sessions.
            </p>
          )}

          {collaborationStatus === 'working' && (
            <p className="mt-4 text-sm text-cyan-100">Syncing with group workspace...</p>
          )}

          {collaborationError && <p className="mt-4 text-sm text-rose-200">{collaborationError}</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="cta-button text-sm" onClick={() => goToSetup()}>
              Back to Timer Setup
            </button>
            {currentGroupId && (
              <button type="button" className="glass-button text-sm" onClick={() => setShowInvite(true)}>
                Invite
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4 md:col-span-2">
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/70">Current Group</p>
                <h3 className="text-2xl font-semibold text-white">
                  {groupData?.name || (currentGroupId ? currentGroupId : 'No group selected')}
                </h3>
                {currentGroupId && <p className="mt-1 text-sm text-white/75">Code: {currentGroupId}</p>}
              </div>

              <button
                type="button"
                className="cta-button text-sm"
                disabled={!authUser || !currentGroupId}
                onClick={() => startSession({ mode: 'group', groupId: currentGroupId })}
              >
                Start Group Session
              </button>
            </div>

            <p className="mt-4 text-sm text-white/80">{activeCount} people focusing right now.</p>
            {activeCount >= 2 && (
              <p className="mt-1 text-sm text-emerald-100">Most people in your group are still going.</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <MemberList members={members} activeUsers={activeUsers} />

            <div className="glass-panel rounded-3xl p-6">
              <h3 className="text-xl font-semibold text-white">Leaderboard Filters</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPeriod('daily')}
                  className={`glass-button text-xs ${period === 'daily' ? 'bg-white/20' : ''}`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('weekly')}
                  className={`glass-button text-xs ${period === 'weekly' ? 'bg-white/20' : ''}`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('all')}
                  className={`glass-button text-xs ${period === 'all' ? 'bg-white/20' : ''}`}
                >
                  All Time
                </button>
              </div>
            </div>
          </div>

          <Leaderboard
            rows={leaderboardRows}
            title={
              period === 'daily'
                ? 'Daily Leaderboard'
                : period === 'weekly'
                  ? 'Weekly Leaderboard'
                  : 'All-time Leaderboard'
            }
          />
        </div>
      </div>

      <InviteModal
        open={showInvite}
        groupId={currentGroupId}
        inviteLink={inviteLink}
        onClose={() => setShowInvite(false)}
      />
    </section>
  )
}

export default GroupPage
