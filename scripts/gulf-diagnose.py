import bpy,json,math
o=bpy.data.objects['GT40_WheelFL']
for i,m in enumerate(o.data.materials):
    r=[]
    for p in o.data.polygons:
        if p.material_index==i:
            c=o.matrix_world@p.center;r.append(math.hypot(c.x-o.location.x,c.z-o.location.z))
    print('WHEEL_SLOT',i,m.name,min(r) if r else None,max(r) if r else None,len(r))
print('VIEW',bpy.context.scene.view_settings.view_transform,bpy.context.scene.view_settings.look,bpy.context.scene.view_settings.exposure,bpy.context.scene.view_settings.gamma)
print('CYCLES',bpy.context.scene.cycles.max_bounces,bpy.context.scene.cycles.transmission_bounces,bpy.context.scene.cycles.transparent_max_bounces)
for n in ['GT40_Glass_Smoked','GT40_Gulf_Blue_Paint']:
    m=bpy.data.materials[n];p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');print(n,[(i.name,str(i.default_value)) for i in p.inputs if i.name in ['Base Color','Transmission Weight','Alpha','Roughness','Coat Weight','IOR','Thin Wall']])
