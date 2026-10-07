import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const out = 'artifacts/component-explorer-20261007'
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--enable-webgl', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', error => errors.push(String(error)))
page.on('console', message => { if (message.type() === 'error' || message.text().includes('mappings not present')) errors.push(message.text()) })
page.on('requestfailed', request => errors.push(`request failed ${request.url()}: ${request.failure()?.errorText}`))
console.log('opening page')
await page.goto('http://127.0.0.1:5173/?qa', { waitUntil: 'domcontentloaded', timeout: 60000 })
console.log('waiting for model')
await page.waitForTimeout(12000)
console.log('capturing opening')
await page.screenshot({ path: path.join(out, 'pre-ignition.png') })
await page.getByRole('button', { name: /start the ford gt40 engine/i }).click()
console.log('ignition clicked')
await page.waitForTimeout(5800)
const revealAudio = await page.locator('.experience').getAttribute('data-engine')
const revDuringReveal = await page.locator('.rev-control').count() > 0
await page.screenshot({ path: path.join(out, 'post-ignition.png') })
await page.evaluate(() => scrollTo(0, 0))
await page.waitForTimeout(600)
const explorerVisible = await page.getByRole('button', { name: /components/i }).isVisible()
let card = false
let hoverCard = false
let hoverCleared = false
let cardAnimations = {}
let selectedComponent = ''
let headlightProbe = {}
let locked = false
let escapeClosed = false
let keyboardLocked = false
let mobileSheet = false
let frameComponents = {}
let desktopRev = null
let tablet = null
if (explorerVisible) {
  await page.mouse.move(1020, 565)
  await page.waitForTimeout(240)
  hoverCard = await page.locator('.component-card').isVisible().catch(() => false)
  cardAnimations.enter = await page.locator('.component-card h2').evaluate(el => getComputedStyle(el).animationName).catch(() => 'none')
  cardAnimations.connector = await page.locator('.component-connector line').evaluate(el => getComputedStyle(el).animationName).catch(() => 'none')
  headlightProbe.right = await page.evaluate(() => ({ hits: window.__GT40_EXPLORER_HITS__ ?? [], card: document.querySelector('#component-title')?.textContent ?? '' }))
  await page.mouse.move(420, 565)
  await page.waitForTimeout(240)
  headlightProbe.left = await page.evaluate(() => ({ hits: window.__GT40_EXPLORER_HITS__ ?? [], card: document.querySelector('#component-title')?.textContent ?? '' }))
  if (hoverCard) await page.screenshot({ path: path.join(out, 'desktop-hover-headlight.png') })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  cardAnimations.reducedMotion = await page.locator('.component-card h2').evaluate(el => getComputedStyle(el).animationName).catch(() => 'none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.mouse.move(1400, 850)
  await page.waitForTimeout(220)
  hoverCleared = await page.locator('.component-card').count() === 0
  await page.locator('.component-list-toggle').focus()
  await page.keyboard.press('Enter')
  await page.locator('.component-list-panel button').filter({ hasText: 'Headlights' }).focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  card = await page.locator('.component-card').isVisible().catch(() => false)
  selectedComponent = await page.locator('#component-title').textContent().catch(() => '')
  if (card) await page.screenshot({ path: path.join(out, 'desktop-headlights-card.png') })
  locked = await page.locator('.component-card.is-locked').count() > 0
  keyboardLocked = locked
  await page.keyboard.press('Escape')
  escapeClosed = await page.locator('.component-card').count() === 0
  await page.getByRole('button', { name: /components/i }).click()
  await page.locator('.component-list-panel button').filter({ hasText: 'Front Intake' }).click()
  await page.waitForTimeout(250)
  desktopRev = await page.locator('.rev-control').evaluate(el => ({ top: Math.round(el.getBoundingClientRect().top), visible: getComputedStyle(el).display !== 'none' })).catch(() => null)
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(out, 'tablet-component-card.png') })
  tablet = await page.locator('.component-card').evaluate(el => { const r = el.getBoundingClientRect(); return { visible: r.width > 0, withinViewport: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight } }).catch(() => null)
  tablet.anchor = await page.locator('.component-connector circle').last().evaluate(el => ({ x: Number(el.getAttribute('cx')), y: Number(el.getAttribute('cy')) })).catch(() => null)
  tablet.canvas = await page.locator('canvas').evaluate(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height } })
  tablet.cameraAspect = await page.evaluate(() => window.__GT40_QA__?.camera.aspect)
  tablet.grillCenter = await page.evaluate(() => {
    const q = window.__GT40_QA__; const object = q?.scene.getObjectByName('GT40_FrontGrill'); if (!object) return null
    const box = new q.THREE.Box3().setFromObject(object, true); const p = box.getCenter(new q.THREE.Vector3()).project(q.camera)
    return { x: Math.round((p.x + 1) * innerWidth / 2), y: Math.round((1 - p.y) * innerHeight / 2), min: box.min.toArray(), max: box.max.toArray() }
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(out, 'mobile-component-card.png') })
  mobileSheet = await page.locator('.component-card').isVisible().catch(() => false)
  await page.getByRole('button', { name: /close component inspection/i }).click()
  await page.setViewportSize({ width: 1440, height: 900 })
  const readFrameComponents = async (key, progress, screenshot) => {
    await page.evaluate(value => {
      const maxScroll = document.documentElement.scrollHeight - innerHeight
      scrollTo(0, maxScroll * value)
    }, progress)
    await page.waitForTimeout(1400)
    await page.screenshot({ path: path.join(out, screenshot) })
    await page.locator('.component-list-toggle').click()
    const names = await page.locator('.component-list-panel button').allTextContents()
    frameComponents[key] = names.map(name => name.trim())
    await page.locator('.component-list-toggle').click()
  }
  await readFrameComponents('front', 0.08, 'front-frame.png')
  await readFrameComponents('side', 0.34, 'side-frame.png')
  await readFrameComponents('cockpit', 0.46, 'cockpit-frame.png')
  await readFrameComponents('engine', 0.69, 'engine-frame.png')
}
const desktop = { explorerVisible, hoverCard, hoverCleared, card, selectedComponent, locked, keyboardLocked, escapeClosed, mobileSheet, phase: await page.locator('.experience').getAttribute('data-phase'), audio: await page.locator('.experience').getAttribute('data-engine'), frameComponents, headlightProbe, cardAnimations }
const parts = await page.evaluate(() => {
  const q = window.__GT40_QA__
  const names = ['GT40_HeadLights', 'GT40_HeadLightCover', 'GT40_HeadLightCover2', 'GT40_HeadLightGlass', 'GT40_SecondaryHeadlights', 'GT40_WheelFL', 'GT40_WheelFR']
  return Object.fromEntries(names.map(name => {
    const object = q?.scene.getObjectByName(name)
    if (!object) return [name, null]
    const box = new q.THREE.Box3().setFromObject(object, true)
    const p = box.getCenter(new q.THREE.Vector3()).project(q.camera)
    return [name, { x: Math.round((p.x + 1) * innerWidth / 2), y: Math.round((1 - p.y) * innerHeight / 2), min: box.min.toArray(), max: box.max.toArray() }]
  }))
})
await page.setViewportSize({ width: 390, height: 844 })
await page.waitForTimeout(300)
await page.screenshot({ path: path.join(out, 'mobile-explorer.png') })
const rev = await page.locator('.rev-control').evaluate(el => ({ top: Math.round(el.getBoundingClientRect().top), visible: getComputedStyle(el).display !== 'none' })).catch(() => null)
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ desktop, desktopRev, tablet, rev, revealAudio, revDuringReveal, parts, errors }, null, 2))
console.log(JSON.stringify({ desktop, desktopRev, tablet, rev, revealAudio, revDuringReveal, parts, errors }, null, 2))
await browser.close()
