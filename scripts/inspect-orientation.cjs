const fs = require('fs')
const path = require('path')

const glbPath = path.resolve(__dirname, '../public/models/velar.glb')
const buffer = fs.readFileSync(glbPath)

const chunk0Length = buffer.readUInt32LE(12)
const jsonText = buffer.toString('utf8', 20, 20 + chunk0Length)
const gltf = JSON.parse(jsonText)

// Buffer 0 is the binary chunk starting right after JSON chunk
const chunk1Offset = 20 + chunk0Length
const chunk1Length = buffer.readUInt32LE(chunk1Offset)
const chunk1Type = buffer.readUInt32LE(chunk1Offset + 4) // 0x004E4942 is BIN
const binBuffer = buffer.subarray(chunk1Offset + 8, chunk1Offset + 8 + chunk1Length)

const posAcc = gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION]
const posBv = gltf.bufferViews[posAcc.bufferView]
const byteOffset = (posBv.byteOffset || 0) + (posAcc.byteOffset || 0)

const vertexCount = posAcc.count
console.log(`Analyzing ${vertexCount} vertices...`)

// Profile along Z in 10 bins from -0.5 to +0.5
const bins = 10
const binHeights = Array.from({ length: bins }, () => ({ count: 0, maxY: -Infinity, minY: Infinity, avgY: 0, sumY: 0 }))

for (let i = 0; i < vertexCount; i++) {
  const x = binBuffer.readFloatLE(byteOffset + i * 12 + 0)
  const y = binBuffer.readFloatLE(byteOffset + i * 12 + 4)
  const z = binBuffer.readFloatLE(byteOffset + i * 12 + 8)

  const binIndex = Math.min(bins - 1, Math.max(0, Math.floor((z + 0.5) * bins)))
  const bin = binHeights[binIndex]
  bin.count++
  bin.sumY += y
  if (y > bin.maxY) bin.maxY = y
  if (y < bin.minY) bin.minY = y
}

console.log('\nZ-Axis Profile (z ranges from -0.50 to +0.50):')
console.log('Bin | Z Range          | Max Y   | Avg Y   | Vertex Count')
console.log('----+------------------+---------+---------+-------------')
binHeights.forEach((b, idx) => {
  const zStart = -0.5 + (idx / bins)
  const zEnd = -0.5 + ((idx + 1) / bins)
  const avg = b.count > 0 ? (b.sumY / b.count).toFixed(3) : '0'
  console.log(` ${idx.toString().padStart(2)} | [${zStart.toFixed(2)}, ${zEnd.toFixed(2)}] | ${b.maxY.toFixed(3)}   | ${avg}   | ${b.count}`)
})
