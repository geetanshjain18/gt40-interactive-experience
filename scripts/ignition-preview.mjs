import {chromium} from '@playwright/test'

import fs from 'node:fs'

import assert from 'node:assert/strict'
import http from 'node:http'
import path from 'node:path'

const out='artifacts/ignition-20261004',production=process.argv.includes('--production'),url=production?'http://127.0.0.1:4173/?qa':'http://127.0.0.1:5173/?qa'
let server
if(production){const root=path.resolve('dist');server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return}const target=file===root||file===root+path.sep?path.join(root,'index.html'):file;try{const ext=path.extname(target);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.woff2':'font/woff2','.woff':'font/woff','.webp':'image/webp'})[ext]||'application/octet-stream');res.end(fs.readFileSync(target))}catch{res.writeHead(404);res.end()}});await new Promise(r=>server.listen(4173,'127.0.0.1',r))}

const browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']})

const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[],requests=[],views=[]

page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE ERROR',String(e))});page.on('console',m=>{
  if(m.type()==='error'){errors.push(m.text());console.log('CONSOLE ERROR',m.text())}
  if(m.text().includes('[SCROLL PERF]')){console.log('PERF:', m.text())}
});
page.on('request',r=>{if(/\.(glb|ogg|mp3)(?:\?|$)/.test(r.url()))requests.push(r.url())})

const ready=()=>page.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='ready',null,{timeout:60000})

const finished=()=>page.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='exploring',null,{timeout:30000})

async function shot(name){await page.screenshot({path:`${out}/${name}.png`});const info=await page.evaluate(()=>{const q=window.__GT40_QA__,root=q?.scene.getObjectByName('GT40Vehicle');return{size:[innerWidth,innerHeight],phase:document.querySelector('.experience')?.dataset.phase,overflow:document.documentElement.scrollWidth>innerWidth,uuid:root?.uuid,frame:q?.gl.info.render.frame,drawCalls:q?.gl.info.render.calls,triangles:q?.gl.info.render.triangles,camera:q?.camera.position.toArray(),time:q?.motion.current.time,progress:q?.motion.current.progress}});assert.equal(info.overflow,false,name+' overflow');views.push({name,...info});return info}

await page.route('**/*.glb',async r=>{await new Promise(resolve=>setTimeout(resolve,2500));await r.continue()})

await page.goto(url,{waitUntil:'networkidle'});
const content = await page.content();
console.log('PAGE CONTENT:', content.substring(0, 500));
await page.waitForTimeout(300);await shot('blackout');await page.waitForTimeout(700);await shot('real-loading');await ready();await page.unroute('**/*.glb');const opening=await shot('headlights');const count=requests.length

