"""Prune only unreachable images; bound directory sizes and resource path lengths.

The complete previous src tree is preserved before replacing it. No game,
frame, save position, image pixels or font are changed.
"""
from pathlib import Path
import json,re,shutil
root=Path(__file__).resolve().parents[1]
src=root/'src'
backup=root/'reports/install-v021-source'
stage=root/'reports/install-v022-stage'
for p in (src,backup,stage):
    assert p.resolve().is_relative_to(root.resolve()),p
assert not backup.exists() and not stage.exists(),'Refusing to replace an existing checkpoint'
shutil.copytree(src,stage)
common=stage/'common'
assets_source=(common/'assets.js').read_text('utf8')
assets=json.loads(re.search(r'const assets=(.*?);',assets_source).group(1))
aliases=json.loads(re.search(r'const galleryImages=(.*?);',assets_source).group(1))
ids=set()
graph=json.loads((common/'graph.txt').read_text('utf8'))
story_names=sorted({c['file'] for n in graph['nodes'].values() for c in n['chunks']})
for name in story_names:
    for view in json.loads((common/'story'/name).read_text('utf8'))['views']:
        ids.update(layer[0] for layer in view)
for group in json.loads((common/'gallery.txt').read_text('utf8')):
    ids.update(aliases.get(name,name) for name in group['images'])
assert not(ids-set(assets)-{'black','white'})
required={assets[name] for name in ids if name not in ('black','white')}
image_names=sorted(required)
file_map={}
for i,name in enumerate(image_names):
    new=f'{i//48:02d}/{i%48:02d}{Path(name).suffix}'
    file_map[name]=new
    p=common/'images'/new;p.parent.mkdir(exist_ok=True)
    shutil.copyfile(common/'images'/name,p)
old_images=list((common/'images').glob('*.*'))
removed=[{'file':p.name,'bytes':p.stat().st_size} for p in old_images if p.name not in required]
for p in old_images:p.unlink()  # Stage-only files; complete src is still untouched.
new_assets={key:file_map[assets[key]] for key in assets if key in ids and key not in ('black','white')}
assets_source=re.sub(r'const assets=.*?;',lambda _:'const assets='+json.dumps(new_assets,separators=(',',':'))+';',assets_source,count=1)
(common/'assets.js').write_text(assets_source,'utf8')
story_map={}
for i,name in enumerate(story_names):
    new=f'{i//48:02d}/{i%48:02d}.txt'
    story_map[name]=new
    p=common/'story'/new;p.parent.mkdir(exist_ok=True)
    shutil.copyfile(common/'story'/name,p)
for p in (common/'story').glob('*.txt'):p.unlink()
for n in graph['nodes'].values():
    for c in n['chunks']:c['file']=story_map[c['file']]
(common/'graph.txt').write_text(json.dumps(graph,ensure_ascii=False,separators=(',',':')),'utf8')
for name in ('manifest.json','config-watch.json'):
    p=stage/name;m=json.loads(p.read_text('utf8'));m.update(versionName='0.2.2',versionCode=4)
    assert m['package']=='com.codex.steins2.rw5'
    p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n','utf8')
report={'previousVersion':'0.2.1','version':'0.2.2','samePackageIdentity':True,
        'unchangedImageFiles':len(file_map),'removedUnreferencedImages':removed,
        'removedImageBytes':sum(x['bytes'] for x in removed),'imagePathMap':file_map,
        'storyPathMap':story_map,'maximumAssetsPerDirectory':48,
        'physicalInstallationPassed':False}
(root/'reports/install-resource-map.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8')
# Both resolved targets were checked above and remain inside this project.
src.rename(backup);stage.rename(src)
p=root/'package.json';m=json.loads(p.read_text('utf8'));m['version']='0.2.2';p.write_text(json.dumps(m,indent=2)+'\n','utf8')
print(json.dumps({k:v for k,v in report.items() if k not in ('removedUnreferencedImages','imagePathMap','storyPathMap')},ensure_ascii=False))
