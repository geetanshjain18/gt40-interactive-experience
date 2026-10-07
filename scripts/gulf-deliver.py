"""Final non-destructive export: defer the rear decal obstructed by the raised intake."""
import bpy,json
from mathutils import Vector
ROOT=r'D:\AntiGravity\Project-1';OUT=ROOT+r'\artifacts\gulf-20261003-021901'
s=bpy.context.scene;bpy.context.view_layer.update()
assert bpy.data.objects.get('GT40_DoorHatch1') is None
o=bpy.data.objects['GT40_Number6_RearDeck']
record=dict(name=o.name,location=list(o.location),dimensions=list(o.dimensions),parent=o.parent.name if o.parent else None,reason='Raised rear intake obstructs the roundel; optional decal deferred to preserve a clean composition.')
json.dump(record,open(OUT+'/rear-decal-exclusion.json','w'),indent=2)
o.hide_render=True;o.hide_set(True)
car=[o for o in s.objects if o.type=='MESH' and o.name.startswith('GT40_') and o.name not in ['GT40_DoorHatchScrews','GT40_Number6_RearDeck']]
bpy.ops.object.select_all(action='DESELECT')
for o in car:o.hide_set(False);o.select_set(True)
bpy.ops.export_scene.gltf(filepath=ROOT+r'\public\models\gt40-gulf-number-6.glb',export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
json.dump([dict(object=o.name,materials=[m.name if m else None for m in o.data.materials]) for o in car],open(OUT+'/final-assignments.json','w'),indent=2)
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
cam=s.camera
for name,pos in [('front',(12,13,5)),('rear',(-12,-13,5)),('side',(0,-18,3.3))]:
    cam.location=pos;cam.rotation_euler=(Vector((0,0,.2))-cam.location).to_track_quat('-Z','Y').to_euler()
    s.render.filepath=OUT+'/delivered-blender-'+name+'.png';bpy.ops.render.render(write_still=True)
print('DELIVERY_EXPORT_COMPLETE',flush=True)
