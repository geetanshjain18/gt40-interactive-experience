import bpy, os, json
from mathutils import Vector

s=bpy.context.scene
collection=bpy.data.collections.get('Studio_Finish') or bpy.data.collections.new('Studio_Finish')
if collection.name not in s.collection.children:s.collection.children.link(collection)
dg=bpy.context.evaluated_depsgraph_get()
minimum=[]
for name in ['GT40_WheelFL','GT40_WheelFR','GT40_WheelBL','GT40_WheelBR']:
    o=bpy.data.objects[name];e=o.evaluated_get(dg);m=e.to_mesh()
    minimum.append(min((e.matrix_world@v.co).z for v in m.vertices));e.to_mesh_clear()
floor_z=min(minimum)
print('TYRE_MIN_Z',floor_z,'WEBSITE_LIFT',-floor_z*.486)
s['gt40TyreMinimumZ']=floor_z

world=bpy.data.worlds.new('GT40_StudioWorld');s.world=world;world.use_nodes=True
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND')
bg.inputs['Color'].default_value=(.14,.16,.19,1);bg.inputs['Strength'].default_value=.35

def area(name,position,power,size,size_y,target=(0,0,.25)):
    data=bpy.data.lights.new(name,'AREA');data.energy=power
    shapes=[i.identifier for i in data.bl_rna.properties['shape'].enum_items]
    assert 'RECTANGLE' in shapes;data.shape='RECTANGLE';data.size=size;data.size_y=size_y
    o=bpy.data.objects.new(name,data);collection.objects.link(o);o.location=position
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    return o
area('Studio_Finish_Key',(2,3,9),2600,10,4)
area('Studio_Finish_Rim',(-4,-5,6),2200,9,3)
area('Studio_Finish_Fill',(5,-6,3),1250,7,5)

floor=bpy.data.materials.new('Studio_Finish_Floor');floor.use_nodes=True
p=next(n for n in floor.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
p.inputs['Base Color'].default_value=(.011,.014,.018,1);p.inputs['Roughness'].default_value=.82
mesh=bpy.data.meshes.new('Studio_Finish_Floor');mesh.from_pydata([(-100,-100,floor_z),(-100,100,floor_z),(100,100,floor_z),(100,-100,floor_z)],[],[(3,2,1,0)])
o=bpy.data.objects.new('Studio_Finish_Floor',mesh);collection.objects.link(o);mesh.materials.append(floor)
camera=bpy.data.objects.new('Studio_Finish_Camera',bpy.data.cameras.new('Studio_Finish_Camera'))
collection.objects.link(camera);camera.location=(11,13,5.5)
camera.rotation_euler=(Vector((0,0,.15))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.lens=52;s.camera=camera
s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True
s.render.resolution_x=1000;s.render.resolution_y=650;s.render.resolution_percentage=100
assert 'PNG' in [i.identifier for i in s.render.image_settings.bl_rna.properties['file_format'].enum_items]
s.render.image_settings.file_format='PNG'
print('COLOR MANAGEMENT',s.view_settings.view_transform,s.view_settings.look,s.view_settings.exposure)
s.render.filepath=r'D:\AntiGravity\Project-1\artifacts\gt40-materials\finish-preview.png'
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
def render():
    bpy.ops.render.render(write_still=True)
    return None
bpy.app.timers.register(render,first_interval=.5)
print('Preview render queued')
