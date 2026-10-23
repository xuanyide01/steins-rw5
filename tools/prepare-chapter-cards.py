"""Read original TIT001..012; resize without cropping or redrawing any text."""
from pathlib import Path
import sys,io,json,hashlib,re
from PIL import Image
from mpk import MPK

root=Path(__file__).resolve().parents[1]
game=Path(sys.argv[1]) if len(sys.argv)>1 else Path('G:/SteamLibrary/steamapps/common/STEINS;GATE')
bg=MPK(game/'USRDIR/bg.mpk');dest=root/'src/common/chapters';dest.mkdir(exist_ok=True)
rows=[]
for ident in range(487,499):
 raw=bg.read(ident);im=Image.open(io.BytesIO(raw)).convert('RGBA');source_size=list(im.size)
 canvas=Image.new('RGBA',im.size,'black');canvas.alpha_composite(im)
 canvas.convert('RGB').resize((432,243),Image.Resampling.LANCZOS).save(dest/f'{ident}.png',optimize=True)
 rows.append({'bgId':ident,'source':bg.by_id[ident]['name'],'sourceSize':source_size,'sourceSHA256':hashlib.sha256(raw).hexdigest(),'file':f'common/chapters/{ident}.png','size':[432,243],'sha256':hashlib.sha256((dest/f'{ident}.png').read_bytes()).hexdigest()})
g=json.loads((root/'src/common/graph.txt').read_text('utf8'));starts=[]
for title,entry in g['chapterStarts'].items():
 if title=='序章':continue
 n=int(title[:2]);ident=486+n if n<10 else (496 if '因果关系' in title else 497) if n==10 else 498
 script=root.parent/'steins-probe/disasm-sc'/f'SG{n:02d}_01.scs';s=script.read_text('utf8')
 assert re.search(r'BGload 1, '+str(ident)+r'\b',s),(title,ident)
 assert '$W(1) = 128;' in s and 'CallFarRL 6, 935' in s
 starts.append({'title':title,'bgId':ident,'entry':entry,'script':script.name})
report={'result':'passed','images':rows,'chapterEntries':starts,'prologueStillCard':False,'originalHoldTicks':128,'adaptedHoldMilliseconds':2133,'resizedWithoutCropping':True,'totalBytes':sum(p.stat().st_size for p in dest.glob('*.png'))}
(root/'reports/chapter-cards-v024.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8')
print(json.dumps({'result':'passed','images':len(rows),'chapterEntries':len(starts),'bytes':report['totalBytes']},ensure_ascii=False))
