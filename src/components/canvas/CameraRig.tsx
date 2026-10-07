/* oxlint-disable react/immutability -- Three owns camera transforms. */
import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CHOREOGRAPHY as C } from '../../config/choreography'
import type { Motion } from '../../config/choreography'
import type { ExperienceState } from '../../hooks/useExperience'

export function CameraRig({ state, motion, wake, free }: { state:ExperienceState; motion:React.RefObject<Motion>; wake:React.RefObject<()=>void>; free:boolean }) {
  const { camera, size, invalidate } = useThree()
  useEffect(() => { wake.current=invalidate; invalidate(); return () => {wake.current=()=>{}} }, [wake,invalidate])
  useEffect(() => { invalidate() }, [state,size,free,invalidate])
  const curves = useMemo(() => {
    const aspect=size.width/size.height
    const mobile=aspect<1.1
    const scale=mobile ? Math.max(1,3.9/aspect/5.1) : 1
    const cameraPoints=C.cameraPath.map(([x,y,z],i)=>new THREE.Vector3(x*(mobile&&(i<4||i>=8)?scale:1),y,z*(mobile&&(i<4||i>=8)?scale:1)))
    cameraPoints[0].set(0,C.frontView.position[1],C.frontView.position[2]*scale)
    return { camera:new THREE.CatmullRomCurve3(cameraPoints,false,'catmullrom',.35), target:new THREE.CatmullRomCurve3(C.targetPath.map(v=>new THREE.Vector3(...v)),false,'catmullrom',.35), scale, mobile }
  },[size])
  const target=useMemo(()=>new THREE.Vector3(),[])
  const engineTarget=useMemo(()=>new THREE.Vector3(...C.engineShots[0].target),[])
  useFrame(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)||free) return
    const m=motion.current
    const p=state.reduced?0:THREE.MathUtils.clamp(m.progress,0,1)
    const front=state.phase!=='exploring'||p===0
    const engineFocus = THREE.MathUtils.smoothstep(p, .61, .67) *
      (1 - THREE.MathUtils.smoothstep(p, .70, .78))
    if(front){ camera.position.copy(curves.camera.points[0]); target.set(...C.frontView.target) }
    else { camera.position.copy(curves.camera.getPoint(p)); target.copy(curves.target.getPoint(p)) }
    if (!front) target.lerp(engineTarget, engineFocus)
    const baseFov = curves.mobile ? 44 : C.frontView.fov
    camera.fov=baseFov-(curves.mobile?7:10)*engineFocus
    camera.near=.03
    camera.lookAt(target)
    camera.clearViewOffset()
    camera.updateProjectionMatrix()
    if(import.meta.env.DEV) (window as unknown as Record<string,unknown>).__debug={phase:state.phase,progress:p,camera:camera.position.toArray(),target:target.toArray(),fov:camera.fov}
  })
  return null
}
