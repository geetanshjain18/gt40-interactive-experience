import { chromium } from '@playwright/test'
import fs from 'node:fs'

const browser = await chromium.launch({ channel: 'chromium', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] })
fs.mkdirSync('artifacts/gt40-postchange', { recursive: true })
const results = {}
for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport })
  await page.addInitScript(() => {
    window.__audioSourceStarts = []
    const original = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function (when = 0, offset, duration) {
      window.__audioSourceStarts.push({ duration: this.buffer?.duration, loop: this.loop, when })
      return original.call(this, when, offset, duration)
    }
  })
  const errors = []
  const assets = []
  page.on('pageerror', error => errors.push(String(error)))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('response', response => { if (/gt40-gulf-number-6\.glb|\.mp3$/.test(response.url())) assets.push({ url: new URL(response.url()).pathname, status: response.status() }) })
  const timings = []
  page.on('request', request => { if (request.url().endsWith('gt40-gulf-number-6.glb')) timings.push({ start: Date.now() }) })
  const started = Date.now()
  await page.goto('http://127.0.0.1:5173/?qa', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('.experience')?.dataset.phase === 'ready', null, { timeout: 120000 })
  const readyMs = Date.now() - started
  const readyTime = () => page.evaluate(() => window.__GT40_QA__.motion.current.readyTime)
  const capturePhase = async (target, file) => { await page.waitForFunction(target => window.__GT40_QA__.motion.current.readyTime >= target, target); await page.screenshot({ path: `artifacts/gt40-postchange/${viewport.name}-${file}.png` }); return readyTime() }
  const timeline = []
  timeline.push({ phase: 'early', time: await capturePhase(.25, 'early-glow') })
  timeline.push({ phase: 'mid', time: await capturePhase(.75, 'mid-glow') })
  timeline.push({ phase: 'pre-ignition', time: await capturePhase(1.4, 'pre-ignition') })
  const intro = await page.evaluate(() => ({ phase: document.querySelector('.experience').dataset.phase, engine: document.querySelector('.experience').dataset.engine, canvasCount: document.querySelectorAll('canvas').length, car: window.__GT40_QA__.scene.getObjectByName('GT40Vehicle')?.uuid, textHidden: !document.querySelector('.landing-copy'), startEnabled: !document.querySelector('.start-button').disabled, audioSourcesBeforeStart: window.__audioSourceStarts.length }))
  await page.locator('.start-button').click()
  await page.waitForTimeout(260)
  await page.screenshot({ path: `artifacts/gt40-postchange/${viewport.name}-crank.png` })
  await page.waitForTimeout(650)
  await page.screenshot({ path: `artifacts/gt40-postchange/${viewport.name}-catch.png` })
  await page.waitForFunction(() => document.querySelector('.experience')?.dataset.phase === 'exploring', null, { timeout: 15000 })
  await page.screenshot({ path: `artifacts/gt40-postchange/${viewport.name}-hero.png` })
  const opening = await page.evaluate(() => ({ phase: document.querySelector('.experience').dataset.phase, camera: window.__GT40_QA__.camera.position.toArray(), headline: getComputedStyle(document.querySelector('h1')).color, support: document.querySelector('.support').innerText, audio: document.querySelector('.audio-control')?.innerText, overflow: document.documentElement.scrollWidth > innerWidth }))
  await page.waitForFunction(() => document.querySelector('.experience')?.dataset.engine === 'IDLING', null, { timeout: 15000 })
  const revButton = page.locator('.rev-control')
  await revButton.waitFor({ state: 'visible' })
  await revButton.click()
  await page.waitForFunction(() => document.querySelector('.experience')?.dataset.engine === 'REVVING')
  const repeatedRevAccepted = await page.evaluate(() => window.__GT40_AUDIO_QA__.rev())
  await page.waitForTimeout(250)
  const revState = await page.evaluate(() => ({ state: document.querySelector('.experience').dataset.engine, sources: [...window.__audioSourceStarts], disabled: document.querySelector('.rev-control')?.disabled }))
  await page.waitForFunction(() => document.querySelector('.experience')?.dataset.engine === 'IDLING', null, { timeout: 8000 })
  await page.getByRole('button', { name: 'Mute engine sound' }).click()
  const muteState = await page.locator('.experience').getAttribute('data-engine')
  await page.getByRole('button', { name: 'Enable engine sound' }).click()
  await page.waitForFunction(() => ['IDLING', 'SCROLL_FADED'].includes(document.querySelector('.experience')?.dataset.engine))
  if (viewport.name === 'desktop') {
    await page.evaluate(() => scrollTo(0, .40 * (document.documentElement.scrollHeight - innerHeight)))
    await page.waitForFunction(() => document.querySelector('.experience')?.dataset.engine === 'SCROLL_FADED')
    await page.waitForTimeout(2100)
    const farScrollState = await page.evaluate(() => ({ state: document.querySelector('.experience').dataset.engine, audioContextState: window.__GT40_AUDIO_QA__.context?.state }))
    await page.evaluate(() => scrollTo(0, 0))
    await page.waitForFunction(() => document.querySelector('.experience')?.dataset.engine === 'IDLING', null, { timeout: 5000 })
    await page.waitForTimeout(300)
    await page.evaluate(() => scrollTo(0, .03 * (document.documentElement.scrollHeight - innerHeight)))
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'artifacts/gt40-postchange/desktop-first-scroll.png' })
    results.scroll = { farScrollState, returnedState: await page.locator('.experience').getAttribute('data-engine') }
  }
  const hero = { ...opening, copyRect: await page.locator('.landing-copy').evaluate(el => el.getBoundingClientRect().toJSON()), audioSources: await page.evaluate(() => window.__audioSourceStarts) }
  if (viewport.name === 'desktop') {
    await page.evaluate(() => scrollTo(0, .03 * (document.documentElement.scrollHeight - innerHeight)))
    await page.waitForTimeout(450)
    await page.screenshot({ path: 'artifacts/gt40-postchange/desktop-first-scroll.png' })
  }
  results[viewport.name] = { readyMs, glbRequestCount: timings.length, timings, assets, timeline, intro, hero, revState, repeatedRevAccepted, muteState, errors }
  await page.close()
}
fs.mkdirSync('artifacts/gt40-postchange', { recursive: true })
fs.writeFileSync('artifacts/gt40-postchange/report.json', JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
await browser.close()
