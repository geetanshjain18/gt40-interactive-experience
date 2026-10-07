import fs from 'node:fs'
import { Box3, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

globalThis.ProgressEvent ??= class ProgressEvent extends Event {
  constructor(type, options) { super(type); Object.assign(this, options) }
}

const buffer = fs.readFileSync('public/models/gt40-preview.glb')
const json = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString())
// Geometry-only parse for bounds: avoid browser image APIs during Node inspection.
const geometryJson = structuredClone(json)
delete geometryJson.images
delete geometryJson.textures
delete geometryJson.materials
for (const mesh of geometryJson.meshes) {
  for (const primitive of mesh.primitives) delete primitive.material
}
const binaryStart = 20 + buffer.readUInt32LE(12)
const binaryLength = buffer.readUInt32LE(binaryStart)
const binary = buffer.subarray(binaryStart + 8, binaryStart + 8 + binaryLength)
geometryJson.buffers[0].uri = `data:application/octet-stream;base64,${binary.toString('base64')}`
const gltf = await new GLTFLoader().parseAsync(JSON.stringify(geometryJson), '')
const box = new Box3().setFromObject(gltf.scene)
const size = box.getSize(new Vector3())
console.log(JSON.stringify({
  bytes: buffer.length,
  meshObjects: json.nodes.filter(n => n.mesh !== undefined).length,
  unexpectedNodes: json.nodes.filter(n => !n.name?.startsWith('GT40_')).map(n => n.name),
  cameras: json.cameras?.length ?? 0,
  animations: json.animations?.length ?? 0,
  lights: json.extensions?.KHR_lights_punctual?.lights?.length ?? 0,
  bounds: { min: box.min.toArray(), max: box.max.toArray(), size: size.toArray(), center: box.getCenter(new Vector3()).toArray() },
  materials: json.materials,
  embeddedImages: json.images?.map(i => ({ name: i.name, embedded: i.bufferView !== undefined, mimeType: i.mimeType })),
  attributes: [...new Set(json.meshes.flatMap(m => m.primitives.flatMap(p => Object.keys(p.attributes))))],
}, null, 2))
