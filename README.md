# The Machine That Changed Le Mans

A real-time Gulf Ford GT40 number 6 study, representing the 1969 Le Mans-winning P/1075. One GLB and one Canvas remain mounted from blackout through the five camera-led chapters.

## Run and verify

- `npm run dev -- --host 127.0.0.1`
- `npm run build`
- `npm run preview`
- `npx tsc -b`
- `npm run lint`
- `node --test scripts/ignition-audio.test.mjs`
- `node scripts/ignition-preview.mjs` — browser suite against port 5173
- `node scripts/ignition-preview.mjs --production` — serves `dist` temporarily on port 4173 and tests the actual built site

On Windows, process spawning may require an unrestricted terminal. Do not change application code to work around a sandbox `spawn EPERM`.

## Responsibilities

| File | Responsibility |
| --- | --- |
| `src/App.tsx` / `src/App.css` | Semantic opening actions, narrative typography, persistent audio control, fallback and responsive overlay |
| `src/hooks/useExperience.ts` | Loading → ready → preparing → igniting → exploring; error and reset handling |
| `src/hooks/useMotion.ts` | Shared elapsed-time timeline, native scroll target, frame-independent damping and DOM synchronization |
| `src/config/choreography.ts` | Camera keyframes, narrative chapters, timing, studio palette, lighting and quality defaults |
| `src/config/experience.ts` | Existing model path, yaw and target length; legacy framing fields are no longer used |
| `src/components/canvas/VehicleModel.tsx` | Single cached GLB, bounds normalization, shader warm-up and targeted headlight overrides |
| `src/components/canvas/CameraRig.tsx` | Exterior, side, glazing/cockpit, rear-window engine and final hero camera path |
| `src/components/canvas/StudioEnvironment.tsx` | Moving reveal light, cool rim, front fill, warm nose light and headlight beams |
| `src/components/canvas/StudioFloor.tsx` | Dark rough floor and analytic contact shadow |
| `src/components/canvas/HeadlightBloom.tsx` | Thresholded opening-only desktop bloom; direct rendering resumes before scroll |
| `src/components/canvas/ExperienceCanvas.tsx` | Persistent renderer, visibility and device-quality handling, final orbit inspection |
| `src/audio/EngineAudio.ts` / `src/config/audio.ts` | Gesture-unlocked Web Audio transport, buffering, gain transitions, overlapping loop and visibility handling |
| `public/audio/PROVENANCE.md` | Required licensed recordings, rejected candidates and final audio acceptance work |

## Asset boundary

`public/models/gt40-gulf-number-6.glb` is unchanged (SHA256 `86bccae2c83a0c3bf53da0ea67c4f3e8442148a3890dfc45f0ba88c0f70d3c3f`). Its 26.2 MiB monolithic structure means exterior and interior cannot be independently network-prioritized without a separate asset optimization pipeline. A single 2048px atlas is embedded; no external texture fetch is needed. No model re-export, node removal or authored paint/glass replacement was performed. Cameras remain outside the closed glass and panels.

Fonts are local, use swap, and require no external font service. Production emits the active GLB, fallback poster, supplied compressed audio, provenance and compiled assets. Historical GLBs, old image sequences and the unverified WAV are excluded. Legacy scripts remain historical; use the ignition suite for the new UI.

## Audio is pending a licensed recording

No engine sound is currently shipped. Start Engine unlocks Web Audio and runs the full visual sequence, with a restrained sound-unavailable state when recordings are absent. Silent entry never opens audio. Do not enable `licensedAssetsAvailable` until the switch/start/idle recordings have verified identity and distribution rights, complete provenance, matching edits and listening approval. No exact P/1075 sound is claimed.

## Evidence and rollback

`artifacts/ignition-20261004/` contains the source backup, model hierarchy, browser screenshots, verification results and implementation report. Restore `src-before/` plus the saved root files to reverse the redesign; the GLB itself was never changed. The `?qa` query exposes inspection references only for local validation. Browser screenshots and measured frame timing are separate from static/build checks.
