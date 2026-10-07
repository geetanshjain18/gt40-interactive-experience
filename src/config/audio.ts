export const AUDIO = {
  paths: {
    click: `${import.meta.env.BASE_URL}audio/start-engine-button-click.mp3`,
    start: `${import.meta.env.BASE_URL}audio/gt40-engine-start.mp3`,
    idle: `${import.meta.env.BASE_URL}audio/gt40-engine-idle-loop.mp3`,
    rev: `${import.meta.env.BASE_URL}audio/gt40-engine-rev.mp3`,
  },
  starterDelay: .10,
  crossfade: .60,
  revReturnFade: .48,
  startVolume: .22,
  idleVolume: .28,
  revVolume: .12,
  click: .18,
} as const
