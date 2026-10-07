import fs from 'node:fs'
import sharp from 'sharp'
import assert from 'node:assert/strict'
const dir = 'artifacts/typography-qa'
const chapters = JSON.parse(fs.readFileSync(`${dir}/chapters-report.json`, 'utf8'))
const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i], 0)
const colors = { primary: [242,238,229], secondary: [183,192,195], muted: [154,166,171] }
const result = []
for (const view of chapters) {
  for (const [index, progress] of [.2,.34,.46,.69,.98].entries()) {
    const rect = view.chapters[index].rect
    const { data, info } = await sharp(`${dir}/${view.width}-chapter-${progress}-background.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    let brightest = 0
    for (let y = Math.max(0,Math.floor(rect.y)); y < Math.min(info.height,Math.ceil(rect.y + rect.height)); y++) {
      for (let x = Math.max(0,Math.floor(rect.x)); x < Math.min(info.width,Math.ceil(rect.x + rect.width)); x++) {
        const i = (y * info.width + x) * info.channels
        brightest = Math.max(brightest,luminance([data[i],data[i+1],data[i+2]]))
      }
    }
    const ratios = Object.fromEntries(Object.entries(colors).map(([name,rgb]) => [name, +( (luminance(rgb)+.05)/(brightest+.05) ).toFixed(2)]))
    assert.ok(ratios.secondary >= 4.5, `${view.width} chapter ${progress}: ${ratios.secondary}`)
    result.push({ width:view.width,progress,ratios,chapterOpacity:view.chapters[index].opacity })
  }
}
fs.writeFileSync(`${dir}/contrast.json`, JSON.stringify(result,null,2))
console.log(JSON.stringify(result))
