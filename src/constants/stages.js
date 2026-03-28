export const STAGE = {
  IGNITION: 'ignition',
  FLOW: 'flow',
  FINAL: 'final',
}

export const STAGE_META = {
  [STAGE.IGNITION]: {
    label: 'Ignition',
    message: 'Focus begins with this first step.',
    progressRange: [0, 0.3],
    ringColorClass: 'stage-ignition',
  },
  [STAGE.FLOW]: {
    label: 'Flow',
    message: 'Keep going. This is where progress happens.',
    progressRange: [0.3, 0.7],
    ringColorClass: 'stage-flow',
  },
  [STAGE.FINAL]: {
    label: 'Final Push',
    message: 'This last stretch matters the most.',
    progressRange: [0.7, 1],
    ringColorClass: 'stage-final',
  },
}
