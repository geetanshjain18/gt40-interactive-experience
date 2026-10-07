import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const out='artifacts/final-gt40-verification'
fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chromium',args:['--enable-webgl','--ignore-gpu-blocklist']})
const failures=[],results=[]
for(const viewport of [{width:1440,height:900,name:'desktop'},{width:768,height:1024,name:'tablet'},{width:390,height:844,name:'mobile390'},{width:360,height:800,name:'mobile360'}]){
 const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},hasTouch:viewport.width<900,isMobile:viewport.width<900,reducedMotion:'no-preference'})
 const errors=[],responses=[]
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 page.on('response',r=>{if(/gt40-gulf-number-6\.glb|start-engine-button-click\.mp3/.test(r.url()))responses.push({url:r.url(),status:r.status()})})
 await page.goto('http://127.0.0.1:5173/?qa',{waitUntil:'domcontentloaded'})
 if(viewport.name==='desktop') await page.screenshot({path:`${out}/black-before-ready.png`})
 await page.locator('.start-button:enabled').waitFor({timeout:120000})
 const q=()=>page.evaluate(()=>({phase:document.querySelector('.experience')?.dataset.phase,cam:window.__GT40_QA__.camera.position.toArray(),fov:window.__GT40_QA__.camera.fov,ready:window.__GT40_QA__.motion.current.readyTime,txt:!!document.querySelector('.landing-copy'),button:!!document.querySelector('.start-button'),height:document.documentElement.scrollHeight,hidden:document.body.style.overflowY}))
 await page.waitForTimeout(1100)
 const pre=await q();assert.equal(pre.phase,'ready');assert.equal(pre.txt,false);assert.equal(pre.button,true);assert(Math.abs(pre.cam[0])<1e-6&&pre.cam[2]>0)
 assert.equal(await page.locator('text=3D is unavailable on this device').count(),0)
 await page.screenshot({path:`${out}/${viewport.name}-pre-ignition.png`})
 if(viewport.name==='desktop'){
   const timeFrames=[['crank',.18],['voltage-dip',.38],['engine-catch',.60],['lamp-settle',.9],['partial-reveal',1.5],['full-reveal',2.6],['headline',3.5],['scroll-unlock',4.35],['landing-end',5.0]]
   if(viewport.name==='tablet'){await page.locator('.start-button').focus();await page.keyboard.press('Enter')}else await page.locator('.start-button').click()
   for(const [label,t] of timeFrames){await page.waitForFunction(t=>window.__GT40_QA__.motion.current.time>=t,t,{timeout:15000});await page.screenshot({path:`${out}/${label}.png`})}
   const endpoint=await page.evaluate(()=>({pos:window.__GT40_QA__.camera.position.toArray(),rot:window.__GT40_QA__.camera.quaternion.toArray(),fov:window.__GT40_QA__.camera.fov,env:window.__GT40_QA__.scene.environmentIntensity,exposure:window.__GT40_QA__.gl.toneMappingExposure}))
   await page.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='exploring')
   await page.waitForTimeout(100)
   await page.mouse.wheel(0,250);await page.waitForTimeout(450);assert(await page.evaluate(()=>scrollY)>0)
   await page.mouse.wheel(0,-250);await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>scrollY),0)
   await page.evaluate(()=>{window.__GT40_QA__.motion.current.progress=0;window.__GT40_QA__.motion.current.target=0;window.__GT40_QA__.motion.current.active=true;window.scrollTo(0,0)})
   await page.waitForTimeout(150)
   const first=await page.evaluate(()=>({pos:window.__GT40_QA__.camera.position.toArray(),rot:window.__GT40_QA__.camera.quaternion.toArray(),fov:window.__GT40_QA__.camera.fov,env:window.__GT40_QA__.scene.environmentIntensity,exposure:window.__GT40_QA__.gl.toneMappingExposure}))
   assert(Math.max(...endpoint.pos.map((v,i)=>Math.abs(v-first.pos[i])))<1e-4);assert(Math.max(...endpoint.rot.map((v,i)=>Math.abs(v-first.rot[i])))<1e-4);assert.equal(endpoint.fov,first.fov);assert(Math.abs(endpoint.env-first.env)<1e-4);assert(Math.abs(endpoint.exposure-first.exposure)<1e-4)
   const max=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight)
   for(const [label,p] of [['front-zero',0],['awakening-10',.10],['three-quarter',.28],['side',.34],['interior',.46],['engine',.69],['final-hero',.98],['reverse-side',.42],['reverse-front',0]]){
     await page.evaluate(({p,max})=>window.scrollTo(0,p*max),{p,max});await page.waitForTimeout(600)
     await page.evaluate(p=>{window.__GT40_QA__.motion.current.progress=p;window.__GT40_QA__.motion.current.target=p},p);await page.waitForTimeout(130)
     await page.screenshot({path:`${out}/${label}.png`})
   }
   await page.reload({waitUntil:'domcontentloaded'})
   await page.locator('.start-button:enabled').waitFor({timeout:120000})
   await page.waitForTimeout(900)
   const reset=await page.evaluate(()=>({scrollY,phase:document.querySelector('.experience')?.dataset.phase,camera:window.__GT40_QA__.camera.position.toArray(),progress:window.__GT40_QA__.motion.current.progress,active:window.__GT40_QA__.motion.current.active,copy:!!document.querySelector('.landing-copy')}))
   assert.equal(reset.scrollY,0);assert.equal(reset.phase,'ready');assert.equal(reset.progress,0);assert.equal(reset.active,false);assert.equal(reset.copy,false);assert(Math.abs(reset.camera[0])<1e-6&&reset.camera[2]>0)
   await page.screenshot({path:`${out}/reload-reset.png`})
   results.push({landingEndpoint:endpoint,scrollStart:first,reloadReset:reset})
 } else {
   if(viewport.name==='tablet'){await page.locator('.start-button').focus();await page.keyboard.press('Enter')}else await page.locator('.start-button').click()
   await page.waitForFunction(()=>window.__GT40_QA__.motion.current.time>=5,{timeout:15000})
   await page.waitForTimeout(100)
   await page.screenshot({path:`${out}/${viewport.name}-post-ignition.png`})
   await page.evaluate(()=>window.scrollTo(0,innerHeight*.5));await page.waitForTimeout(600)
   await page.screenshot({path:`${out}/${viewport.name}-first-scroll.png`})
 }
 const rootWidth=await page.evaluate(()=>document.documentElement.scrollWidth)
 assert(rootWidth<=viewport.width+1,`${viewport.name} horizontal overflow ${rootWidth}`)
 assert(errors.length===0,`${viewport.name} browser errors: ${errors.join(' | ')}`)
 results.push({viewport,pre,responses,errors})
 await page.close()
}
const unavailable=await browser.newPage({viewport:{width:390,height:844}})
await unavailable.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'||type==='webgl'||type==='experimental-webgl')return null;return original.call(this,type,...args)}})
await unavailable.goto('http://127.0.0.1:5173/');await unavailable.locator('.fallback').waitFor({timeout:15000});const fallback=await unavailable.locator('.fallback').innerText();assert.match(fallback,/WebGL|display/i);await unavailable.close()
const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'})
await reduced.goto('http://127.0.0.1:5173/?qa',{waitUntil:'domcontentloaded'});await reduced.locator('.start-button:enabled').waitFor({timeout:120000});await reduced.locator('.start-button').click();await reduced.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='exploring',{timeout:15000});assert.equal(await reduced.evaluate(()=>document.body.style.overflowY),'auto');await reduced.screenshot({path:`${out}/reduced-motion.png`});await reduced.close()
fs.writeFileSync(`${out}/results.json`,JSON.stringify({results,failures,fallback},null,2));console.log(JSON.stringify({results,failures,fallback},null,2));await browser.close()
