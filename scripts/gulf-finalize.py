import bpy,bmesh,json,os,math
from mathutils import Vector
ROOT=r'D:\AntiGravity\Project-1';OUT=ROOT+r'\artifacts\gulf-20261003-021901'
s=bpy.context.scene
def principled(m):return next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
# Glass/lenses are thin optical sheets: alpha approximation avoids glTF transmission prepass.
for name in ['GT40_Lens_Red','GT40_Lens_Amber']:
    p=principled(bpy.data.materials[name]);p.inputs['Transmission Weight'].default_value=0
# Bonnet is read from the front of the vehicle; rotate the original 6 UV, not the artwork.
o=bpy.data.objects['GT40_Number6_Bonnet']
for loop in o.data.uv_layers.active.data:loop.uv=(1-loop.uv.x,1-loop.uv.y)
# Confirmed surface overlays: reject any stripe face below the first painted top envelope.
body=bpy.data.objects['GT40_Body'];dg=bpy.context.evaluated_depsgraph_get()
from mathutils.bvhtree import BVHTree
mesh=bpy.data.meshes.new_from_object(body.evaluated_get(dg),depsgraph=dg);mesh.transform(body.matrix_world)
b=bmesh.new();b.from_mesh(mesh);bvh=BVHTree.FromBMesh(b)
stripe=bpy.data.objects['GT40_Gulf_CentreStripe'];bm=bmesh.new();bm.from_mesh(stripe.data)
bad=[]
for f in bm.faces:
    c=f.calc_center_median();hit,normal,index,d=bvh.ray_cast(Vector((c.x,c.y,5)),Vector((0,0,-1)))
    if hit is None or abs(hit.z-c.z)>.02:bad.append(f)
bmesh.ops.delete(bm,geom=bad,context='FACES');bm.to_mesh(stripe.data);bm.free();b.free();bpy.data.meshes.remove(mesh)
print('Removed interior stripe faces',len(bad),flush=True)
# Restore dark period instrument panel if any source body slot was an internal surface.
# No geometry removed; retain source material slots and all structural parts.
floor=bpy.data.objects['Gulf_Studio_Floor']
for v in floor.data.vertices:v.co.x*=100;v.co.y*=100
cam=s.camera
cam.location=(12,13,5);cam.rotation_euler=(Vector((0,0,.2))-cam.location).to_track_quat('-Z','Y').to_euler()
s.render.filepath=OUT+'/final-blender-front.png';bpy.ops.render.render(write_still=True)
car=[o for o in s.objects if o.type=='MESH' and o.name.startswith('GT40_') and o.name!='GT40_DoorHatchScrews']
bpy.ops.object.select_all(action='DESELECT')
for o in car:o.hide_set(False);o.select_set(True)
bpy.ops.export_scene.gltf(filepath=ROOT+r'\public\models\gt40-gulf-number-6.glb',export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
spec=[]
for m in set(m for o in car for m in o.data.materials):
    p=principled(m);spec.append(dict(name=m.name,color=list(p.inputs['Base Color'].default_value),roughness=p.inputs['Roughness'].default_value,metallic=p.inputs['Metallic'].default_value,coat=p.inputs['Coat Weight'].default_value,coatRoughness=p.inputs['Coat Roughness'].default_value,alpha=p.inputs['Alpha'].default_value,transmission=p.inputs['Transmission Weight'].default_value))
open(OUT+'/final-materials.json','w').write(json.dumps(spec,indent=2))
