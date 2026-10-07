import bpy,bmesh,json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=r'D:\AntiGravity\Project-1';OUT=ROOT+r'\artifacts\gulf-20261003-021901'
bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();body=bpy.data.objects['GT40_Body']
report=json.load(open(OUT+'/housing-face-assignments.json'))
for row in report['bodyFaces']:
    if row['role']=='headlight housing':body.data.polygons[row['face']].material_index=0
cover=bpy.data.objects['GT40_HeadLightCover'];mesh=bpy.data.meshes.new_from_object(cover.evaluated_get(dg),depsgraph=dg);mesh.transform(cover.matrix_world)
bm=bmesh.new();bm.from_mesh(mesh);tree=BVHTree.FromBMesh(bm)
idx=next(i for i,m in enumerate(body.data.materials) if m.name=='GT40_Grille_Black')
matched=[]
for p in body.data.polygons:
    c=body.matrix_world@p.center
    if c.z<.015 or c.x<3.8:continue
    hit,n,index,d=tree.ray_cast(Vector((c.x,c.y,5)),Vector((0,0,-1)))
    if hit is not None and .012<hit.z-c.z<.4:p.material_index=idx;matched.append(p.index)
bm.free();bpy.data.meshes.remove(mesh)
print('Lamp housing faces fitted to lens footprint',len(matched),flush=True)
json.dump(dict(faces=matched,method='Only source faces below evaluated clear headlamp cover footprint'),open(OUT+'/housing-footprint.json','w'),indent=2)
s=bpy.context.scene;car=[o for o in s.objects if o.type=='MESH' and o.name.startswith('GT40_') and o.name!='GT40_DoorHatchScrews']
bpy.ops.object.select_all(action='DESELECT')
for o in car:o.hide_set(False);o.select_set(True)
bpy.ops.export_scene.gltf(filepath=ROOT+r'\public\models\gt40-gulf-number-6.glb',export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
s.render.filepath=OUT+'/final-blender-housing.png';bpy.ops.render.render(write_still=True)
