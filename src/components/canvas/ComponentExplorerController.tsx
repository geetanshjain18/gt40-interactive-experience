/* oxlint-disable react/immutability -- selected mesh material clones are restored on cleanup. */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { EXPERIENCE_CONFIG } from '../../config/experience'
import type { Motion } from '../../config/choreography'
import { VEHICLE_COMPONENTS } from '../explorer/vehicleComponents'
import type { InspectionFrame, VehicleComponent } from '../explorer/vehicleComponents'

const inspectionFrames: InspectionFrame[] = ['front', 'three-quarter', 'side', 'cockpit', 'engine', 'hero']
function frameAtProgress(progress: number): InspectionFrame {
  const rests = [.08, .20, .34, .46, .69, .98]
  let nearest = 0
  for (let i = 1; i < rests.length; i++) {
    if (Math.abs(rests[i] - progress) < Math.abs(rests[nearest] - progress)) nearest = i
  }
  return inspectionFrames[nearest]
}

export interface InspectionSelection {
  component: VehicleComponent
  anchor: { x: number; y: number }
  vehicle: { left: number; right: number; top: number; bottom: number }
  locked: boolean
}

export interface ExplorerActions {
  select: (id: string) => boolean
  lock: () => void
  close: () => void
}

interface MeshEntry {
  mesh: THREE.Mesh
  component: VehicleComponent
  anchor: THREE.Vector3
  original: THREE.Material | THREE.Material[]
  clones: THREE.Material[]
}

