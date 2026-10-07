"""Reproducible source-to-Gulf conversion; run in background Blender on source file."""
import bpy,bmesh,json,math,os,sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=r'D:\AntiGravity\Project-1'
OUT=ROOT+r'\artifacts\gulf-20261003-021901'
WORK=r'D:\Blender Project\GT40 Project\Blender Files\GT40_04_GULF_LIVERY.blend'
TEX=r'D:\Blender Project\GT40 Project\Textures\Gulf\roundel-6.png'
exec(compile(open(ROOT+r'\scripts\gulf-materials.py').read(),'gulf-materials.py','exec'))
s=bpy.context.scene
excluded=['Studio_Ground1','PaintPallet1','PaintPallet2','PaintPallet3','PaintPallet4','GT40_DoorHatchScrews']
excluded_rows=[]
for o in s.objects:
    if o.name in excluded or o.type in {'LIGHT','CAMERA'}:
        excluded_rows.append(dict(name=o.name,type=o.type,location=list(o.location),dimensions=list(o.dimensions),parent=o.parent.name if o.parent else None))
        o.hide_render=True;o.hide_set(True)
open(OUT+'/excluded.json','w').write(json.dumps(excluded_rows,indent=2))
alloy=material('GT40_Wheel_Lip_Alloy','#B6BEC3',.9,.23)
grille=material('GT40_Grille_Black','#161A1D',.25,.57)
for name in ['GT40_FrontGrill','GT40_RearGrill','GT40_EngineVent']:
    bpy.data.objects[name].data.materials[0]=grille
# Split original centre/rim slot using wheel-relative radius, never touching tyre faces.
for suffix in ['FL','FR','BL','BR']:
    o=bpy.data.objects['GT40_Wheel'+suffix];o.data=o.data.copy()
    idx=len(o.data.materials);o.data.materials.append(alloy)
    for p in o.data.polygons:
        if p.material_index!=1:continue
        c=o.matrix_world@p.center
        radius=math.hypot(c.x-o.location.x,c.z-o.location.z)
        if radius>(.50 if suffix[0]=='F' else .54):p.material_index=idx
# Source glass is thin-sheet geometry; transmission is exported, no alpha layering.
for n in ['GT40_Glass_Smoked','GT40_Lens_Clear']:
    mats[n].use_backface_culling=True
# Non-destructive material work; source geometry and modifiers retained.
bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
body=bpy.data.objects['GT40_Body']
base=bpy.data.meshes.new_from_object(body.evaluated_get(dg),depsgraph=dg);base.transform(body.matrix_world)
bm=bmesh.new();bm.from_mesh(base);bm.normal_update();bvh=BVHTree.FromBMesh(bm)
coll=bpy.data.collections.new('GT40_Gulf_Livery');s.collection.children.link(coll)
yc=.01426943
def newmesh(name,mesh,mat):
    mesh.materials.clear();mesh.materials.append(mat)
    for p in mesh.polygons:p.material_index=0;p.use_smooth=True
    o=bpy.data.objects.new(name,mesh);coll.objects.link(o);return o
def clipped(name,selector,planes,mat,offset=.0012):
    b=bmesh.new();b.from_mesh(base);b.normal_update()
    bad=[]
    for f in b.faces:
        c=f.calc_center_median()
        if f.material_index not in (0,1) or not selector(f,c):bad.append(f);continue
        # Reject interior and duplicate inward panels by checking the exterior envelope.
        start=c+f.normal*.025
        hit,normal,index,dist=bvh.ray_cast(start,-f.normal,.1)
        if hit is None or (hit-c).length>.012:bad.append(f)
    bmesh.ops.delete(b,geom=bad,context='FACES')
    for co,no,inner,outer in planes:
        bmesh.ops.bisect_plane(b,geom=list(b.verts)+list(b.edges)+list(b.faces),dist=1e-6,plane_co=co,plane_no=no,clear_inner=inner,clear_outer=outer)
    bmesh.ops.delete(b,geom=[v for v in b.verts if not v.link_faces],context='VERTS')
    b.normal_update()
    for v in b.verts:v.co+=v.normal*offset
    mesh=bpy.data.meshes.new(name+'_Mesh');b.to_mesh(mesh);b.free()
    print(name,len(mesh.polygons),flush=True);return newmesh(name,mesh,mat)
