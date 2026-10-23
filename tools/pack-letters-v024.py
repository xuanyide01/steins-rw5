from pathlib import Path
import json,shutil
r=Path(__file__).resolve().parents[1];common=r/'src/common';source=json.loads((r.parent/'steins-rw5/src/common/mail.txt').read_text('utf8'))
dest=common/'letter-packs';dest.mkdir(exist_ok=True);largest=0
for start in range(0,len(source),16):
 text=json.dumps({m['id']:m for m in source[start:start+16]},ensure_ascii=False,separators=(',',':'));largest=max(largest,len(text.encode('utf8')))
 (dest/(str(start//16)+'.txt')).write_text(text,'utf8')
assert largest<16000
# These are deterministic generated mail copies, all retained in the original
# converter and the existing 0.2.3 source snapshot. No user saves are here.
for folder in (common/'letters',common/'mail'):
 assert folder.resolve().is_relative_to((r/'src/common').resolve())
 if folder.exists():
  for p in folder.rglob('*.txt'):p.unlink()
  for p in sorted(folder.rglob('*'),key=lambda x:len(x.parts),reverse=True):
   if p.is_dir():p.rmdir()
  folder.rmdir()
(r/'reports/letter-packs-v024.json').write_text(json.dumps({'letters':len(source),'groups':(len(source)+15)//16,'maximumReadBytes':largest,'sourceRowsPreserved':True},indent=2),'utf8')
print('LETTER_PACKS',len(source),(len(source)+15)//16,largest)
