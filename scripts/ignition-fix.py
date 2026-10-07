from pathlib import Path
for p in Path('src').rglob('*'):
 if p.suffix in ['.ts','.tsx','.css']:
  try:p.read_text(encoding='utf-8')
  except UnicodeDecodeError:p.write_text(p.read_bytes().decode('cp1252'),encoding='utf-8')
p=Path('src/components/canvas/StudioEnvironment.tsx');s=p.read_text().replace("import { useRef }", "import { useRef, useMemo }").replace('const aim=useRef(new T.Object3D()),beamAim=useRef(new T.Object3D())','const aim=useMemo(()=>new T.Object3D(),[]),beamAim=useMemo(()=>{const o=new T.Object3D();o.position.set(0,-.1,7);return o},[])').replace('aim.current','aim').replace('beamAim.current','beamAim').replace(' beamAim.position.set(0,-.1,7)\n','');p.write_text(s)
p=Path('src/components/canvas/ExperienceCanvas.tsx');s=p.read_text().replace('useEffect, useState','useEffect, useState, useRef').replace('function Quality(){let slow=0;','function Quality(){const slow=useRef(0);').replace('slow++','slow.current++').replace('slow=Math.max(0,slow-1)','slow.current=Math.max(0,slow.current-1)').replace('if(slow>50','if(slow.current>50').replace(';slow=0',';slow.current=0');p.write_text(s)
p=Path('src/components/canvas/VehicleModel.tsx');p.write_text('/* oxlint-disable react/immutability -- Animate only the cloned headlight material owned by Three. */\n'+p.read_text())
p=Path('src/index.css');s=p.read_text().replace('#070A0D','#020304').replace('#F3EFE6','#F2EEE5').replace('#8D99A3','#8E989D').replace('#74B9D2','#7CC1D8').replace('#F36C21','#F26A21');p.write_text(s)
