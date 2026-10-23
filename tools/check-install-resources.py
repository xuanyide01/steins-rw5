from pathlib import Path
from collections import Counter
import zipfile,json,re,hashlib
from rpk_signature import audit
root=Path(__file__).resolve().parents[1]
baseline=root.parents[1]/'outputs/命运石之门-REDMIWatch5-0.2.1-安装兼容修订.bin'
candidate=root/'dist/com.codex.steins2.rw5.debug.0.2.2.rpk'
mapping=json.loads((root/'reports/install-resource-map.json').read_text('utf8'))
def asset_map(p):
    return json.loads(re.search(rb'const assets=(.*?);',p).group(1))
with zipfile.ZipFile(baseline) as old,zipfile.ZipFile(candidate) as new:
    ga=json.loads(old.read('common/graph.txt'));gb=json.loads(new.read('common/graph.txt'))
    for n in ga['nodes']:
        for c in ga['nodes'][n]['chunks']:c['file']=mapping['storyPathMap'][c['file']]
    assert ga==gb,'Only physical paths may change in the graph'
    for a,b in mapping['storyPathMap'].items():
        assert old.read('common/story/'+a)==new.read('common/story/'+b),a
    used=set()
    for name in mapping['storyPathMap'].values():
        block=json.loads(new.read('common/story/'+name))
        for view in block['views']:
            used.update(layer[0] for layer in view)
    assets=asset_map((root/'src/common/assets.js').read_bytes())
    original_assets=asset_map((root/'reports/install-v021-source/common/assets.js').read_bytes())
    for key in assets:
        assert old.read('common/images/'+original_assets[key])==new.read('common/images/'+assets[key]),key
    assert used-set(assets)<= {'black','white'}
    for name in ['common/gallery.txt','common/sg-original.ttf','common/logo.png','common/title_bg.png']:
        assert old.read(name)==new.read(name),name
    for info in old.infolist():
        if info.filename.startswith('common/mail/') and not info.is_dir():
            assert old.read(info.filename)==new.read(info.filename)
    for name in ['common/engine.js','common/progress.js','common/saves.js','pages/index/index.ux']:
        assert (root/'src'/name).read_bytes()==(root/'reports/install-v021-source'/name).read_bytes(),name
    assert json.loads(new.read('manifest.json'))['versionCode']>3
    infos=[i for i in new.infolist() if not i.is_dir()]
    assert all(i.compress_type==8 for i in infos)
    counts=Counter(str(Path(i.filename).parent) for i in infos)
    assert max(counts.values())<=48
    rows=sum(n['count'] for n in gb['nodes'].values())
    assert rows==134334
report={**audit(candidate),'result':'passed','baselineSha256':hashlib.sha256(baseline.read_bytes()).hexdigest(),
        'unchangedNodeFrames':rows,'unchangedUniqueStoryBlocks':len(mapping['storyPathMap']),
        'unchangedReferencedImageBytes':len(mapping['imagePathMap']),
        'removedOnlyUnreferencedImages':len(mapping['removedUnreferencedImages']),
        'removedBytes':mapping['removedImageBytes'],'maximumFilesInOneDirectory':max(counts.values()),
        'maxInternalPathBytes':max(len(i.filename.encode()) for i in infos),
        'unchangedReaderUiSource':True,'unchangedSaveAddressesAndKeys':True,
        'unchangedCriticalChoicesAndEndings':True,'unchangedFontAndIcon':True,
        'physicalInstallationPassed':False,
        'P1PhysicalInstallationPassed':True,
        'limitations':'Physical full-package installation must still be tested. P1 proves the identity/icon/minimal app works; it does not distinguish exact resource-volume, path, installer allocation or payload-specific cause.'}
(root/'reports/install-v022-equivalence.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8')
print(json.dumps(report,ensure_ascii=False))
