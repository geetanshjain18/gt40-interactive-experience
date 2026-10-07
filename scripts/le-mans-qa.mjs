import { chromium } from '@playwright/test'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const out='artifacts/le-mans-opening',url=process.env.QA_URL||'http://127.0.0.1:5173/?qa'
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']})
const context=await browser.newContext({viewport:{width:1440,height:900}})
const page=await context.newPage(),errors=[],requests=[],views=[]
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('request',r=>{if(r.url().includes('.glb'))requests.push(r.url())})
const ready=async p=>{await p.waitForFunction(()=>['ready','reducedMotion'].includes(document.querySelector('.experience')?.dataset.phase)&&!document.querySelector('.explore-button').disabled,{},{timeout:60000});await p.waitForTimeout(300)}
async function snapshot(name,p=page){
 const info=await p.evaluate(()=>{
  const q=window.__GT40_QA__,root=q.scene.getObjectByName('GT40Vehicle'),points=[]
  q.scene.updateMatrixWorld(true);q.camera.updateMatrixWorld(true)
  root.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;for(let i=0;i<8;i++){const v=b.min.clone().set(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z).applyMatrix4(o.matrixWorld).project(q.camera);points.push([v.x,v.y,v.z])}}})
  const extrema={minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))}
  return{...extrema,camera:q.camera.position.toArray(),fov:q.camera.fov,view:q.camera.view,uuid:root.uuid,vehicleCount:q.scene.children.filter(o=>o.name==='GT40Vehicle').length,phase:document.querySelector('.experience').dataset.phase,scrollY,viewport:[innerWidth,innerHeight],horizontalOverflow:document.documentElement.scrollWidth>innerWidth}
 })
 assert.ok(info.minX>-.99&&info.maxX<.99&&info.minY>-.99&&info.maxY<.99,name+' vehicle clipping '+JSON.stringify(info))
 assert.equal(info.horizontalOverflow,false,name+' page overflow')
 await p.screenshot({path:`${out}/qa-${name}.png`,timeout:60000});views.push({name,...info});return info
}
const scroll=async(p,amount)=>{await p.evaluate(v=>scrollTo(0,v*(document.documentElement.scrollHeight-innerHeight)),amount);await p.waitForTimeout(350)}
const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true})
// Slow uncached geometry: verify content, actual load state and disabled action survive the intro.
let delay=true
await page.route('**/*.glb',async route=>{if(delay)await new Promise(r=>setTimeout(r,4000));await route.continue()})
await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForTimeout(1200)
await page.screenshot({path:out+'/qa-loading.png'});assert.equal(await page.getByRole('button',{name:'EXPLORE THE MACHINE'}).isDisabled(),true)
const skip=page.getByRole('button',{name:/SKIP INTRO/});if(await skip.isVisible())await skip.click()
await ready(page);delay=false;await page.unroute('**/*.glb');await cdp.send('Network.setCacheDisabled',{cacheDisabled:false})
const landing=await snapshot('desktop-landing');const firstRequests=requests.length;assert.equal(firstRequests,1,'single initial GLB request')
await page.getByRole('button',{name:'EXPLORE THE MACHINE'}).focus();await page.keyboard.press('Enter')
await page.waitForTimeout(450);await snapshot('entering');await page.waitForTimeout(800)
const opening=await snapshot('front-left');assert.equal(landing.uuid,opening.uuid,'same model instance through Explore');assert.equal(requests.length,firstRequests,'no second GLB request')
assert.equal(opening.vehicleCount,1)
for(const[name,p]of [['left',.38],['rear-left',.62],['rear',.72],['rear-right',.82],['right',.92],['closing',1]]){await scroll(page,p);await snapshot(name)}
for(let i=20;i>=0;i--){await scroll(page,i/20);if(i%5===0)await snapshot('reverse-'+i)}
// Fast trackpad bursts and slow wheel steps exercise native scroll through one ScrollTrigger.
await page.mouse.move(1100,650)
for(let i=0;i<30;i++)await page.mouse.wheel(0,145)
await page.waitForTimeout(400);await snapshot('rapid-wheel')
for(let i=0;i<20;i++){await page.mouse.wheel(0,-36);await page.waitForTimeout(30)}
await page.waitForTimeout(400);await snapshot('slow-wheel')
await page.keyboard.press('Home');await page.waitForTimeout(500);await page.keyboard.press('PageDown');await page.waitForTimeout(500);await snapshot('keyboard-page-down')
await scroll(page,1);await page.getByRole('button',{name:/REPLAY STUDY/}).click();await page.waitForTimeout(1400);assert.equal(await page.evaluate(()=>scrollY),0)
// Demand render loop should stop once the short interpolation settles.
const f1=await page.evaluate(()=>window.__GT40_QA__.gl.info.render.frame);await page.waitForTimeout(1000);const f2=await page.evaluate(()=>window.__GT40_QA__.gl.info.render.frame)
assert.ok(f2-f1<=2,'no idle continuous render loop')
const performanceResult=await page.evaluate(async()=>{
 const q=window.__GT40_QA__,durations=[],start=performance.now();let prev=start;const initialFrames=q.gl.info.render.frame
 await new Promise(resolve=>{function tick(now){durations.push(now-prev);prev=now;scrollTo(0,((now-start)/2600)*(document.documentElement.scrollHeight-innerHeight));if(now-start<2600)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)})
 return{rafFps:durations.length*1000/(prev-start),renderPassesPerSecond:(q.gl.info.render.frame-initialFrames)*1000/(prev-start),frameMsP95:durations.sort((a,b)=>a-b)[Math.floor(durations.length*.95)],drawCalls:q.gl.info.render.calls,triangles:q.gl.info.render.triangles,geometries:q.gl.info.memory.geometries,textures:q.gl.info.memory.textures}
})
await page.reload({waitUntil:'networkidle'});await ready(page);assert.equal(await page.evaluate(()=>scrollY),0);await snapshot('cached-reload')
for(const [name,width,height]of [['tablet',820,1180],['mobile',390,844],['small-mobile',360,640],['short-desktop',1366,768],['landscape-phone',844,390]]){
 await page.setViewportSize({width,height});await page.reload({waitUntil:'networkidle'});await ready(page);await snapshot(name+'-landing')
 await page.getByRole('button',{name:'EXPLORE THE MACHINE'}).click();await page.waitForTimeout(1200)
 for(const [angle,p]of [['front',0],['side',.38],['rear',.72],['closing',1]]){await scroll(page,p);await snapshot(name+'-'+angle)}
}
await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.reload({waitUntil:'networkidle'});await ready(page);await snapshot('reduced-landing')
await page.getByRole('button',{name:'EXPLORE THE MACHINE'}).click();await page.waitForTimeout(250)
for(const name of ['LEFT','REAR','RIGHT','FRONT']){await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(150);await snapshot('reduced-'+name.toLowerCase())}
// Real touch events in a mobile context, without synthetic scrollTo.
const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1})
const touchPage=await touchContext.newPage();await touchPage.goto(url,{waitUntil:'networkidle'});await ready(touchPage)
await touchPage.getByRole('button',{name:'EXPLORE THE MACHINE'}).tap();await touchPage.waitForTimeout(1200)
const touchCDP=await touchContext.newCDPSession(touchPage)
await touchCDP.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:200,y:620}]})
for(let y=590;y>=250;y-=30){await touchCDP.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y}]});await touchPage.waitForTimeout(20)}
await touchCDP.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touchPage.waitForTimeout(700)
assert.ok(await touchPage.evaluate(()=>scrollY)>50,'native touch scrolling advances study');await snapshot('native-touch',touchPage)
await touchContext.close()
// Failure is injected in a separate page, so intentional network errors are recorded separately.
const failure=await context.newPage();const expectedErrors=[];failure.on('pageerror',e=>expectedErrors.push(String(e)))
await failure.route('**/*.glb',r=>r.abort('failed'));await failure.goto(url,{waitUntil:'networkidle'});await failure.getByRole('button',{name:/RETRY LOADING/}).waitFor({timeout:30000})
await failure.screenshot({path:out+'/qa-failure.png'});await failure.unroute('**/*.glb');await failure.getByRole('button',{name:/RETRY LOADING/}).click();await ready(failure);await snapshot('retry-success',failure)
assert.equal(errors.length,0,'clean normal browser console')
const report={url,normalErrors:errors,expectedFailureErrors:expectedErrors,firstLoadGLBRequests:firstRequests,landingToExploreExtraRequests:0,sameModelUUID:true,idleRenderedFrames:f2-f1,performance:performanceResult,views}
fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({views:views.length,errors,performance:performanceResult,idleRenderedFrames:f2-f1,firstLoadGLBRequests:firstRequests},null,2));await browser.close()
