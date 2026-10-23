from pathlib import Path
import zipfile,json,hashlib
root=Path(__file__).resolve().parents[1]
baseline=root.parents[1]/'outputs/命运石之门-REDMIWatch5-0.2.2-资源安装修订.bin'
candidate=root/'dist/com.codex.steins2.rw5.debug.0.2.3.rpk'
with zipfile.ZipFile(baseline) as old,zipfile.ZipFile(candidate) as new:
 names=[n for n in old.namelist() if n.startswith(('common/story/','common/i/')) and not n.endswith('/')]
 names += ['common/graph.txt','common/sg-original.ttf','common/gallery.txt','common/title_bg.png','common/logo.png']
 # Check every existing image regardless of its directory naming convention.
 names += [n for n in old.namelist() if n.endswith(('.png','.jpg'))]
 for n in set(names): assert old.read(n)==new.read(n),n
 graph=json.loads(new.read('common/graph.txt'))
 before=root/'reports/before-v023/src/pages/index/index.ux'
 a=before.read_text('utf8');b=(root/'src/pages/index/index.ux').read_text('utf8')
 # The bounded, asynchronous block reader is unchanged.
 def reader(s):return s[s.index('  readChapter('):s.index('  renderFrame(')]
 assert reader(a)==reader(b),'Chunk reader changed'
 report={'result':'passed','sha256':hashlib.sha256(candidate.read_bytes()).hexdigest(),'baselineVersion':'0.2.2','unchangedFiles':len(set(names)),'unchangedGraph':True,'unchangedSingleChunkReader':True,'nodes':len(graph['nodes']),'edges':sum(len(n.get('choice',{}).get('items',[])) for n in graph['nodes'].values()),'nodeFrames':sum(n['count'] for n in graph['nodes'].values()),'addedMailFiles':len([n for n in new.namelist() if n.startswith('common/mail/') and n.endswith('.txt')]),'packageGrowthBytes':candidate.stat().st_size-baseline.stat().st_size}
(root/'reports/features-v023-equivalence.json').write_text(json.dumps(report,indent=2)+'\n','utf8')
print(json.dumps(report))
