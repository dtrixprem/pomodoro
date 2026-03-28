function Leaderboard({ rows, title }) {
  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-white sm:text-xl">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-white/70">No focus sessions in this period yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-115 border-collapse text-left text-sm">
            <thead>
              <tr className="text-white/70">
                <th className="pb-2 pr-4">Rank</th>
                <th className="pb-2 pr-4">User</th>
                <th className="pb-2 pr-4">Focus Min</th>
                <th className="pb-2 pr-4">Sessions</th>
                <th className="pb-2">XP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.userId} className="border-t border-white/10">
                  <td className="py-2 pr-4 font-semibold text-white">#{index + 1}</td>
                  <td className="py-2 pr-4 text-white/90">{row.name || row.username || row.userId}</td>
                  <td className="py-2 pr-4 text-white/90">{row.totalFocusMinutes}</td>
                  <td className="py-2 pr-4 text-white/90">{row.sessionsCompleted}</td>
                  <td className="py-2 text-white/90">{row.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Leaderboard
