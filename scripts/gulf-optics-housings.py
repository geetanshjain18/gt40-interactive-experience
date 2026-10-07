import bpy,bmesh,json,os
from mathutils import Vector
ROOT=r'D:\AntiGravity\Project-1';OUT=ROOT+r'\artifacts\gulf-20261003-021901'
s=bpy.context.scene;bpy.context.view_layer.update()
# Source window sheets include inward normals; two-sided is restricted to optical materials.
for name,alpha in [('GT40_Glass_Smoked',.38),('GT40_Lens_Clear',.18)]:
    m=bpy.data.materials[name];m.use_backface_culling=False
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Alpha'].default_value=alpha
    p.inputs['Coat Weight'].default_value=.25;p.inputs['Coat Roughness'].default_value=.12
body=bpy.data.objects['GT40_Body'];body.data=body.data.copy()
idx=len(body.data.materials);body.data.materials.append(bpy.data.materials['GT40_Grille_Black'])
changed=[]
for p in body.data.polygons:
    c=body.matrix_world@p.center
    headlight=3.88<c.x<4.64 and 1.02<abs(c.y-.01427)<1.78 and .035<c.z<.275
    rear=c.x<-4.40 and .3<abs(c.y-.01427)<1.35 and .05<c.z<.43
    front=4.20<c.x<4.64 and abs(c.y-.01427)<1.20 and -.57<c.z<-.14
    if headlight or rear or front:
        p.material_index=idx;changed.append(dict(face=p.index,center=list(c),role='headlight housing' if headlight else 'grille recess'))
o=bpy.data.objects['GT40_Gulf_OrangeNose'];bm=bmesh.new();bm.from_mesh(o.data)
bad=[f for f in bm.faces if (lambda c:4.20<c.x<4.66 and abs(c.y-.01427)<1.20 and -.59<c.z<-.12)(f.calc_center_median())]
bmesh.ops.delete(bm,geom=bad,context='FACES');bm.to_mesh(o.data);bm.free()
open(OUT+'/housing-face-assignments.json','w').write(json.dumps(dict(bodyFaces=changed,orangeOverlayRecessFacesRemoved=len(bad)),indent=2))
# Dark central wheel hub, retain the orange spokes.
for suffix in ['FL','FR','BL','BR']:
    o=bpy.data.objects['GT40_Rim'+suffix];o.data=o.data.copy();mi=len(o.data.materials);o.data.materials.append(bpy.data.materials['GT40_Metal_Dark'])
    for p in o.data.polygons:
        c=o.matrix_world@p.center
        if ((c.x-o.location.x)**2+(c.z-o.location.z)**2)**.5<.085:p.material_index=mi
cam=s.camera;cam.location=(12,13,5);cam.rotation_euler=(Vector((0,0,.2))-cam.location).to_track_quat('-Z','Y').to_euler()
s.render.filepath=OUT+'/final-blender-optics.png';bpy.ops.render.render(write_still=True)
car=[o for o in s.objects if o.type=='MESH' and o.name.startswith('GT40_') and o.name!='GT40_DoorHatchScrews']
bpy.ops.object.select_all(action='DESELECT')
for o in car:o.hide_set(False);o.select_set(True)
bpy.ops.export_scene.gltf(filepath=ROOT+r'\public\models\gt40-gulf-number-6.glb',export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
open(OUT+'/final-assignments.json','w').write(json.dumps([dict(object=o.name,materials=[m.name if m else None for m in o.data.materials]) for o in car],indent=2))
