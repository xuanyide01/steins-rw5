"""Compare actual failed/good RPKs and prove the re-chunked game's equivalence."""
from pathlib import Path
from collections import Counter
import json,zipfile,hashlib
ROOT=Path(__file__).resolve().parents[1]
old=ROOT.parents[1]/'outputs/命运石之门-REDMIWatch5-0.2.0-场景重制版.rpk'
new=ROOT/'dist/com.codex.steins2.rw5.debug.0.2.1.rpk'
good=ROOT.parent/'steins-rw5/dist/com.codex.steins.rw5.debug.0.1.4.rpk'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def stats(p):
 with zipfile.ZipFile(p) as z:
  infos=[i for i in z.infolist() if not i.is_dir()]
  return {'version':json.loads(z.read('manifest-watch.json'))['versionName'],'sha256':sha(p),'bytes':p.stat().st_size,'expandedBytes':sum(i.file_size for i in infos),'files':len(infos),'storyFiles':len([i for i in infos if i.filename.startswith('common/story/')]),'compressionMethods':dict(Counter(i.compress_type for i in infos)),'allocation32kEstimate':sum((i.file_size+32767)//32768*32768 for i in infos)}
with zipfile.ZipFile(old) as a,zipfile.ZipFile(new) as b,zipfile.ZipFile(good) as c:
 ga=json.loads(a.read('common/graph.txt'));gb=json.loads(b.read('common/graph.txt'));assert set(ga)==set(gb)
 # Story is the only content changed; manifests, build records and signatures differ.
 assert a.read('pages/index/index.js')==b.read('pages/index/index.js'),'Watch reader/UI executable changed'
 resources=[n for n in a.namelist() if n.startswith('common/') and not n.endswith('/') and n!='common/graph.txt' and not n.startswith('common/story/')]
 for n in resources:assert a.read(n)==b.read(n),n
 assert a.read('common/sg-original.ttf')==c.read('common/sg-original.ttf')
 media=[n for n in resources if n.endswith(('.png','.jpg'))]
 for n in media:
  assert a.read(n)==c.read(n),n
  assert b.getinfo(n).compress_type==zipfile.ZIP_STORED,n
 for k in ga:
  if k!='nodes':assert ga[k]==gb[k],k
 caches=[{},{}]
 def rows(z,cache,node):
  for p in node['chunks']:
   if p['file'] not in cache:cache[p['file']]=json.loads(z.read('common/story/'+p['file']))
   block=cache[p['file']];assert len(block['frames'])==p['count']
   for r in block['frames']:yield [r[0],r[1],block['views'][r[2]],*r[3:]]
 count=0
 for node in ga['nodes']:
  na,nb=ga['nodes'][node],gb['nodes'][node]
  assert {k:v for k,v in na.items() if k!='chunks'}=={k:v for k,v in nb.items() if k!='chunks'},node
  aa=list(rows(a,caches[0],na));bb=list(rows(b,caches[1],nb));assert aa==bb,node;count+=len(aa)
 assert b.testzip() is None
report={'result':'passed','goodPhysicalBaseline':stats(good),'failedPhysicalBaseline':stats(old),'candidate':stats(new),'watchReaderAndUIByteIdenticalTo020':True,'nonStoryCommonResourcesIdenticalTo020':len(resources),'fontByteIdenticalTo014':True,'allImageBytesIdenticalTo014And020':len(media),'allNodeFramesTextDateLayersSourceIdentical':count,'choicesEndingsChapterEntriesAndSaveAddressesIdentical':True,'maximumChunkBytes':max((ROOT/'src/common/story'/n).stat().st_size for n in caches[1]),'physicalInstallationPassed':False,'failureCauseConfirmed':False,'note':'Lower expanded size and file count; PNG/JPEG stored without another ZIP inflate. No device installer log, so the previous failure cause is not proven. Allocation figure assumes 32KB blocks, not measured watch free space.'}
assert report['candidate']['expandedBytes']<report['goodPhysicalBaseline']['expandedBytes']
assert report['candidate']['files']<report['goodPhysicalBaseline']['files']
assert report['candidate']['bytes']<=25000000
(ROOT/'reports/install-revision.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(report,ensure_ascii=False))
