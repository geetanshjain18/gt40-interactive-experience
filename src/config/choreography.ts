// GT40 Gulf study timing, lighting, and the continuous front-to-story camera path.
export const CHOREOGRAPHY = {
  duration: 5,
  scrollHeightVh: 620,
  damping: 13,
  timing: { crank: .10, catch: .55, reveal: .90, silhouette: 2.5, label: 2.8, headline: 3.1, support: 3.7, scroll: 4.2 },
  colors: { black: '#020304', studio: '#071017', floor: '#101a1e' },
  lighting: { environment: .68, key: 7.5, rim: 2.35, fill: .9, warm: 1.2, headlights: 3 },
  quality: { desktopDpr: 1.35, mobileDpr: .9, minimumDpr: .75, slowFrame: .028 },
  frontView: { position: [0, 1.1, 5.1] as [number,number,number], target: [0,.70,0] as [number,number,number], fov: 36 },
  headlightRig: {
    // Measured from transformed GLB lamp cups after tire grounding.
    leftPos: [ .70,.59,1.96] as [number,number,number],
    rightPos: [-.70,.59,1.96] as [number,number,number],
    beamTargetZ: 4.5, beamTargetY: -.03,
  },
  headlight: { preGlow: .62, preGlowDuration: 2.0, emissiveScale: 20, spotlightScale: 2.5, beamAngleFull: .24, beamAngleDim: .15, beamDistanceDim: 5.5, beamDistanceFull: 8.5 },
  // Camera positions are measured from the centered world-space model. First point is frontView.
  cameraPath: [
    [0,1.1,5.1], [0,.95,6.2], [2.0,1.0,5.5], [7.2,1.35,.15],
    [1.7,1.55,.3], [2.8,2.8,-1.0], [1.4,1.45,-3.8], [-.4,3.0,-5.0], [-4.0,2.6,.2], [-1.8,1.25,6.1],
  ] as [number,number,number][],
  targetPath: [
    [0,.70,0], [0,.65,0], [0,.66,0], [0,.65,0], [0,1.0,-.35],
    [0,1.05,-1.0], [0,1.05,-1.30], [0,.65,-1.0], [0,.75,0], [0,.64,0],
  ] as [number,number,number][],
  interiorShots: [
    { position:[1.7,1.55,.3] as [number,number,number], target:[0,1.0,-.35] as [number,number,number], fov:36 },
    { position:[1.5,1.42,.2] as [number,number,number], target:[0,.95,-.3] as [number,number,number], fov:36 },
  ],
  engineShots: [
    { position:[-.72,1.45,-3.6] as [number,number,number], target:[0,1.05,-1.3] as [number,number,number], fov:36 },
    { position:[.72,1.38,-3.4] as [number,number,number], target:[0,1.0,-1.2] as [number,number,number], fov:36 },
  ],
  chapters: [
    { title:'AWAKENING', copy:'Born from a refusal to lose.', rest:.08 },
    { title:'THE CHALLENGER', copy:'Built to defeat Ferrari.', rest:.20 },
    { title:'SHAPED BY SPEED', copy:'Every curve in service of the straight.', rest:.34 },
    { title:'INSIDE THE MACHINE', copy:'A singular focus. The road ahead.', rest:.46 },
    { title:'POWER BEHIND THE VICTORY', copy:'Endurance begins beneath the surface.', rest:.69 },
    { title:'THE LEGEND', copy:'Two victories. One chassis. An enduring legend.', rest:.98 },
  ],
} as const
export const smooth = (v:number) => { const t=Math.max(0,Math.min(1,v)); return t*t*(3-2*t) }
export const easeOut = (v:number) => { const t=Math.max(0,Math.min(1,v)); return 1-(1-t)*(1-t)*(1-t) }
export const easeInOut = (v:number) => { const t=Math.max(0,Math.min(1,v)); return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2 }
export const lerp = (a:number,b:number,t:number) => a+(b-a)*t
/** Continuous lamp output: soft electrical arrival, cranking dip, catch overshoot, stable idle. */
export function headlightCurve(t:number, ignition:boolean):number {
  const pre = CHOREOGRAPHY.headlight.preGlow
  if (!ignition) return pre*smooth(t/CHOREOGRAPHY.headlight.preGlowDuration)
  if (t<.38) return lerp(pre,pre*.72,smooth(t/.38))
  if (t<.68) return pre*.72
  if (t<1.08) return lerp(pre*.72,1.08,easeOut((t-.68)/.40))
  if (t<1.38) return lerp(1.08,1,smooth((t-1.08)/.30))
  return 1
}
export interface Motion { time:number; readyTime:number; progress:number; target:number; active:boolean }

