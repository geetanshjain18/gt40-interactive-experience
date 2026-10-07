from pathlib import Path
p=Path('vite.config.ts');s=p.read_text();s=s.replace("  build: { rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'vendor', test: /node_modules/, maxSize: 450000 }] } } } },\n",'');p.write_text(s)
