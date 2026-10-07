const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

async function analyzeFrames() {
  const rawDir = path.resolve(__dirname, '../public/sequence/raw')
  const frames = []

  for (let i = 0; i < 36; i++) {
    const filename = `frame_${String(i).padStart(2, '0')}.png`
    const filePath = path.join(rawDir, filename)
    const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true })
    const { width, height, channels } = info

    // Analyze bounding box of car: background is dark studio (~rgb 30-40)
    // Find minX, maxX, minY, maxY where pixel is significantly brighter than background
    // Background threshold: luminance > 55
    let minX = width, maxX = 0, minY = height, maxY = 0
    let totalLuminance = 0
    let weightedX = 0, weightedY = 0

    // Also find bottom wheel contact points (dark tires against dark floor)
    // Tires have some texture or rim highlights
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        const lum = 0.299 * r + 0.587 * g + 0.114 * b

        if (lum > 50) { // Car body / highlights
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y

          totalLuminance += lum
          weightedX += x * lum
          weightedY += y * lum
        }
      }
    }

    const centroidX = totalLuminance > 0 ? weightedX / totalLuminance : width / 2
    const centroidY = totalLuminance > 0 ? weightedY / totalLuminance : height / 2

    frames.push({
      index: i,
      filename,
      width,
      height,
      data,
      bbox: { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY },
      centroid: { x: centroidX, y: centroidY }
    })
  }

  // Calculate difference between adjacent frames
  console.log('Adjacent Frame Differences (Mean Absolute Difference):')
  const diffs = []
  for (let i = 0; i < 35; i++) {
    const fA = frames[i].data
    const fB = frames[i + 1].data
    let totalDiff = 0
    for (let p = 0; p < fA.length; p++) {
      totalDiff += Math.abs(fA[p] - fB[p])
    }
    const mad = totalDiff / fA.length
    diffs.push({ from: i, to: i + 1, mad: mad.toFixed(2) })
    console.log(`Frame ${String(i).padStart(2,'0')} -> ${String(i+1).padStart(2,'0')}: MAD = ${mad.toFixed(2)} | bbox: [${frames[i].bbox.w}x${frames[i].bbox.h}] centroidX: ${frames[i].centroid.x.toFixed(1)}`)
  }

  fs.writeFileSync(
    path.resolve(__dirname, '../public/sequence/inspection/frame_metrics.json'),
    JSON.stringify(frames.map(f => ({
      index: f.index,
      bbox: f.bbox,
      centroid: { x: +f.centroid.x.toFixed(1), y: +f.centroid.y.toFixed(1) }
    })), null, 2)
  )
}

analyzeFrames().catch(console.error)
