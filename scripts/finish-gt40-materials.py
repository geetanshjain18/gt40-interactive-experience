"""Run through Blender MCP in the GT40_03_MATERIALS working file."""
import bpy, json, os

assert os.path.basename(bpy.data.filepath) == 'GT40_03_MATERIALS.blend'
assert bpy.data.objects.get('GT40_DoorHatch1') is None

def rgba(value):
    rgb = [int(value[i:i+2], 16)/255 for i in (1,3,5)]
    return tuple(c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in rgb)+(1,)

def material(name, color, metal, rough, coat=0, transmission=0, ior=1.45):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes=True
    m.node_tree.nodes.clear()
    p=m.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    out=m.node_tree.nodes.new('ShaderNodeOutputMaterial')
    p.inputs['Base Color'].default_value=rgba(color)
    p.inputs['Metallic'].default_value=metal
    p.inputs['Roughness'].default_value=rough
    p.inputs['Coat Weight'].default_value=coat
    p.inputs['Coat Roughness'].default_value=.09
    p.inputs['Transmission Weight'].default_value=transmission
    p.inputs['IOR'].default_value=ior
    p.inputs['Thin Wall'].default_value=True
    m.node_tree.links.new(p.outputs['BSDF'],out.inputs['Surface'])
    m.diffuse_color=rgba(color)
    # Preserve two-sided source surfaces until browser verification is available.
    m.use_backface_culling=False
    return m

