import bpy, json, os
from mathutils import Vector
OUT=r'D:\AntiGravity\Project-1\artifacts\gulf-20261003-021901'
rows=[]
dg=bpy.context.evaluated_depsgraph_get()
for o in bpy.context.scene.objects:
    if o.type!='MESH': continue
    ev=o.evaluated_get(dg)
    bounds=[o.matrix_world@Vector(v) for v in ev.bound_box]
    rows.append(dict(name=o.name,materials=[m.name if m else None for m in o.data.materials],location=list(o.location),dimensions=list(o.dimensions),parent=o.parent.name if o.parent else None,bounds=[[min(v[i] for v in bounds) for i in range(3)],[max(v[i] for v in bounds) for i in range(3)]],vertices=len(o.data.vertices),polygons=len(o.data.polygons),uv=[u.name for u in o.data.uv_layers],modifiers=[dict(name=m.name,type=m.type,viewport=m.show_viewport,render=m.show_render) for m in o.modifiers]))
open(os.path.join(OUT,'scene-inventory.json'),'w').write(json.dumps(dict(file=bpy.data.filepath,version=bpy.app.version_string,meshes=rows),indent=2))
print('INVENTORY',len(rows),bpy.data.filepath)
