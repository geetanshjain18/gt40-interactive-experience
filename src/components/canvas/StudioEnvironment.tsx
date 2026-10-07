/* oxlint-disable react/immutability -- Lighting refs are animation targets. */
/**
 * StudioEnvironment â€” all scene lighting.
 *
 * HEADLIGHT RIG: Two spotlights positioned at the measured headlight world
 * positions [Â±0.843, 0.133, -1.978]. Beams point forward (world -Z from car nose,
 * so in the direction camera is looking FROM). Floor pools are computed from the
 * exact beam-axis intersection with y=0.
 *
 * All headlight elements driven by the single headlightCurve(t):
 *   emissive material (VehicleModel)
 *   spotlights (here)
 *   floor pools (StudioFloor)
 *   bloom (HeadlightBloom)
 */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as T from 'three'
import type { Motion } from '../../config/choreography'
import {
  CHOREOGRAPHY as C,
  smooth,
  easeInOut,
  headlightCurve,
} from '../../config/choreography'
import { StudioFloor } from './StudioFloor'

const STUDIO_COLOR = new T.Color('#071820')

// Beam geometry: spot at [x, y, z], pointing toward [x, beamTargetY, beamTargetZ]
// Floor pool center = where beam axis hits y=0
function beamFloorHit(
  ox: number, oy: number, oz: number,
  tx: number, ty: number, tz: number,
): [number, number] {
  // Parametric: P = O + t*(T-O), find t when y=0
  const dy = ty - oy
  if (Math.abs(dy) < 0.0001) return [ox, oz]
  const tParam = -oy / dy
  return [ox + tParam * (tx - ox), oz + tParam * (tz - oz)]
}