# One constant 0.78-unit band; only actual painted surfaces, no bridges over gaps/glass.
clipped('GT40_Gulf_CentreStripe',lambda f,c:f.normal.z>.18 and c.z>0,
    [((0,yc-.39,0),(0,1,0),True,False),((0,yc+.39,0),(0,1,0),False,True)],mats['GT40_Gulf_Orange_Paint'])
clipped('GT40_Gulf_OrangeNose',lambda f,c:(f.normal.x>.05 or abs(f.normal.y)>.1) and c.x>3.25,
    [((3.30,0,0),(1,0,0),True,False),((0,0,.04),(0,0,1),False,True)],mats['GT40_Gulf_Orange_Paint'])
# Roundels follow evaluated painted body triangles; clipped grid surfaces never bridge holes.
decalmat=material('GT40_Roundel_Number6','#EEEDE5',0,.3,.35)
nodes=decalmat.node_tree.nodes;p=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(TEX);tex.image.colorspace_settings.name='sRGB';tex.image.pack()
decalmat.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
decalmat.node_tree.links.new(tex.outputs['Alpha'],p.inputs['Alpha'])
def roundel(name,center,radius,side=0):
    vertices=[];uvs=[];faces=[];valid=[];N=64
    for j in range(N+1):
        for i in range(N+1):
            u=i/N;v=j/N
            if side:
                x=center[0]+(u-.5)*2*radius*(-side);z=center[2]+(v-.5)*2*radius
                origin=Vector((x,side*5+yc,z));direction=Vector((0,-side,0))
            else:
                x=center[0]+(v-.5)*2*radius;y=center[1]+(u-.5)*2*radius
                origin=Vector((x,y,5));direction=Vector((0,0,-1))
            hit,normal,index,dist=bvh.ray_cast(origin,direction,10)
            ok=hit is not None and base.polygons[index].material_index in (0,1) and normal.dot(-direction)>.35
            vertices.append(tuple(hit+normal*.0025) if hit is not None else (0,0,0));uvs.append((u,v));valid.append(ok)
    for j in range(N):
        for i in range(N):
            ids=[j*(N+1)+i,j*(N+1)+i+1,(j+1)*(N+1)+i+1,(j+1)*(N+1)+i]
            if all(valid[k] for k in ids) and all((Vector(vertices[ids[k]])-Vector(vertices[ids[(k+1)%4]])).length<radius*.12 for k in range(4)):
                faces.append(ids)
    mesh=bpy.data.meshes.new(name+'_Mesh');mesh.from_pydata(vertices,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='Gulf_ProjectedUV')
    for poly in mesh.polygons:
        for li in poly.loop_indices:uv.data[li].uv=uvs[mesh.loops[li].vertex_index]
    obj=newmesh(name,mesh,decalmat)
    # Recalculate normals then orient the open decal toward its projection direction.
    b=bmesh.new();b.from_mesh(mesh);bmesh.ops.recalc_face_normals(b,faces=list(b.faces));b.normal_update()
    expected=Vector((0,side,0)) if side else Vector((0,0,1))
    for f in b.faces:
        if f.normal.dot(expected)<0:f.normal_flip()
    b.to_mesh(mesh);b.free()
    print('ROUNDEL',name,len(faces),flush=True)
