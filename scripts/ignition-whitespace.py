from pathlib import Path
p=Path('src/components/canvas/HeadlightBloom.tsx');p.write_bytes(p.read_bytes().replace(b'\r\r\n',b'\n').replace(b'\r\n',b'\n'))
