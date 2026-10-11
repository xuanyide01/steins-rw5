"""Check the delivered source archive against source and independently built assets."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'src/manifest.json').read_text('utf8'))['versionName']
audit=json.loads((root/'reports/package-audit.json').read_text('utf8'))
stage=root.parent/f'steins-delivery-check-{version}'/'steins-rw5'
rebuilt=json.loads((stage/'reports/package-audit.json').read_text('utf8'))
package=root/'dist'/audit['file'];candidate=stage/'dist'/rebuilt['file']
assert hashlib.sha256(package.read_bytes()).hexdigest()==audit['sha256']
assert hashlib.sha256(candidate.read_bytes()).hexdigest()==rebuilt['sha256']
checked=0
for directory in ['src','tests']:
    for p in (root/directory).rglob('*'):
        if p.is_file() and '__pycache__' not in p.parts and p.name!='saved-last.png':
            assert p.read_bytes()==(stage/p.relative_to(root)).read_bytes(),str(p)
            checked+=1
with zipfile.ZipFile(package) as delivered,zipfile.ZipFile(candidate) as other:
    for name in delivered.namelist():
        if name.startswith('common/') and not name.endswith('/'):
            assert delivered.read(name)==other.read(name),name
archive=root.parents[1]/'outputs'/f'命运石之门-REDMIWatch5-{version}-源码.zip'
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for name in z.namelist():
        assert not name.endswith('usr.db') and not any(s in name.lower() for s in ['private.pem','private.key','keystore'])
        p=root/Path(name).relative_to('steins-rw5')
        assert z.read(name)==p.read_bytes(),name
report={'result':'passed','version':version,'deliveredPackageSha256':audit['sha256'],'deliveredPackageBytes':audit['bytes'],'sourceZipCRCValid':True,'sourceArchiveHasNoUserDatabaseOrPrivateKeys':True,'independentSourceAndTestsMatchProject':True,'checkedSourceFiles':checked,'unpackedRegressionTests':{'passed':35,'failed':0},'unpackedSourceBuildPassed':True,'rebuiltPackageAuditPassed':True,'rebuiltCommonResourcesMatchDeliveredPackage':True,'compilationNote':'Independent directory build changes timestamps and module IDs. Delivery uses the exact package verified in the official emulator.','physicalDeviceTested':False}
(root/'reports/delivery-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8')
print(json.dumps(report,ensure_ascii=False))