export function StudioEnvironment({
  motion, ready, reduced, isMobile,
}: {
  motion:   React.RefObject<Motion>
  ready:    boolean
  reduced:  boolean
  isMobile: boolean
}) {
  // Studio lights
  const key    = useRef<T.SpotLight>(null)
  const rim    = useRef<T.DirectionalLight>(null)
  const fill   = useRef<T.DirectionalLight>(null)
  const warm   = useRef<T.PointLight>(null)
  // A narrow, low-power key lets the bonnet register during the hidden-car
  // introduction without lifting the rest of the studio out of blackout.
  const bonnetKey = useRef<T.SpotLight>(null)
  // Headlight spotlights
  const leftSpot  = useRef<T.SpotLight>(null)
  const rightSpot = useRef<T.SpotLight>(null)
  // Interior chapter lights
  const intKey = useRef<T.PointLight>(null)
  const intRim = useRef<T.DirectionalLight>(null)
  // Engine chapter fill
  const engFill = useRef<T.PointLight>(null)

  const aim     = useMemo(() => new T.Object3D(), [])
  const bonnetAim = useMemo(() => {
    const o = new T.Object3D()
    o.position.set(0, 0.64, 1.35)
    return o
  }, [])
  const beamAim = useMemo(() => {
    const o = new T.Object3D()
    // Beam target: forward from headlight position in world space
    // Headlights at z=-1.978, beams point toward z=beamTargetZ=-4.5 (away from camera)
    o.position.set(0, C.headlightRig.beamTargetY, C.headlightRig.beamTargetZ)
    return o
  }, [])

  // Pre-compute floor pool centers from beam geometry
  const leftPoolXZ  = beamFloorHit(
    C.headlightRig.leftPos[0],  C.headlightRig.leftPos[1],  C.headlightRig.leftPos[2],
    C.headlightRig.leftPos[0],  C.headlightRig.beamTargetY, C.headlightRig.beamTargetZ,
  )
  const rightPoolXZ = beamFloorHit(
    C.headlightRig.rightPos[0], C.headlightRig.rightPos[1], C.headlightRig.rightPos[2],
    C.headlightRig.rightPos[0], C.headlightRig.beamTargetY, C.headlightRig.beamTargetZ,
  )

  useFrame(({ scene, gl }) => {
    const t = motion.current.time
    const p = motion.current.progress

    // â”€â”€ Scene reveal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const preReveal = ready
      ? smooth(motion.current.readyTime / C.headlight.preGlowDuration) * .008
      : 0
    // Carry the exact pre-ignition level through the click, then begin the
    // wider studio reveal after the starter catches.
    const ignitionReveal = motion.current.active
      ? preReveal + (1 - preReveal) * smooth((t - .78) / 1.72)
      : preReveal
    const r = ignitionReveal
    const story = smooth(p / .45)
    const travel = reduced ? 1 : smooth((t - .9) / 1.6)

    scene.environmentIntensity = r * C.lighting.environment
    if (scene.fog instanceof T.Fog)
      (scene.fog as T.Fog).color.set(C.colors.black).lerp(STUDIO_COLOR, r)

    // Exposure pulse at engine catch
    const catchPulse = .10 * Math.exp(-Math.pow((t-.55)/.11,2))
    gl.toneMappingExposure = .72 + .28 * r + catchPulse * (motion.current.active ? 1 : 0)

    if (key.current) {
      key.current.position.set(2 + 3 * story, 4.5, 4 - 7 * travel)
      key.current.intensity = C.lighting.key * r * (1 - .22 * story)
      aim.position.set(0, 0.60, 2 - 3 * travel)
      aim.updateMatrixWorld()
    }
    if (rim.current) rim.current.intensity = C.lighting.rim * r * (.75 + .25 * smooth(p/.32))
    if (fill.current) fill.current.intensity = C.lighting.fill * r
    if (warm.current) warm.current.intensity = C.lighting.warm * r

    // Keep the studio concealed before ignition, but let a soft overhead
    // reflection trace only the bonnet. Fade it out as the full reveal starts.
    if (bonnetKey.current) {
      const preWarm = ready
        ? .6 + .4 * smooth(motion.current.readyTime / C.headlight.preGlowDuration)
        : 0
      const handoff = motion.current.active ? 1 - smooth((t - .78) / .65) : 1
      bonnetKey.current.intensity = .82 * preWarm * handoff
    }

    // â”€â”€ Headlight spotlights â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const lampTime = motion.current.active ? t : motion.current.readyTime
    const hlNorm = ready ? Math.max(0, headlightCurve(lampTime, motion.current.active)) : 0
    const beamAngle = C.headlight.beamAngleDim + (C.headlight.beamAngleFull-C.headlight.beamAngleDim)*smooth(hlNorm)
    const beamDistance = C.headlight.beamDistanceDim + (C.headlight.beamDistanceFull-C.headlight.beamDistanceDim)*smooth(hlNorm)
    const leftNorm = ready ? headlightCurve(motion.current.active?t:motion.current.readyTime, motion.current.active) : 0
    const rightNorm = leftNorm
    for (const [l,value] of [[leftSpot.current,leftNorm],[rightSpot.current,rightNorm]] as const) {
      if (!l) continue
      l.intensity = value * C.headlight.spotlightScale
      l.angle = beamAngle
      l.distance = beamDistance
    }

    // â”€â”€ Interior lighting (Chapter 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const ic = C.chapters[3]
    const interiorStart = ic.rest - 0.07
    const interiorEnd   = ic.rest + 0.09
    const interiorBlend =
      easeInOut(Math.max(0, Math.min(1, (p - interiorStart) / 0.05))) *
      easeInOut(Math.max(0, Math.min(1, (interiorEnd - p) / 0.05)))

    if (intKey.current)  intKey.current.intensity  = 2.5 * interiorBlend
    if (intRim.current)  intRim.current.intensity  = 1.6 * interiorBlend

    // â”€â”€ Engine fill (Chapter 3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const ec = C.chapters[4]
    const engineStart = ec.rest - 0.07
    const engineEnd   = ec.rest + 0.09
    const engineBlend =
      easeInOut(Math.max(0, Math.min(1, (p - engineStart) / 0.05))) *
      easeInOut(Math.max(0, Math.min(1, (engineEnd - p) / 0.05)))

    if (engFill.current) engFill.current.intensity = 4.0 * engineBlend
  })

  return (
    <>
      <Environment resolution={isMobile ? 128 : 256} environmentIntensity={0}>
        <Lightformer intensity={3.3} scale={[8, 2, 1]} position={[2, 6, 2]} target={[0, 0.6, 0]} color="#d8c8a8" />
        <Lightformer intensity={2.1} scale={[7, 1.4, 1]} position={[-4, 3, -4]} target={[0, 0.6, 0]} color="#b4c6d0" />
        <Lightformer intensity={1.1} scale={[5, 3, 1]} position={[5, 2, 4]} target={[0, 0.5, 0]} color="#eee9df" />
      </Environment>

      <primitive object={aim} />
      <primitive object={bonnetAim} />
      <primitive object={beamAim} />

      {/* Studio key */}
      <spotLight ref={key} intensity={0} target={aim} angle={0.75} penumbra={1} decay={2} />
      {/* Faint bonnet-only fill during the pre-ignition introduction. */}
      <spotLight
        name="gt40-pre-ignition-bonnet-fill"
        ref={bonnetKey}
        position={[0, 2.25, 3.5]}
        target={bonnetAim}
        intensity={0}
        color="#c8c4b6"
        angle={0.44}
        penumbra={0.96}
        distance={4.2}
        decay={2}
      />
      {/* Rim */}
      <directionalLight ref={rim}  intensity={0} position={[-4, 4, -4]} color="#b4c6d0" />
      {/* Fill */}
      <directionalLight ref={fill} intensity={0} position={[4, 2, 5]} color="#eee9df" />
      {/* Warm point */}
      <pointLight ref={warm} intensity={0} position={[-1, 1, 3]} color="#b36a35" distance={5} />

      {/* Headlight spotlights â€” at measured headlight world positions */}
      {/* Left (driver's side, positive X) */}
      <spotLight
        name="gt40-headlight-left"
        ref={leftSpot}
        position={C.headlightRig.leftPos}
        target={beamAim}
        intensity={0}
        color="#ffe7c3"
        angle={C.headlight.beamAngleDim}
        penumbra={0.8}
        distance={10}
        decay={2}
      />
      {/* Right (passenger's side, negative X) */}
      <spotLight
        name="gt40-headlight-right"
        ref={rightSpot}
        position={C.headlightRig.rightPos}
        target={beamAim}
        intensity={0}
        color="#ffe7c3"
        angle={C.headlight.beamAngleDim}
        penumbra={0.8}
        distance={10}
        decay={2}
      />

      {/* Interior soft key â€” warm, above cockpit */}
      <pointLight ref={intKey} intensity={0} position={[0, 1.4, 0.2]} color="#ffe8cc" distance={2.5} decay={2} />
      {/* Interior rim â€” cool, from side */}
      <directionalLight ref={intRim} intensity={0} position={[1.8, 1.2, 0.4]} color="#c8dae8" />
      {/* Engine bay fill â€” warm, from above rear */}
      <pointLight ref={engFill} intensity={0} position={[0, 1.8, 2.0]} color="#f0d9b0" distance={3.5} decay={2} />

      {/* Floor with mathematically computed pool positions */}
      <StudioFloor
        motion={motion}
        isMobile={isMobile}
        leftPoolXZ={leftPoolXZ}
        rightPoolXZ={rightPoolXZ}
      />
    </>
  )
}

