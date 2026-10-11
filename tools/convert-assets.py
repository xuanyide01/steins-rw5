"""Decode MPK PNG + LAY sprites without running the original game."""
from pathlib import Path
import os,io,struct,json,hashlib,re
from PIL import Image,ImageDraw,ImageFont,ImageOps
from mpk import MPK
ROOT=Path(__file__).resolve().parents[1]
GAME=Path(os.environ['STEINS_GAME_ROOT'])/'USRDIR'
OUT=ROOT/'src/common';IMAGES=OUT/'images';IMAGES.mkdir(parents=True,exist_ok=True)
REPORT=ROOT/'reports';REPORT.mkdir(exist_ok=True)
assets={};dimensions={};portraitMap={};bgNames={};gallery={};audit=[];hashes={}
def save(im,kind,key):
    filename=key+('.png' if kind=='p' else '.jpg');p=IMAGES/filename
    if kind=='p':
        im=im.convert('RGBA');box=im.getbbox()
        if not box:return None
        im=im.crop(box)
        # Retain face and upper body at a readable size on a 432px screen.
        if im.height>900:im=im.crop((0,0,im.width,900))
        im.thumbnail((176,224),Image.Resampling.LANCZOS)
        im=im.quantize(colors=192,method=Image.Quantize.FASTOCTREE)
        buf=io.BytesIO();im.save(buf,format='PNG',optimize=True)
    else:
        im=im.convert('RGB');im.thumbnail((320,240),Image.Resampling.LANCZOS)
        buf=io.BytesIO();im.save(buf,format='JPEG',quality=72,optimize=True,progressive=False)
    data=buf.getvalue();sha=hashlib.sha256(data).hexdigest()
    if sha in hashes:filename=hashes[sha]
    else:p.write_bytes(data);hashes[sha]=filename
    assets[key]=filename;dimensions[filename]=list(im.size)
    audit.append({'id':key,'file':filename,'bytes':len(data),'size':list(im.size)})
    return key
bg=MPK(GAME/'bg.mpk')
for row in bg.entries:
    im=Image.open(io.BytesIO(bg.read(row['id'])))
    key='bg'+str(row['id']);save(im,'b',key);bgNames[str(row['id'])]=row['name']
    name=Path(row['name']).stem
    if name.upper().startswith('EV'):
        group=re.match(r'EV_[A-Z]\d+',name,re.I)
        group=group.group() if group else name
        gallery.setdefault(group,[]).append(key)
print('backgrounds',len(bg.entries),flush=True)
ch=MPK(GAME/'chara.mpk')
for row in ch.entries:
    if not row['name'].lower().endswith('.png'):continue
    source=Image.open(io.BytesIO(ch.read(row['id']))).convert('RGBA');lay=ch.read(row['id']+1)
    n,count=struct.unpack_from('<II',lay);assert 8+n*12+count*16<=len(lay)
    states={}
    for j in range(n):
        ident,start,length=struct.unpack_from('<III',lay,8+j*12)
        assert start+length<=count
        states[ident]=[tuple(round(x) for x in struct.unpack_from('<4f',lay,8+n*12+(start+k)*16)) for k in range(length)]
    faces=sorted({0}|{i&255 for i in states if i>>24==0x20})
    for face in faces:
        layers=[1,0x20000000|face,0x40000000|(face<<8),0x60000000|(face<<8),0x30000000|(face<<8)]
        chunks=[c for layer in layers for c in states.get(layer,[])]
        if not chunks:continue
        x0=min(c[0] for c in chunks);y0=min(c[1] for c in chunks)
        x1=max(c[0]+30 for c in chunks);y1=max(c[1]+30 for c in chunks)
        assert 0<x1-x0<6000 and 0<y1-y0<6000
        canvas=Image.new('RGBA',(x1-x0,y1-y0))
        # MAGES uses the inner 30px of each 32px atlas tile (1px border).
        for x,y,sx,sy in chunks:
            assert 0<=sx and 0<=sy and sx+30<=source.width and sy+30<=source.height
            canvas.paste(source.crop((sx,sy,sx+30,sy+30)),(x-x0,y-y0))
        key='p'+str(row['id'])+'_'+str(face);save(canvas,'p',key)
        portraitMap[str(row['id'])+':'+str(face)]=key
    if row['id']%40==0:print('portraits',row['id'],'/',len(ch.entries),flush=True)
data={'assets':assets,'dimensions':dimensions,'portraits':portraitMap,'backgroundNames':bgNames}
(OUT/'assets.txt').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
groups=[{'image':v[0],'images':v,'label':k} for k,v in sorted(gallery.items())]
(OUT/'gallery.txt').write_text(json.dumps(groups,ensure_ascii=False,separators=(',',':')),'utf8')
(REPORT/'assets.json').write_text(json.dumps({'files':audit,'uniqueFiles':len(hashes),'bytes':sum((IMAGES/f).stat().st_size for f in hashes.values()),'sources':{'bg':len(bg.entries),'chara':len(ch.entries)}},ensure_ascii=False,indent=2),'utf8')
thumb=Image.new('RGB',(960,720),'#152232');d=ImageDraw.Draw(thumb)
examples=[k for k in portraitMap if k.startswith(('0:','44:','126:','178:'))][:20]
for j,k in enumerate(examples):
    im=Image.open(IMAGES/assets[portraitMap[k]]).convert('RGBA');x=(j%5)*192;y=(j//5)*176;im.thumbnail((170,153));thumb.paste(im,(x,y),im);d.text((x,y+154),k,fill='white')
thumb.save(REPORT/'portrait-preview.jpg')
print('ASSETS',len(hashes),'bytes',sum((IMAGES/f).stat().st_size for f in hashes.values()))
