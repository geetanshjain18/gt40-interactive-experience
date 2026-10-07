import { Component, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { ExperienceState } from '../../hooks/useExperience'
import { CHOREOGRAPHY as C } from '../../config/choreography'
import type { Motion } from '../../config/choreography'
import { HeadlightBloom } from './HeadlightBloom'
import { VehicleModel } from './VehicleModel'
import { CameraRig } from './CameraRig'
import { StudioEnvironment } from './StudioEnvironment'
import { ComponentExplorerController, type ExplorerActions, type InspectionSelection } from './ComponentExplorerController'
import type { VehicleComponent } from '../explorer/vehicleComponents'

class ModelBoundary extends Component<{ children: React.ReactNode; onError: (message: string) => void; onWebglError: (message: string) => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) { console.error('GT40 model/display failure', error); if (/creating WebGL|WebGL.*context|WebGL.*support/i.test(error.message)) this.props.onWebglError('WebGL could not be initialized. Please retry.'); else this.props.onError('The GT40 model or its materials could not be loaded. Please retry.') }
  render() { return this.state.failed ? null : this.props.children }
}

function RendererStatus({ onReady, onError }: { onReady: () => void; onError: (message: string) => void }) {
  const { gl } = useThree()
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onError('The studio display lost its WebGL context. Please retry.') }
    gl.domElement.addEventListener('webglcontextlost', lost)
    onReady()
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onReady, onError])
  return null
}

function Quality() {
  const slow = useRef(0)
  useFrame(({ gl }, dt) => { if (dt > .12) return; if (dt > .028) slow.current++; else slow.current = Math.max(0, slow.current - 1); if (slow.current > 50 && gl.getPixelRatio() > .75) { gl.setPixelRatio(Math.max(.75, gl.getPixelRatio() - .25)); slow.current = 0 } })
  return null
}

export function ExperienceCanvas({ state, motion, wake, onCanvasReady, onReady, onGeometry, onModelError, onWebglError, free, onComponentSelection, onComponentCatalog, explorerActions }: { state: ExperienceState; motion: React.RefObject<Motion>; wake: React.RefObject<() => void>; onCanvasReady: () => void; onReady: () => void; onGeometry: (bounds: unknown) => void; onModelError: (message: string) => void; onWebglError: (message: string) => void; free: boolean; onComponentSelection: (selection: InspectionSelection | null) => void; onComponentCatalog: (components: VehicleComponent[]) => void; explorerActions: React.RefObject<ExplorerActions> }) {
  const [hidden, setHidden] = useState(document.hidden)
  const [compact, setCompact] = useState(innerWidth < 900)
  useEffect(() => { const visibility = () => setHidden(document.hidden); const resize = () => setCompact(innerWidth < 900); document.addEventListener('visibilitychange', visibility); addEventListener('resize', resize); return () => { document.removeEventListener('visibilitychange', visibility); removeEventListener('resize', resize) } }, [])
  const geometry = useCallback((bounds: unknown) => onGeometry(bounds), [onGeometry])
  return <div className="experience-canvas" style={{ visibility: state.phase === 'error' ? 'hidden' : 'visible' }} role="img" aria-label="Gulf Ford GT40 number 6 in a dark automotive studio"><ModelBoundary onError={onModelError} onWebglError={onWebglError}>
    <Canvas frameloop={hidden ? 'never' : 'demand'} dpr={compact ? C.quality.mobileDpr : C.quality.desktopDpr} camera={{ position: C.frontView.position, fov: C.frontView.fov, near: .03, far: 60 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }} fallback={<span>This browser cannot display a canvas.</span>} onCreated={({ gl, scene, camera }) => { gl.setClearColor(0x000000, 0); scene.background = null; scene.environmentIntensity = 0; if (new URLSearchParams(location.search).has('qa')) Object.assign(window, { __GT40_QA__: { gl, scene, camera, motion, THREE } }) }}>
      <RendererStatus onReady={onCanvasReady} onError={onWebglError} />
      <Quality />
      {!compact && <HeadlightBloom motion={motion} />}<CameraRig state={state} motion={motion} wake={wake} free={free} />
      <StudioEnvironment motion={motion} ready={state.modelReady} reduced={state.reduced} isMobile={compact} />
      
      <Suspense fallback={null}><VehicleModel onReady={onReady} onGeometry={geometry} onError={onModelError} motion={motion} ready={state.modelReady} /></Suspense>
      {state.phase === 'exploring' && state.modelReady && !free && <ComponentExplorerController motion={motion} onSelection={onComponentSelection} onCatalogReady={onComponentCatalog} actions={explorerActions} />}
      {free && <OrbitControls makeDefault target={[0, .68, 0]} enablePan={false} enableZoom={false} minDistance={5} maxDistance={18} minPolarAngle={.5} maxPolarAngle={1.5} enableDamping dampingFactor={.08} />}
    </Canvas>
  </ModelBoundary></div>
}
