import fs from 'node:fs'
import assert from 'node:assert/strict'
import ts from 'typescript'
import sharp from 'sharp'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

globalThis.ProgressEvent ??= class extends Event {
  constructor(type, options) { super(type); Object.assign(this, options) }
}
async function read(path) {
  const bytes = fs.readFileSync(path), end = 20 + bytes.readUInt32LE(12)
  assert.equal(bytes.readUInt32LE(8), bytes.length)
  const json = JSON.parse(bytes.subarray(20, end).toString())
  const binary = bytes.subarray(end + 8)
  // Material definitions still parse normally; only GPU image decoding is stubbed.
  const loader = new GLTFLoader()
  loader.register(() => ({ name: 'verification-textures', loadTexture: async () => new THREE.Texture() }))
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
  gltf.scene.updateMatrixWorld(true)
  const meshes = []
  gltf.scene.traverse(o => { if (o.isMesh) meshes.push(o) })
  let invalidNormals = 0
  for (const mesh of meshes) {
    for (const attribute of Object.values(mesh.geometry.attributes)) {
      assert.ok(attribute.array.every(Number.isFinite), `${mesh.name}: finite attributes`)
    }
    const normal = mesh.geometry.attributes.normal
    for (let i = 0; i < normal.count; i++) {
      const length = Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i))
      if (Math.abs(length - 1) > .01) invalidNormals++
    }
    assert.ok(mesh.geometry.index.array.every(i => i < mesh.geometry.attributes.position.count))
  }
  const images = []
  for (const image of json.images ?? []) {
    const view = json.bufferViews[image.bufferView]
    const info = await sharp(binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)).metadata()
    images.push({ name: image.name, width: info.width, height: info.height, bytes: view.byteLength })
  }
  const stats = {
    bytes: bytes.length, nodes: json.nodes.length, meshObjects: json.meshes.length,
    meshPrimitives: meshes.length,
    triangles: meshes.reduce((sum, m) => sum + m.geometry.index.count / 3, 0),
    materials: json.materials.length, images,
    alphaBlendPrimitives: meshes.filter(m => m.material.transparent).length,
    transmissionPrimitives: meshes.filter(m => m.material.transmission > 0).length,
    doubleSidedPrimitives: meshes.filter(m => m.material.side === THREE.DoubleSide).length,
    nonUnitNormals: invalidNormals,
  }
  return { ...gltf, json, stats, meshes }
}
const before = await read('public/models/gt40-no-door-hatch.glb')
const after = await read('public/models/gt40-le-mans-black.glb')
assert.equal(after.stats.nonUnitNormals, 0)
assert.equal(after.stats.transmissionPrimitives, 0)
assert.equal(after.json.animations?.length ?? 0, 0)
assert.equal(after.json.cameras?.length ?? 0, 0)
assert.ok(!after.json.extensions?.KHR_lights_punctual)
for (const name of ['GT40_DoorHatch1', 'GT40_DoorHatchScrews', 'Studio_Ground1', 'PaintPallet1', 'PaintPallet2', 'PaintPallet3', 'PaintPallet4']) {
  assert.ok(!after.scene.getObjectByName(name), `Excluded ${name}`)
}
function triangleCount(object) {
  let n = 0; object.traverse(o => { if (o.isMesh) n += o.geometry.index.count / 3 }); return n
}
let retained = 0, maxBoundsDelta = 0
for (const node of before.json.nodes) {
  if (node.name === 'GT40_DoorHatchScrews') continue
  const a = before.scene.getObjectByName(node.name), b = after.scene.getObjectByName(node.name)
  assert.ok(b, `Preserved ${node.name}`)
  assert.equal(triangleCount(a), triangleCount(b), `${node.name}: original evaluated geometry count`)
  const boxA = new THREE.Box3().setFromObject(a, true), boxB = new THREE.Box3().setFromObject(b, true)
  const difference = Math.max(boxA.min.distanceTo(boxB.min), boxA.max.distanceTo(boxB.max))
  maxBoundsDelta = Math.max(maxBoundsDelta, difference)
  assert.ok(difference < .0001, `${node.name}: unchanged geometry bounds ${difference}`)
  retained++
}
for (const material of after.json.materials) assert.ok(material.pbrMetallicRoughness, `No fallback material: ${material.name}`)
const glass = after.json.materials.find(m => m.name === 'GT40_Glass_Dark')
assert.equal(glass.alphaMode, 'BLEND')
assert.ok(glass.pbrMetallicRoughness.baseColorFactor[3] < .4)
const rubber = after.json.materials.find(m => m.name === 'GT40_Rubber').pbrMetallicRoughness
assert.equal(rubber.metallicFactor, 0)
assert.ok(rubber.roughnessFactor >= .65)
assert.ok(Math.max(...rubber.baseColorFactor.slice(0, 3)) < .02)
for (const suffix of ['FL', 'FR', 'BL', 'BR']) {
  const names = []
  after.scene.getObjectByName(`GT40_Wheel${suffix}`).traverse(o => { if (o.isMesh) names.push(o.material.name) })
  assert.ok(names.includes('GT40_Rubber') && names.includes('GT40_Wheel_Gold'))
}
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const config = new Function('exports', compile('src/config/experience.ts') + '\nreturn exports.EXPERIENCE_CONFIG')({})
const math = new Function('exports', compile('src/utils/presentation.ts') + '\nreturn exports')({})
assert.equal(math.clampProgress(-1), 0); assert.equal(math.clampProgress(2), 1); assert.equal(math.clampProgress(NaN), 0)
assert.deepEqual([0, .2, 1, .8, .4, 0].map(math.clampProgress), [0, .2, 1, .8, .4, 0])
const center = after.scene.userData.gt40PresentationCenter
assert.deepEqual(center, before.scene.userData.gt40PresentationCenter)
after.scene.position.set(-center[0], 0, -center[2])
const yaw = new THREE.Group(), root = new THREE.Group()
yaw.rotation.y = config.model.yawOffset; yaw.add(after.scene)
root.scale.setScalar(config.model.scale); root.position.fromArray(config.model.centerOffset); root.add(yaw)
const framing = []
for (const [width, height] of [[1920,1080],[1440,900],[1024,768],[820,1180],[390,844],[320,932],[768,320]]) {
  const f = config.framing
  const fit = math.presentationCameraFit(width, height, f.cameraDistanceDesktop, f.cameraDistanceMobile,
    f.cameraFovDesktop, f.cameraFovMobile, config.model.targetLength)
  const camera = new THREE.PerspectiveCamera(fit.fov, width/height, .2, 60)
  camera.position.set(0,1.45,fit.distance); camera.lookAt(0,.85+f.targetOffsetY,0);camera.updateMatrixWorld(true)
  let maxX = 0, maxY = 0
  for (let degrees = 0; degrees <= 360; degrees += 5) {
    root.rotation.y = f.openingRotationY + degrees * Math.PI / 180; root.updateMatrixWorld(true)
    for (const mesh of after.meshes) {
      mesh.geometry.computeBoundingBox()
      const box = mesh.geometry.boundingBox
      for (let i = 0; i < 8; i++) {
        const v = new THREE.Vector3(i&1 ? box.max.x : box.min.x, i&2 ? box.max.y : box.min.y, i&4 ? box.max.z : box.min.z)
          .applyMatrix4(mesh.matrixWorld).project(camera)
        maxX = Math.max(maxX, Math.abs(v.x)); maxY = Math.max(maxY, Math.abs(v.y))
        assert.ok(Math.abs(v.x) < .98 && Math.abs(v.y) < .98 && Math.abs(v.z) <= 1, `${width}x${height}: clipping at ${degrees}`)
      }
    }
  }
  framing.push({width,height,...fit,maxNdcX:maxX,maxNdcY:maxY})
}
const report = {before:before.stats, after:after.stats, retainedOriginalCarObjects:retained,maxBoundsDelta,
  framing,rotationSamplesPerViewport:73, browser:'Pending: no connected browser; these are model and projection checks, not GPU performance measurements.'}
fs.writeFileSync('artifacts/gt40-materials/verification.json', JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