await page.waitForTimeout(1000);
await page.screenshot({path: 'debug-initial.png'});
await page.getByRole('button',{name:'START ENGINE',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForTimeout(250);await shot('cranking');await page.waitForTimeout(1250);await shot('partial');await finished();const hero=await shot('hero');assert.equal(opening.uuid,hero.uuid);assert.equal(requests.length,count);assert.equal(count,1,'one model transfer');assert.equal(await page.locator('canvas').count(),1);assert.equal(await page.getByRole('button',{name:'Enable engine sound'}).count(),1)

await page.getByRole('button',{name:'Enable engine sound'}).click();assert.equal(await page.getByRole('button',{name:'Enable engine sound'}).getAttribute('aria-pressed'),'false')

for(const[name,p]of [['challenger',.04],['side',.31],['cockpit',.52],['engine',.75],['legend',1]]){await page.evaluate(p=>scrollTo(0,p*(document.documentElement.scrollHeight-innerHeight)),p);await page.waitForTimeout(1000);await shot(name)}

await page.getByRole('button',{name:/EXPLORE FREELY/}).click();await page.mouse.move(900,500);await page.mouse.down();await page.mouse.move(980,530,{steps:8});await page.mouse.up();await page.waitForTimeout(500);await shot('free-inspection');await page.getByRole('button',{name:/RETURN TO THE STORY/}).click()

const perf=await page.evaluate(async()=>{const q=window.__GT40_QA__,times=[],long=[];const observer=new PerformanceObserver(l=>long.push(...l.getEntries().map(e=>e.duration)));observer.observe({type:'longtask',buffered:false});let last=performance.now(),start=last,rendered=0,lastFrame=q.gl.info.render.frame;const before=q.gl.info.render.frame;await new Promise(resolve=>{function tick(now){times.push(now-last);last=now;if(q.gl.info.render.frame!==lastFrame)rendered++;lastFrame=q.gl.info.render.frame;scrollTo(0,(1-(now-start)/2200)*(document.documentElement.scrollHeight-innerHeight));if(now-start<2200)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});observer.disconnect();return{rafFps:times.length*1000/(last-start),renderFps:rendered*1000/(last-start),passesPerSecond:(q.gl.info.render.frame-before)*1000/(last-start),p95:times.sort((a,b)=>a-b)[Math.floor(times.length*.95)],longTasks:long,drawCalls:q.gl.info.render.calls,triangles:q.gl.info.render.triangles,dpr:q.gl.getPixelRatio(),renderer:q.gl.getContext().getParameter(q.gl.getContext().RENDERER)}})

await page.waitForTimeout(1500);const f1=await page.evaluate(()=>window.__GT40_QA__.gl.info.render.frame);await page.waitForTimeout(700);const f2=await page.evaluate(()=>window.__GT40_QA__.gl.info.render.frame);assert.ok(f2-f1<=2,'demand rendering settles')

for(const[w,h]of [[1920,1080],[1440,900],[1366,768],[1024,768],[768,1024],[390,844],[360,800]]){await page.setViewportSize({width:w,height:h});await page.reload({waitUntil:'networkidle'});await ready();assert.equal(await page.evaluate(()=>scrollY),0);await shot(`${w}x${h}-opening`);await page.getByRole('button',{name:'ENTER WITHOUT SOUND',exact:true}).click();await finished();await shot(`${w}x${h}-hero`)}

await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'networkidle'});await ready();await page.getByRole('button',{name:'ENTER WITHOUT SOUND',exact:true}).click();await finished();await shot('reduced-hero');await page.evaluate(()=>scrollTo(0,.52*(document.documentElement.scrollHeight-innerHeight)));await page.waitForTimeout(1000);await shot('reduced-cockpit')

// Queue one interaction while the real network transfer is still pending.

await page.emulateMedia({reducedMotion:'no-preference'});await page.route('**/*.glb',async r=>{await new Promise(resolve=>setTimeout(resolve,3000));await r.continue()});await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(1000);await page.getByRole('button',{name:'START ENGINE',exact:true}).click();await finished();await shot('queued-one-click');await page.unroute('**/*.glb')

const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}),touchPage=await touchContext.newPage();await touchPage.goto(url,{waitUntil:'networkidle'});await touchPage.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='ready');await touchPage.getByRole('button',{name:'ENTER WITHOUT SOUND',exact:true}).tap();await touchPage.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='exploring');const touchCDP=await touchContext.newCDPSession(touchPage);await touchCDP.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:200,y:600}]});for(let y=580;y>250;y-=30){await touchCDP.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y}]});await touchPage.waitForTimeout(20)}await touchCDP.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touchPage.waitForTimeout(800);assert.ok(await touchPage.evaluate(()=>scrollY)>50,'natural touch scroll');await touchPage.screenshot({path:out+'/native-touch.png'});const mobilePerformance=await touchPage.evaluate(async()=>{const q=window.__GT40_QA__,times=[];let last=performance.now(),start=last;await new Promise(resolve=>{function tick(now){times.push(now-last);last=now;scrollTo(0,(now-start)/1600*(document.documentElement.scrollHeight-innerHeight));if(now-start<1600)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});return{fps:times.length*1000/(last-start),p95:times.sort((a,b)=>a-b)[Math.floor(times.length*.95)],dpr:q.gl.getPixelRatio(),drawCalls:q.gl.info.render.calls}});await touchContext.close()
const failure=await context.newPage();await failure.route('**/*.glb',r=>r.abort());await failure.goto(url,{waitUntil:'networkidle'});await failure.getByRole('button',{name:'TRY AGAIN'}).waitFor();await failure.screenshot({path:out+'/model-fallback.png'});await failure.close()

const noGL=await context.newPage();await noGL.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return original.call(this,type,...args)}});await noGL.goto(url,{waitUntil:'networkidle'});await noGL.getByRole('button',{name:'TRY AGAIN'}).waitFor();await noGL.screenshot({path:out+'/webgl-fallback.png'});await noGL.close()

assert.equal(errors.length,0,JSON.stringify(errors));const result={production,url,errors,views,performance:perf,mobilePerformance,idleFrames:f2-f1,initialModelRequests:count,sameModel:true,audio:'licensed asset unavailable; no production audio requests or autoplay',fallbacks:true};fs.writeFileSync(out+'/verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify({views:views.length,errors,performance:perf,mobilePerformance,idleFrames:f2-f1},null,2));await browser.close();server?.close()

