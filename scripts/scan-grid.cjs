const sharp = require('sharp')
const path = require('path')

async function scanGrid() {
  const sheetPath = path.resolve(__dirname, '../public/reference/velar-angle-reference-sheet.png')
  const { data, info } = await sharp(sheetPath).raw().toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  console.log(`Scanning width=${width}, height=${height}, channels=${channels}`)

  // Check column boundaries around 256, 512, 768, 1024, 1280
  console.log('\nColumn checks:')
  for (let c = 1; c < 6; c++) {
    const x = c * 256
    let avgBefore = 0
    let avgLine = 0
    let avgAfter = 0
    for (let y = 0; y < height; y++) {
      const idxB = (y * width + (x - 1)) * channels
      const idxL = (y * width + x) * channels
      const idxA = (y * width + (x + 1)) * channels
      avgBefore += (data[idxB] + data[idxB + 1] + data[idxB + 2]) / 3
      avgLine += (data[idxL] + data[idxL + 1] + data[idxL + 2]) / 3
      avgAfter += (data[idxA] + data[idxA + 1] + data[idxA + 2]) / 3
    }
    console.log(`Col boundary ${c} (x=${x}): before=${(avgBefore/height).toFixed(1)}, line=${(avgLine/height).toFixed(1)}, after=${(avgAfter/height).toFixed(1)}`)
  }

  // Row boundaries: 1024 / 6 = 170.67
  // Let's check y around 170, 341, 512, 682, 853
  console.log('\nRow checks around multiples of 170.67:')
  const nominalY = [0, 170.67, 341.33, 512, 682.67, 853.33, 1024]
  for (let r = 1; r < 6; r++) {
    const yCenter = Math.round(nominalY[r])
    for (let dy = -2; dy <= 2; dy++) {
      const y = yCenter + dy
      let avg = 0
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels
        avg += (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      }
      console.log(`Row boundary ${r}, y=${y}: avg=${(avg / width).toFixed(1)}`)
    }
  }
}

scanGrid().catch(console.error)
