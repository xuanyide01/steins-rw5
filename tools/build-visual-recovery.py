"""Compact original scene buffers for migration of 0.1.0/0.1.1 saves."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];states=[];indexes={};sites={}
for route in ['suzuha','faris','luka','mayuri','kurisu','true']:
    r=json.loads((root/'reports'/('recovery-'+route+'.json')).read_text('utf8'));mapping={}
    for i,state in enumerate(r['views']):
        key=json.dumps(state,separators=(',',':'))
        if key not in indexes:indexes[key]=len(states);states.append(state)
        mapping[i]=indexes[key]
    for chapter,cursor,index in r['sites']:sites.setdefault(str(chapter),{}).setdefault(str(cursor),mapping[index])
data={'states':states,'sites':sites}
text=json.dumps(data,separators=(',',':'));(root/'src/common/visual.txt').write_text(text,'utf8')
folder=root/'src/common/visual';folder.mkdir(exist_ok=True)
maximum=0
for chapter,locations in sites.items():
    used=sorted(set(locations.values()));local={index:i for i,index in enumerate(used)}
    block={'states':[states[i] for i in used],'sites':{cursor:local[index] for cursor,index in locations.items()}}
    encoded=json.dumps(block,separators=(',',':'));(folder/(chapter+'.txt')).write_text(encoded,'utf8');maximum=max(maximum,len(encoded.encode()))
archive=root/'asset-backups/visual-full-analysis.json';archive.parent.mkdir(exist_ok=True);archive.write_text(text,'utf8')
(root/'src/common/visual.txt').unlink()
(root/'reports/visual-recovery.json').write_text(json.dumps({'originalGraphicStates':len(states),'textLocations':sum(len(v) for v in sites.values()),'bytes':len(text.encode()),'scope':'Six original ending paths; only BG/CHA display buffers are restored, not story or mail flags'},indent=2),'utf8')
print('visual recovery',len(states),'states',sum(len(v) for v in sites.values()),'locations; max per-scene bytes',maximum)
