from pathlib import Path
p=Path('src/components/canvas/VehicleModel.tsx');s=p.read_text().replace('o.material = list','o.material = Array.isArray(o.material) ? list : list[0]');p.write_text(s)
