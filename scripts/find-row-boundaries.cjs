const sharp = require('sharp')
const path = require('path')

async function findRowBoundaries() {
  const sheetPath = path.resolve(__dirname, '../public/reference/velar-angle-reference-sheet.png')
  const { data, info } = await sharp(sheetPath).raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  console.log('Finding row boundaries by scanning vertical luminance profile:')
  for (let y = 0; y < height; y++) {
    let sum = 0
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels
      sum += (data[idx] + data[idx+1] + data[idx+2]) / 3
    }
    const avg = sum / width
    // Print around expected transitions
    if ((y >= 160 && y <= 195) ||
        (y >= 330 && y <= 365) ||
        (y >= 500 && y <= 535) ||
        (y >= 670 && y <= 705) ||
        (y >= 840 && y <= 875)) {
      console.log(`y=${y}: avg=${avg.toFixed(1)}`)
    }
  }
}

findRowBoundaries().catch(console.error)
