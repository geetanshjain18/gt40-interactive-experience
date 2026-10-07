const sharp = require('sharp')
const path = require('path')

async function inspectSheet() {
  const sheetPath = path.resolve(__dirname, '../public/reference/velar-angle-reference-sheet.png')
  const metadata = await sharp(sheetPath).metadata()
  console.log('Image dimensions:', metadata.width, 'x', metadata.height, 'channels:', metadata.channels)

  const cols = 6
  const rows = 6
  const cellW = metadata.width / cols
  const cellH = metadata.height / rows
  console.log(`Nominal cell size: ${cellW.toFixed(2)} x ${cellH.toFixed(2)}`)
}

inspectSheet().catch(console.error)
