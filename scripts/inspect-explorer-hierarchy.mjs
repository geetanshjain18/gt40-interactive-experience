import fs from 'node:fs'
const bytes = fs.readFileSync('public/models/gt40-gulf-number-6.glb')
const length = bytes.readUInt32LE(12)
const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + length))
const parent = new Map()
for (const node of gltf.nodes) for (const child of node.children ?? []) parent.set(child, node)
const terms = /HeadLight|WheelF|WheelB|Rim|FrontGrill|SteeringWheel|EngineBlock|DoorInterior|Windshield|RearExhaust/i
for (let i = 0; i < gltf.nodes.length; i++) {
  const node = gltf.nodes[i]
  if (!terms.test(node.name ?? '')) continue
  const chain = []
  let current = node
  while (current) { chain.unshift(`${current.name ?? '(unnamed)'}${current.mesh === undefined ? '' : `[mesh ${current.mesh}]`}`); current = parent.get(gltf.nodes.indexOf(current)) }
  process.stdout.write(`${chain.join(' > ')} | children:${(node.children ?? []).map(c => gltf.nodes[c].name).join(', ')}\n`)
}
