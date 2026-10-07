from pathlib import Path
p=Path('src/components/canvas/VehicleModel.tsx');s=p.read_text();a=s.index('  const headlightMaterials');b=s.index('  useEffect(() => {\n    let cancelled',a);s=s[:a]+'''  const headlightMaterials = useRef<THREE.MeshStandardMaterial[]>([])
  useEffect(() => {
    const originals: { mesh: THREE.Mesh; material: THREE.Material | THREE.Material[] }[] = []
    for (const name of ['GT40_HeadLights', 'GT40_HeadLightGlass']) {
      scene.getObjectByName(name)?.traverse(o => {
        if (!(o instanceof THREE.Mesh)) return
        originals.push({ mesh: o, material: o.material })
        const list = (Array.isArray(o.material) ? o.material : [o.material]).map(m => {
          const copy = m.clone() as THREE.MeshStandardMaterial
          copy.emissive.set('#fff1d5'); copy.emissiveIntensity = 0
          if (name === 'GT40_HeadLightGlass') copy.opacity = .85
          headlightMaterials.current.push(copy)
          return copy
        })
        o.material = list
      })
    }
    return () => { for (const {mesh,material} of originals) mesh.material = material; for (const m of headlightMaterials.current) m.dispose(); headlightMaterials.current = [] }
  }, [scene])
''' +s[b:];s=s.replace('of headlightMaterials)', 'of headlightMaterials.current)');p.write_text(s)
p=Path('src/components/canvas/StudioFloor.tsx');s=p.read_text().replace('roughness={.32} metalness={.25}','roughness={.92} metalness={0} envMapIntensity={.015}');p.write_text(s)
p=Path('src/components/canvas/StudioEnvironment.tsx');s=p.read_text().replace('gl.toneMappingExposure=.8+.25*r','if(scene.fog instanceof T.Fog)scene.fog.color.copy(scene.background as T.Color)\n  gl.toneMappingExposure=.8+.25*r');p.write_text(s)
p=Path('src/components/canvas/ExperienceCanvas.tsx');s=p.read_text().replace('<color attach="background"', '<fog attach="fog" args={["#020304",12,35]}/><color attach="background"');p.write_text(s)
p=Path('src/config/choreography.ts');s=p.read_text().replace('[5.4, 1.65, 7.7]','[4.2, 1.45, 6.1]').replace('[4.7, 1.45, 7.0]','[4.1, 1.4, 6.0]').replace('[1.65, 1.65, .45]','[2.3, 1.8, .65]').replace('[1.55, 1.6, .35]','[2.3, 1.8, .65]');p.write_text(s)
p=Path('src/components/canvas/CameraRig.tsx');s=p.read_text().replace('camera.fov=38','camera.fov=32').replace('Math.max(1,1.15/(size.width/size.height))','Math.max(1,1.3/(size.width/size.height))');p.write_text(s)
p=Path('src/App.tsx');s=p.read_text().replace('aria-hidden="true">?</span>', 'aria-hidden="true">&#8599;</span>').replace('SCROLL TO EXPLORE <span aria-hidden="true">&#8599;', 'SCROLL TO EXPLORE <span aria-hidden="true">&#8595;');p.write_text(s)
p=Path('src/App.css');s=p.read_text().replace('6.4vw','5.8vw');s+='\n.experience[data-phase=exploring] .chapter-copy{max-width:32vw}.experience[data-phase=exploring] .chapter-copy:has(h2){text-shadow:none}@media(max-aspect-ratio:1.1){.experience[data-phase=exploring] .chapter-copy{max-width:86vw}}\n';p.write_text(s)
