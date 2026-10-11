from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1];a=json.loads((root/'src/common/assets.txt').read_text('utf8'));groups={}
for n,name in a['backgroundNames'].items():
 m=re.match(r'EV_[A-Z]\d+',name,re.I)
 if m:groups.setdefault(m.group(),[]).append('bg'+n)
rows=[{'image':v[0],'images':v,'label':k} for k,v in groups.items()]
(root/'src/common/gallery.txt').write_text(json.dumps(rows,separators=(',',':')),'utf8');print('CG',len(rows),'groups',sum(len(x['images']) for x in rows),'images')
