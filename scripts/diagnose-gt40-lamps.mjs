import fs from 'node:fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
globalThis.ProgressEvent ??= class extends Event { constructor(type, options) { super(type); Object.assign(this, options) } }
globalThis.self = globalThis
const bytes = fs.readFileSync('public/models/gt40-gulf-number-6.glb')
const loader = new GLTFLoader()
loader.register(() => ({ name: 'stub', loadTexture: async () => new THREE.Texture() }))
const { scene } = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
scene.updateMatrixWorld(true)
const sourceBounds = new THREE.Box3().setFromObject(scene, true)
const sourceSize = sourceBounds.getSize(new THREE.Vector3())
const sourceCenter = sourceBounds.getCenter(new THREE.Vector3())
const contacts = new Map()
scene.traverse(o => {
  if (!o.isMesh || !/^GT40_Wheel(?:FL|FR|BL|BR)$/.test(o.parent?.name ?? '')) return
  const mats = Array.isArray(o.material) ? o.material : [o.material]
  if (!mats.some(m => m.name === 'GT40_Tyre_Rubber')) return
  const b = new THREE.Box3().setFromObject(o, true)
  const prior = contacts.get(o.parent.name)
  contacts.set(o.parent.name, { y: Math.min(prior?.y ?? Infinity, b.min.y), x: b.getCenter(new THREE.Vector3()).x })
})
const meanY = [...contacts.values()].reduce((sum, c) => sum + c.y, 0) / contacts.size
const meanX = [...contacts.values()].reduce((sum, c) => sum + c.x, 0) / contacts.size
const varianceX = [...contacts.values()].reduce((sum, c) => sum + (c.x - meanX) ** 2, 0)
const covariance = [...contacts.values()].reduce((sum, c) => sum + (c.x - meanX) * (c.y - meanY), 0)
const pitch = contacts.size === 4 && varianceX ? -Math.atan(covariance / varianceX) : 0
const xz = Array.isArray(scene.userData.gt40PresentationCenter) ? scene.userData.gt40PresentationCenter : [sourceCenter.x, 0, sourceCenter.z]
const contactY = contacts.size === 4 ? meanY + Math.tan(pitch) * (meanX - xz[0]) : sourceBounds.min.y
const pose = new THREE.Group(), fit = new THREE.Group()
pose.scale.setScalar(4.8 / sourceSize.x); pose.rotation.y = -Math.PI / 2; fit.rotation.z = pitch
fit.position.set(-xz[0], -contactY, -xz[2]); pose.add(fit); fit.add(scene); pose.updateMatrixWorld(true)
const lamps = []
scene.traverse(o => {
  if (!o.isMesh || !/head.?light|lens/i.test(o.name)) return
  const box = new THREE.Box3().setFromObject(o, true)
  lamps.push({ name: o.name, parent: o.parent?.name, material: (Array.isArray(o.material) ? o.material : [o.material]).map(m => m.name), min: box.min.toArray(), max: box.max.toArray(), center: box.getCenter(new THREE.Vector3()).toArray() })
})
console.log(JSON.stringify(lamps, null, 2))
