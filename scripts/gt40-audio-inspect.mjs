import { chromium } from '@playwright/test'
import fs from 'node:fs'

const browser = await chromium.launch({ channel: 'chromium', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] })
const page = await browser.newPage()
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
const data = await page.evaluate(async () => {
  const context = new AudioContext()
  const files = ['gt40-engine-start.mp3', 'gt40-engine-idle-loop.mp3', 'gt40-engine-revs-full.mp3', 'gt40-engine-rev.mp3', 'start-engine-button-click.mp3']
  const result = {}
  for (const file of files) {
    const response = await fetch(`/audio/${file}`)
    const buffer = await context.decodeAudioData(await response.arrayBuffer())
    const channel = buffer.getChannelData(0)
    const windowSize = Math.round(buffer.sampleRate * .25)
    const windows = []
    for (let start = 0; start < channel.length; start += windowSize) {
      let sum = 0, peak = 0
      const end = Math.min(start + windowSize, channel.length)
      for (let i = start; i < end; i++) { const v = channel[i]; sum += v * v; peak = Math.max(peak, Math.abs(v)) }
      windows.push({ at: +(start / buffer.sampleRate).toFixed(2), rms: +Math.sqrt(sum / (end - start)).toFixed(4), peak: +peak.toFixed(4) })
    }
    const edge = Math.min(2048, channel.length)
    let seam = 0
    for (let i = 0; i < edge; i++) { const delta = channel[i] - channel[channel.length - edge + i]; seam += delta * delta }
    result[file] = { duration: buffer.duration, sampleRate: buffer.sampleRate, channels: buffer.numberOfChannels, edgeRmsDifference: +Math.sqrt(seam / edge).toFixed(5), windows }
  }
  await context.close()
  return result
})
fs.writeFileSync('artifacts/gt40-audio-inspection.json', JSON.stringify(data, null, 2))
console.log(JSON.stringify(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { duration: v.duration, windows: v.windows }])), null, 2))
await browser.close()
