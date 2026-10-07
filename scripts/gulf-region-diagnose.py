import bpy,json
s=bpy.context.scene;o=bpy.data.objects['GT40_Body']
for i,m in enumerate(o.data.materials):
    pts=[o.matrix_world@p.center for p in o.data.polygons if p.material_index==i]
    print('BODY_SLOT',i,m.name,'faces',len(pts),'bounds',[[min(p[j] for p in pts) for j in range(3)],[max(p[j] for p in pts) for j in range(3)]] if pts else [])
    if i==1:
        mat=m.copy();o.data.materials[i]=mat;p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(1,0,1,1)
for n in ['GT40_Windshield','GT40_WindowL','GT40_WindowR','GT40_HeadLightCover','GT40_BackWindow1']:
    o=bpy.data.objects[n];v=sum((o.matrix_world.to_3x3().inverted().transposed()@p.normal*p.area for p in o.data.polygons),__import__('mathutils').Vector());print('NORMAL',n,list(v.normalized()))
s.render.resolution_percentage=70;s.cycles.samples=12;s.render.filepath=r'D:\AntiGravity\Project-1\artifacts\gulf-20261003-021901\body-slot-diagnostic.png';bpy.ops.render.render(write_still=True)
