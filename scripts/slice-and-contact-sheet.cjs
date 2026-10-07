const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

async function sliceAndContactSheet() {
  const sheetPath = path.resolve(__dirname, '../public/reference/velar-angle-reference-sheet.png')
  const rawDir = path.resolve(__dirname, '../public/sequence/raw')
  const inspectDir = path.resolve(__dirname, '../public/sequence/inspection')

  fs.mkdirSync(rawDir, { recursive: true })
  fs.mkdirSync(inspectDir, { recursive: true })

  // Define row slices to neatly cover 1024 pixels:
  // Row 0: y=0, h=170
  // Row 1: y=170, h=171
  // Row 2: y=341, h=171
  // Row 3: y=512, h=171
  // Row 4: y=683, h=170
  // Row 5: y=853, h=171
  const rowY = [0, 170, 341, 512, 683, 853]
  const rowH = [170, 171, 171, 171, 170, 171]
  const colW = 256

  const cellMetadata = []

  console.log('Extracting 36 cells...')
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const index = r * 6 + c
      const padIndex = String(index).padStart(2, '0')
      const left = c * colW
      const top = rowY[r]
      const width = colW
      const height = rowH[r]

      const outPath = path.join(rawDir, `frame_${padIndex}.png`)

      await sharp(sheetPath)
        .extract({ left, top, width, height })
        .toFile(outPath)

      cellMetadata.push({
        index,
        row: r,
        col: c,
        left,
        top,
        width,
        height,
        filename: `frame_${padIndex}.png`,
      })
    }
  }

  console.log(`Successfully extracted 36 cells to ${rawDir}`)

  // Create numbered contact sheet with SVG badges on each cell
  console.log('Generating numbered contact sheet...')
  const overlays = []
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const index = r * 6 + c
      const padIndex = String(index).padStart(2, '0')
      const x = c * colW
      const y = rowY[r]

      // Small high-contrast number badge SVG
      const badgeSvg = Buffer.from(`
        <svg width="40" height="24" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="24" rx="3" fill="#141414" fill-opacity="0.85" stroke="#C5AE88" stroke-width="1.5"/>
          <text x="20" y="16" font-family="monospace" font-size="13" font-weight="bold" fill="#F4F0E8" text-anchor="middle">${padIndex}</text>
        </svg>
      `)

      overlays.push({
        input: badgeSvg,
        left: x + 8,
        top: y + 8,
      })
    }
  }

  const contactSheetPath = path.join(inspectDir, 'contact_sheet_numbered.png')
  await sharp(sheetPath)
    .composite(overlays)
    .toFile(contactSheetPath)

  console.log(`Contact sheet saved to ${contactSheetPath}`)

  fs.writeFileSync(
    path.join(inspectDir, 'cells_manifest.json'),
    JSON.stringify(cellMetadata, null, 2)
  )
}

sliceAndContactSheet().catch(console.error)
