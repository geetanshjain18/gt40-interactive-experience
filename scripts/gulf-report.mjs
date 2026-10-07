import fs from 'node:fs'
import sharp from 'sharp'
const out='artifacts/gulf-20261003-021901'
const read=n=>JSON.parse(fs.readFileSync(`${out}/${n}.json`,'utf8'))
const glb=read('glb-verification'),qa=read('browser-verification'),before=read('before-browser'),samples=read('reference-samples'),inventory=read('scene-inventory'),assignments=read('final-assignments'),excluded=read('excluded')
const hex=rgb=>'#'+rgb.slice(0,3).map(c=>Math.round((c<=.0031308?12.92*c:1.055*c**(1/2.4)-.055)*255).toString(16).padStart(2,'0')).join('').toUpperCase()
const materialRows=glb.materials.map(m=>({name:m.name,hex:hex(m.pbrMetallicRoughness.baseColorFactor??[1,1,1,1]),metallic:m.pbrMetallicRoughness.metallicFactor??1,roughness:m.pbrMetallicRoughness.roughnessFactor??1,coat:m.extensions?.KHR_materials_clearcoat?.clearcoatFactor??0,alpha:m.pbrMetallicRoughness.baseColorFactor?.[3]??1,doubleSided:!!m.doubleSided}))
fs.writeFileSync(`${out}/final-materials.json`,JSON.stringify(materialRows,null,2))
const fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:2})
const rows=[['GLB MiB',glb.before.MiB,glb.after.MiB],['Vertices',glb.before.vertices,glb.after.vertices],['Triangles',glb.before.triangles,glb.after.triangles],['Mesh objects',glb.before.meshes,glb.after.meshes],['GLB primitives',glb.before.primitives,glb.after.primitives],['Materials',glb.before.materials,glb.after.materials],['Embedded textures',0,1],['Transparent materials',0,3],['Double-sided materials',40,2],['Browser draw calls',before.metrics.drawCalls,qa.performanceDesktop.drawCalls],['Desktop sampled FPS',before.metrics.fps,qa.performanceDesktop.fps]]
const changed=[]
function compare(dir,prefix=''){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const rel=prefix+ent.name;if(ent.isDirectory())compare(dir+'/'+ent.name,rel+'/');else{const old=out+'/src-backup/'+rel;if(!fs.existsSync(old)||!fs.readFileSync(old).equals(fs.readFileSync(dir+'/'+ent.name)))changed.push('src/'+rel)}}}
compare('src')
const warnings=(fs.readFileSync(out+'/lint.log','utf8').match(/warning /g)||[]).length
const report=`# GT40 / GULF STUDY — implementation and verification

The new Gulf number 6 asset is integrated at http://127.0.0.1:5173/. This is an independent design study, not an affiliation claim. Original model and GLB remain unchanged; both match their timestamped backups by SHA-256.

## Finish and palette

Nonmetallic powder-blue vintage gloss: base #80BBD2, metallic 0, roughness 0.26, clearcoat 0.70, coat roughness 0.14. Orange #F36C21 uses roughness 0.25 and the same clearcoat. Warm roundel white #EEEDE5 and numeral black #101113 are in the original vector-derived artwork. Paint is deliberately between the shadowed blue and brightly lit blue samples; reference lighting is not baked into individual panels. Orange is balanced against the supplied starting palette to avoid baking the reference images' warm cast into the finish.

Pixel samples below are per-channel medians of actual 9×9 pixel patches, not estimated swatches. Coordinates and RGB values are in reference-samples.json. All five supplied references were opened and inspected.

| Reference | Blue sample | Orange sample |
|---|---|---|
${samples.map(s=>`| ${s.file} | ${s.blue.hex} at ${s.blue.xy.join(', ')} | ${s.orange.hex} at ${s.orange.xy.join(', ')} |`).join('\n')}

## Materials and assignments

Twenty shared exported materials. Complete exact object-to-slot assignments are in final-assignments.json and below. Wheel centres are orange, tyre and sidewall slots black, outer wheel lip faces alloy, centre hubs dark. Brakes retain steel/red/metal slots. Interior seats, grips, panels, gauges, controls and engine parts retain differentiated materials. Grille recesses and lamp housings received targeted face assignments, documented in housing-face-assignments.json and housing-footprint.json. The latter corrects the headlamp mask to its actual evaluated lens footprint.

| Material | sRGB base | Metallic | Roughness | Coat | Alpha | Two-sided |
|---|---|---:|---:|---:|---:|---|
${materialRows.map(m=>`| ${m.name} | ${m.hex} | ${fmt(m.metallic)} | ${fmt(m.roughness)} | ${fmt(m.coat)} | ${fmt(m.alpha)} | ${m.doubleSided} |`).join('\n')}

## UV, decals, and graphics

One original SVG-derived 2048×2048 transparent PNG (135,264 bytes), packed into Blender and embedded in GLB. It contains a warm white roundel and a custom path-drawn black 6; no external artwork or fonts were copied. Targeted projected UV maps place it on both doors and bonnet. The optional rear-deck roundel was excluded after the raised intake visibly obstructed it; its separate object remains hidden in the editable Blender file (rear-decal-exclusion.json). The bonnet UV is oriented to read from the front. All authored racing numerals are 6; no 9 artwork exists. Decal surfaces follow the evaluated body. Orange stripe geometry is clipped to a consistent 0.78-unit band and filtered against the upper exterior envelope; windows and openings remain uncovered. Orange lower-nose treatment follows the available Mk II fascia. Small Gulf/sponsor logos are deferred: clean supplied graphic assets were unavailable.

## Geometry and export

No original car mesh deleted, joined, decimated or reshaped. 160 original car nodes retain exactly their prior evaluated triangle counts and world bounds (per-object results: glb-verification.json). This includes evaluated Mirror geometry. Five separate livery meshes are exported; the optional rear roundel remains hidden in Blender. The source body already combines several panels into GT40_Body; this pass preserves that existing editability rather than newly joining parts. Body topology differs from the reference cars in the nose, headlamps, wheel design, roof and rear bodywork; those differences remain.

GT40_DoorHatch1 is absent from source, working file and export. Excluded, not deleted: Studio_Ground1, PaintPallet1, PaintPallet2, PaintPallet3, PaintPallet4, and orphan GT40_DoorHatchScrews. The last belongs to the removed roof hatch. Original Studio_Camera and Studio_Light1–4 and new Gulf_Studio_* preview objects are excluded from GLB. Exact original exclusion locations/dimensions/parents are in excluded.json. GT40_UndersideBox is a fitted structural component; it remains with dark metal, not a white helper.

Export has no cameras, lights, animation tracks or missing materials. KHR_materials_clearcoat is verified. Three.js GLTFLoader parsed it successfully; all geometry attributes are finite. No Draco/Meshopt dependency was added. Global DoubleSide and disabled frustum culling were removed. Only the two optical materials remain two-sided because the original thin-sheet orientation varies; those use a single Three.js render pass.

## Lighting, camera and scrolling

Blender: three broad neutral area lights, charcoal floor, subdued world fill; front/rear/side Cycles previews inspected and iterated. Website: procedural studio environment, broad highlights, neutral key/fill/rim, ACES mapping at exposure 1.1, dark charcoal background, orange UI accent and warm off-white text. The rectangular contact-shadow artefact was replaced by a soft analytic contact patch with transparent edges. This shadow is an approximation, not a ray-traced tyre shadow.

Camera target height comes from cleaned loaded geometry bounds; horizontal centre comes from recalculated export metadata. Desktop distance 7.2, mobile minimum 15.2, plus aspect-aware silhouette fitting; desktop FOV 36°, mobile 44°. The complete car stays inside tested frames.

Sticky stage pins the 360° exterior rotation. Scroll maps to an absolute yaw target with short frame-rate-independent damping (lambda 24); it reverses naturally. The unrelated automatic intro is removed from the active page. Manual history restoration and reload reset are retained. Reduced motion presents a static view with zero idle rendered frames. No door, engine or interior-transition animation was added. Active component renamed to GT40Model across imports. Archived backup files retain their historical text; no visible Velar/Range Rover branding remains.

## Performance

| Metric | Before | After |
|---|---:|---:|
${rows.map(r=>`| ${r[0]} | ${fmt(r[1])} | ${fmt(r[2])} |`).join('\n')}

Final texture: one 2K sRGB PNG; no data maps. Renderer texture count includes the studio environment and shadow texture and therefore differs from GLB texture count. Desktop 1440×900 P95 frame time: ${fmt(qa.performanceDesktop.frameMsP95)} ms. Mobile viewport 390×844 sampled ${fmt(qa.performanceMobile.fps)} fps, P95 ${fmt(qa.performanceMobile.frameMsP95)} ms. These are headless Chromium results on this computer, not a physical-phone benchmark. There was no silhouette decimation or destructive mesh merge. Removing transmission prepasses recovered the initial ~29 fps prototype to the reported final rate.

## Verification

- Node ${process.version}, npm 11.17.0; Blender 5.2.2 LTS, C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe.
- Blender MCP available and inspected. Its open GT40_03_MATERIALS.blend scene was dirty, so background Blender preserved that unsaved session.
- Type: node node_modules/typescript/bin/tsc -b --pretty false — exit 0. No dedicated type script exists.
- Lint: npm run lint — exit 0, ${warnings} warnings, no errors. Warnings cover existing scripts, archived backups, set-state-in-effect and React immutability rules on imperative R3F code; details in lint.log.
- Build: npm run build — exit 0 outside sandbox; original sandbox attempt failed with spawn EPERM. Vite reports its >500 kB bundle advisory; build.log contains output.
- Browser: ${qa.results.length} recorded states, no model/shader/texture errors, no clipped bounds. Opening, front, rear, both sides, four three-quarter views, elevated view, 25-step full rotation, reverse scroll, full reload, nine mobile rotation positions, desktop/mobile reduced motion. Reload position was checked before issuing any test scroll command. Reduced-motion idle frames: ${qa.reducedMotionIdleFrames}.
- Screenshot review confirms a complete car, consistent paint, readable 6 roundels, black tyres, orange centres/alloy lips, dark grilles, visible interior, optical surfaces and no obstructing studio geometry. The screenshot gallery/contact sheets are separate from build evidence.

## Files

- Blender backup: D:\\Blender Project\\GT40 Project\\Blender Files\\GT40_02_NO_DOOR_HATCH_BACKUP_20261003-021901.blend
- Working file: D:\\Blender Project\\GT40 Project\\Blender Files\\GT40_04_GULF_LIVERY.blend
- GLB backup: D:\\AntiGravity\\Project-1\\public\\models\\gt40-no-door-hatch-backup-20261003-021901.glb
- New GLB: D:\\AntiGravity\\Project-1\\public\\models\\gt40-gulf-number-6.glb
- Texture: D:\\Blender Project\\GT40 Project\\Textures\\Gulf\\roundel-6.png
- Reproducible Blender scripts: D:\\Blender Project\\GT40 Project\\Scripts\\gulf-*.py (copies also in website scripts/). Run source conversion, refine, finalize, optics-housings, housing-fit, then deliver in that order. Refinement scripts are sequential passes, not repeat-idempotent operations.
- Website changes: ${changed.join(', ')}, index.html, package.json, package-lock.json; VelarModel.tsx renamed to GT40Model.tsx. Verification and report scripts are in scripts/gulf-*.

## Remaining limitations

No external blocker. Exact logos/sponsor decals deferred for missing clean artwork. The model's Mk II body and wheel geometry differs from the references; this is a livery/material match within those limits. Glass uses an alpha/Fresnel approximation rather than physically refractive transmission: the latter exported but made the layered source windows too opaque and doubled the rendering workload. Headlight reflectors and gauges are limited by the original geometry. Some inherited panel waviness remains visible under broad Blender studio reflections; no body resculpt was performed. The approximately 26 MiB uncompressed asset remains substantial; component detail and later animation editability were prioritised. Mobile results are viewport emulation. Production was built locally, not deployed.

## Exact object-to-material assignments

| Object | Material slots in order |
|---|---|
${assignments.map(o=>`| ${o.object} | ${o.materials.join('; ')} |`).join('\n')}

## Original mesh inventory

Source-file property values before edits; complete data including evaluated bounds, UVs and modifier names is in scene-inventory.json.

| Mesh | Original slots | Location | Dimensions | Parent |
|---|---|---|---|---|
${inventory.meshes.map(o=>`| ${o.name} | ${o.materials.join('; ')||'(none)'} | ${o.location.map(fmt).join(', ')} | ${o.dimensions.map(fmt).join(', ')} | ${o.parent??'(none)'} |`).join('\n')}
`
fs.writeFileSync(out+'/REPORT.md',report)
const groups=[['rotation',fs.readdirSync(out).filter(x=>/^web-rotation/.test(x))],['angles',['web-opening.png','web-front.png','web-front-left.png','web-left.png','web-rear-left.png','web-rear.png','web-rear-right.png','web-right.png','web-front-right.png','web-elevated.png','web-reload.png','web-reduced-motion-desktop.png']],['mobile',fs.readdirSync(out).filter(x=>/^web-mobile|^web-reduced-motion-mobile/.test(x))]]
for(const [group,files] of groups){const mobile=group==='mobile',w=mobile?195:480,h=mobile?422:300,cols=mobile?5:group==='rotation'?5:3;const composite=await Promise.all(files.map(async(f,i)=>({input:await sharp(out+'/'+f).resize(w,h).toBuffer(),left:i%cols*w,top:Math.floor(i/cols)*h})));await sharp({create:{width:w*cols,height:h*Math.ceil(files.length/cols),channels:3,background:'#17191c'}}).composite(composite).jpeg({quality:90}).toFile(out+'/'+group+'-contact-sheet.jpg')}
const files=groups.flatMap(x=>x[1]);fs.writeFileSync(out+'/gallery.html',`<!doctype html><meta charset="utf-8"><title>GT40 / Gulf Study — verification gallery</title><style>body{background:#17191c;color:#eeede5;font:16px system-ui;margin:32px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:20px}figure{margin:0}img{width:100%;height:300px;object-fit:contain;background:#111}a{color:#f36c21}figcaption{padding:10px}</style><h1>GT40 / Gulf Study</h1><p>Final rendered browser views. <a href="REPORT.md">Technical report</a></p><main>${files.map(f=>`<figure><a href="${f}"><img src="${f}" loading="lazy"></a><figcaption>${f.replace('web-','').replace('.png','')}</figcaption></figure>`).join('')}</main>`)
console.log('Report and final galleries generated')
