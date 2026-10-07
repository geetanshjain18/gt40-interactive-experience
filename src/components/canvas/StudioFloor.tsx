import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Motion } from '../../config/choreography'
import { CHOREOGRAPHY as C, headlightCurve } from '../../config/choreography'

function createStudioSweep() {
  const geometry = new THREE.BufferGeometry()
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const widthSegments = 16
  const profile: [number, number][] = []
  for (let z = 30; z >= -8; z -= 2) profile.push([z, 0])
  const radius = 3
  for (let i = 1; i <= 12; i++) {
    const a = (Math.PI / 2) * (i / 12)
    profile.push([-8 - radius * Math.sin(a), radius * (1 - Math.cos(a))])
  }
  for (let y = 3.5; y <= 18; y += .5) profile.push([-11, y])

  const near = new THREE.Color('#101a1e')
  const mid = new THREE.Color('#0b2028')
  const far = new THREE.Color('#071017')
  const warm = new THREE.Color('#211711')
  for (const [z, y] of profile) {
    const depth = THREE.MathUtils.smoothstep(-z, 1, 18)
    const vertical = THREE.MathUtils.smoothstep(y, 1, 8)
    const floorTone = near.clone().lerp(mid, depth * .42).lerp(far, depth * .50)
    const wallTone = mid.clone().lerp(far, vertical * .72)
    const base = floorTone.clone().lerp(wallTone, THREE.MathUtils.smoothstep(y, 0, 3))
    for (let xIndex = 0; xIndex <= widthSegments; xIndex++) {
      const x = -30 + (60 * xIndex / widthSegments)
      const warmFalloff = Math.exp(-((x - .55) ** 2 / 8 + (z - 1.2) ** 2 / 20)) * (1 - vertical)
      const coolFalloff = Math.exp(-((x + 1.1) ** 2 / 14 + (z + .6) ** 2 / 32)) * (1 - vertical)
      const vertex = base.clone().lerp(warm, warmFalloff * .13).lerp(new THREE.Color('#132a32'), coolFalloff * .16)
      positions.push(x, y, z)
      colors.push(vertex.r, vertex.g, vertex.b)
    }
  }
  for (let row = 0; row < profile.length - 1; row++) {
    for (let col = 0; col < widthSegments; col++) {
      const a = row * (widthSegments + 1) + col
      const b = a + widthSegments + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  geometry.setIndex(indices)
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function StudioFloor({ motion, isMobile = false, leftPoolXZ = [.7, 4.5], rightPoolXZ = [-.7, 4.5] }: {
  motion?: React.RefObject<Motion>
  isMobile?: boolean
  leftPoolXZ?: [number, number]
  rightPoolXZ?: [number, number]
}) {
  const shadowTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 5, 128, 128, 120)
    g.addColorStop(0, 'rgba(0,0,0,.48)')
    g.addColorStop(.38, 'rgba(0,0,0,.24)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(canvas)
  }, [])
  useEffect(() => () => shadowTex.dispose(), [shadowTex])

  const poolTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 192
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(128, 96, 3, 128, 96, 94)
    g.addColorStop(0, 'rgba(255,238,202,.42)')
    g.addColorStop(.36, 'rgba(255,221,168,.22)')
    g.addColorStop(.76, 'rgba(255,198,128,.06)')
    g.addColorStop(1, 'rgba(255,190,120,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 192)
    return new THREE.CanvasTexture(canvas)
  }, [])
  useEffect(() => () => poolTex.dispose(), [poolTex])

  const ground = useMemo(() => createStudioSweep(), [])
  useEffect(() => () => ground.dispose(), [ground])
  const floorMat = useRef<THREE.MeshBasicMaterial>(null)
  const leftMat = useRef<THREE.MeshBasicMaterial>(null)
  const rightMat = useRef<THREE.MeshBasicMaterial>(null)
  const leftMesh = useRef<THREE.Mesh>(null)
  const rightMesh = useRef<THREE.Mesh>(null)
  const blueMat = useRef<THREE.MeshBasicMaterial>(null)
  const warmMat = useRef<THREE.MeshBasicMaterial>(null)
  const blueTex = useMemo(() => makeGlowTexture('#7cc1d8', 40), [])
  const warmTex = useMemo(() => makeGlowTexture('#f26a21', 26), [])
  useEffect(() => () => { blueTex.dispose(); warmTex.dispose() }, [blueTex, warmTex])
  const blackout = useMemo(() => new THREE.Color('#020304'), [])
  const clear = useMemo(() => new THREE.Color('#ffffff'), [])

  useFrame(() => {
    if (!motion) return
    const active = motion.current.active
    const t = active ? motion.current.time : motion.current.readyTime
    const settled = motion.current.time >= C.duration
    const reveal = settled ? 1 : active ? THREE.MathUtils.smoothstep(t, .82, 2.85) : 0
    floorMat.current?.color.copy(blackout).lerp(clear, reveal)
    const lamp = Math.max(0, headlightCurve(t, active))
    // Keep the pool continuous at the click; the lamp curve supplies the main
    // voltage dip, with only a small eased floor-reflection dip layered on top.
    const crank = active
      ? 1 - .08 * THREE.MathUtils.smoothstep(t, 0, .14) * (1 - THREE.MathUtils.smoothstep(t, .38, .68))
      : 1
    const pool = lamp * crank * (isMobile ? .085 : .12)
    if (leftMat.current) leftMat.current.opacity = pool
    if (rightMat.current) rightMat.current.opacity = pool
    const spread = .74 + .26 * Math.min(1, lamp)
    leftMesh.current?.scale.set(spread, spread, 1)
    rightMesh.current?.scale.set(spread, spread, 1)
    const blueReveal = settled ? .22 : active ? THREE.MathUtils.smoothstep(t, 1.35, 2.85) * .22 : 0
    const warmReveal = settled ? .20 : active ? THREE.MathUtils.smoothstep(t, 1.3, 2.8) * .20 : 0
    if (blueMat.current) blueMat.current.opacity = blueReveal * (isMobile ? .75 : 1)
    if (warmMat.current) warmMat.current.opacity = warmReveal * (isMobile ? .6 : 1)
  })

  return <>
    <mesh geometry={ground}>
      <meshBasicMaterial ref={floorMat} color="#020304" vertexColors side={THREE.DoubleSide} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .0015, .05]}>
      <planeGeometry args={[7.2, 5.5]} />
      <meshBasicMaterial ref={blueMat} map={blueTex} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[.38, .002, 2.55]}>
      <planeGeometry args={[5.4, 4.2]} />
      <meshBasicMaterial ref={warmMat} map={warmTex} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .001, 0]}>
      <planeGeometry args={[5.2, 2.4]} />
      <meshBasicMaterial map={shadowTex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
    {[[.78, 1.2], [-.78, 1.2], [.75, -1.51], [-.75, -1.51]].map(([x, z], i) =>
      <mesh key={`contact-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, .0014, z]}>
        <planeGeometry args={[.66, .9]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={.78} depthWrite={false} toneMapped={false} />
      </mesh>,
    )}
    <mesh ref={leftMesh} rotation={[-Math.PI / 2, 0, 0]} position={[leftPoolXZ[0], .002, leftPoolXZ[1]]}>
      <planeGeometry args={[2.2, 3.6]} />
      <meshBasicMaterial ref={leftMat} map={poolTex} transparent opacity={0} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
    </mesh>
    <mesh ref={rightMesh} rotation={[-Math.PI / 2, 0, 0]} position={[rightPoolXZ[0], .002, rightPoolXZ[1]]}>
      <planeGeometry args={[2.2, 3.6]} />
      <meshBasicMaterial ref={rightMat} map={poolTex} transparent opacity={0} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
    </mesh>
  </>
}

function makeGlowTexture(color: string, alpha: number) {
  const size = 128
  const data = new Uint8Array(size * size * 4)
  const hex = Number.parseInt(color.slice(1), 16)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x - 63.5) / 62
    const dy = (y - 63.5) / 62
    const strength = Math.max(0, 1 - dx * dx - dy * dy)
    const i = (y * size + x) * 4
    data[i] = (hex >> 16) & 255
    data[i + 1] = (hex >> 8) & 255
    data[i + 2] = hex & 255
    data[i + 3] = Math.round(alpha * strength * strength)
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}