specs={
 'GT40_Paint_Black':('#080909',.73,.23,.65),
 'GT40_Stripe_Silver':('#B8BCC0',.65,.30,.15),
 'GT40_Roundel_White':('#E8E7DF',0,.38,.15),
 'GT40_Graphics_Black':('#090A0B',0,.38,.1),
 'GT40_Glass_Dark':('#ADB8BE',0,.10,0,.92),
 'GT40_Rubber':('#151719',0,.76),
 'GT40_Wheel_Gold':('#A57C45',.92,.29),
 'GT40_Metal_Brushed':('#929BA1',.88,.34),
 'GT40_Metal_Chrome':('#BCC3C6',1,.19),
 'GT40_Metal_Dark':('#353B40',.82,.42),
 'GT40_Interior_Black':('#22262A',0,.63),
 'GT40_Leather':('#191C20',0,.49),
 'GT40_Engine_Aluminium':('#929A9F',.85,.43),
 'GT40_Engine_Steel':('#646D74',.90,.32),
 'GT40_Engine_Black':('#292D30',.55,.46),
 'GT40_Accent_Red':('#8A1A16',.12,.39),
 'GT40_Light_Clear':('#F2F5F6',0,.09,0,.96),
 'GT40_Light_Red':('#A10C0A',0,.21,.35,.35),
 'GT40_Light_Amber':('#D77812',0,.24,.3,.25),
}
mats={n:material(n,*v) for n,v in specs.items()}
mapping={
 'GT40_PaintBlack':'GT40_Paint_Black','Material':'GT40_Paint_Black',
 'GT40_Glass':'GT40_Glass_Dark',
 'GT40_Trim1':'GT40_Metal_Brushed','GT40_Trim2':'GT40_Engine_Steel','GT40_Trim3':'GT40_Metal_Dark',
 'GT40_Tire1':'GT40_Rubber','GT40_Tire2':'GT40_Rubber',
 'GT40_Rim1':'GT40_Wheel_Gold','GT40_Rim2':'GT40_Metal_Dark',
 'GT40_RedTrim1':'GT40_Accent_Red',
 'GT40_Seat1':'GT40_Leather','GT40_Seat2':'GT40_Interior_Black',
 'GT40_Matte':'GT40_Interior_Black','GT40_Dark':'GT40_Interior_Black',
 'GT40_InteriorFloor':'GT40_Interior_Black','GT40_Interior3':'GT40_Leather','GT40_InteriorConsole':'GT40_Interior_Black',
 'GT40_EngineTube1':'GT40_Rubber','GT4_Exhaust':'GT40_Metal_Dark',
 'GT40_Steer1':'GT40_Leather','GT40_Steer2':'GT40_Metal_Brushed','GT40_Steer3':'GT40_Interior_Black',
 'GT40_Stick1':'GT40_Interior_Black','GT40_Pedal':'GT40_Metal_Brushed',
 'GT40_Headlight1':'GT40_Light_Clear','GT40_Headlight2':'GT40_Light_Amber','GT40_Headlight3':'GT40_Light_Clear',
 'GT40_Headlight4':'GT40_Metal_Chrome','GT40_Headlight5':'GT40_Metal_Chrome',
 'GT40_Tailight1':'GT40_Light_Red','GT40_Taillight2':'GT40_Light_Red',
 'GT40_Speedometer1':'GT40_Interior_Black','GT40_Speedometer2':'GT40_Metal_Dark',
 'GT40_SPeedometer3':'GT40_Interior_Black','GT40_RPM1':'GT40_Interior_Black','GT40_Fuel1':'GT40_Interior_Black',
 'GT40_GearSign1':'GT40_Metal_Brushed','GT40_Button1':'GT40_Accent_Red',
 'GT40_Button2':'GT40_Light_Amber','GT40_Button3':'GT40_Interior_Black',
}
overrides={
 'GT40_EngineBlock1':{0:'GT40_Engine_Aluminium'},
 'GT40_EngineBlockCaps':{0:'GT40_Engine_Black'},
 'GT40_EngineCaps':{0:'GT40_Engine_Aluminium'},
 'GT40_EngineSuperChargers':{0:'GT40_Engine_Aluminium',1:'GT40_Metal_Brushed',2:'GT40_Engine_Black'},
 'GT40_EnginePipes1':{0:'GT40_Engine_Steel'},
 'GT40_EnginePipes2':{0:'GT40_Metal_Dark'},
 'GT40_EnginePipes3':{0:'GT40_Engine_Steel',1:'GT40_Engine_Black'},
 'GT40_EnginePipes4':{0:'GT40_Metal_Dark'},
 'GT40_EngineVent':{0:'GT40_Metal_Dark'},
 'GT40_FrontGrill':{0:'GT40_Metal_Dark'},'GT40_RearGrill':{0:'GT40_Metal_Dark'},
 'GT40_Underside':{0:'GT40_Engine_Black'},'GT40_UndersideBox':{0:'GT40_Engine_Black'},
 'GT40_Radiator1':{0:'GT40_Engine_Aluminium',1:'GT40_Engine_Black'},
 'GT40_TurnSignalLights':{0:'GT40_Light_Amber'},
 'GT40_FuelCap':{0:'GT40_Metal_Chrome'},
}
for n in ['GT40_RimFL','GT40_RimFR','GT40_RimBL','GT40_RimBR']:
    overrides[n]={0:'GT40_Engine_Steel',1:'GT40_Accent_Red',2:'GT40_Metal_Brushed',3:'GT40_Metal_Dark'}
for n in ['GT40_InteriorTube1','GT40_InteriorTube2','GT40_InteriorTube3','GT40_InteriorTube4']:
    overrides[n]={0:'GT40_Rubber'}
rows=[]
for o in bpy.context.scene.objects:
    if o.type!='MESH' or not o.name.startswith('GT40_'):continue
    if not o.data.materials:o.data.materials.append(mats['GT40_Engine_Black'])
    for i,old in enumerate(list(o.data.materials)):
        oldname=old.name if old else None
        target=overrides.get(o.name,{}).get(i) or mapping.get(oldname)
        if oldname in mats and not target:target=oldname
        assert target, (o.name,i,oldname)
        o.data.materials[i]=mats[target]
        rows.append({'object':o.name,'slot':i,'source_material':oldname,'material':target})
out=r'D:\AntiGravity\Project-1\artifacts\gt40-materials'
open(os.path.join(out,'material-assignments.json'),'w').write(json.dumps(rows,indent=2))
open(os.path.join(out,'material-specs.json'),'w').write(json.dumps(specs,indent=2))
print('Assigned',len(mats),'reusable materials to',len(rows),'slots; all car components retained.')
