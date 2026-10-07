const fs = require('fs')
const path = require('path')

const glbPath = path.resolve(__dirname, '../public/models/velar.glb')
const buffer = fs.readFileSync(glbPath)

// GLB header: magic (4), version (4), length (4)
const magic = buffer.readUInt32LE(0)
const version = buffer.readUInt32LE(4)
const length = buffer.readUInt32LE(8)

console.log('GLB Header:')
console.log('  Magic:', magic.toString(16), magic === 0x46546c67 ? '(glTF)' : '(invalid)')
console.log('  Version:', version)
console.log('  Total File Length:', length, 'bytes', `(${(length / (1024 * 1024)).toFixed(2)} MB)`)

// Chunk 0: JSON
const chunk0Length = buffer.readUInt32LE(12)
const chunk0Type = buffer.readUInt32LE(16) // 0x4E4F534A is JSON
const jsonText = buffer.toString('utf8', 20, 20 + chunk0Length)
const gltf = JSON.parse(jsonText)

console.log('\nglTF Structure:')
console.log('  Asset:', JSON.stringify(gltf.asset))
console.log('  Meshes count:', gltf.meshes ? gltf.meshes.length : 0)
console.log('  Nodes count:', gltf.nodes ? gltf.nodes.length : 0)
console.log('  Materials count:', gltf.materials ? gltf.materials.length : 0)
console.log('  Accessors count:', gltf.accessors ? gltf.accessors.length : 0)
console.log('  Images count:', gltf.images ? gltf.images.length : 0)

if (gltf.materials) {
  console.log('\nMaterials:')
  gltf.materials.forEach((mat, i) => {
    console.log(`  [${i}] ${mat.name || 'unnamed'}:`, JSON.stringify(mat.pbrMetallicRoughness || {}))
  })
}

// Inspect meshes and primitives
if (gltf.meshes) {
  gltf.meshes.forEach((mesh, i) => {
    console.log(`\nMesh [${i}] ${mesh.name || 'unnamed'}:`)
    mesh.primitives.forEach((prim, pi) => {
      console.log(`  Primitive [${pi}]: mode=${prim.mode ?? 4}, material=${prim.material}`)
      console.log(`  Attributes:`, Object.keys(prim.attributes).join(', '))
      
      const posAccIdx = prim.attributes.POSITION
      if (posAccIdx !== undefined) {
        const posAcc = gltf.accessors[posAccIdx]
        console.log(`  POSITION Accessor: count=${posAcc.count} (vertices)`)
        console.log(`  POSITION Min: [${posAcc.min.join(', ')}]`)
        console.log(`  POSITION Max: [${posAcc.max.join(', ')}]`)
        const sizeX = posAcc.max[0] - posAcc.min[0]
        const sizeY = posAcc.max[1] - posAcc.min[1]
        const sizeZ = posAcc.max[2] - posAcc.min[2]
        console.log(`  Dimensions: X=${sizeX.toFixed(4)}, Y=${sizeY.toFixed(4)}, Z=${sizeZ.toFixed(4)}`)
        const centerX = (posAcc.min[0] + posAcc.max[0]) / 2
        const centerY = (posAcc.min[1] + posAcc.max[1]) / 2
        const centerZ = (posAcc.min[2] + posAcc.max[2]) / 2
        console.log(`  Center: [${centerX.toFixed(4)}, ${centerY.toFixed(4)}, ${centerZ.toFixed(4)}]`)
      }

      if (prim.indices !== undefined) {
        const indAcc = gltf.accessors[prim.indices]
        console.log(`  INDICES Accessor: count=${indAcc.count} (${indAcc.count / 3} triangles)`)
      }
    })
  })
}

// Nodes inspection (hierarchy & transforms)
console.log('\nNodes:')
if (gltf.nodes) {
  gltf.nodes.forEach((node, i) => {
    console.log(`  Node [${i}] ${node.name || 'unnamed'}: mesh=${node.mesh}, translation=${JSON.stringify(node.translation)}, rotation=${JSON.stringify(node.rotation)}, scale=${JSON.stringify(node.scale)}`)
  })
}
