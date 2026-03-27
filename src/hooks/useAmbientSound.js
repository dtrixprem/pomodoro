import { Howl } from 'howler'
import { useEffect, useRef } from 'react'
import { AMBIENT_SOUNDS, BACKGROUND_MUSIC_PATH } from '../constants/sounds'
import { usePomodoroStore } from '../store/usePomodoroStore'

const AMBIENT_FADE_MS = 1400
const MUSIC_FADE_MS = 2000
const BACKGROUND_MUSIC_VOLUME = 0.16

export const useAmbientSound = () => {
  const selectedSound = usePomodoroStore((state) => state.selectedSound)
  const volume = usePomodoroStore((state) => state.volume)
  const soundEnabled = usePomodoroStore((state) => state.soundEnabled)
  const bgMusicEnabled = usePomodoroStore((state) => state.bgMusicEnabled)
  const status = usePomodoroStore((state) => state.status)

  const ambientMapRef = useRef(null)
  const currentAmbientRef = useRef(null)
  const backgroundMusicRef = useRef(null)
  const pauseTimersRef = useRef({})

  const clearPauseTimer = (key) => {
    if (pauseTimersRef.current[key]) {
      window.clearTimeout(pauseTimersRef.current[key])
      pauseTimersRef.current[key] = null
    }
  }

  const fadeOutAndPause = (sound, key, durationMs) => {
    if (!sound) return

    clearPauseTimer(key)

    const from = sound.volume()
    if (!sound.playing()) {
      sound.volume(0)
      return
    }

    sound.fade(from, 0, durationMs)
    pauseTimersRef.current[key] = window.setTimeout(() => {
      sound.pause()
      sound.seek(0)
      sound.volume(0)
      pauseTimersRef.current[key] = null
    }, durationMs + 80)
  }

  const ensureFadeIn = (sound, toVolume, durationMs, key) => {
    if (!sound) return
    clearPauseTimer(key)

    if (!sound.playing()) {
      sound.volume(0)
      sound.play()
    }

    sound.fade(sound.volume(), toVolume, durationMs)
  }

  if (!ambientMapRef.current) {
    ambientMapRef.current = AMBIENT_SOUNDS.reduce((acc, sound) => {
      // Reused Howl instances keep loops smooth and prevent reinitialization on render.
      acc[sound.id] = new Howl({
        src: [sound.soundPath],
        loop: true,
        preload: true,
        volume: 0,
      })
      console.log(`[audio] ambient instance created: ${sound.id} -> ${sound.soundPath}`)
      return acc
    }, {})
  }

  if (!backgroundMusicRef.current) {
    backgroundMusicRef.current = new Howl({
      src: [BACKGROUND_MUSIC_PATH],
      loop: true,
      preload: true,
      volume: 0,
    })
    console.log(`[audio] background instance created: ${BACKGROUND_MUSIC_PATH}`)
  }

  useEffect(() => {
    const ambientMap = ambientMapRef.current
    const safeSelected = ambientMap[selectedSound] ? selectedSound : 'rain'

    if (status === 'running' && soundEnabled) {
      const nextSound = ambientMap[safeSelected]
      const previousId = currentAmbientRef.current
      const previousSound = previousId ? ambientMap[previousId] : null

      if (previousId && previousId !== safeSelected) {
        console.log(`[audio] ambient fade out: ${previousId}`)
        fadeOutAndPause(previousSound, previousId, AMBIENT_FADE_MS)
      }

      currentAmbientRef.current = safeSelected
      console.log(`[audio] ambient play triggered: ${safeSelected}`)
      ensureFadeIn(nextSound, volume, AMBIENT_FADE_MS, safeSelected)
      return
    }

    const currentId = currentAmbientRef.current
    if (currentId) {
      fadeOutAndPause(ambientMap[currentId], currentId, AMBIENT_FADE_MS)
    }
  }, [selectedSound, soundEnabled, status, volume])

  useEffect(() => {
    const backgroundMusic = backgroundMusicRef.current

    if (status === 'running' && bgMusicEnabled) {
      console.log('[audio] bg music play triggered')
      ensureFadeIn(backgroundMusic, BACKGROUND_MUSIC_VOLUME, MUSIC_FADE_MS, 'bg')
      return
    }

    fadeOutAndPause(backgroundMusic, 'bg', MUSIC_FADE_MS)
  }, [status, bgMusicEnabled])

  useEffect(
    () => () => {
      const ambientMap = ambientMapRef.current
      Object.keys(pauseTimersRef.current).forEach((key) => clearPauseTimer(key))
      Object.values(ambientMap).forEach((sound) => sound.unload())
      backgroundMusicRef.current?.unload()
    },
    [],
  )
}
