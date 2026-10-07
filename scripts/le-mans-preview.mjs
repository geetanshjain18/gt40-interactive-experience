import { chromium } from '@playwright/test'
import fs from 'node:fs'
const out='artifacts/le-mans-opening'
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']})
const page=await browser.newPage({viewport:{width:1440,height:900}})
const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.goto('http://127.0.0.1:5173/?qa',{waitUntil:'networkidle'})
await page.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='ready',{},{timeout:60000})
await page.screenshot({path:out+'/desktop-landing.png'})
console.log('READY',await page.locator('.experience').getAttribute('data-phase'))
await page.getByRole('button',{name:'EXPLORE THE MACHINE'}).click();await page.waitForTimeout(1200)
for(const [name,p]of [['opening',0],['left',.38],['rear-left',.62],['rear-right',.82],['right',.92],['closing',1]]){
 await page.evaluate(p=>scrollTo(0,p*(document.documentElement.scrollHeight-innerHeight)),p);await page.waitForTimeout(400);await page.screenshot({path:`${out}/desktop-${name}.png`})
}
await page.setViewportSize({width:390,height:844});await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('.experience')?.dataset.phase==='ready');await page.screenshot({path:out+'/mobile-landing.png'})
await page.getByRole('button',{name:'EXPLORE THE MACHINE'}).click();await page.waitForTimeout(1200);await page.screenshot({path:out+'/mobile-exploring.png'})
fs.writeFileSync(out+'/preview-errors.json',JSON.stringify(errors,null,2));console.log(errors);await browser.close()
