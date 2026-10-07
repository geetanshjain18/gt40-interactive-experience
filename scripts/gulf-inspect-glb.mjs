import fs from 'node:fs'
import sharp from 'sharp'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
globalThis.ProgressEvent??=class extends Event{constructor(type,opts){super(type);Object.assign(this,opts)}}
async function inspect(path){
 const b=fs.readFileSync(path);assert.equal(b.readUInt32LE(8),b.length)
 const end=20+b.readUInt32LE(12),j=JSON.parse(b.subarray(20,end)),bin=b.subarray(end+8)
 const loader=new GLTFLoader();loader.register(()=>({name:'qa-images',loadTexture:async()=>new THREE.Texture()}))
 const gltf=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')
 const meshes=[];gltf.scene.traverse(o=>{if(o.isMesh)meshes.push(o)})
 for(const m of meshes)for(const a of Object.values(m.geometry.attributes))assert.ok(a.array.every(Number.isFinite),m.name+' finite geometry')
 const images=[];for(const i of j.images||[]){const v=j.bufferViews[i.bufferView];const meta=await sharp(bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)).metadata();images.push({name:i.name,width:meta.width,height:meta.height,bytes:v.byteLength})}
 const stats={bytes:b.length,MiB:b.length/1048576,vertices:meshes.reduce((s,m)=>s+m.geometry.attributes.position.count,0),triangles:meshes.reduce((s,m)=>s+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0),meshes:j.meshes.length,primitives:meshes.length,materials:j.materials.length,textures:j.textures?.length??0,images,transparentMaterials:j.materials.filter(m=>m.alphaMode==='BLEND').length,transmissionMaterials:j.materials.filter(m=>m.extensions?.KHR_materials_transmission?.transmissionFactor>0).length,doubleSidedMaterials:j.materials.filter(m=>m.doubleSided).length,cameras:j.cameras?.length??0,lights:j.extensions?.KHR_lights_punctual?.lights?.length??0,animations:j.animations?.length??0,extensions:j.extensionsUsed}
 return {stats,j,scene:gltf.scene}
}
const before=await inspect('public/models/gt40-no-door-hatch.glb'),after=await inspect('public/models/gt40-gulf-number-6.glb')
for(const name of ['GT40_DoorHatch1','GT40_DoorHatchScrews','GT40_Number6_RearDeck','Studio_Ground1','PaintPallet1','PaintPallet2','PaintPallet3','PaintPallet4'])assert.ok(!after.j.nodes.some(n=>n.name===name),'Excluded '+name)
assert.equal(after.stats.cameras,0);assert.equal(after.stats.lights,0);assert.equal(after.stats.animations,0)
assert.ok(after.j.materials.filter(m=>/Gulf_.*Paint/.test(m.name)).every(m=>m.extensions.KHR_materials_clearcoat.clearcoatFactor>.6))
assert.ok(after.j.nodes.filter(n=>/Number/.test(n.name)).every(n=>/Number6/.test(n.name)))
const retained=[]
const geometryChecks=[]
const triangles=o=>{let count=0;o.traverse(m=>{if(m.isMesh)count+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3});return count}
before.scene.updateMatrixWorld(true);after.scene.updateMatrixWorld(true)
for(const n of before.j.nodes){
 if(n.name==='GT40_DoorHatchScrews')continue
 const a=before.scene.getObjectByName(n.name),b=after.scene.getObjectByName(n.name)
 assert.ok(b,'Preserve '+n.name)
 const ta=triangles(a),tb=triangles(b);assert.equal(tb,ta,'Preserved evaluated triangle count: '+n.name)
 const ba=new THREE.Box3().setFromObject(a,true),bb=new THREE.Box3().setFromObject(b,true)
 const delta=Math.max(ba.min.distanceTo(bb.min),ba.max.distanceTo(bb.max));assert.ok(delta<.0001,'Preserved bounds: '+n.name)
 geometryChecks.push({name:n.name,triangles:tb,maxBoundsDelta:delta});retained.push(n.name)
}
const report={before:before.stats,after:after.stats,retainedSourceNodes:retained.length,geometryChecks,nodeNames:after.j.nodes.map(n=>n.name),materials:after.j.materials}
fs.writeFileSync('artifacts/gulf-20261003-021901/glb-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({before:before.stats,after:after.stats,retainedSourceNodes:retained.length},null,2))