export function ComponentExplorerController({
  motion, onSelection, onCatalogReady, actions,
}: {
  motion: React.RefObject<Motion>
  onSelection: (selection: InspectionSelection | null) => void
  onCatalogReady: (components: VehicleComponent[]) => void
  actions: React.RefObject<ExplorerActions>
}) {
  const { scene } = useGLTF(EXPERIENCE_CONFIG.model.path)
  const { gl, camera, invalidate } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const pointer = useMemo(() => new THREE.Vector2(), [])
  const projected = useMemo(() => new THREE.Vector3(), [])
  const projectedVehicle = useMemo(() => Array.from({ length: 8 }, () => new THREE.Vector3()), [])
  const vehicleBox = useMemo(() => new THREE.Box3(), [])
  const entries = useRef<MeshEntry[]>([])
  const activeTargets = useRef<THREE.Mesh[]>([])
  const availableComponents = useRef<VehicleComponent[]>([])
  const activeFrame = useRef<InspectionFrame>(frameAtProgress(motion.current.progress))
  const current = useRef<{ entry: MeshEntry; locked: boolean } | null>(null)
  const pendingId = useRef('')
  const hoverTimer = useRef<number | undefined>(undefined)
  const leaveTimer = useRef<number | undefined>(undefined)
  const raf = useRef(0)
  const resizeRaf = useRef(0)
  const resizeTimer = useRef<number | undefined>(undefined)
  const lastPointer = useRef({ x: 0, y: 0 })
  const down = useRef<{ x: number; y: number; type: string } | null>(null)
  const lastProgress = useRef(motion.current.progress)
  const cameraSettledAt = useRef(0)
  const selectedMeshes = useMemo(() => new Set<THREE.Mesh>(), [])
  const refreshAnchor = useRef<() => void>(() => {})
  const lastAnchorRefresh = useRef(0)

  useFrame(() => {
    const p = motion.current.progress
    const frame = frameAtProgress(p)
    if (frame !== activeFrame.current) {
      activeFrame.current = frame
      activeTargets.current = entries.current.filter(entry => entry.component.inspectionFrames.includes(frame)).map(entry => entry.mesh)
      onCatalogReady(availableComponents.current.filter(component => component.inspectionFrames.includes(frame)))
      if (current.current && !current.current.entry.component.inspectionFrames.includes(frame)) actions.current.close()
    }
    if (Math.abs(p - lastProgress.current) > 0.00012) {
      lastProgress.current = p
      cameraSettledAt.current = performance.now()
    }
    const now = performance.now()
    if (current.current && now - lastAnchorRefresh.current > 90) {
      lastAnchorRefresh.current = now
      refreshAnchor.current()
    }
  })

  useEffect(() => {
    const mapped: MeshEntry[] = []
    const found = new Set<string>()
    scene.updateMatrixWorld(true)
    vehicleBox.setFromObject(scene, true)
    const visibleMeshes: THREE.Mesh[] = []
    const visibleMeshSet = new Set<THREE.Mesh>()

    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      const materialsForVisibility = Array.isArray(object.material) ? object.material : [object.material]
      let ancestor: THREE.Object3D | null = object
      let inVisibleTree = true
      while (ancestor && ancestor !== scene) { if (!ancestor.visible) { inVisibleTree = false; break } ancestor = ancestor.parent }
      if (inVisibleTree && materialsForVisibility.some(material => material.visible && (!material.transparent || material.opacity >= .62))) {
        visibleMeshes.push(object)
        visibleMeshSet.add(object)
      }
      const hierarchy: THREE.Object3D[] = []
      for (let node: THREE.Object3D | null = object; node && node !== scene; node = node.parent) hierarchy.push(node)
      const matches = (matcher: string | RegExp, name: string) => typeof matcher === 'string' ? name === matcher : matcher.test(name)
      const component = VEHICLE_COMPONENTS
        .filter(candidate => candidate.meshMatchers.some(matcher => hierarchy.some(node => matches(matcher, node.name))))
        .sort((a, b) => b.priority - a.priority)[0]
      if (!component) return

      const original = object.material
      const sourceMaterials = Array.isArray(original) ? original : [original]
      const clones = sourceMaterials.map(material => material.clone())
      object.material = Array.isArray(original) ? clones : clones[0]
      const anchorMatcher = component.anchorMatchers?.[0]
      const anchorNode = hierarchy.find(node => anchorMatcher && matches(anchorMatcher, node.name)) ??
        (typeof anchorMatcher === 'string' ? scene.getObjectByName(anchorMatcher) : undefined) ??
        hierarchy.find(node => component.meshMatchers.some(matcher => matches(matcher, node.name))) ?? object
      const bounds = new THREE.Box3().setFromObject(anchorNode, true)
      const anchor = bounds.getCenter(new THREE.Vector3())
      if (component.anchorOffset) anchor.add(new THREE.Vector3(...component.anchorOffset))
      mapped.push({ mesh: object, component, anchor, original, clones })
      // Transparent lamp lenses and covers are still valid inspection targets.
      if (inVisibleTree && !visibleMeshSet.has(object)) {
        visibleMeshes.push(object)
        visibleMeshSet.add(object)
      }
      found.add(component.id)
    })

    mapped.sort((a, b) => b.component.priority - a.component.priority)
    entries.current = mapped
    activeFrame.current = frameAtProgress(motion.current.progress)
    activeTargets.current = mapped.filter(entry => entry.component.inspectionFrames.includes(activeFrame.current)).map(entry => entry.mesh)
    availableComponents.current = VEHICLE_COMPONENTS.filter(component => found.has(component.id))
    const entryByMesh = new Map(mapped.map(entry => [entry.mesh, entry]))
    onCatalogReady(availableComponents.current.filter(component => component.inspectionFrames.includes(activeFrame.current)))
    if (import.meta.env.DEV) {
      const missing = VEHICLE_COMPONENTS.filter(component => !found.has(component.id)).map(component => component.id)
      if (missing.length) console.info('GT40 component mappings not present in GLB:', missing.join(', '))
    }

    const hitAt = (clientX: number, clientY: number) => {
      if (document.hidden || !gl.domElement.isConnected) return null
      const rect = gl.domElement.getBoundingClientRect()
      if (!rect.width || !rect.height) return null
      pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(visibleMeshes, false)
      if (import.meta.env.DEV && new URLSearchParams(location.search).has('qa')) {
        Object.assign(window, { __GT40_EXPLORER_HITS__: hits.slice(0, 5).map(hit => ({ mesh: hit.object.name, component: entryByMesh.get(hit.object as THREE.Mesh)?.component.id, distance: hit.distance })) })
      }
      for (const hit of hits) {
        const entry = entryByMesh.get(hit.object as THREE.Mesh)
        if (entry && activeTargets.current.includes(entry.mesh)) return entry
        return null
      }
      return null
    }

    const screenAnchor = (entry: MeshEntry) => {
      projected.copy(entry.anchor).project(camera)
      return {
        x: (projected.x + 1) * innerWidth / 2,
        y: (1 - projected.y) * innerHeight / 2,
      }
    }
    const screenVehicleBounds = () => {
      const { min, max } = vehicleBox
      const points = projectedVehicle
      points[0].set(min.x, min.y, min.z); points[1].set(max.x, min.y, min.z)
      points[2].set(min.x, max.y, min.z); points[3].set(max.x, max.y, min.z)
      points[4].set(min.x, min.y, max.z); points[5].set(max.x, min.y, max.z)
      points[6].set(min.x, max.y, max.z); points[7].set(max.x, max.y, max.z)
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
      for (const point of points) {
        point.project(camera)
        const x = (point.x + 1) * innerWidth / 2
        const y = (1 - point.y) * innerHeight / 2
        left = Math.min(left, x); right = Math.max(right, x)
        top = Math.min(top, y); bottom = Math.max(bottom, y)
      }
      return { left, right, top, bottom }
    }
    refreshAnchor.current = () => {
      const active = current.current
      if (!active) return
      onSelection({ component: active.entry.component, anchor: screenAnchor(active.entry), vehicle: screenVehicleBounds(), locked: active.locked })
    }

    const restoreHighlight = () => {
      for (const entry of entries.current) {
        if (!selectedMeshes.has(entry.mesh)) continue
        for (let i = 0; i < entry.clones.length; i++) {
          const clone = entry.clones[i]
          const originalMaterial = Array.isArray(entry.original) ? entry.original[i] : entry.original
          if (clone instanceof THREE.MeshStandardMaterial && originalMaterial instanceof THREE.MeshStandardMaterial) {
            clone.emissive.copy(originalMaterial.emissive)
            clone.emissiveIntensity = originalMaterial.emissiveIntensity
          }
        }
      }
      selectedMeshes.clear()
    }

    const highlight = (component: VehicleComponent | null) => {
      restoreHighlight()
      if (!component) return
      const accent = new THREE.Color(component.accentColor)
      for (const entry of mapped) {
        if (entry.component.id !== component.id) continue
        selectedMeshes.add(entry.mesh)
        for (let i = 0; i < entry.clones.length; i++) {
          const clone = entry.clones[i]
          const originalMaterial = Array.isArray(entry.original) ? entry.original[i] : entry.original
          if (!(clone instanceof THREE.MeshStandardMaterial) || !(originalMaterial instanceof THREE.MeshStandardMaterial)) continue
          if (/Glass|Lens_Clear/.test(clone.name) || component.id === 'headlights') continue
          clone.emissive.copy(originalMaterial.emissive).lerp(accent, .55)
          clone.emissiveIntensity = Math.max(originalMaterial.emissiveIntensity, .12)
        }
      }
      invalidate()
    }

    const clearHoverTimers = () => {
      if (hoverTimer.current !== undefined) clearTimeout(hoverTimer.current)
      if (leaveTimer.current !== undefined) clearTimeout(leaveTimer.current)
      hoverTimer.current = undefined
      leaveTimer.current = undefined
      pendingId.current = ''
    }

    const clear = () => {
      clearHoverTimers()
      current.current = null
      refreshAnchor.current = () => {}
      highlight(null)
      onSelection(null)
    }

    const publish = (entry: MeshEntry, locked: boolean) => {
      clearHoverTimers()
      current.current = { entry, locked }
      highlight(entry.component)
      onSelection({ component: entry.component, anchor: screenAnchor(entry), vehicle: screenVehicleBounds(), locked })
    }

    const canInspect = () => performance.now() - cameraSettledAt.current >= 220 &&
      Math.abs(motion.current.target - motion.current.progress) <= .0025

    const selectId = (id: string) => {
      if (!canInspect()) return false
      const candidates = mapped.filter(entry => entry.component.id === id && entry.component.inspectionFrames.includes(activeFrame.current))
      for (const entry of candidates) {
        const point = screenAnchor(entry)
        projected.copy(entry.anchor).project(camera)
        if (projected.z > -1 && projected.z < 1 && point.x > 12 && point.x < innerWidth - 12 && point.y > 12 && point.y < innerHeight - 12) {
          publish(entry, true)
          return true
        }
      }
      return false
    }

    actions.current.select = selectId
    actions.current.lock = () => {
      if (current.current && !current.current.locked) publish(current.current.entry, true)
    }
    actions.current.close = clear

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !canInspect() || current.current?.locked) return
      if (leaveTimer.current !== undefined) { clearTimeout(leaveTimer.current); leaveTimer.current = undefined }
      lastPointer.current.x = event.clientX
      lastPointer.current.y = event.clientY
      if (raf.current) return
      raf.current = requestAnimationFrame(() => {
        raf.current = 0
        const hit = hitAt(lastPointer.current.x, lastPointer.current.y)
        gl.domElement.style.cursor = hit ? 'pointer' : ''
        if ((hit?.component.id ?? '') === (current.current?.entry.component.id ?? '')) return
        if (hit?.component.id === pendingId.current) return
        clearHoverTimers()
        pendingId.current = hit?.component.id ?? ''
        hoverTimer.current = window.setTimeout(() => {
          hoverTimer.current = undefined
          if (!canInspect() || current.current?.locked) return
          if (hit) publish(hit, false)
          else if (current.current && !current.current.locked) clear()
        }, 110)
      })
    }

    const onDown = (event: PointerEvent) => {
      down.current = { x: event.clientX, y: event.clientY, type: event.pointerType }
      if (event.pointerType === 'touch') return
      if (!canInspect()) return
      const hit = hitAt(event.clientX, event.clientY)
      if (!hit) { if (current.current) clear(); return }
      if (current.current?.locked) {
        if (current.current.entry.component.id === hit.component.id) publish(hit, false)
        return
      }
      publish(hit, true)
    }

    const onUp = (event: PointerEvent) => {
      const origin = down.current
      down.current = null
      if (!origin || origin.type !== 'touch' || !canInspect()) return
      if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 9) return
      const hit = hitAt(event.clientX, event.clientY)
      if (!hit) { if (current.current) clear(); return }
      if (current.current?.locked && current.current.entry.component.id === hit.component.id) publish(hit, false)
      else if (!current.current?.locked) publish(hit, true)
    }

    const onLeave = (event: PointerEvent) => {
      gl.domElement.style.cursor = ''
      if (current.current?.locked) return
      if (raf.current) {
        cancelAnimationFrame(raf.current)
        raf.current = 0
      }
      clearHoverTimers()
      const related = event.relatedTarget
      if (related instanceof Element && related.closest('.component-card,.component-list-toggle,.component-list-panel')) return
      if (current.current) clear()
    }

    const onOutside = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element) || target.closest('.component-card,.component-explorer')) return
      if (target === gl.domElement) return
      if (current.current) clear()
    }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && current.current) clear() }
    const onScroll = () => {
      cameraSettledAt.current = performance.now()
      lastProgress.current = motion.current.progress
      if (current.current) clear()
    }
    const onResize = () => {
      const refreshCurrentSelection = () => {
        const active = current.current
        if (!active) return
        camera.updateMatrixWorld(true)
        onSelection({ component: active.entry.component, anchor: screenAnchor(active.entry), vehicle: screenVehicleBounds(), locked: active.locked })
      }
      refreshCurrentSelection()
      if (resizeRaf.current) cancelAnimationFrame(resizeRaf.current)
      resizeRaf.current = requestAnimationFrame(() => {
        invalidate()
        resizeRaf.current = requestAnimationFrame(() => {
          resizeRaf.current = 0
          refreshCurrentSelection()
        })
      })
      if (resizeTimer.current !== undefined) clearTimeout(resizeTimer.current)
      resizeTimer.current = window.setTimeout(() => {
        resizeTimer.current = undefined
        refreshCurrentSelection()
      }, 120)
    }
    const canvasResize = new ResizeObserver(onResize)
    canvasResize.observe(gl.domElement)

    gl.domElement.addEventListener('pointermove', onMove, { passive: true })
    gl.domElement.addEventListener('pointerdown', onDown, { passive: true })
    gl.domElement.addEventListener('pointerup', onUp, { passive: true })
    gl.domElement.addEventListener('pointerleave', onLeave, { passive: true })
    document.addEventListener('pointerdown', onOutside)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })

    return () => {
      clearHoverTimers()
      if (raf.current) cancelAnimationFrame(raf.current)
      if (resizeRaf.current) cancelAnimationFrame(resizeRaf.current)
      if (resizeTimer.current !== undefined) clearTimeout(resizeTimer.current)
      canvasResize.disconnect()
      gl.domElement.style.cursor = ''
      gl.domElement.removeEventListener('pointermove', onMove)
      gl.domElement.removeEventListener('pointerdown', onDown)
      gl.domElement.removeEventListener('pointerup', onUp)
      gl.domElement.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('pointerdown', onOutside)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      for (const entry of mapped) {
        entry.mesh.material = entry.original
        for (const clone of entry.clones) clone.dispose()
      }
      const actionsRef = actions.current
      const currentRef = current
      const entriesRef = entries
      const activeTargetsRef = activeTargets
      const availableComponentsRef = availableComponents
      if (actionsRef.select === selectId) actionsRef.select = () => false
      actionsRef.lock = () => {}
      actionsRef.close = () => {}
      currentRef.current = null
      entriesRef.current = []
      activeTargetsRef.current = []
      availableComponentsRef.current = []
    }
  }, [scene, gl, camera, raycaster, pointer, projected, projectedVehicle, vehicleBox, invalidate, motion, onSelection, onCatalogReady, actions, selectedMeshes])

  return null
}
