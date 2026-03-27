function InviteModal({ open, groupId, inviteLink, onClose }) {
  if (!open) return null

  const handleCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch (error) {
      console.error('Could not copy text', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6">
        <h3 className="text-2xl font-semibold text-white">Invite Members</h3>

        <p className="mt-4 text-sm text-white/75">Share this group code:</p>
        <div className="mt-2 flex items-center gap-2">
          <input
            readOnly
            value={groupId}
            className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white"
          />
          <button type="button" className="glass-button text-sm" onClick={() => handleCopy(groupId)}>
            Copy
          </button>
        </div>

        <p className="mt-4 text-sm text-white/75">Invite link:</p>
        <div className="mt-2 flex items-center gap-2">
          <input
            readOnly
            value={inviteLink}
            className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white"
          />
          <button
            type="button"
            className="glass-button text-sm"
            onClick={() => handleCopy(inviteLink)}
          >
            Copy
          </button>
        </div>

        <button type="button" className="cta-button mt-6 text-sm" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}

export default InviteModal
