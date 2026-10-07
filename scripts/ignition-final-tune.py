from pathlib import Path
p=Path('src/components/canvas/ExperienceCanvas.tsx');s=p.read_text().replace("import { VehicleModel }", "import { HeadlightBloom } from './HeadlightBloom'\nimport { VehicleModel }").replace('<CameraRig state=', '{!compact&&<HeadlightBloom/>}<CameraRig state=');p.write_text(s)
p=Path('src/components/canvas/VehicleModel.tsx');s=p.read_text().replace("if (name === 'GT40_HeadLightGlass') copy.opacity = .85",'''if (name === 'GT40_HeadLightGlass') copy.opacity = .35
          // Restrict emission to the physical bulb centres, not the flat lens surround.
          copy.onBeforeCompile = shader => {
            shader.vertexShader = 'varying vec3 lampWorld;\\n' + shader.vertexShader
            shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\\nlampWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')
            shader.fragmentShader = 'varying vec3 lampWorld;\\n' + shader.fragmentShader
            shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\\ntotalEmissiveRadiance *= 1.0 - smoothstep(0.025, 0.065, length(vec2(abs(lampWorld.x) - 0.728, lampWorld.y - 0.790)));')
          }
          copy.customProgramCacheKey = () => 'gt40-bulb-mask-v1' ''').replace('? .6 : 3','? 1.5 : 9');p.write_text(s)
p=Path('src/components/canvas/CameraRig.tsx');s=p.read_text();a=s.index('  const close=');b=s.index('  camera.near',a);s=s[:a]+'''  const close=smooth((p-.36)/.12)*(1-smooth((p-.79)/.12))
  if(portrait){const factor=THREE.MathUtils.lerp(Math.max(1,1.3/(size.width/size.height)),1.5,close);camera.position.sub(target).multiplyScalar(factor).add(target)}
'''+s[b:];p.write_text(s)
p=Path('src/hooks/useMotion.ts');s=p.read_text().replace("overlay.current?.style.setProperty('--landing-opacity'", "overlay.current?.style.setProperty('--challenger-opacity',String(Math.min(1,m.progress/.025)))\n    overlay.current?.style.setProperty('--landing-opacity'");p.write_text(s)
p=Path('src/App.css');s=p.read_text().replace('opacity:var(--chapter-opacity)}.fallback', 'opacity:calc(var(--chapter-opacity)*var(--challenger-opacity,0))}.fallback');p.write_text(s)
p=Path('scripts/ignition-preview.mjs');s=p.read_text().replace('/\\.glb|\\/audio\\//','/\\.(glb|ogg|mp3)(?:\\?|$)/');p.write_text(s)
p=Path('vite.config.ts');s=p.read_text().replace("import { readFileSync }", "import { readFileSync, readdirSync }").replace("export default defineConfig({", "export default defineConfig({\n  build: { rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'vendor', test: /node_modules/, maxSize: 450000 }] } } } },")
s=s.replace("      for (const path of [configuredModel.slice(1), 'images/gt40-loading.webp'])", "      const audioFiles = readdirSync('public/audio').filter(p => /\\.(ogg|mp3|md)$/i.test(p)).map(p => `audio/${p}`)\n      for (const path of [configuredModel.slice(1), 'images/gt40-loading.webp', ...audioFiles])");p.write_text(s)
