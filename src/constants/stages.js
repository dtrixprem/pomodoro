export const STAGE = {
  IGNITION: 'ignition',
  FLOW: 'flow',
  FINAL: 'final',
}

export const STAGE_META = {
  [STAGE.IGNITION]: {
    label: 'Ignition',
    message: 'Warm up your focus. Lock in.',
    progressRange: [0, 0.3],
    ringColorClass: 'stage-ignition',
  },
  [STAGE.FLOW]: {
    label: 'Flow',
    message: 'Momentum is here. Keep your rhythm.',
    progressRange: [0.3, 0.7],
    ringColorClass: 'stage-flow',
  },
  [STAGE.FINAL]: {
    label: 'Final Push',
    message: 'Protect this finish. End strong.',
    progressRange: [0.7, 1],
    ringColorClass: 'stage-final',
  },
}
