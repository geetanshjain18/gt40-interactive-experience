import { chromium } from '@playwright/test'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import assert from 'node:assert/strict'

const dir = 'artifacts/typography-qa'
fs.mkdirSync(dir, { recursive: true })
const server = http.createServer((req, res) => {
  const file = path.join(process.cwd(), 'dist', decodeURIComponent(new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname))
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return }
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.webp': 'image/webp' }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
await new Promise(resolve => server.listen(4187, '127.0.0.1', resolve))
const browser = await chromium.launch({ channel: 'chromium', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] })
const report = []
try {
  for (const [width, height] of (process.argv.includes('--chapters') ? [[1440,900],[390,844]] : [[1920,1080],[1440,900],[1366,768],[768,1024],[390,844],[360,800]])) {
    const page = await browser.newPage({ viewport: { width, height } })
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp.send('DOM.enable')
    await cdp.send('CSS.enable')
    const errors = [], fonts = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    page.on('response', r => { if (/\.woff2?$/.test(r.url())) fonts.push({ url: r.url(), status: r.status(), mime: r.headers()['content-type'] }) })
    await page.goto('http://127.0.0.1:4187/', { waitUntil: 'domcontentloaded' })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.querySelector('.experience')?.dataset.phase === 'ready', null, { timeout: 120000 })
    assert.equal(await page.locator('.landing-copy').count(), 0)
    const fontChecks = await page.evaluate(async () => {
      const required = [['Barlow Condensed',600],['Barlow Condensed',700],['Inter',400],['Inter',500],['Inter',600],['IBM Plex Mono',400],['IBM Plex Mono',500],['IBM Plex Mono',600]]
      return Promise.all(required.map(async ([family, weight]) => {
        const query = `${weight} ${family === 'Barlow Condensed' ? 64 : family === 'Inter' ? 16 : 12}px "${family}"`
        const loaded = await document.fonts.load(query)
        return { family, weight, check: document.fonts.check(query), faces: loaded.map(f => ({ family: f.family, weight: f.weight, status: f.status })) }
      }))
    })
    assert.ok(fontChecks.every(f => f.check && f.faces.length && f.faces.every(x => x.status === 'loaded')))
    await page.screenshot({ path: `${dir}/${width}-intro.png` })
    await page.locator('.start-button').click()
    await page.waitForFunction(() => document.querySelector('.experience')?.dataset.phase === 'exploring', null, { timeout: 20000 })
    await page.waitForFunction(() => document.querySelector('.experience')?.dataset.engine === 'IDLING', null, { timeout: 15000 })
    const selectors = ['h1','.support','.landing-copy .eyebrow','.rev-control','.scroll-cue','.scroll-cue span','.audio-control']
    const computed = await page.evaluate(selectors => Object.fromEntries(selectors.map(selector => {
      const el = document.querySelector(selector), s = getComputedStyle(el), r = el.getBoundingClientRect()
      return [selector, { family:s.fontFamily,weight:s.fontWeight,size:s.fontSize,color:s.color,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing, rect:{x:r.x,y:r.y,width:r.width,height:r.height} }]
    })), selectors)
    const rendered = {}
    const { root } = await cdp.send('DOM.getDocument')
    for (const selector of ['h1 b','.support','.landing-copy .eyebrow','.rev-control']) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector })
      rendered[selector] = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts
    }
    assert.equal(computed.h1.color, 'rgb(242, 238, 229)')
    assert.equal(computed['.support'].color, 'rgb(183, 192, 195)')
    assert.equal(computed['.landing-copy .eyebrow'].color, 'rgb(154, 166, 171)')
    assert.equal(computed['.scroll-cue span'].color, 'rgb(242, 106, 33)')
    assert.ok(Object.values(rendered).every(list => list.length && list.every(f => f.isCustomFont)))
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    assert.equal(overflow, false)
    await page.screenshot({ path: `${dir}/${width}-hero.png` })
    const chapters = []
    if ([1440,390].includes(width)) {
      for (const progress of [.20,.34,.46,.69,.98]) {
        await page.evaluate(p => scrollTo(0, p * (document.documentElement.scrollHeight-innerHeight)), progress)
        await page.waitForTimeout(2200)
        await page.screenshot({ path: `${dir}/${width}-chapter-${progress}.png` })
        await page.screenshot({ path: `${dir}/${width}-chapter-${progress}-background.png`, style: '.overlay{visibility:hidden!important}' })
        chapters.push(await page.locator('.chapter-copy').evaluate(el => ({ text:el.innerText,opacity:getComputedStyle(el).opacity,rect:el.getBoundingClientRect().toJSON() })))
      }
    }
    assert.ok(fonts.every(f => f.status === 200 && f.mime.startsWith('font/')))
    assert.deepEqual(errors, [])
    report.push({ width,height,fontChecks,fonts,computed,rendered,overflow,errors,chapters })
    await page.close()
    fs.writeFileSync(`${dir}/${process.argv.includes('--chapters') ? 'chapters-report' : 'report'}.json`, JSON.stringify(report,null,2))
    console.log(`${width}x${height}: all 8 font weights loaded; rendered webfonts and exact colors confirmed; no overflow/errors`)
  }
} finally {
  await browser.close()
  server.close()
}

