from pathlib import Path
p=Path('src/components/canvas/VehicleModel.tsx')
s=p.read_text();s=s.replace("import { EXPERIENCE_CONFIG }", "import type { Motion } from '../../config/choreography'\nimport { EXPERIENCE_CONFIG }")
s=s.replace('onReady, onGeometry, onError }:','onReady, onGeometry, onError, motion, ready }:').replace('onReady: () => void; onGeometry:', 'motion: React.RefObject<Motion>; ready: boolean; onReady: () => void; onGeometry:')
a=s.index('    for (const name');b=s.index('    scene.traverse',a);s=s[:a]+s[b:]
s=s.replace('  useEffect(() => {\n    let cancelled', '''  const headlightMaterials = useMemo(() => {
    const materials: THREE.MeshStandardMaterial[] = []
    const assembly = scene.getObjectByName('GT40_HeadLights')
    assembly?.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return
      const original = Array.isArray(o.material) ? o.material : [o.material]
      o.material = original.map(m => { const copy = m.clone() as THREE.MeshStandardMaterial; copy.emissive.set('#fff1d5'); copy.emissiveIntensity = 0; materials.push(copy); return copy })
    })
    return materials
  }, [scene])
  useEffect(() => {
    let cancelled''')
s=s.replace('  useFrame(() => {\n    if', '''  useFrame(() => {
    const t = motion.current.time
    for (const m of headlightMaterials) m.emissiveIntensity = !ready ? 0 : t > .1 && t < .55 ? .6 : 3
    if''')
p.write_text(s)
p=Path('src/components/canvas/StudioFloor.tsx');s=p.read_text().replace('return <mesh','return <><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,-.008,0]}><planeGeometry args={[120,120]}/><meshStandardMaterial color="#040709" roughness={.32} metalness={.25}/></mesh><mesh').replace('  </mesh>','  </mesh></>');p.write_text(s)
p=Path('index.html');s=p.read_text().replace('GT40 / GULF STUDY','The Machine That Changed Le Mans | Ford GT40').replace('#070A0D','#020304');p.write_text(s)
