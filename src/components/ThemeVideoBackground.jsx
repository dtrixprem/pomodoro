import { memo, useMemo } from 'react'
import { AMBIENT_SOUNDS } from '../constants/sounds'

function ThemeVideoBackground({ themeId, overlayClassName = 'bg-white/28 backdrop-blur-[1.5px]' }) {
  const videoPath = useMemo(() => {
    const selected = AMBIENT_SOUNDS.find((theme) => theme.id === themeId)
    return selected?.videoPath ?? '/videos/rain.mp4'
  }, [themeId])

  return (
    <>
      <video
        key={videoPath}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={videoPath} type="video/mp4" />
      </video>
      <div className={`absolute inset-0 ${overlayClassName}`} />
    </>
  )
}

export default memo(ThemeVideoBackground)
