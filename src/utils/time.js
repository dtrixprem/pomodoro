export const formatSeconds = (value) => {
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const secondsFromMinutes = (value) => Math.round(value * 60)
