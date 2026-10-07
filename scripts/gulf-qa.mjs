import { chromium } from '@playwright/test'
import fs from 'node:fs'
const out='artifacts/gulf-20261003-021901'
const browser=await chromium.launch({headless:true,channel:'chromium',args:['--enable-webgl','--ignore-gpu-blocklist']})
const errors=[];const results=[]
const page=await browser.newPage({viewport:{width:1440,height:900}})
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.goto('http://127.0.0.1:5173/?qa',{waitUntil:'networkidle'})
await page.waitForFunction(()=>window.__GT40_QA__?.scene.getObjectByName('GT40_Body'))
await page.waitForTimeout(4000)
async function stats(){return page.evaluate(async()=>{
 const q=window.__GT40_QA__;const times=[];let prev=performance.now();const start=prev
 await new Promise(resolve=>{function tick(now){times.push(now-prev);prev=now;if(now-start<2200)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)})
 return {drawCalls:q.gl.info.render.calls,triangles:q.gl.info.render.triangles,geometries:q.gl.info.memory.geometries,textures:q.gl.info.memory.textures,fps:times.length*1000/(prev-start),frameMsP95:times.sort((a,b)=>a-b)[Math.floor(times.length*.95)],scrollY:scrollY}
})}
async function check(name,p,screenshot=true){
 await page.evaluate(p=>scrollTo(0,p*(document.documentElement.scrollHeight-innerHeight)),p)
 await page.waitForTimeout(300)
 const state=await page.evaluate(()=>{
  const q=window.__GT40_QA__,body=q.scene.getObjectByName('GT40_Body');let root=body;while(root.parent&&root.parent!==q.scene)root=root.parent
  const camera=q.camera;const points=[]
  q.scene.updateMatrixWorld(true)
  root.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;for(let i=0;i<8;i++){const v=b.min.clone();v.set(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z);v.applyMatrix4(o.matrixWorld).project(camera);points.push([v.x,v.y,v.z])}}})
  return {scrollY,rotation:root.rotation.y,maxX:Math.max(...points.map(v=>Math.abs(v[0]))),maxY:Math.max(...points.map(v=>Math.abs(v[1]))),camera:camera.position.toArray(),viewport:[innerWidth,innerHeight]}
 })
 if(screenshot)await page.screenshot({path:`${out}/web-${name}.png`,timeout:120000})
 results.push({name,progress:p,...state})
}
await check('opening',0)
const performanceDesktop=await stats()
// Site forward axis is +Z, and opening yaw is 5.8 radians.
for(const [name,degrees] of [['front',0],['front-left',45],['left',90],['rear-left',135],['rear',180],['rear-right',225],['right',270],['front-right',315]]){
 const p=((degrees*Math.PI/180-5.8+Math.PI*4)%(Math.PI*2))/(Math.PI*2)
 await check(name,p)
}
for(let i=0;i<=24;i++)await check('rotation-'+String(i).padStart(2,'0'),i/24)
for(const p of [.75,.5,.25,0])await check('reverse-'+p,p)
await page.evaluate(()=>{window.__GT40_QA__.camera.position.y=3.8})
await check('elevated',.15)
await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight*.7));await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(3000)
results.push({name:'reload-before-any-scroll-command',scrollY:await page.evaluate(()=>scrollY)})
await check('reload',0)
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(2000)
for(let i=0;i<=8;i++)await check('mobile-'+i,i/8)
const performanceMobile=await stats()
await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(3500)
await check('reduced-motion-mobile',0)
const reducedBefore=await page.evaluate(()=>window.__GT40_QA__.gl.info.render.frame)
await page.waitForTimeout(1000)
const reducedAfter=await page.evaluate(()=>window.__GT40_QA__.gl.info.render.frame)
await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(1000);await check('reduced-motion-desktop',0)
const report={performanceDesktop,performanceMobile,reducedMotionIdleFrames:reducedAfter-reducedBefore,errors,results}
fs.writeFileSync(out+'/browser-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({performanceDesktop,performanceMobile,reducedMotionIdleFrames:report.reducedMotionIdleFrames,errors,views:results.length,clipping:results.filter(x=>x.maxX>.98||x.maxY>.98)},null,2))
await browser.close()
