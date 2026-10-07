// Deep inspect GT40 GLB: headlight positions, model forward axis, wheel positions
import fs from 'node:fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

globalThis.ProgressEvent ??= class extends Event {
  constructor(type, opts) { super(type); Object.assign(this, opts) }
}
globalThis.self = globalThis

const b = fs.readFileSync('public/models/gt40-gulf-number-6.glb')
const loader = new GLTFLoader()
loader.register(() => ({ name: 'stub', loadTexture: async () => new THREE.Texture() }))
const gltf = await loader.parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')
gltf.scene.updateMatrixWorld(true)

const meshes = []
gltf.scene.traverse(o => { if (o.isMesh) meshes.push(o) })

// Overall bounds
const all = new THREE.Box3().setFromObject(gltf.scene)
const center = all.getCenter(new THREE.Vector3())
const size = all.getSize(new THREE.Vector3())
console.log('=== OVERALL BOUNDS ===')
console.log('min:', all.min.toArray().map(v=>v.toFixed(4)))
console.log('max:', all.max.toArray().map(v=>v.toFixed(4)))
console.log('center:', center.toArray().map(v=>v.toFixed(4)))
console.log('size (X, Y, Z):', size.toArray().map(v=>v.toFixed(4)))

// Headlights
console.log('\n=== HEADLIGHT MESHES ===')
for (const name of ['GT40_HeadLights', 'GT40_HeadLightGlass', 'GT40_HeadLightCover', 'GT40_HeadLightCover2']) {
  const m = gltf.scene.getObjectByName(name)
  if (!m) { console.log(name, 'NOT FOUND'); continue }
  const b3 = new THREE.Box3().setFromObject(m)
  const c = b3.getCenter(new THREE.Vector3())
  const s = b3.getSize(new THREE.Vector3())
  console.log(`${name}: world center=[${c.x.toFixed(4)}, ${c.y.toFixed(4)}, ${c.z.toFixed(4)}] size=[${s.x.toFixed(4)}, ${s.y.toFixed(4)}, ${s.z.toFixed(4)}]`)
}

// Front grill - tells us which end is front
console.log('\n=== FRONT INDICATORS ===')
for (const name of ['GT40_FrontGrill', 'GT40_Gulf_OrangeNose', 'GT40_WheelTrimF', 'GT40_WheelTrimB']) {
  const m = gltf.scene.getObjectByName(name)
  if (!m) { console.log(name, 'NOT FOUND'); continue }
  const b3 = new THREE.Box3().setFromObject(m)
  const c = b3.getCenter(new THREE.Vector3())
  console.log(`${name}: center=[${c.x.toFixed(4)}, ${c.y.toFixed(4)}, ${c.z.toFixed(4)}]`)
}

// Steering wheel and interior
console.log('\n=== INTERIOR MESHES ===')
for (const pattern of [/SteeringWheel/i, /GearShift/i, /Seat/i, /Dashboard/i, /Instrument/i, /Gauge/i]) {
  const found = meshes.filter(m => pattern.test(m.name)).slice(0,2)
  for (const m of found) {
    const b3 = new THREE.Box3().setFromObject(m)
    const c = b3.getCenter(new THREE.Vector3())
    console.log(`${m.name}: center=[${c.x.toFixed(4)}, ${c.y.toFixed(4)}, ${c.z.toFixed(4)}]`)
  }
}

// Engine meshes
console.log('\n=== ENGINE MESHES ===')
for (const pattern of [/EngineBlock/i, /EnginePipes/i, /EngineVent/i]) {
  const found = meshes.filter(m => pattern.test(m.name)).slice(0,2)
  for (const m of found) {
    const b3 = new THREE.Box3().setFromObject(m)
    const c = b3.getCenter(new THREE.Vector3())
    console.log(`${m.name}: center=[${c.x.toFixed(4)}, ${c.y.toFixed(4)}, ${c.z.toFixed(4)}]`)
  }
}

// Determine forward axis from WheelTrimF vs WheelTrimB
const wf = gltf.scene.getObjectByName('GT40_WheelTrimF')
const wb = gltf.scene.getObjectByName('GT40_WheelTrimB')
if (wf && wb) {
  const cf = new THREE.Box3().setFromObject(wf).getCenter(new THREE.Vector3())
  const cb = new THREE.Box3().setFromObject(wb).getCenter(new THREE.Vector3())
  console.log('\n=== FORWARD AXIS DEDUCTION ===')
  console.log(`Front wheel center: [${cf.x.toFixed(4)}, ${cf.y.toFixed(4)}, ${cf.z.toFixed(4)}]`)
  console.log(`Rear wheel center:  [${cb.x.toFixed(4)}, ${cb.y.toFixed(4)}, ${cb.z.toFixed(4)}]`)
  const dx = cf.x - cb.x, dz = cf.z - cb.z
  console.log(`Front-rear delta: X=${dx.toFixed(4)}, Z=${dz.toFixed(4)}`)
  console.log(`Dominant axis: ${Math.abs(dx) > Math.abs(dz) ? 'X (car points +X for front)' : 'Z (car points +Z for front)'}`)
  const headlightForward = Math.abs(dx) > Math.abs(dz)
    ? (dx > 0 ? 'headlights at +X end' : 'headlights at -X end')
    : (dz > 0 ? 'headlights at +Z end' : 'headlights at -Z end')
  console.log(headlightForward)
  
  // Compute what yaw offset makes car face camera (camera at +Z)
  // If car's front is at +X, we need to rotate -PI/2 to make it face +Z
  // If car's front is at -X, we need to rotate +PI/2
  if (Math.abs(dx) > Math.abs(dz)) {
    const yaw = dx > 0 ? -Math.PI/2 : Math.PI/2
    console.log(`Recommended yawOffset (to face +Z camera): ${yaw.toFixed(4)} rad (${(yaw*180/Math.PI).toFixed(1)}°)`)
  } else {
    const yaw = dz > 0 ? 0 : Math.PI
    console.log(`Recommended yawOffset (to face +Z camera): ${yaw.toFixed(4)} rad (${(yaw*180/Math.PI).toFixed(1)}°)`)
  }
}
