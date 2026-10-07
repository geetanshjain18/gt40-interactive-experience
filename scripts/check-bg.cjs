const sharp = require('sharp')
const path = require('path')

async function checkBackgroundColors() {
  const rawDir = path.resolve(__dirname, '../public/sequence/raw')

  console.log('Corner Background Colors for raw frames:')
  for (let i of [0, 4, 11, 18, 26, 31, 35]) {
    const filename = `frame_${String(i).padStart(2, '0')}.png`
    const { data, info } = await sharp(path.join(rawDir, filename)).raw().toBuffer({ resolveWithObject: true })
    const { width, height, channels } = info

    // Check top-left (5, 5), top-right (250, 5), bottom-left (5, 165), bottom-right (250, 165)
    function getRgb(x, y) {
      const idx = (y * width + x) * channels
      return `rgb(${data[idx]}, ${data[idx+1]}, ${data[idx+2]})`
    }

    console.log(`Frame ${i}: TL=${getRgb(5,5)}, TR=${getRgb(250,5)}, BL=${getRgb(5, height-5)}, BR=${getRgb(250, height-5)}`)
  }
}

checkBackgroundColors().catch(console.error)
