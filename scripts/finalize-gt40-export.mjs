import fs from 'node:fs'
import assert from 'node:assert/strict'

const path = 'public/models/gt40-le-mans-black.glb'
const backup = 'artifacts/gt40-materials/gt40-le-mans-black-raw-final.glb'
const bytes = fs.readFileSync(path)
assert.ok(!fs.existsSync(backup), 'Do not overwrite export backup')
fs.copyFileSync(path, backup)
const end = 20 + bytes.readUInt32LE(12)
const json = JSON.parse(bytes.subarray(20, end).toString())
assert.equal(json.nodes.length, 162)
const excluded = ['GT40_DoorHatch1', 'GT40_DoorHatchScrews', 'Studio_Ground1', 'PaintPallet1', 'PaintPallet2', 'PaintPallet3', 'PaintPallet4']
assert.ok(!json.nodes.some(n => excluded.includes(n.name)))
assert.ok(!json.animations?.length && !json.cameras?.length)
json.scenes[json.scene ?? 0].extras = {
  gt40PresentationCenter: [-0.025296134189867647, 0.07914431763914576, 0.22168660163879395],
  gt40FinishVersion: 'le-mans-black-1',
}
const encoded = Buffer.from(JSON.stringify(json))
const padded = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 0x20)
encoded.copy(padded)
const header = Buffer.from(bytes.subarray(0, 20)), binary = bytes.subarray(end)
header.writeUInt32LE(20 + padded.length + binary.length, 8)
header.writeUInt32LE(padded.length, 12)
fs.writeFileSync(path, Buffer.concat([header, padded, binary]))
console.log('Validated selection and restored presentation-center metadata without changing geometry or materials.')
