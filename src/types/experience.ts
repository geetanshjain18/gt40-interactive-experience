export interface ExperienceConfig {
  theme: {
    bg: string
    surface: string
    text: string
    text2: string
    accent: string
    divider: string
    background: string
    textMain: string
    textSecondary: string
    floor: string
    muted: string
    blue: string
    racingWhite: string
    dividerStrong: string
  }
  framing: {
    // Opening orientation (formerly 4th view composition: passenger front 3/4)
    openingRotationY: number
    // Full continuous rotation sweep in radians across 100% scroll
    totalRotationSweep: number
    // World Y offset applied to camera target to position visual center ~46-47% down viewport
    targetOffsetY: number
    cameraDistanceDesktop: number
    cameraDistanceMobile: number
    cameraFovDesktop: number
    cameraFovMobile: number
  }
  model: {
    path: string
    scale: number
    yawOffset: number
    centerOffset: [number, number, number]
    targetLength: number
  }
  lighting: {
    keyLightColor: string
    keyLightIntensity: number
    keyLightPosition: [number, number, number]
    rimLightColor: string
    rimLightIntensity: number
    rimLightPosition: [number, number, number]
    fillLightColor: string
    fillLightIntensity: number
    fillLightPosition: [number, number, number]
    ambientIntensity: number
  }
  performance: {
    dprDesktop: number
    dprMobile: number
    shadowMapSize: number
  }
  scroll: {
    totalHeightVh: number
  }
}
