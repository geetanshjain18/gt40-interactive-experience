import fs from 'node:fs'
let source=fs.readFileSync('scripts/finish-gt40-materials.py','utf8')
source=source.replace("assert os.path.basename(bpy.data.filepath) == 'GT40_03_MATERIALS.blend'", "assert os.path.basename(bpy.data.filepath) == 'GT40_02_NO_DOOR_HATCH.blend'")
const names={GT40_Paint_Black:'GT40_Gulf_Blue_Paint',GT40_Stripe_Silver:'GT40_Gulf_Orange_Paint',GT40_Graphics_Black:'GT40_Black_Graphic',GT40_Glass_Dark:'GT40_Glass_Smoked',GT40_Rubber:'GT40_Tyre_Rubber',GT40_Wheel_Gold:'GT40_Wheel_Centre_Orange',GT40_Light_Clear:'GT40_Lens_Clear',GT40_Light_Red:'GT40_Lens_Red',GT40_Light_Amber:'GT40_Lens_Amber'}
for(const [a,b] of Object.entries(names))source=source.replaceAll(a,b)
source=source.replace("('#080909',.73,.23,.65)","('#80BBD2',0,.26,.8)").replace("('#B8BCC0',.65,.30,.15)","('#F36C21',0,.25,.8)").replace("('#A57C45',.92,.29)","('#F36C21',0,.25,.8)").replace("('#ADB8BE',0,.10,0,.92)","('#A6B8C2',0,.12,0,.86)").replace("('#E8E7DF',0,.38,.15)","('#EEEDE5',0,.3,.35)")
source=source.replace("m.use_backface_culling=False","m.use_backface_culling=True")
source=source.replace("out=r'D:\\AntiGravity\\Project-1\\artifacts\\gt40-materials'","out=r'D:\\AntiGravity\\Project-1\\artifacts\\gulf-20261003-021901'")
fs.writeFileSync('scripts/gulf-materials.py',source)