roundel('GT40_Number6_DoorL',(-.25,0,.10),.70,1)
roundel('GT40_Number6_DoorR',(-.25,0,.10),.70,-1)
roundel('GT40_Number6_Bonnet',(2.85,yc,0),.64)
roundel('GT40_Number6_RearDeck',(-4.02,yc+.91,0),.48)
bm.free();bpy.data.meshes.remove(base)
# Bounds from actual evaluated vertices, not rotated axis-aligned bounding-box corners.
bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
car=[o for o in s.objects if o.type=='MESH' and o.name.startswith('GT40_') and o.name not in excluded]
points=[]
for o in car:
    e=o.evaluated_get(dg);m=e.to_mesh();points.extend(e.matrix_world@v.co for v in m.vertices);e.to_mesh_clear()
lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
s['gt40PresentationCenter']=[(lo[0]+hi[0])/2,0,-(lo[1]+hi[1])/2]
s['gt40BoundsMin']=lo;s['gt40BoundsMax']=hi
open(OUT+'/clean-bounds.json','w').write(json.dumps(dict(min=lo,max=hi,center=list(s['gt40PresentationCenter'])),indent=2))
# Studio preview setup lives outside the selection exported below.
studio=bpy.data.collections.new('Gulf_Studio_Preview');s.collection.children.link(studio)
world=bpy.data.worlds.new('Gulf_Studio_World');s.world=world;world.use_nodes=True
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.15,.18,.22,1);bg.inputs['Strength'].default_value=.4
def area(name,pos,power,size,sy):
    d=bpy.data.lights.new(name,'AREA');d.energy=power
    assert 'RECTANGLE' in [i.identifier for i in d.bl_rna.properties['shape'].enum_items]
    d.shape='RECTANGLE';d.size=size;d.size_y=sy
    o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,.2))-o.location).to_track_quat('-Z','Y').to_euler()
area('Gulf_Studio_Key',(3,4,9),2400,10,4);area('Gulf_Studio_Rim',(-4,-5,6),1900,9,3);area('Gulf_Studio_Fill',(6,-5,4),1500,7,5)
floor=material('Gulf_Studio_Floor','#20252A',0,.85)
m=bpy.data.meshes.new('Gulf_Studio_Floor');m.from_pydata([(-100,-100,lo[2]-.015),(100,-100,lo[2]-.015),(100,100,lo[2]-.015),(-100,100,lo[2]-.015)],[],[(0,1,2,3)])
o=bpy.data.objects.new('Gulf_Studio_Floor',m);studio.objects.link(o);m.materials.append(floor)
cam=bpy.data.objects.new('Gulf_Studio_Camera',bpy.data.cameras.new('Gulf_Studio_Camera'));studio.objects.link(cam);s.camera=cam;cam.data.lens=52
cam.location=(12,13,6);cam.rotation_euler=(Vector((0,0,.2))-cam.location).to_track_quat('-Z','Y').to_euler()
try:s.render.engine='CYCLES'
except TypeError:raise
s.cycles.samples=24;s.cycles.use_denoising=True
s.render.resolution_x=1200;s.render.resolution_y=800;s.render.resolution_percentage=100
assert 'PNG' in [i.identifier for i in s.render.image_settings.bl_rna.properties['file_format'].enum_items]
s.render.image_settings.file_format='PNG'
bpy.ops.wm.save_as_mainfile(filepath=WORK)
rows=[dict(object=o.name,materials=[m.name if m else None for m in o.data.materials]) for o in car]
open(OUT+'/final-assignments.json','w').write(json.dumps(rows,indent=2))
for view,pos in [('front',(12,13,6)),('rear',(-12,-13,6)),('side',(0,-18,4))]:
    cam.location=pos;cam.rotation_euler=(Vector((0,0,.2))-cam.location).to_track_quat('-Z','Y').to_euler()
    s.render.filepath=OUT+'/blender-'+view+'.png';bpy.ops.render.render(write_still=True)
cam.location=(12,13,6);cam.rotation_euler=(Vector((0,0,.2))-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.select_all(action='DESELECT')
for o in car:o.hide_set(False);o.select_set(True)
bpy.ops.export_scene.gltf(filepath=ROOT+r'\public\models\gt40-gulf-number-6.glb',export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=WORK)
print('GULF_BUILD_COMPLETE',flush=True)
