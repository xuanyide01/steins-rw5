from pathlib import Path
import json,io,zipfile,re,sys
from PIL import Image
from fontTools.ttLib import TTFont
from rpk_signature import audit
root=Path(__file__).resolve().parents[1];m=json.loads((root/'src/manifest.json').read_text('utf8'));p=root/'dist'/f'{m["package"]}.debug.{m["versionName"]}.rpk';r=audit(p);assert r['bytes']<=25000000
z=zipfile.ZipFile(p);assert json.loads(z.read('manifest-watch.json'))==m;assert m['name']=='命运石之门';images=0
for name in z.namelist():
 if name.endswith('/'):continue
 if name.startswith('common/'):
  assert z.read(name)==(root/'src'/name).read_bytes(),name
 if name.endswith(('.png','.jpg')):
  im=Image.open(io.BytesIO(z.read(name)));im.load();images+=1
  assert (im.size==(640,160) if name.startswith('common/title-machine/atlas') else im.size==(768,216) if name.startswith('common/opening/') else im.width<=432 and im.height<=288),(name,im.size)
icon=Image.open(io.BytesIO(z.read('common/logo.png')));assert icon.size==(192,192) and icon.mode=='RGBA';assert all(icon.getpixel(q)[3]==0 for q in [(0,0),(191,0),(0,191),(191,191)])
font=TTFont(io.BytesIO(z.read('common/sg-original.ttf'))).getBestCmap();default=TTFont(Path(sys.argv[1]) if len(sys.argv)>1 else root.parent/'clannad-probe/native-default-font.ttf').getBestCmap();strings=[]
def visit(v):
 if isinstance(v,str):strings.append(v)
 elif isinstance(v,list):
  for x in v:visit(x)
 elif isinstance(v,dict):
  for x in v.values():visit(x)
for n in z.namelist():
 if n.startswith('common/') and n.endswith('.txt'):visit(json.loads(z.read(n)))
for s in strings:
 cmap=font if re.search('[\ue000-\uf1ff]',s) else default
 assert all(c.isspace() or ord(c)<32 or ord(c) in cmap for c in s),repr(s)
rows=json.loads((root/'src/common/gallery.txt').read_text('utf8'));r.update({'maximumPackageBytes':25000000,'compatibilityTailRemainder':p.stat().st_size%16,'commonFilesMatchSource':True,'decodedImages':images,'fontCoverageStrings':len(strings),'circularRGBAIcon':True,'galleryGroups':len(rows),'galleryImages':sum(len(x['images']) for x in rows),'physicalDeviceTested':False})
(root/'reports/package-audit.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),'utf8');print(json.dumps(r,ensure_ascii=False))
