import { chromium } from '@playwright/test'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const out='artifacts/front-centered'
fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chromium',args:['--enable-webgl','--ignore-gpu-blocklist']})
const results=[]
for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
 const page=await browser.newPage({viewport})
 const errors=[];page.on('pageerror',e=>errors.push(String(e)))
 await page.goto('http://127.0.0.1:5173/?qa')
 await page.locator('.start-button:enabled').waitFor({timeout:120000})
 const camera=()=>page.evaluate(()=>window.__GT40_QA__.camera.position.toArray())
 const ready=await camera()
 assert(Math.abs(ready[0])<0.001 && ready[2]>0)
 await page.screenshot({path:`${out}/${viewport.width}-ready.png`})
 await page.locator('.start-button').click()
 await page.waitForFunction(()=>document.querySelector('.experience').dataset.phase==='exploring',{},{timeout:120000})
 await page.waitForTimeout(500)
 assert.deepEqual(await camera(),ready)
 await page.screenshot({path:`${out}/${viewport.width}-landing.png`})
 await page.evaluate(()=>scrollTo(0,innerHeight*.5));await page.waitForTimeout(700)
 assert.deepEqual(await camera(),ready)
 await page.evaluate(()=>scrollTo(0,innerHeight*2));await page.waitForTimeout(1200)
 assert(Math.abs((await camera())[0])>.1)
 await page.screenshot({path:`${out}/${viewport.width}-scroll.png`})
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(1500)
 assert.deepEqual(await camera(),ready)
 results.push({viewport,ready,errors})
 await page.close()
}
fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2))
console.log(results)
await browser.close()
