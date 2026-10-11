"""Bake original static crop and mask states at watch resolution."""
from pathlib import Path
import io,os,json,hashlib
import numpy as np
from PIL import Image
from mpk import MPK
root=Path(__file__).resolve().parents[1];out=root/'src/common';images=out/'images'
data=json.loads((out/'assets.txt').read_text('utf8'))
game=Path(os.environ['STEINS_GAME_ROOT'])/'USRDIR';bg=MPK(game/'bg.mpk');mask=MPK(game/'mask.mpk')
views=[f for p in [(root/'reports')/('visual-'+route+'.json') for route in ['suzuha','faris','luka','mayuri','kurisu','true']] for f in json.loads(p.read_text('utf8'))]
crops=set();masks=set();colors=set()
for f in views:
    for x in f['backgrounds']:
        if x[8]==65535:continue
        if x[8]<0:colors.add(x[8])
        if x[10]==1:crops.add((x[8],x[3],x[4],x[6],x[7]))
        if x[12] in (15,16):masks.add((x[8],x[12],x[15],x[11],x[16]))
def original(id):
    if id<0:return Image.new('RGBA',(1920,1080),((id>>16)&255,(id>>8)&255,id&255,255))
    return Image.open(io.BytesIO(bg.read(id))).convert('RGBA')
def save(im,key):
    im.thumbnail((320,240),Image.Resampling.LANCZOS)
    name=key+('.png' if im.getchannel('A').getextrema()[0]<255 else '.jpg')
    if name.endswith('.png'):im.quantize(colors=192,method=Image.Quantize.FASTOCTREE).save(images/name,optimize=True)
    else:im.convert('RGB').save(images/name,quality=68,optimize=True)
    data['assets'][key]=name;data['dimensions'][name]=list(im.size)
for id in colors:
    key='color'+str(id);save(Image.new('RGBA',(1,1),((id>>16)&255,(id>>8)&255,id&255,255)),key)
data['backgroundCrops']={};data['backgroundMasks']={}
for spec in sorted(crops):
    id,x,y,w,h=spec
    if w<=0 or h<=0:continue
    text=':'.join(map(str,spec));key='crop-'+hashlib.sha256(text.encode()).hexdigest()[:16]
    im=original(id).crop((round(x*1.5),round(y*1.5),round((x+w)*1.5),round((y+h)*1.5)))
    save(im,key);data['backgroundCrops'][text]=key
for spec in sorted(masks):
    id,mode,mid,count,extent=spec
    text=':'.join(map(str,spec));key='mask-'+hashlib.sha256(text.encode()).hexdigest()[:16]
    im=original(id);im.thumbnail((320,240),Image.Resampling.LANCZOS)
    m=Image.open(io.BytesIO(mask.read(mid))).convert('RGB').resize(im.size,Image.Resampling.BILINEAR)
    values=np.asarray(m,dtype=np.float32)/255
    light=(values.max(axis=2)+values.min(axis=2))/2
    if mode==16:light=1-light
    extent=extent or 16;count=max(0,min(count,extent+256))
    factor=np.clip(light*(256/extent)-(1-count/255)*(256/extent),0,1)
    old=np.asarray(im.getchannel('A'),dtype=np.float32)
    im.putalpha(Image.fromarray(np.round(old*factor).astype('uint8')))
    save(im,key);data['backgroundMasks'][text]=key
(out/'assets.txt').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
print('original crops',len(data['backgroundCrops']),'original masked layers',len(data['backgroundMasks']),'solid colors',len(colors))
