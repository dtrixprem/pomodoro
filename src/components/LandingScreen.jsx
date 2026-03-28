import { usePomodoroStore } from '../store/usePomodoroStore'

function LandingScreen() {
  const goToSetup = usePomodoroStore((state) => state.goToSetup)
  const backgroundImage = `url('${import.meta.env.BASE_URL}images/bgimg.png')`

  return (
    <section
      className="theme-rain relative flex h-screen items-center justify-center overflow-hidden px-6 bg-cover bg-center"
      style={{ backgroundImage }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="glass-panel relative z-10 w-full max-w-xl rounded-3xl p-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
          Ready to focus?
        </h1>
        <p className="mt-4 text-base text-purple-200">
          Create a moment that matters.
        </p>
        <p className="mt-2 text-sm text-white/75">One session can change your day.</p>
        <p className="mt-1 text-sm text-white/75">You showed up. That matters.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={goToSetup}
            className="cta-button text-sm tracking-wide"
          >
            Start Session Options
          </button>
        </div>
      </div>
    </section>
  )
}

export default LandingScreen
