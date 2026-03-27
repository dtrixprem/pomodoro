function MemberList({ members, activeUsers }) {
  const activeIds = new Set(activeUsers.map((user) => user.userId))

  return (
    <div className="glass-panel rounded-3xl p-6">
      <h3 className="text-xl font-semibold text-white">Members</h3>
      {members.length === 0 ? (
        <p className="mt-3 text-sm text-white/70">No members found.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {members.map((member) => {
            const isActive = activeIds.has(member.userId)
            return (
              <li
                key={member.userId}
                className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"
              >
                <span className="text-white/90">{member.username || member.userId}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isActive ? 'bg-emerald-400/25 text-emerald-100' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {isActive ? 'Focusing' : 'Idle'}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default MemberList
