import type { ExperienceConfig } from '../types/experience'

// ─── CONFIGURATION & SOURCE OF TRUTH ─────────────────────────────────────────
// GT40 / GULF STUDY
// Theme below is shared with the CSS palette. Camera motion lives in choreography.ts.
//
// GT40 preview: raw length 9.87856, height 2.86381, width 4.07202.
// Scale 0.486 yields length 4.80098. Offset lifts the tire minimum to Y=0.
// Loader centers the horizontal bounds and aligns +X forward to +Z.

export const EXPERIENCE_CONFIG: ExperienceConfig = {
  theme: {
    bg: '#070A0D',
    surface: '#0D1217',
    text: '#F3EFE6',
    text2: '#8D99A3',
    accent: '#F36C21',
    divider: 'rgba(238, 237, 229, 0.12)',
    background: '#070A0D',
    textMain: '#F3EFE6',
    textSecondary: '#8D99A3',
    floor: '#080A0C',
    muted: '#65717B',
    blue: '#74B9D2',
    racingWhite: '#EEEDE5',
    dividerStrong: 'rgba(238, 237, 229, 0.22)',
  },
  framing: {
    // Fourth view angle composition (~332° / 5.80 rad passenger front 3/4) as new opening
    openingRotationY: 5.80,
    // Smooth 360° continuous rotation across 100% scroll
    totalRotationSweep: 2 * Math.PI,
    // Shifts camera target upward in world space, framing car ~8-10% lower in viewport
    targetOffsetY: -0.10,
    cameraDistanceDesktop: 7.2,
    cameraDistanceMobile: 15.2,
    cameraFovDesktop: 36,
    cameraFovMobile: 44,
  },
  model: {
    path: `${import.meta.env.BASE_URL}models/gt40-gulf-number-6.glb`,
    scale: 0.486,
    yawOffset: -Math.PI / 2,
    centerOffset: [0, 0.494227509, 0],
    targetLength: 4.80,
  },
  lighting: {
    keyLightColor: '#FFFFFF',
    keyLightIntensity: 1.5,
    keyLightPosition: [4, 7, 5],
    rimLightColor: '#ABB7C4',
    rimLightIntensity: 1.0,
    rimLightPosition: [-6, 4.5, -4],
    fillLightColor: '#ECEFF2',
    fillLightIntensity: 0.65,
    fillLightPosition: [0, 2, 6],
    ambientIntensity: 0.45,
  },
  performance: {
    dprDesktop: 1.5,
    dprMobile: 1.25,
    shadowMapSize: 1024,
  },
  scroll: {
    totalHeightVh: 350,
  },
}
