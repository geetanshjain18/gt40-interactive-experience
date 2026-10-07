import bpy,json,os,math
from mathutils import Vector
ROOT=r'D:\AntiGravity\Project-1';OUT=ROOT+r'\artifacts\gulf-20261003-021901'
s=bpy.context.scene
def pmat(name):return next(n for n in bpy.data.materials[name].node_tree.nodes if n.type=='BSDF_PRINCIPLED')
def linear(hex):
    vals=[int(hex[i:i+2],16)/255 for i in (1,3,5)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in vals)+(1,)
for suffix in ['FL','FR','BL','BR']:
    o=bpy.data.objects['GT40_Wheel'+suffix]
    for p in o.data.polygons:
        if p.material_index not in (1,4):continue
        c=o.matrix_world@p.center;r=math.hypot(c.x-o.location.x,c.z-o.location.z)
        p.material_index=4 if r>(.39 if suffix[0]=='F' else .42) else 1
    # Original Rim object is the visible fluted wheel centre, not solely brake geometry.
    bpy.data.objects['GT40_Rim'+suffix].data.materials[0]=bpy.data.materials['GT40_Wheel_Centre_Orange']
# Reduce excessively broad white specular panels while retaining automotive clearcoat.
for name in ['GT40_Gulf_Blue_Paint','GT40_Gulf_Orange_Paint','GT40_Wheel_Centre_Orange']:
    p=pmat(name);p.inputs['Coat Roughness'].default_value=.14;p.inputs['Coat Weight'].default_value=.7
# Thin window sheets: use alpha with Fresnel highlights for reliable visible interior in glTF.
# Transmission itself exports, but this source's layered sheets give opaque-looking refraction.
for name,color,alpha in [('GT40_Glass_Smoked','#354C5B',.28),('GT40_Lens_Clear','#CEDAE1',.12)]:
    p=pmat(name);p.inputs['Base Color'].default_value=linear(color);p.inputs['Transmission Weight'].default_value=0;p.inputs['Alpha'].default_value=alpha;p.inputs['Roughness'].default_value=.14
    mat=bpy.data.materials[name]
    enum=[i.identifier for i in mat.bl_rna.properties['surface_render_method'].enum_items]
    if 'BLENDED' in enum:mat.surface_render_method='BLENDED'
    mat.use_backface_culling=True
for o in s.objects:
    if o.type=='LIGHT' and o.name.startswith('Gulf_Studio_'):o.data.energy*=.5
s.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.22
cam=s.camera
for view,pos in [('front',(12,13,5)),('rear',(-12,-13,5)),('side',(0,-18,3.3))]:
    cam.location=pos;cam.rotation_euler=(Vector((0,0,.2))-cam.location).to_track_quat('-Z','Y').to_euler()
    s.render.filepath=OUT+'/refined-'+view+'.png';bpy.ops.render.render(write_still=True)
car=[o for o in s.objects if o.type=='MESH' and o.name.startswith('GT40_') and o.name!='GT40_DoorHatchScrews']
bpy.ops.object.select_all(action='DESELECT')
for o in car:o.hide_set(False);o.select_set(True)
bpy.ops.export_scene.gltf(filepath=ROOT+r'\public\models\gt40-gulf-number-6.glb',export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
open(OUT+'/final-assignments.json','w').write(json.dumps([dict(object=o.name,materials=[m.name if m else None for m in o.data.materials]) for o in car],indent=2))
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
