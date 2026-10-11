from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];p=root/'src/common/assets.txt'
a=json.loads(p.read_text('utf8'));count=0
for key,asset in list(a['portraits'].items()):
    file,face=map(int,key.split(':'))
    if face!=0 or str(file)+':1' not in a['portraits']:continue
    if a['portraitGeometry'].get(asset,{}).get('faceLayer',True):continue
    a['portraits'][key]=a['portraits'][str(file)+':1'];a['assets'].pop(asset,None);a['portraitGeometry'].pop(asset,None);count+=1
p.write_text(json.dumps(a,ensure_ascii=False,separators=(',',':')),'utf8')
print('default complete faces',count)
