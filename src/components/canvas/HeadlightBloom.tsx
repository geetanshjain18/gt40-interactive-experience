/* oxlint-disable react/immutability -- The postprocessing pass owns renderer statistics during its lifetime. */
/**
 * HeadlightBloom — selective HDR bloom.
 *
 * Bloom strength is driven by headlightCurve(t) during ignition,
 * so the bloom contribution ramps in unison with the emissive and spotlight.
 * After ignition settles (t > 2.6) we drop to a minimal ambient bloom.
 * On slow devices (>50 slow frames) post-processing is disabled automatically.
 */
import type { Motion } from '../../config/choreography'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector2, WebGLRenderTarget, HalfFloatType } from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass }     from 'three/addons/postprocessing/OutputPass.js'
import { CHOREOGRAPHY as C, headlightCurve, smooth } from '../../config/choreography'

/** HDR threshold keeps painted roundels below bloom; mobile bypasses all postprocessing. */
export function HeadlightBloom({ motion }: { motion: React.RefObject<Motion> }) {
  const { gl, scene, camera, size } = useThree()
  const slow     = useRef(0)
  const disabled = useRef(false)

  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl, new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 }))
    const render   = new RenderPass(scene, camera)
    // threshold=10 means only truly HDR emissive pixels bloom (not the car paint)
    const bloom    = new UnrealBloomPass(new Vector2(512, 512), 0.0, 0.30, 10)
    const output   = new OutputPass()
    composer.addPass(render)
    composer.addPass(bloom)
    composer.addPass(output)
    return { composer, bloom, output }
  }, [gl, scene, camera])

  useEffect(() => {
    pipeline.composer.setSize(size.width, size.height)
    pipeline.composer.setPixelRatio(gl.getPixelRatio())
  }, [pipeline, size, gl])

  useEffect(() => {
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
      pipeline.bloom.dispose()
      pipeline.output.dispose()
      pipeline.composer.dispose()
    }
  }, [pipeline, gl])

  useFrame((_, dt) => {
    // Adaptive quality: disable post if too many slow frames
    if (dt > 0.028) slow.current++
    else slow.current = Math.max(0, slow.current - 1)
    if (slow.current > 50) disabled.current = true

    gl.info.reset()

    const m=motion.current
    const time=m.active?m.time:m.readyTime
    const lamps=headlightCurve(time,m.active)
    const bloomStrength=smooth(lamps)*.16
    pipeline.bloom.strength=bloomStrength


    if (disabled.current || gl.getPixelRatio() < 1 || (m.active && m.time >= C.duration)) {
      gl.render(scene, camera)
    } else {
      pipeline.composer.render(dt)
    }
  }, 1)

  return null
}
