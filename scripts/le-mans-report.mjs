import fs from 'node:fs'
const dir='artifacts/le-mans-opening',qa=JSON.parse(fs.readFileSync(`${dir}/verification.json`)),mobile=JSON.parse(fs.readFileSync(`${dir}/mobile-performance.json`)),model=JSON.parse(fs.readFileSync(`${dir}/model-audit.json`))
const report=`# GT40 / GULF STUDY — implementation evidence

Implemented the requested editorial landing and continuous camera-led exterior presentation. Production preview: http://127.0.0.1:4173/. Dev preview: http://127.0.0.1:5173/.

- Windows project: D:\\AntiGravity\\Project-1. Node 24.19.0, npm 11.17.0; npm lockfile retained.
- Installed runtime: React 19.3.0, Three 0.186.1, R3F 9.8.1, Drei 10.7.9, GSAP 3.15.0. One ScrollTrigger; no additional scroll library.
- Scripts: dev, build, lint, preview. No dedicated typecheck script; TypeScript build mode used directly.

## Files and architecture

- Replaced src/App.tsx, src/App.css, src/index.css with landing, loading status, accessible controls, chapter UI and responsive layouts.
- Added src/hooks/useExperience.ts: one reducer owns loading/intro/ready/entering/exploring/reducedMotion/error, geometry readiness, shader readiness, timeout and retry.
- Added src/components/canvas/ExperienceCanvas.tsx, VehicleModel.tsx and CameraRig.tsx. The Canvas and loaded scene persist across Explore; no scene clone.
- Added src/config/choreography.ts; updated src/config/experience.ts, src/types/experience.ts, src/config/sequenceConfig.ts and StudioEnvironment.tsx.
- Updated index.html, vite.config.ts, package.json, package-lock.json, .oxlintrc.json and README.md. The build includes only the active model and loading poster, preserving historical files on disk.
- Added public/images/gt40-loading.webp (21.18 kB), derived from this project's own model render.
- Added scripts/le-mans-preview.mjs, le-mans-qa.mjs, le-mans-performance.mjs and le-mans-report.mjs.
- Prior competing intro/scroll/model/UI components and hooks are preserved in artifacts/le-mans-opening/retired/. Source backup: src-before/; original README: README.before.md. No Blender or GLB modifications in this website pass.

## Typography and palette

Added @fontsource/barlow-condensed 5.3.0 and @fontsource/ibm-plex-mono 5.3.0. Reused local Inter. Loaded Latin Barlow 500/600, Inter 400/500, Plex Mono 400; no runtime font service.

| Role | Value |
|---|---|
| Background / raised / floor | #070A0D / #0D1217 / #080A0C |
| Primary / secondary / technical text | #F3EFE6 / #8D99A3 / #65717B |
| Gulf blue / Gulf orange / racing white | #74B9D2 / #F36C21 / #EEEDE5 |
| Dividers | rgba(238,237,229,0.12), rgba(238,237,229,0.22) |

## Camera and choreography

Desktop landing camera: [3.329097, 1.300000, 5.814389], target [0, 0.659113, 0], FOV 32 degrees. Landing view offset: -16% horizontal, -9.5% vertical; entry eases this to zero. The target derives from actual cleaned model bounds. Vehicle length is normalized to 4.8 units with existing presentation-center metadata and yaw preserved.

| Progress | Azimuth radians | Distance | Height | FOV |
|---|---:|---:|---:|---:|
| 0% | 0.52 | 7.0 | 1.30 | 32 |
| 15% | 0.62 | 6.7 | 1.28 | 32 |
| 38% | 1.570796 | 7.6 | 1.15 | 34 |
| 62% | 2.43 | 7.1 | 1.65 | 33 |
| 72% | 3.141593 | 7.1 | 1.50 | 33 |
| 82% | 4.03 | 7.2 | 1.40 | 34 |
| 92% | 4.712389 | 7.6 | 1.15 | 34 |
| 100% | 5.70 | 7.0 | 1.30 | 32 |

Targets vary gently from bounds midpoint minus 0.03 to midpoint. Chapters: 0–15% THE MACHINE; 15–38% FORM IN MOTION; 38–62% BUILT FOR ENDURANCE; 62–82% EVERY ANGLE; 82–100% AN ENDURING FORM. Camera orbit is dominant; the vehicle stays fixed. Smoothstep keyframe interpolation plus delta-time exponential damping 28; progress lives in refs. Sticky stage spans a 560svh native scrolling container. Reverse, touch, keyboard, chapter jumps and Replay use the same scroll source.

Intro: 2.9 seconds desktop, 1.7 seconds compact; narrow light sweep, masked headline reveal, copy and action. Skip settles immediately. Explore takes 1 second with the same visible car. Loading begins on initial mount; useProgress reports actual completed loading items (not byte interpolation). INITIALISING → LOADING GEOMETRY → PREPARING MATERIALS → READY. Shader compileAsync plus three warm frames gate Explore. A 45-second timeout and tested retry avoid indefinite loading. Slow loading holds the composition without restarting the intro.

Reload resets history scroll restoration before paint and returns camera to the landing view. A persisted pageshow resets the study. Reduced motion skips the sweep/orbit and provides FRONT/LEFT/REAR/RIGHT static angle controls with the same model/content/Explore action.

Portrait mobile: FOV 44, bounds-based distance; measured opening position [7.345158,1.3,12.828585]. DPR capped at 1.15, environment 256; desktop DPR 1.5, environment 512. Landscape phone uses the side-by-side layout. Viewport units, 44px chapter controls and separate title/car/action regions prevent clipping.

## Lighting and rendering

Neutral key [4,7,5], intensity 1.5, #FFFFFF; rim [-6,4.5,-4], intensity 1.0, #ABB7C4; fill [0,2,6], intensity 0.65, #ECEFF2; hemisphere 0.45. Fixed procedural softboxes: overhead intensity 2.0, rim 1.6, fill 0.6. ACES tone mapping, exposure 1.05. Analytic feathered contact patch, no real-time shadow maps or postprocessing. Reflection environment is memoized, avoiding six-face rebakes on UI updates. Only existing optical materials use double-sided/single-pass handling; no global DoubleSide override. Demand rendering stops after settling and while hidden.

## Model and performance

Active model: ${model.path}, ${model.bytes.toLocaleString()} bytes (${model.MiB.toFixed(2)} MiB). SHA256: ${model.sha256}.

Before/after website pass: unchanged ${model.vertices.toLocaleString()} unique-position vertices, ${model.triangles.toLocaleString()} model triangles, ${model.meshes} meshes, ${model.primitives} primitives, ${model.materials} materials, ${model.textures} embedded 2048×2048 PNG (135,264 bytes), ${model.alphaMaterials} alpha materials, 2 optical double-sided materials. GLB has clearcoat extension, no camera/light, and no GT40_DoorHatch1.

Renderer before/after: 268 draw calls, 885,302 rendered triangles including floor, 283 geometries, 6 runtime textures in the desktop sample. Asset quality is preserved. Initial download remains substantial.

| Measurement | Result |
|---|---:|
| Final desktop continuous-scroll RAF sample | ${qa.performance.rafFps.toFixed(1)} fps |
| Desktop P95 frame interval | ${qa.performance.frameMsP95.toFixed(1)} ms |
| Mobile-emulated continuous scroll, DPR ${mobile.performance.dpr} | ${mobile.performance.rafFps.toFixed(1)} fps |
| Mobile P95 frame interval | ${mobile.performance.frameMsP95.toFixed(1)} ms |
| Idle / hidden rendered frames | ${mobile.idleFrames} / ${mobile.hiddenFrames} |
| Initial GLB requests / extra request on Explore | 1 / 0 |

The saved prior browser baseline was 60.4 desktop fps and 36.4 mobile fps (mobile P95 83.1ms). Those samples used the old interaction and are not an identical-workload benchmark. Current results are Chromium emulation on this machine, not a physical-phone guarantee. Renderer pass counts include offscreen work and are not display FPS.

## Verification

- TypeScript: node node_modules/typescript/bin/tsc -b --pretty false — exit 0.
- Production: npm run build — exit 0. Vite emits a bundle-size advisory: main JS 1.389 MB, about 400.5 kB gzip. The model starts loading immediately; no delayed scene chunk.
- Lint: npm run lint — exit 0, six pre-existing unused-variable warnings in historical utility scripts; active application source has no warnings. Backups and dist are excluded from lint.
- Production Chromium suite: ${qa.views.length} captured views, ${qa.normalErrors.length} normal console/page errors. Verified slow uncached load, cached reload, Skip, keyboard Explore, one scene UUID across entry, one initial GLB request, full forward/reverse travel, rapid/slow wheel, keyboard navigation, replay, resize, native touch, reduced motion, failed request and successful retry.
- Viewports: 1440×900, 1366×768, 820×1180, 390×844, 360×640, 844×390. Projected bounds assertions pass in every captured view; no horizontal page overflow.
- Visually inspected opening/front-left, both side profiles, rear-left, rear, rear-right, closing/front-right, entry, mobile/tablet/landscape, loading, reduced-motion and retry screenshots. No camera clipping, missing half, obstructing helper, text over critical vehicle features, or model/shader/texture errors observed.
- Active src/index.html and built output branding search: zero forbidden identity/copy matches. Whole-project search still finds historical scripts, backups and preserved image-sequence metadata. Those assets are not included in production.
- Supplemental hidden-page test exposed redundant environment rebakes; fixed by memoizing StudioEnvironment. Final idle/hidden assertions both pass.

Evidence: verification.json, mobile-performance.json, model-audit.json, qa-*.png. Before screenshots: before-desktop.png and before-mobile.png.

## Remaining limits

No blocking website defect remains in the tested paths. The existing model's sculpted surface/optical-detail limitations remain; no geometry or livery changes were made. Sound is omitted because no suitable audio-license evidence was found. Physical-device performance, Safari and Firefox were not tested. The analytic floor contact patch is a performant approximation rather than a ray-traced shadow. Old models and archives are intentionally preserved on disk.
`
fs.writeFileSync(`${dir}/REPORT.md`,report)
console.log(`Wrote ${dir}/REPORT.md`)
