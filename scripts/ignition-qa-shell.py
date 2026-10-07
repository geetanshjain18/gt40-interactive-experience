from pathlib import Path
p=Path('scripts/ignition-preview.mjs');s=p.read_text().replace("document.querySelector('.experience').dataset.phase","document.querySelector('.experience')?.dataset.phase");p.write_text(s)
