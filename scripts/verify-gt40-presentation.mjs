import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--enable-webgl', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', error => errors.push(String(error)))
await page.goto('http://127.0.0.1:5173/?qa', { waitUntil: 'domcontentloaded' })
await page.locator('.start-button:enabled').waitFor({ timeout: 120000 })
await page.evaluate(() => document.fonts.ready)
await page.locator('.start-button').click()
await page.waitForFunction(() => window.__GT40_QA__?.motion.current.time >= 5, { timeout: 15000 })
const report = await page.evaluate(() => {
  const style = selector => {
    const element = document.querySelector(selector)
    if (!element) return null
    const css = getComputedStyle(element)
    return { text: element.textContent?.trim(), color: css.color, fontFamily: css.fontFamily, opacity: css.opacity }
  }
  return {
    fonts: {
      barlow: document.fonts.check('600 44px "Barlow Condensed"'),
      inter: document.fonts.check('500 16px Inter'),
      plex: document.fonts.check('500 12px "IBM Plex Mono"'),
    },
    text: {
      headline: [...document.querySelectorAll('.hero-title b')].map(e => ({ text: e.textContent, color: getComputedStyle(e).color, font: getComputedStyle(e).fontFamily })),
      support: style('.support'), label: style('.landing-copy .eyebrow'), sound: style('.audio-control'), chapter: style('.chapter-copy h2'),
    },
    render: {
      canvases: document.querySelectorAll('canvas').length,
      phase: document.querySelector('.experience')?.dataset.phase,
      fog: window.__GT40_QA__.scene.fog?.toJSON(),
      envIntensity: window.__GT40_QA__.scene.environmentIntensity,
      dpr: window.__GT40_QA__.gl.getPixelRatio(),
    },
  }
})
await browser.close()
if (errors.length) throw new Error(errors.join('\n'))
if (!Object.values(report.fonts).every(Boolean)) throw new Error(`Font not loaded: ${JSON.stringify(report.fonts)}`)
if (report.render.canvases !== 1) throw new Error(`Expected one persistent Canvas: ${report.render.canvases}`)
console.log(JSON.stringify({ ...report, errors }, null, 2))
