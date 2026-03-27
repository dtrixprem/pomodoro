import { STAGE } from '../constants/stages'

export const getStageByProgress = (progress) => {
  if (progress < 0.3) return STAGE.IGNITION
  if (progress < 0.7) return STAGE.FLOW
  return STAGE.FINAL
}

export const clampProgress = (value) => Math.min(1, Math.max(0, value))
