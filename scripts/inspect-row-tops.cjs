const sharp = require('sharp')
const path = require('path')

async function inspectRowTops() {
  const sheetPath = path.resolve(__dirname, '../public/reference/velar-angle-reference-sheet.png')
  const { data, info } = await sharp(sheetPath).raw().toBuffer({ resolveWithObject: true })
  const { width, channels } = info

  // Check y from 165 to 195
  console.log('Average luminance across row 1 top boundary (y=165 to 195):')
  for (let y = 165; y <= 195; y++) {
    let sum = 0
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels
      sum += (data[idx] + data[idx+1] + data[idx+2]) / 3
    }
    console.log(`y=${y}: avg=${(sum / width).toFixed(1)}`)
  }
}

inspectRowTops().catch(console.error)
