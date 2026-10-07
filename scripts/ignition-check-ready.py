from pathlib import Path
p=Path('src/components/canvas/HeadlightBloom.tsx');p.write_text(p.read_text().replace('\ufeff',''))
p=Path('scripts/ignition-preview.mjs');s=p.read_text().replace("assert.equal(requests.length,count);", "assert.equal(requests.length,count);assert.equal(count,1,'one model transfer');");p.write_text(s)
