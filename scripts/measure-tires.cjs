const sharp = require('sharp')
const path = require('path')

async function measureTiresAndCenter() {
  const rawDir = path.resolve(__dirname, '../public/sequence/raw')

  console.log('Frame Measurements:')
  console.log('Idx | Left | Right | Width | Top | Bottom (tire) | Height | CenterX | CenterY')
  console.log('----+------+-------+-------+-----+---------------+--------+---------+--------')

  for (let i = 0; i < 36; i++) {
    const filename = `frame_${String(i).padStart(2, '0')}.png`
    const { data, info } = await sharp(path.join(rawDir, filename)).raw().toBuffer({ resolveWithObject: true })
    const { width, height, channels } = info

    let minX = width, maxX = 0, minY = height, maxY = 0

    // Threshold luminance: background is around 25-35
    // Car body and tires: anything with luminance > 45 or distinct color
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels
        const r = data[idx], g = data[idx+1], b = data[idx+2]
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        // The car body or wheels
        if (lum > 45) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    const w = maxX - minX
    const h = maxY - minY
    const cx = ((minX + maxX) / 2).toFixed(1)
    const cy = ((minY + maxY) / 2).toFixed(1)

    console.log(`${String(i).padStart(2,'0')}  | ${String(minX).padStart(4)} | ${String(maxX).padStart(5)} | ${String(w).padStart(5)} | ${String(minY).padStart(3)} | ${String(maxY).padStart(13)} | ${String(h).padStart(6)} | ${String(cx).padStart(7)} | ${String(cy).padStart(7)}`)
  }
}

measureTiresAndCenter().catch(console.error)
