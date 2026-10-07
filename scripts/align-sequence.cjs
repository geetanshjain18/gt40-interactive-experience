const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

// Curated 23-frame progression covering 360-degree turntable:
// Front -> Left Side -> Rear -> Right Side -> Front Return
const SELECTED_FRAMES = [
  0, 1, 2, 4, 6, 8, 10, 11,
  12, 13, 15, 17, 18,
  19, 21, 23, 24, 26,
  28, 29, 31, 34, 35
]

// Exact physical row boundaries in the 1536x1024 reference sheet
// Calculated from vertical luminance profile to exclude cross-row floor lighting bands
const ROW_BOUNDARIES = [
  { top: 0,   height: 168 }, // Row 0 (frames 0-5)
  { top: 187, height: 152 }, // Row 1 (frames 6-11)
  { top: 361, height: 150 }, // Row 2 (frames 12-17)
  { top: 533, height: 154 }, // Row 3 (frames 18-23)
  { top: 706, height: 146 }, // Row 4 (frames 24-29)
  { top: 873, height: 151 }, // Row 5 (frames 30-35)
]

// Fine vertical alignment to keep ground contact plane perfectly stable across angles
const TIRE_BASELINE_OFFSETS = {
  0: 6,   // Front view: align ground plane with 3/4 view
  1: 3,
  2: 2,
  4: 0,
  6: 0,
  8: 0,
  10: 0,
  11: 0,  // Left side profile
  12: 0,
  13: 0,
  15: 0,
  17: 0,
  18: 3,  // Rear view: align ground plane
  19: 0,
  21: 0,
  23: 0,
  24: 0,
  26: 0,  // Right side profile
  28: 0,
  29: 0,
  31: 2,
  34: 4,
  35: 6   // Front return view
}

