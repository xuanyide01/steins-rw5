from pathlib import Path
import json
r=Path(__file__).resolve().parents[1];base=r/'src/common';rows=[]
for p in sorted((base/'mobile').rglob('n*.txt')):rows.append((p.stem,json.loads(p.read_text('utf8'))))
dest=base/'mobile-packs';dest.mkdir(exist_ok=True);group={};mapping={};index=0;largest=0
def write():
 global largest
 if not group:return
 text=json.dumps(group,ensure_ascii=False,separators=(',',':'));largest=max(largest,len(text.encode('utf8')));(dest/(str(index)+'.txt')).write_text(text,'utf8')
for node,data in rows:
 probe={**group,node:data}
 if group and len(json.dumps(probe,ensure_ascii=False,separators=(',',':')).encode('utf8'))>16000:write();group={};index+=1
 group[node]=data;mapping[node]=index
write();assert largest<=16000
(base/'mobile-event-map.js').write_text('export const mobileEventFiles='+json.dumps(mapping,separators=(',',':'))+';\n','utf8')
target=(base/'mobile').resolve();assert target.is_relative_to((r/'src/common').resolve())
for p in target.rglob('*.txt'):p.unlink()
for p in sorted(target.rglob('*'),key=lambda x:len(x.parts),reverse=True):
 if p.is_dir():p.rmdir()
target.rmdir()
(r/'reports/mobile-packs-v024.json').write_text(json.dumps({'nodes':len(rows),'groups':index+1,'maximumReadBytes':largest},indent=2),'utf8');print('MOBILE_PACKS',len(rows),index+1,largest)
