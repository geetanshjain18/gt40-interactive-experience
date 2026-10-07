import fs from 'node:fs'
import sharp from 'sharp'
const out='artifacts/gulf-20261003-021901'
const refs=[['color4.webp',[1934,1746],[1000,2010]],['color3.webp',[880,476],[825,648]],['color2.jpg',[781,428],[720,510]],['color.jpg',[419,667],[330,446]],['color1.webp',[1410,397],[1280,490]]]
const rows=[]
for(const [file,blue,orange] of refs){
 const samples={file}
 for(const [name,xy] of Object.entries({blue,orange})){
  const {data,info}=await sharp('C:/Users/geeta/Downloads/'+file).extract({left:xy[0]-4,top:xy[1]-4,width:9,height:9}).removeAlpha().raw().toBuffer({resolveWithObject:true})
  const rgb=[0,1,2].map(c=>Array.from({length:81},(_,i)=>data[i*info.channels+c]).sort((a,b)=>a-b)[40])
  samples[name]={xy,rgb,hex:'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('')}
 }
 rows.push(samples)
}
fs.writeFileSync(out+'/reference-samples.json',JSON.stringify(rows,null,2));console.log(rows)
// Original vector-drawn numeral, with no font or external logo dependency.
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 1024 1024"><circle cx="512" cy="512" r="496" fill="#eeede5"/><path fill="#101113" fill-rule="evenodd" d="M654 245 C605 206 531 198 471 221 C371 260 325 369 325 520 L325 661 C325 768 392 823 504 823 C619 823 689 754 689 645 L689 570 C689 470 630 416 538 416 C505 416 478 424 451 440 C455 353 475 318 517 312 C544 308 576 321 599 339 Z M451 571 C451 535 477 516 508 516 C542 516 563 540 563 577 L563 658 C563 701 544 722 508 722 C471 722 451 699 451 658 Z"/></svg>`
await sharp(Buffer.from(svg)).png().toFile(out+'/roundel-6.png')
