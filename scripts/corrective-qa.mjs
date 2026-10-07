import { chromium } from '@playwright/test'
import fs from 'node:fs'
import assert from 'node:assert/strict'

const out=process.env.QA_OUT||'artifacts/corrective-20261004'
fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chromium'})
const base=process.env.QA_URL||'http://127.0.0.1:5174'
const report={base,views:[],failures:[]}
async function metrics(page){return page.evaluate(()=>{
 const q=window.__GT40_QA__,stage=document.querySelector('.pinned-stage'),root=document.querySelector('.experience')
 return {phase:root?.dataset.phase,scrollY,progress:q?.motion.current.progress,target:q?.motion.current.target,camera:q?.camera.position.toArray(),stageTop:stage?.getBoundingClientRect().top,headlineOpacity:document.querySelector('.landing-copy')?getComputedStyle(document.querySelector('.landing-copy')).opacity:null,chapterOpacity:document.querySelector('.chapter-copy')?getComputedStyle(document.querySelector('.chapter-copy')).opacity:null,chapter:document.querySelector('.overlay')?.dataset.chapter,contextLost:q?.gl.getContext().isContextLost(),drawCalls:q?.gl.info.render.calls,triangles:q?.gl.info.render.triangles,buttons:[...document.querySelectorAll('button')].map(x=>x.textContent)}
})}
async function settle(page,p){
 await page.evaluate(p=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p),p)
 await page.waitForFunction(p=>Math.abs(window.__GT40_QA__.motion.current.progress-p)<.002,p,{timeout:10000})
 await page.screenshot({path:out+'/current.png'})
}
try{
 for(const [name,width,height,reduced] of [['desktop',1440,900,false],['mobile',390,844,false],['reduced',390,844,true]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<500,reducedMotion:reduced?'reduce':'no-preference'})
  const errors=[],assets=[]
  page.on('pageerror',e=>errors.push(e.stack||String(e)))
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  page.on('response',r=>{if(/\.glb|\.mp3/.test(r.url()))assets.push({url:r.url(),status:r.status()})})
  await page.goto(base+'/?qa',{waitUntil:'networkidle'})
  await page.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='ready',null,{timeout:90000})
  const opening=await metrics(page)
  assert.deepEqual(opening.buttons,['START ENGINE↗'])
  assert.equal(await page.locator('h1').count(),0)
  assert.equal(await page.locator('.fallback').count(),0)
  await page.screenshot({path:out+'/'+name+'-opening.png'})
  await page.getByRole('button',{name:'Start the Ford GT40 engine'}).click()
  await page.waitForFunction(()=>window.__GT40_QA__.motion.current.time>=1.5)
  await page.screenshot({path:out+'/'+name+'-crank.png'})
  await page.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='exploring',null,{timeout:30000})
  const landing=await metrics(page)
  assert.equal(Number(landing.chapterOpacity),0)
  await page.screenshot({path:out+'/'+name+'-landing.png'})
  const frames=[]
  for(const p of [.12,.31,.52,.75,.9,1,.5,0]){
   await settle(page,p)
   const m=await metrics(page)
   assert.equal(m.stageTop,0)
   assert.equal(m.contextLost,false)
   frames.push(m)
   await page.screenshot({path:out+'/'+name+'-'+p+'.png'})
  }
  if(!reduced){await page.mouse.wheel(0,700);await page.waitForFunction(()=>scrollY>0&&window.__GT40_QA__.motion.current.progress>.01);assert.ok((await metrics(page)).progress>0)}
  if(name==='desktop')report.performance=await page.evaluate(async()=>{
   const q=window.__GT40_QA__,times=[],start=performance.now();let previous=start,lastFrame=q.gl.info.render.frame,rendered=0
   await new Promise(resolve=>{function step(now){times.push(now-previous);previous=now;const frame=q.gl.info.render.frame;if(frame!==lastFrame)rendered++;lastFrame=frame;scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*(.2+.3*Math.min(1,(now-start)/2500)));if(now-start<2500)requestAnimationFrame(step);else resolve()}requestAnimationFrame(step)})
   const context=q.gl.getContext(),debug=context.getExtension('WEBGL_debug_renderer_info')
   return {observedRenderFps:rendered*1000/(previous-start),rafP95:times.sort((a,b)=>a-b)[Math.floor(times.length*.95)],dpr:q.gl.getPixelRatio(),renderer:debug?context.getParameter(debug.UNMASKED_RENDERER_WEBGL):context.getParameter(context.RENDERER),triangles:q.gl.info.render.triangles,drawCalls:q.gl.info.render.calls}
  })
  const sound=await page.evaluate(async()=>{
   const r=await fetch('/audio/start-engine-button-click.mp3'),context=new OfflineAudioContext(1,44100,44100),buffer=await context.decodeAudioData(await r.arrayBuffer());let peak=0,sum=0;const data=buffer.getChannelData(0);for(const x of data){peak=Math.max(peak,Math.abs(x));sum+=x*x}return {status:r.status,duration:buffer.duration,peak,rms:Math.sqrt(sum/data.length)}
  })
  report.views.push({name,opening,landing,frames,assets,sound,errors})
  if(errors.length)report.failures.push(...errors)
  await page.reload({waitUntil:'networkidle'})
  await page.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='ready',null,{timeout:90000})
  assert.equal(await page.locator('h1').count(),0)
  assert.equal(await page.evaluate(()=>scrollY),0)
  await page.close()
 }
 // A failed GLB is model-specific, and retry must clear the rejected loader cache.
 const page=await browser.newPage({viewport:{width:1280,height:800}})
 await page.route('**/*.glb',r=>r.fulfill({status:503,body:'Deliberate QA model failure'}))
 await page.goto(base+'/?qa')
 await page.getByRole('alert').waitFor({timeout:30000})
 assert.match(await page.getByRole('alert').innerText(),/model/)
 await page.unroute('**/*.glb')
 await page.getByRole('button',{name:'TRY AGAIN'}).click()
 await page.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='ready',null,{timeout:90000})
 assert.equal(await page.getByRole('alert').count(),0)
 report.modelRetry='passed'
 await page.close()
 const silent=await browser.newPage()
 await silent.route('**/*.mp3',r=>r.abort())
 await silent.goto(base+'/?qa')
 await silent.getByRole('button',{name:'Start the Ford GT40 engine'}).click({timeout:90000})
 await silent.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='exploring',null,{timeout:30000})
 assert.equal(await silent.getByRole('alert').count(),0)
 report.audioFailure='visual experience completes'
 await silent.close()
 const unsupported=await browser.newPage()
 await unsupported.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /^webgl/.test(type)?null:original.call(this,type,...args)}})
 await unsupported.goto(base+'/?qa')
 await unsupported.getByRole('alert').waitFor()
 assert.match(await unsupported.getByRole('alert').innerText(),/WebGL could not be initialized/)
 report.webglUnavailable='confirmed context failure produces WebGL-specific fallback'
 await unsupported.close()
 const loss=await browser.newPage()
 await loss.goto(base+'/?qa')
 await loss.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='ready',null,{timeout:90000})
 await loss.evaluate(()=>window.__GT40_QA__.gl.getContext().getExtension('WEBGL_lose_context').loseContext())
 await loss.getByRole('alert').waitFor()
 assert.match(await loss.getByRole('alert').innerText(),/lost its WebGL context/)
 await loss.getByRole('button',{name:'TRY AGAIN'}).click()
 await loss.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='ready',null,{timeout:90000})
 report.contextLossRetry='passed'
 await loss.close()
}catch(e){report.failures.push(e.stack||String(e));process.exitCode=1}
finally{if(report.failures.length)process.exitCode=1;fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,views:report.views.map(v=>({name:v.name,errors:v.errors,sound:v.sound,frames:v.frames.length}))},null,2));await browser.close()}
