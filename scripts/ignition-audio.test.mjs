import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const events=[],gains=[]
class Param{value=0;setValueAtTime(v,t){gains.push(['set',v,t])}linearRampToValueAtTime(v,t){gains.push(['ramp',v,t])}cancelAndHoldAtTime(){}}
class Gain{gain=new Param();connect(n){return n}disconnect(){}}
class Context{
 currentTime=0;destination={};state='suspended'
 async resume(){this.state='running';events.push(['resume'])}
 async suspend(){this.state='suspended';events.push(['suspend'])}
 async close(){this.state='closed'}
 createGain(){return new Gain()}
 createDynamicsCompressor(){return {threshold:new Param(),knee:new Param(),ratio:new Param(),attack:new Param(),release:new Param(),connect:n=>n}}
 async decodeAudioData(b){const id=new Uint8Array(b)[0];return {id,duration:id===1?.09:id===2?3:8}}
 createBufferSource(){return {buffer:null,connect:n=>n,disconnect(){},start(t){events.push(['start',this.buffer.id,t])},stop(){events.push(['stop',this.buffer.id])}}}
}
globalThis.AudioContext=Context;globalThis.document={hidden:false};globalThis.sessionStorage={setItem(){}}
globalThis.fetch=async path=>({ok:true,headers:{get:()=> 'audio/mpeg'},arrayBuffer:async()=>new Uint8Array([path.includes('click')?1:path.includes('start')?2:3]).buffer})
let code=ts.transpileModule(fs.readFileSync('src/audio/EngineAudio.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
code=code.replace(/import \{ AUDIO as A \} from ['"][^'"]+['"];?/,`const A={engineVerified:true,paths:{click:'/audio/button-click.mp3',start:'/audio/gt40-start.mp3',idle:'/audio/gt40-idle-loop.mp3'},crossfade:.55,loopCrossfade:.5,master:.24,ambient:.035,click:.18,fade:1};`)
const {EngineAudio}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
test('gesture starts supplied click before engine; idle overlaps without fading early',async()=>{
 events.length=0;gains.length=0;const e=new EngineAudio()
 try{await e.preload();assert.equal(events.length,0);await e.unlock();e.playButtonClick();e.begin()
 let starts=events.filter(e=>e[0]==='start');assert.deepEqual(starts.map(e=>e[1]),[1,2]);assert.ok(starts[1][2]>starts[0][2])
 e.context.currentTime=2;e.scheduleIdle();starts=events.filter(e=>e[0]==='start');assert.equal(starts[2][1],3)
 assert.ok(Math.abs(starts[2][2]-(starts[1][2]+3-.55))<1e-6)
 assert.ok(gains.some(e=>e[0]==='set'&&e[1]===.18));assert.ok(gains.some(e=>e[0]==='set'&&e[1]===.24))
 assert.ok(!gains.some(e=>e[0]==='ramp'&&e[1]===.035/.24));e.finish();assert.ok(gains.some(e=>e[0]==='ramp'&&e[1]===.035/.24))
 }finally{e.dispose()}
})
test('enable and visibility resume only idle without replaying the starter',async()=>{
 events.length=0;const e=new EngineAudio()
 try{await e.preload();assert.equal(events.length,0);assert.equal(await e.enable(),true);assert.deepEqual(events.filter(e=>e[0]==='start').map(e=>e[1]),[3])
 document.hidden=true;e.visibility();assert.equal(e.context.state,'suspended');document.hidden=false;e.visibility();assert.deepEqual(events.filter(e=>e[0]==='start').map(e=>e[1]),[3]);e.setMuted(true)
 }finally{e.dispose()}
})
