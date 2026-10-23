from pathlib import Path
import subprocess,hashlib,json,urllib.request,urllib.parse
r=Path(__file__).resolve().parents[1];adb=r.parent/'starry-rw5/node_modules/@miwt/adb/bin/win/adb.exe';backup=r/'reports/sdk-font-install-backup-v030';backup.mkdir(exist_ok=True)
def run(*args):return subprocess.run([str(adb),'-s','emulator-5556',*args],capture_output=True,check=True,timeout=150).stdout.decode('utf8','replace')
run('wait-for-device');font=backup/'simkai.ttf';run('pull','/data/font/simkai.ttf',str(font))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
expected='9dd76f7ab430edd091db24c3f18e71410325c1414141aad5fe67947873ffba06';assert sha(font)==expected
before=run('shell','df');restored=False;result='failed';p=r/'dist/com.codex.steins2.rw5.debug.0.3.0.rpk'
try:
 run('shell','rm','/data/font/simkai.ttf')
 req='http://127.0.0.1:43140/install?rpk='+urllib.parse.quote(str(p))
 data=urllib.request.urlopen(req,timeout=240).read();assert b'success 0' in data,data;result='passed'
finally:
 run('push',str(font),'/data/font/simkai.ttf');check=backup/'verified-restore.ttf';run('pull','/data/font/simkai.ttf',str(check));assert sha(check)==expected;restored=True
 (r/'reports/sdk-install-space-v030.json').write_text(json.dumps({'result':result,'packageSHA256':sha(p),'beforeDF':before,'afterDF':run('shell','df'),'temporarySDKFontBackupRestored':restored,'fontSHA256':expected,'realWatchModified':False},indent=2),'utf8')
print('Installed exact 0.3.0; temporary SDK font fully restored')
