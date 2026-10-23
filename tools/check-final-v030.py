from pathlib import Path
from PIL import Image,ImageStat,ImageChops
import hashlib,json,zipfile,wave,io
r=Path(__file__).resolve().parents[1];read=lambda p:json.loads((r/p).read_text('utf8'));a=read('reports/package-audit.json');n=read('native-test-results/v030/report.json');m=read('native-test-results/v030/memory-loops.json');s=read('reports/media-v030-source.json');i=read('reports/installed-package.json');e=read('native-test-results/v030/extra-audio.json')
assert a['version']=='0.3.0' and a['sha256']==n['sha256']==m['sha256']==i['sha256']==e['sha256']
assert n['result']==m['result']==e['result']=='passed' and n['coldStart'] and n['slotsRestored']==[1,30,23]
assert n['extraTapReturnsWithoutChangingStory'] and n['extraNaturalReturnsWithoutChangingStory']
assert len(m['guardedStops'])>=2 and m['noNaturalEOFObserved'] and m['noAppRestartOrPanic'] and m['titleAnimationResumed']
assert s['openingFrames']==1375 and sum(x['count'] for x in s['frames'])==1375
same=[];changed=[];before=r/'reports/before-v030/src/common'
for f in before.rglob('*'):
 if not f.is_file():continue
 rel=f.relative_to(before)
 if rel.parts[0]=='opening' or rel.name=='title-piano.mp3':continue
 if f.read_bytes()==(r/'src/common'/rel).read_bytes():same.append(rel.as_posix())
 else:changed.append(rel.as_posix())
assert sorted(changed)==['opening.js','title-music.js'],changed
with zipfile.ZipFile(r/'dist'/a['file']) as z:
 assert 'common/title-piano.mp3' not in z.namelist()
 for f in s['frames']:assert hashlib.sha256(z.read('common/opening/'+f['file'])).hexdigest()==f['sha256']
 assert hashlib.sha256(z.read(s['titleAudio']['file'])).hexdigest()==s['titleAudio']['sha256']
 with wave.open(io.BytesIO(z.read(s['titleAudio']['file']))) as w:assert w.getframerate()==8000 and w.getsampwidth()==2 and w.getnchannels()==1 and 234<w.getnframes()/8000<235
shots=[]
for name in ['opening-muted','opening-10s','opening-35s','opening-65s','opening-95s']:
 im=Image.open(r/'native-test-results/v030'/f'{name}.png').convert('RGB');assert im.size==(432,514)
 for box in [(0,0,432,149),(0,365,432,514),(0,149,24,365),(408,149,432,365)]:assert max(v[1] for v in im.crop(box).getextrema())==0,(name,box)
 shots.append(name)
card=Image.open(r/'src/common/chapters/487.png').convert('RGB');cards=[]
for name in ['opening-skipped-chapter-card','opening-ended-chapter-card']:
 im=Image.open(r/'native-test-results/v030'/f'{name}.png').convert('RGB');error=min(sum(ImageStat.Stat(ImageChops.difference(card,im.crop((0,y,432,y+243)))).mean)/3 for y in [135,136]);assert error<4;cards.append({'file':name,'meanRGBError':error})
data={'result':'passed','version':'0.3.0','sha256':a['sha256'],'unchangedCommonFilesExcludingMedia':len(same),'changedPriorModules':changed,'storyGraphImagesFontsWorldlinesMailAndTitleFramesUnchanged':True,'routeEvidenceReused':read('reports/graph-v028-validation.json'),'media':s,'memoryAndTitleLoops':m,'native':n,'extraAudio':e,'centeredOpeningWithoutUI':shots,'chapter1CardPixels':cards,'sdkInstallSpace':read('reports/sdk-install-space-v030.json'),'openingComparison':read('reports/opening-v030-comparison.json'),'standaloneVideoExported':False,'physicalDeviceTested':False,'realWatchRootCauseProven':False}
(r/'reports/final-v030-proof.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),'utf8');print(json.dumps({'result':'passed','sha256':a['sha256'],'unchangedCommonFiles':len(same)}))
