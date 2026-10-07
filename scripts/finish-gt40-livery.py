import bpy, bmesh, math, json, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree

assert os.path.basename(bpy.data.filepath)=='GT40_03_MATERIALS.blend'
body=bpy.data.objects['GT40_Body']
dg=bpy.context.evaluated_depsgraph_get()
base=bpy.data.meshes.new_from_object(body.evaluated_get(dg),depsgraph=dg)
base.transform(body.matrix_world)
bm=bmesh.new();bm.from_mesh(base);bm.normal_update()
bvh=BVHTree.FromBMesh(bm)
collection=bpy.data.collections.get('GT40_Livery') or bpy.data.collections.new('GT40_Livery')
if collection.name not in bpy.context.scene.collection.children:bpy.context.scene.collection.children.link(collection)
assert not any(o.name.startswith('GT40_Stripe_') for o in bpy.data.objects), 'Run once on the backed-up working file; final stripes also receive the exterior-envelope filter.'

def make(name,vertices,faces,material):
    mesh=bpy.data.meshes.new(name+'_Mesh');mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj)
    mesh.materials.append(bpy.data.materials[material])
    for p in mesh.polygons:p.use_smooth=True
    return obj

# Clip an evaluated copy to two constant-width bands; original body is untouched.
yc=.01426943
for label,low,high in [('Left',yc+.075,yc+.475),('Right',yc-.475,yc-.075)]:
    strip=bmesh.new();strip.from_mesh(base);strip.normal_update()
    bmesh.ops.delete(strip,geom=[f for f in strip.faces if f.material_index!=0 or f.normal.z<.12],context='FACES')
    for y,inner,outer in [(low,True,False),(high,False,True)]:
        bmesh.ops.bisect_plane(strip,geom=list(strip.verts)+list(strip.edges)+list(strip.faces),dist=.000001,
            plane_co=(0,y,0),plane_no=(0,1,0),clear_inner=inner,clear_outer=outer)
    bmesh.ops.delete(strip,geom=[v for v in strip.verts if not v.link_faces],context='VERTS')
    strip.normal_update()
    for v in strip.verts:v.co+=v.normal*.0018
    mesh=bpy.data.meshes.new('GT40_Stripe_'+label+'_Mesh');strip.to_mesh(mesh);strip.free()
    mesh.materials.clear();mesh.materials.append(bpy.data.materials['GT40_Stripe_Silver'])
    for p in mesh.polygons:p.material_index=0;p.use_smooth=True
    obj=bpy.data.objects.new('GT40_Stripe_'+label,mesh);collection.objects.link(obj)
    print(obj.name,len(mesh.polygons),'faces')

bm.free();bpy.data.meshes.remove(base)
print('Silver strip surfaces created. Door roundels use the packed UV textures in the working file.')
