"""Retain original layer transparency, sizes and LAY coordinate origins."""
from pathlib import Path
import os,io,json,struct
from PIL import Image
from mpk import MPK
root=Path(__file__).resolve().parents[1];out=root/'src/common'
game=Path(os.environ['STEINS_GAME_ROOT'])/'USRDIR'
data=json.loads((out/'assets.txt').read_text('utf8'));backgrounds={};characters={}
bg=MPK(game/'bg.mpk')
for row in bg.entries:
    im=Image.open(io.BytesIO(bg.read(row['id']))).convert('RGBA')
    alpha=im.getchannel('A').getextrema()
    backgrounds[str(row['id'])]={'size':list(im.size),'transparent':alpha[0]<255}
    if alpha[0]<255:
        im.thumbnail((320,240),Image.Resampling.LANCZOS)
        im=im.quantize(colors=192,method=Image.Quantize.FASTOCTREE)
        name='layer-bg'+str(row['id'])+'.png';im.save(out/'images'/name,optimize=True)
        data['assets']['bg'+str(row['id'])]=name;data['dimensions'][name]=list(im.size)
ch=MPK(game/'chara.mpk')
for row in ch.entries:
    if not row['name'].lower().endswith('.png'):continue
    source=Image.open(io.BytesIO(ch.read(row['id']))).convert('RGBA');lay=ch.read(row['id']+1)
    n,count=struct.unpack_from('<II',lay);states={}
    for j in range(n):
        ident,start,length=struct.unpack_from('<III',lay,8+j*12)
        states[ident]=[tuple(round(x) for x in struct.unpack_from('<4f',lay,8+n*12+(start+k)*16)) for k in range(length)]
    for key in data['portraits']:
        file,face=map(int,key.split(':'))
        if file!=row['id']:continue
        layers=[1,0x20000000|face,0x40000000|(face<<8),0x60000000|(face<<8),0x30000000|(face<<8)]
        chunks=[c for layer in layers for c in states.get(layer,[])]
        if not chunks:continue
        x0=min(c[0] for c in chunks);y0=min(c[1] for c in chunks)
        x1=max(c[0]+30 for c in chunks);y1=max(c[1]+30 for c in chunks)
        canvas=Image.new('RGBA',(x1-x0,y1-y0))
        for x,y,sx,sy in chunks:canvas.paste(source.crop((sx,sy,sx+30,sy+30)),(x-x0,y-y0))
        box=canvas.getbbox()
        if not box:continue
        left,top,right,bottom=box;bottom=min(bottom,900-y0)
        if bottom<=top:bottom=box[3]
        # Retain the visible original body, rather than stretching a waist crop.
        im=canvas.crop((left,top,right,bottom));im.thumbnail((176,288),Image.Resampling.LANCZOS)
        im=im.quantize(colors=192,method=Image.Quantize.FASTOCTREE)
        asset=data['portraits'][key];name=data['assets'][asset]
        im.save(out/'images'/name,optimize=True);data['dimensions'][name]=list(im.size)
        characters[data['portraits'][key]]={'origin':[x0+left,y0+top],'size':[right-left,bottom-top],'faceLayer':(0x20000000|face) in states}
data['backgroundGeometry']=backgrounds;data['portraitGeometry']=characters
(out/'assets.txt').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
(root/'reports/graphics-assets.json').write_text(json.dumps({'backgrounds':backgrounds,'portraits':characters},indent=2),'utf8')
print('transparent backgrounds',sum(v['transparent'] for v in backgrounds.values()),'portrait geometries',len(characters))
for key in ['p126_0','p126_1','p126_2','p40_1','p174_1']:print(key,characters.get(key))
