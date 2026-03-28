const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

const inLast = (value, rangeMs) => {
  if (!value) return false
  const target = new Date(value).getTime()
  if (Number.isNaN(target)) return false
  return Date.now() - target <= rangeMs
}

export const buildLeaderboardByPeriod = (sessions, period = 'all') => {
  const rangeMs =
    period === 'daily' ? DAY_MS : period === 'weekly' ? WEEK_MS : Number.POSITIVE_INFINITY

  const aggregate = new Map()

  sessions
    .filter((session) => session.status === 'completed')
    .filter((session) => (rangeMs === Number.POSITIVE_INFINITY ? true : inLast(session.completedAt, rangeMs)))
    .forEach((session) => {
      const current = aggregate.get(session.userId) || {
        userId: session.userId,
        name: session.name || session.username,
        totalFocusMinutes: 0,
        sessionsCompleted: 0,
        xp: 0,
      }

      current.name = session.name || session.username || current.name
      current.totalFocusMinutes += session.durationMinutes || 0
      current.sessionsCompleted += 1
      current.xp += session.xpEarned || 0

      aggregate.set(session.userId, current)
    })

  return Array.from(aggregate.values()).sort(
    (a, b) => b.totalFocusMinutes - a.totalFocusMinutes || b.xp - a.xp,
  )
}
