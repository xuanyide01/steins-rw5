"""Show layered event CGs as complete scenes in the gallery."""
from pathlib import Path
import json
from PIL import Image
root=Path(__file__).resolve().parents[1];out=root/'src/common';images=out/'images'
a=json.loads((out/'assets.txt').read_text('utf8'));views=[f for p in [(root/'reports')/('visual-'+route+'.json') for route in ['suzuha','faris','luka','mayuri','kurisu','true']] for f in json.loads(p.read_text('utf8'))]
a['galleryImages']={};missing=[]
for number,name in a['backgroundNames'].items():
    id=int(number)
    if not name.startswith('EV_') or not a['backgroundGeometry'][number]['transparent']:continue
    sample=next((f for f in views if any(b[8]==id for b in f['backgrounds']) and any(0<=b[8]<65535 and b[8]!=id for b in f['backgrounds'])),None)
    if not sample:missing.append(name);continue
    canvas=Image.new('RGBA',(320,180),'black')
    for b in sorted(sample['backgrounds'],key=lambda b:b[9]):
        file=b[8]
        if not 0<=file<65535:continue
        key='bg'+str(file);size=a['backgroundGeometry'][str(file)]['size']
        width=size[0]/6;height=size[1]/6;left=-b[1]/4;top=-b[2]/4
        if b[10] in (2,6):
            zoom=b[5]/1000 or 1;width*=zoom;height*=zoom;left=b[1]/4-width/2;top=b[2]/4-height/2
        if b[10]==1:
            spec=':'.join(map(str,[file,b[3],b[4],b[6],b[7]]));key=a['backgroundCrops'].get(spec,key);width=320;height=180;left=top=0
        im=Image.open(images/a['assets'][key]).convert('RGBA').resize((max(1,round(width)),max(1,round(height))),Image.Resampling.LANCZOS)
        if b[14]<256:im.putalpha(im.getchannel('A').point(lambda v:round(v*b[14]/256)))
        canvas.alpha_composite(im,(round(left),round(top)))
    key='gallery-bg'+number;filename=key+'.jpg';canvas.convert('RGB').save(images/filename,quality=72,optimize=True)
    a['assets'][key]=filename;a['dimensions'][filename]=[320,180];a['galleryImages']['bg'+number]=key
(out/'assets.txt').write_text(json.dumps(a,ensure_ascii=False,separators=(',',':')),'utf8')
(root/'reports/gallery-composition.json').write_text(json.dumps({'composedLayeredCGs':len(a['galleryImages']),'unobservedLayers':missing},ensure_ascii=False,indent=2),'utf8')
print('complete layered gallery CGs',len(a['galleryImages']),'unobserved',missing)
