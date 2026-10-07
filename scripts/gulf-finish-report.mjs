import fs from 'node:fs'
const path='scripts/gulf-report.mjs'
let s=fs.readFileSync(path,'utf8')
s=s.replace('on both doors, bonnet, and rear deck.', 'on both doors and bonnet. The optional rear-deck roundel was excluded after the raised intake visibly obstructed it; its separate object remains hidden in the editable Blender file (rear-decal-exclusion.json).')
s=s.replace('Six separate livery meshes are added.', 'Five separate livery meshes are exported; the optional rear roundel remains hidden in Blender.')
s=s.replace('then housing-fit in that order.', 'housing-fit, then deliver in that order.')
s=s.replace('The 26.4 MiB uncompressed asset', 'The approximately 26 MiB uncompressed asset')
fs.writeFileSync(path,s)
