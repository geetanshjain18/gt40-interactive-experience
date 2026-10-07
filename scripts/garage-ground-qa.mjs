import { chromium } from '@playwright/test'
import fs from 'node:fs'

const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--enable-webgl', '--ignore-gpu-blocklist'] })
const results = []
for (const viewport of [{ width: 1920, height: 1080, name: 'desktop-1920' }, { width: 1366, height: 768, name: 'desktop-1366' }, { width: 390, height: 844, name: 'mobile-390' }]) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.width < 700, hasTouch: viewport.width < 700 })
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('http://127.0.0.1:5173/?qa', { waitUntil: 'domcontentloaded' })
  await page.locator('.start-button:enabled').waitFor({ timeout: 120000 })
  await page.locator('.start-button').click()
  await page.waitForFunction(() => window.__GT40_QA__?.motion.current.time >= 5, { timeout: 20000 })
  const grounding = await page.evaluate(() => {
    const scene = window.__GT40_QA__.scene
    scene.updateMatrixWorld(true)
    const root = scene.getObjectByName('GT40Vehicle')
    root.updateMatrixWorld(true)
    const contacts = new Map()
    root.traverse(mesh => {
      if (!mesh.isMesh || !/^GT40_Wheel(?:FL|FR|BL|BR)$/.test(mesh.parent?.name ?? '')) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      if (!mats.some(m => m.name === 'GT40_Tyre_Rubber')) return
      const box = new window.__GT40_QA__.THREE.Box3().setFromObject(mesh, true)
      const wheel = mesh.parent.name
      const prior = contacts.get(wheel)
      contacts.set(wheel, { bottom: prior ? Math.min(prior.bottom, box.min.y) : box.min.y, center: new window.__GT40_QA__.THREE.Vector3().setFromMatrixPosition(mesh.parent.matrixWorld).toArray() })
    })
    const normalized = [...contacts.entries()].map(([wheel, item]) => ({ wheel, bottom: item.bottom, center: item.center }))
    const tireBounds = normalized.map(x => x.bottom)
    return { scale: root.scale.x, rootPosition: root.position.toArray(), floorY: 0, contacts: normalized, maxGapOrPenetration: Math.max(...tireBounds.map(y => Math.abs(y))) }
  })
  await page.screenshot({ path: `artifacts/final-gt40-verification/${viewport.name}-garage.png` })
  results.push({ viewport, grounding, errors })
  await page.close()
}
await browser.close()
fs.writeFileSync('artifacts/final-gt40-verification/garage-ground-results.json', JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
