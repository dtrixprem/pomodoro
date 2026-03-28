import { useState } from 'react'

function ProfileMenu({ authUser, onLogin, onSwitchAccount, onLogout }) {
  const [open, setOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  if (!authUser) {
    return (
      <button
        type="button"
        onClick={onLogin}
        className="glass-button text-sm"
      >
        Login with Google
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="glass-button flex items-center gap-2 px-3 py-1.5"
      >
        <img
          src={authUser.photoURL || 'https://via.placeholder.com/32'}
          alt={authUser.name}
          className="h-8 w-8 rounded-full object-cover"
        />
        <span className="max-w-30 truncate text-sm">{authUser.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-white/20 bg-black/80 p-2 text-sm shadow-xl backdrop-blur-md">
          <button
            type="button"
            className="w-full rounded-xl px-3 py-2 text-left text-white/90 hover:bg-white/10"
            onClick={() => {
              setShowProfile(true)
              setOpen(false)
            }}
          >
            View Profile
          </button>
          <button
            type="button"
            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-white/90 hover:bg-white/10"
            onClick={() => {
              onSwitchAccount()
              setOpen(false)
            }}
          >
            Change Account
          </button>
          <button
            type="button"
            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-rose-200 hover:bg-rose-400/20"
            onClick={() => {
              onLogout()
              setOpen(false)
            }}
          >
            Logout
          </button>
        </div>
      )}

      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 text-white">
            <div className="flex items-center gap-3">
              <img
                src={authUser.photoURL || 'https://via.placeholder.com/64'}
                alt={authUser.name}
                className="h-14 w-14 rounded-full object-cover"
              />
              <div>
                <p className="text-lg font-semibold">{authUser.name}</p>
                <p className="text-sm text-white/75">{authUser.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowProfile(false)}
              className="cta-button mt-5 w-full text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileMenu
