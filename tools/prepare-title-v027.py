from pathlib import Path
from PIL import Image
import json,hashlib,shutil
r=Path(__file__).resolve().parents[1];frames=sorted((r/'artwork/v027/original-frames').glob('frame*.png'));assert len(frames)==299
boxes=[]
for p in frames:
 with Image.open(p) as im:boxes.append(im.getchannel('A').getbbox())
box=(max(0,min(b[0] for b in boxes)-8),max(0,min(b[1] for b in boxes)-8),min(1280,max(b[2] for b in boxes)+8),min(720,max(b[3] for b in boxes)+8))
dest=r/'src/common/title-machine';dest.mkdir(exist_ok=True);backup=r/'reports/v027-39frame-assets';backup.mkdir(exist_ok=True)
for p in dest.glob('*.png'):
 assert p.resolve().parent==dest.resolve()
 if not (backup/p.name).exists():shutil.copyfile(p,backup/p.name)
 p.unlink()
rows=[]
for start in range(0,299,4):
 atlas=Image.new('RGBA',(640,160))
 for offset,p in enumerate(frames[start:start+4]):
  with Image.open(p) as original:im=original.convert('RGBA').crop(box)
  im.thumbnail((160,160),Image.Resampling.LANCZOS);atlas.alpha_composite(im,(offset*160+(160-im.width)//2,(160-im.height)//2))
 f=dest/f'atlas{start//4:02d}.png';atlas.quantize(colors=192,method=Image.Quantize.FASTOCTREE).save(f,optimize=True)
 rows.append({'file':f.name,'firstFrame':start,'frameCount':min(4,299-start),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
report={'result':'passed','source':'Steam USRDIR/movie/1280x720/title.bk2 (original alpha movie)','sourceFrames':299,'sourceSize':[1280,720],'readOnlySource':True,'sampledFrames':299,'sourceFPS':10000000/333333,'sharedCrop':box,'frameSize':[160,160],'atlasSize':[640,160],'atlasCount':len(rows),'framesPerAtlas':4,'paletteColors':192,'cycleMilliseconds':299*333333/10000,'totalPNGBytes':sum(x['bytes'] for x in rows),'oneDecodedRGBAAtlasBytes':640*160*4,'allAtlasesRGBAUpperBoundWithoutOtherOverhead':len(rows)*640*160*4,'runtime':'One clipped image and one title-only timer at source frame interval; native cache may use additional memory. No animation work in story.','frames':rows}
(r/'reports/title-animation-v027.json').write_text(json.dumps(report,indent=2),'utf8');print(json.dumps({k:v for k,v in report.items() if k!='frames'}))
