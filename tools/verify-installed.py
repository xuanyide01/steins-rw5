from pathlib import Path
import json,hashlib,zipfile,subprocess
root=Path(__file__).resolve().parents[1];m=json.loads((root/'src/manifest.json').read_text('utf8'))
p=root/'dist'/f'{m["package"]}.debug.{m["versionName"]}.rpk';adb=root.parent/'starry-rw5/node_modules/@miwt/adb/bin/win/adb.exe'
dest=root/'reports/installed';dest.mkdir(exist_ok=True);checked=[]
with zipfile.ZipFile(p) as z:
 graph=json.loads(z.read('common/graph.txt'));first=graph['nodes'][graph['initial']]['chunks'][0]['file']
 for name in ['pages/index/index.js','manifest-watch.json','common/graph.txt','common/story/'+first,'common/sg-original.ttf','common/logo.png','common/title-piano.wav','common/title-machine/atlas00.png','common/title-machine/atlas74.png','common/opening/000.jpg','common/opening/171.jpg','common/opening/op.mp3']:
  local=dest/name;local.parent.mkdir(parents=True,exist_ok=True)
  subprocess.run([str(adb),'-s','emulator-5556','pull','/data/app/'+m['package']+'/'+name,str(local)],capture_output=True,check=True,timeout=30)
  assert local.read_bytes()==z.read(name),name
  checked.append(name)
report={'result':'passed','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'installedFilesMatchPackage':checked}
(root/'reports/installed-package.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps(report))
