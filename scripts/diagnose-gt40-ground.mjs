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
const whole = new THREE.Box3().setFromObject(scene, true)
const rows = []
scene.traverse(o => {
  if (!o.isMesh) return
  const box = new THREE.Box3().setFromObject(o, true)
  rows.push({ name: o.name, material: (Array.isArray(o.material) ? o.material : [o.material]).map(m => m.name), parent: o.parent?.name, min: box.min.toArray(), max: box.max.toArray(), center: box.getCenter(new THREE.Vector3()).toArray() })
})
console.log(JSON.stringify({ whole: { min: whole.min.toArray(), max: whole.max.toArray() }, lowest: rows.toSorted((a, b) => a.min[1] - b.min[1]).slice(0, 8), wheels: rows.filter(r => /tire|tyre|wheel/i.test(r.name)) }, null, 2))
