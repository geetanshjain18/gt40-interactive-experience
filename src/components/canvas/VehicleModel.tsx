/* oxlint-disable react/immutability -- Animate only the cloned headlight material owned by Three. */
/**
 * VehicleModel â€” loads and renders the GT40 GLB.
 *
 * Headlight ignition is driven by headlightCurve(t) from choreography.ts,
 * producing a physically-staged ramp:
 *   pre-glow â†’ crank sags â†’ engine catch â†’ overshoot â†’ settle
 *
 * All headlight properties (emissive, spotlights, floor pool) are derived
 * from the same normalised intensity so they ramp in unison.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Motion } from '../../config/choreography'
import { CHOREOGRAPHY as C, headlightCurve } from '../../config/choreography'
import { EXPERIENCE_CONFIG } from '../../config/experience'

export interface VehicleBounds { length: number; width: number; height: number; targetY: number }

export function VehicleModel({
  onReady, onGeometry, onError, motion, ready,
}: {
  motion:     React.RefObject<Motion>
  ready:      boolean
  onReady:    () => void
  onGeometry: (bounds: VehicleBounds) => void
  onError:    (message: string) => void
}) {
  const { scene }                        = useGLTF(EXPERIENCE_CONFIG.model.path)
  const { gl, scene: world, camera, invalidate } = useThree()
  const warm                             = useRef({ compiled: false, frames: 0, reported: false })

  const data = useMemo(() => {
    scene.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m.name === 'GT40_Glass_Smoked' || m.name === 'GT40_Lens_Clear') {
          (m as THREE.MeshStandardMaterial).forceSinglePass = true
        }
      }
    })
    scene.updateMatrixWorld(true)
    // Precise vertex bounds matter here: transformed wheel AABBs otherwise
    // inflate the vertical extent and lift the actual tyres clear of the floor.
    const bounds = new THREE.Box3().setFromObject(scene, true)
    const size   = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    const meta: unknown = scene.userData.gt40PresentationCenter
    const xz = Array.isArray(meta) && meta.length === 3 && meta.every(Number.isFinite)
      ? meta as number[]
      : [center.x, 0, center.z]
    const wheelContacts = new Map<string, { y: number; x: number }>()
    scene.traverse(o => {
      if (!(o instanceof THREE.Mesh) || !/^GT40_Wheel(?:FL|FR|BL|BR)$/.test(o.parent?.name ?? '')) return
      const materials = Array.isArray(o.material) ? o.material : [o.material]
      if (!materials.some(material => material.name === 'GT40_Tyre_Rubber')) return
      const tireBounds = new THREE.Box3().setFromObject(o, true)
      const wheel = o.parent!.name
      const prior = wheelContacts.get(wheel)
      wheelContacts.set(wheel, { y: Math.min(prior?.y ?? Infinity, tireBounds.min.y), x: tireBounds.getCenter(new THREE.Vector3()).x })
    })
    const contacts = [...wheelContacts.values()]
    const meanY = contacts.length ? contacts.reduce((sum, contact) => sum + contact.y, 0) / contacts.length : bounds.min.y
    const meanX = contacts.length ? contacts.reduce((sum, contact) => sum + contact.x, 0) / contacts.length : xz[0]
    const varianceX = contacts.reduce((sum, contact) => sum + (contact.x - meanX) ** 2, 0)
    const covariance = contacts.reduce((sum, contact) => sum + (contact.x - meanX) * (contact.y - meanY), 0)
    const groundPitch = wheelContacts.size === 4 && varianceX > 0 ? -Math.atan(covariance / varianceX) : 0
    const contactPlane = wheelContacts.size === 4
      ? meanY + Math.tan(groundPitch) * (meanX - xz[0])
      : bounds.min.y
    const scale = EXPERIENCE_CONFIG.model.targetLength / size.x
    return {
      offset: [-xz[0], -contactPlane, -xz[2]] as [number, number, number],
      groundPitch,
      scale,
      bounds: {
        length:  size.x * scale,
        width:   size.z * scale,
        height:  size.y * scale,
        targetY: size.y * scale / 2,
      },
    }
  }, [scene])

  // â”€â”€ Clone headlight materials so we can animate without touching the shared asset â”€â”€
  const headlightMaterials = useRef<THREE.MeshStandardMaterial[]>([])
  const lampUniforms = useRef<{left:THREE.IUniform<number>;right:THREE.IUniform<number>}[]>([])

  useEffect(() => {
    const originals: { mesh: THREE.Mesh; material: THREE.Material | THREE.Material[] }[] = []
    for (const name of ['GT40_HeadLights', 'GT40_HeadLightGlass']) {
      scene.getObjectByName(name)?.traverse(o => {
        if (!(o instanceof THREE.Mesh)) return
        originals.push({ mesh: o, material: o.material })
        const list = (Array.isArray(o.material) ? o.material : [o.material]).map(m => {
          const copy = m.clone() as THREE.MeshStandardMaterial
          const emitter = name === 'GT40_HeadLights'
          copy.emissive.set(emitter ? '#fff1d5' : '#000000')
          copy.emissiveIntensity = 0
          if (name === 'GT40_HeadLightGlass') copy.opacity = 0.35

          // Restrict emission to the physical bulb centres, not the flat lens surround.
          copy.onBeforeCompile = shader => {
            if (!emitter) return
            const lampGlow = { left: { value: 0 }, right: { value: 0 } }
            lampUniforms.current.push(lampGlow)
            shader.vertexShader = 'varying vec3 lampWorld;\n' + shader.vertexShader
            shader.vertexShader = shader.vertexShader.replace(
              '#include <worldpos_vertex>',
              '#include <worldpos_vertex>\nlampWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
            )
            shader.fragmentShader = 'varying vec3 lampWorld;\nuniform float leftGlow;\nuniform float rightGlow;\n' + shader.fragmentShader
            shader.uniforms.leftGlow = lampGlow.left
            shader.uniforms.rightGlow = lampGlow.right
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              // Mask emission to the actual bulb area measured from GLB world space:
              // headlight world X â‰ˆ Â±0.843, world Y â‰ˆ 0.133 (after scale 0.486 + yaw -Ï€/2)
              // Allow Â±0.06 radius around each bulb centre
              '#include <emissivemap_fragment>\n' +
              // Tire grounding offsets the raw GLB to world Y≈.59. The former
              // Y=.79 mask sat above the lamp mesh and matched no fragments.
              'float bulbL0 = length(vec2(lampWorld.x - 0.70, lampWorld.y - 0.59));\n' +
              'float bulbL1 = length(vec2(lampWorld.x - 0.48, lampWorld.y - 0.59));\n' +
              'float bulbR0 = length(vec2(lampWorld.x + 0.70, lampWorld.y - 0.59));\n' +
              'float bulbR1 = length(vec2(lampWorld.x + 0.48, lampWorld.y - 0.59));\n' +
              'float bulbMaskL = 1.0 - smoothstep(0.035, 0.12, min(bulbL0, bulbL1));\n' +
              'float bulbMaskR = 1.0 - smoothstep(0.035, 0.12, min(bulbR0, bulbR1));\n' +
              'totalEmissiveRadiance *= max(bulbMaskL * leftGlow, bulbMaskR * rightGlow);',
            )
          }
          copy.customProgramCacheKey = () => 'gt40-bulb-mask-grounded-v2'
          headlightMaterials.current.push(copy)
          return copy
        })
        o.material = Array.isArray(o.material) ? list : list[0]
      })
    }
    return () => {
      for (const { mesh, material } of originals) mesh.material = material
      for (const m of headlightMaterials.current) m.dispose()
      headlightMaterials.current = []
      lampUniforms.current = []
    }
  }, [scene])

  useEffect(() => {
    let cancelled = false
    onGeometry(data.bounds)
    warm.current = { compiled: false, frames: 0, reported: false }
    gl.compileAsync(world, camera).then(() => {
      if (!cancelled) { warm.current.compiled = true; invalidate() }
    }).catch(() => {
      if (!cancelled) onError('The 3D materials could not be prepared. Please retry.')
    })
    return () => { cancelled = true }
  }, [gl, world, camera, data, onGeometry, onError, invalidate])

  useFrame(() => {
    const active = motion.current.active
    const t = active ? motion.current.time : motion.current.readyTime

    // â”€â”€ Headlight ignition: drive emissive from the centralised curve â”€â”€â”€â”€â”€â”€
    if (ready) {
      const emInt = C.headlight.emissiveScale
      for (const m of headlightMaterials.current) m.emissiveIntensity = emInt
      const left = active ? headlightCurve(t, true) : headlightCurve(t, false)
      const right = left
      for (const u of lampUniforms.current) { u.left.value = left; u.right.value = right }
    } else {
      for (const m of headlightMaterials.current) m.emissiveIntensity = 0
      for (const u of lampUniforms.current) { u.left.value=0; u.right.value=0 }
    }

    // Shader warm-up gate
    if (!warm.current.compiled || warm.current.reported) return
    if (++warm.current.frames >= 3) { warm.current.reported = true; onReady() }
    else invalidate()
  })

  return (
    <group
      name="GT40Vehicle"
      scale={data.scale}
      rotation={[0, EXPERIENCE_CONFIG.model.yawOffset, 0]}
      dispose={null}
    >
      <group rotation={[0, 0, data.groundPitch]}>
        <primitive object={scene} position={data.offset} />
      </group>
    </group>
  )
}

useGLTF.preload(EXPERIENCE_CONFIG.model.path)
