from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];out=root/'src/common';data=json.loads((out/'assets.txt').read_text('utf8'))
(out/'assets.js').write_text('const assets='+json.dumps(data['assets'],separators=(',',':'))+";\nexport function imagePath(name){if(name==='black'||name==='white')return '/common/'+name+'.png';return assets[name]?'/common/images/'+assets[name]:'/common/black.png';}\n",'utf8')
with (out/'assets.js').open('a',encoding='utf8') as f:f.write('const galleryImages='+json.dumps(data.get('galleryImages',{}),separators=(',',':'))+';\nexport function galleryImagePath(name){return imagePath(galleryImages[name]||name);}\n')
layout=(out/'portrait-layout.js').read_text('utf8')
(out/'portrait-layout.js').write_text('const dimensions='+json.dumps(data['dimensions'],separators=(',',':'))+';\n'+layout[layout.index('export function portraitBox'):],'utf8')
