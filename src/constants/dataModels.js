export const SAMPLE_USER_MODEL = {
  id: 'user_abc123',
  username: 'FocusNinja',
  groupIds: ['AB12CD'],
  totalFocusMinutes: 120,
  sessionsCompleted: 5,
  xp: 140,
  createdAt: '2026-03-27T10:00:00.000Z',
  updatedAt: '2026-03-27T10:00:00.000Z',
}

export const SAMPLE_GROUP_MODEL = {
  id: 'AB12CD',
  name: 'Final Exams Squad',
  adminId: 'user_abc123',
  members: ['user_abc123', 'user_xyz890'],
  sessions: ['session_1', 'session_2'],
  leaderboard: [
    {
      userId: 'user_abc123',
      username: 'FocusNinja',
      totalFocusMinutes: 120,
      sessionsCompleted: 5,
      xp: 140,
      updatedAt: '2026-03-27T10:00:00.000Z',
    },
  ],
  createdAt: '2026-03-27T10:00:00.000Z',
  updatedAt: '2026-03-27T10:00:00.000Z',
}

export const SAMPLE_SESSION_MODEL = {
  id: 'session_1',
  groupId: 'AB12CD',
  userId: 'user_abc123',
  username: 'FocusNinja',
  durationMinutes: 25,
  startedAt: '2026-03-27T10:00:00.000Z',
  completedAt: '2026-03-27T10:25:00.000Z',
  status: 'completed',
  xpEarned: 30,
}
