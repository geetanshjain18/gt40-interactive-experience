import { chromium } from '@playwright/test'
import fs from 'node:fs'
const label=process.argv[2]||'before'
const out='artifacts/gulf-20261003-021901'
const browser=await chromium.launch({headless:true,channel:'chromium',args:['--enable-webgl','--ignore-gpu-blocklist']})
const page=await browser.newPage({viewport:{width:1440,height:900}})
const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.goto('http://127.0.0.1:5173/?qa',{waitUntil:'networkidle'})
await page.waitForTimeout(20000)
await page.screenshot({path:`${out}/${label}-opening.png`,timeout:120000})
const metrics=await page.evaluate(async()=>{
 const q=window.__GT40_QA__;const times=[];let prev=performance.now();const start=prev
 await new Promise(resolve=>{function tick(now){times.push(now-prev);prev=now;if(now-start<3000)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)})
 return {drawCalls:q?.gl.info.render.calls,triangles:q?.gl.info.render.triangles,geometries:q?.gl.info.memory.geometries,textures:q?.gl.info.memory.textures,fps:times.length*1000/(prev-start),frameMsP95:times.sort((a,b)=>a-b)[Math.floor(times.length*.95)],scrollY:scrollY}
})
fs.writeFileSync(`${out}/${label}-browser.json`,JSON.stringify({metrics,errors},null,2));console.log({metrics,errors})
await browser.close()
