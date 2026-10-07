from pathlib import Path
p=Path('scripts/ignition-preview.mjs');s=p.read_text().replace("page.on('pageerror',e=>errors.push(String(e)))", "page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE ERROR',String(e))})").replace("if(m.type()==='error')errors.push(m.text())", "if(m.type()==='error'){errors.push(m.text());console.log('CONSOLE ERROR',m.text())}");p.write_text(s)