async function processSequence() {
  const sheetPath = path.resolve(__dirname, '../public/reference/velar-angle-reference-sheet.png')
  const alignedDir = path.resolve(__dirname, '../public/sequence/aligned')
  const optDir = path.resolve(__dirname, '../public/sequence/optimized')
  const inspectDir = path.resolve(__dirname, '../public/sequence/inspection')

  fs.mkdirSync(alignedDir, { recursive: true })
  fs.mkdirSync(optDir, { recursive: true })
  fs.mkdirSync(inspectDir, { recursive: true })

  // Common canvas size: 320 x 200 (ample margins, zero clipping)
  const canvasW = 320
  const canvasH = 200
  const bgR = 0x14, bgG = 0x14, bgB = 0x14 // #141414

  const manifest = {
    version: '1.0',
    totalFrames: SELECTED_FRAMES.length,
    canvas: { width: canvasW, height: canvasH },
    frames: [],
    chapters: [
      {
        id: 'front-perspective',
        number: '01',
        title: 'Front perspective',
        subtitle: '01 — FRONT PERSPECTIVE',
        caption: 'Explore its sculpted form, signature grille, and purposeful stance.',
        frameIndex: 0,
        progress: 0.0
      },
      {
        id: 'the-silhouette',
        number: '02',
        title: 'The silhouette',
        subtitle: '02 — THE SILHOUETTE',
        caption: 'A taut, unbroken roofline flows into flush waistline glazing and an aerodynamic taper.',
        frameIndex: 7, // Frame 11 (true left side profile)
        progress: 7 / (SELECTED_FRAMES.length - 1)
      },
      {
        id: 'rear-perspective',
        number: '03',
        title: 'Rear perspective',
        subtitle: '03 — REAR PERSPECTIVE',
        caption: 'Broad athletic rear haunches resolve into a clean, reductionist tailgate graphic.',
        frameIndex: 12, // Frame 18 (direct rear view)
        progress: 12 / (SELECTED_FRAMES.length - 1)
      },
      {
        id: 'complete-view',
        number: '04',
        title: 'Complete view',
        subtitle: '04 — COMPLETE VIEW',
        caption: 'The continuous reductionist profile completes a balanced 360-degree exterior study.',
        frameIndex: SELECTED_FRAMES.length - 1, // Frame 35 (direct front return)
        progress: 1.0
      }
    ]
  }

  console.log(`Extracting and aligning ${SELECTED_FRAMES.length} selected frames directly from master sheet...`)

  const colW = 256

  for (let seqIdx = 0; seqIdx < SELECTED_FRAMES.length; seqIdx++) {
    const rawIdx = SELECTED_FRAMES[seqIdx]
    const row = Math.floor(rawIdx / 6)
    const col = rawIdx % 6

    const rowInfo = ROW_BOUNDARIES[row]

    // Trim 2px inside column borders to prevent column divider seams
    const cropLeft = col * colW + 2
    const cropTop = rowInfo.top
    const cropWidth = colW - 4
    const cropHeight = rowInfo.height

    const dy = TIRE_BASELINE_OFFSETS[rawIdx] || 0

    // Extract exact cell directly from reference sheet
    const cellBuffer = await sharp(sheetPath)
      .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
      .toBuffer()

    // Place centered on 320x200 canvas
    const placeLeft = Math.round((canvasW - cropWidth) / 2)
    // Align ground contact plane at constant baseline y=168
    const placeTop = Math.round(168 - cropHeight) + dy

    // Composite onto #141414 solid canvas
    const composited = await sharp({
      create: {
        width: canvasW,
        height: canvasH,
        channels: 3,
        background: { r: bgR, g: bgG, b: bgB }
      }
    })
    .composite([
      {
        input: cellBuffer,
        left: placeLeft,
        top: Math.max(0, placeTop)
      }
    ])
    .png()
    .toBuffer()

    const outFilenamePng = `seq_${String(seqIdx).padStart(2, '0')}.png`
    const outFilenameWebp = `seq_${String(seqIdx).padStart(2, '0')}.webp`

    await sharp(composited).toFile(path.join(alignedDir, outFilenamePng))

    // High fidelity WebP
    await sharp(composited)
      .webp({ quality: 92, effort: 6 })
      .toFile(path.join(optDir, outFilenameWebp))

    manifest.frames.push({
      sequenceIndex: seqIdx,
      sourceRawIndex: rawIdx,
      filename: outFilenameWebp,
      path: `/sequence/optimized/${outFilenameWebp}`,
      progress: seqIdx / (SELECTED_FRAMES.length - 1)
    })
  }

  fs.writeFileSync(
    path.resolve(__dirname, '../public/sequence/manifest.json'),
    JSON.stringify(manifest, null, 2)
  )
  console.log('Manifest written to public/sequence/manifest.json')

  // Generate curated contact sheet
  const contactCols = 6
  const contactRows = Math.ceil(SELECTED_FRAMES.length / contactCols)
  const contactW = contactCols * canvasW
  const contactH = contactRows * canvasH

  const composites = []
  for (let seqIdx = 0; seqIdx < SELECTED_FRAMES.length; seqIdx++) {
    const col = seqIdx % contactCols
    const row = Math.floor(seqIdx / contactCols)
    const framePng = path.join(alignedDir, `seq_${String(seqIdx).padStart(2, '0')}.png`)

    const badgeSvg = Buffer.from(`
      <svg width="60" height="24" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="24" rx="3" fill="#141414" fill-opacity="0.85" stroke="#C5AE88" stroke-width="1.5"/>
        <text x="30" y="16" font-family="monospace" font-size="12" font-weight="bold" fill="#F4F0E8" text-anchor="middle">#${String(seqIdx).padStart(2,'0')}(${SELECTED_FRAMES[seqIdx]})</text>
      </svg>
    `)

    composites.push({
      input: framePng,
      left: col * canvasW,
      top: row * canvasH
    })
    composites.push({
      input: badgeSvg,
      left: col * canvasW + 8,
      top: row * canvasH + 8
    })
  }

  await sharp({
    create: {
      width: contactW,
      height: contactH,
      channels: 3,
      background: { r: bgR, g: bgG, b: bgB }
    }
  })
  .composite(composites)
  .toFile(path.join(inspectDir, 'curated_sequence_contact_sheet.png'))

  console.log('Clean contact sheet generated at public/sequence/inspection/curated_sequence_contact_sheet.png')
}

processSequence().catch(console.error)
