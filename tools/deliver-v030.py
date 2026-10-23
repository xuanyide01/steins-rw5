from pathlib import Path
import json,zipfile,hashlib,shutil,re
r=Path(__file__).resolve().parents[1];out=r.parents[1]/'outputs';read=lambda p:json.loads((r/p).read_text('utf8'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
a=read('reports/package-audit.json');proof=read('reports/final-v030-proof.json');n=read('native-test-results/v030/report.json');i=read('reports/installed-package.json')
assert a['version']=='0.3.0' and a['sha256']==proof['sha256']==n['sha256']==i['sha256'];assert proof['result']==n['result']=='passed'
t=(r/'reports/tests-v030.log').read_text('utf8');assert 'tests 50' in t and 'pass 50' in t and 'fail 0' in t
p=r/'dist'/a['file'];assert sha(p)==a['sha256'];prefix='命运石之门-REDMIWatch5-0.3.0-音频防护与12帧OP';paths=[]
for ext in ['bin','rpk']:
 d=out/(prefix+'.'+ext);shutil.copyfile(p,d);paths.append(d)
for source,suffix in [('README.md','-说明.md'),('WORLDLINES.md','-世界线核对表.md'),('native-test-results/v030/opening-35s.png','-OP预览.png')]:
 d=out/(prefix+suffix);shutil.copyfile(r/source,d);paths.append(d)
d=out/(prefix+'-检查报告.json');d.write_text(json.dumps({'version':'0.3.0','package':a,'verification':proof,'installed':i,'behaviorTests':50,'standaloneVideoExported':False},ensure_ascii=False,indent=2),'utf8');paths.append(d)
files=[r/x for x in ['README.md','WORLDLINES.md','PERFORMANCE.md','HARDWARE_TEST.json','LICENSE','THIRD_PARTY_NOTICES.md','package.json','quickapp.config.js','.gitignore','artwork/v028/source.json']]
for folder in ['src','tools','tests']:
 for f in (r/folder).rglob('*'):
  if not f.is_file() or any(x in {'node_modules','__pycache__','sign'} for x in f.parts) or f.suffix in {'.pem','.key','.db','.log'}:continue
  if folder=='tools' and f.parent==r/'tools':
   if f.name.startswith(('deliver','native-','check-final','update-','ui-v','export-opening-','docs-v','compare-opening-','benchmark-opening-','install-sdk-','prepare-opening-')) and 'v030' not in f.name:continue
   if f.name in {'finalize-docs.py','rewrite-ui.py'}:continue
  files.append(f)
for name in ['package-audit','final-v030-proof','media-v030-source','installed-package','graph-v028-validation','sdk-install-space-v030','worldline-v026-proof','key-phone-v025-proof','opening-v030-comparison']:
 files.append(r/'reports'/(name+'.json'))
files.extend(r/'native-test-results/v030'/x for x in ['report.json','preparation.json','extra-audio.json','memory-loops.json'])
pattern=re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b')
for f in files:
 try:assert not pattern.search(f.read_text('utf8')),str(f)
 except UnicodeDecodeError:pass
archive=out/(prefix+'-源码.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for f in sorted(set(files)):z.write(f,f.relative_to(r).as_posix())
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for name in z.namelist():assert z.read(name)==(r/name).read_bytes()
paths.append(archive);assert all(p.stat().st_size<=25000000 for p in paths),[(p.name,p.stat().st_size) for p in paths]
(out/(prefix+'-SHA256.txt')).write_text(''.join(sha(p)+'  '+p.name+'\n' for p in paths),'utf8')
print(json.dumps({'result':'passed','version':'0.3.0','binBytes':a['bytes'],'sha256':a['sha256'],'sourceBytes':archive.stat().st_size,'sourceFiles':len(set(files)),'standaloneVideoExported':False,'outputs':[p.name for p in paths]},ensure_ascii=False))
