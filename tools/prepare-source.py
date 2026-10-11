from pathlib import Path
import os,json,shutil
from mpk import MPK
root=Path(__file__).resolve().parents[1];probe=root.parent/'steins-probe';(probe/'scripts').mkdir(parents=True,exist_ok=True)
original=Path(os.environ['STEINS_GAME_ROOT'])/'USRDIR';archive=MPK(original/'script.mpk');shutil.copyfile(original/'script.mpk',probe/'script.mpk')
for row in archive.entries:
 name=Path(row['name']).name
 if name!=row['name']:raise ValueError('Unexpected archive path')
 (probe/'scripts'/name).write_bytes(archive.read(row['id']))
indexes={}
for kind in ['bg','chara','system']:
 archive=MPK(original/(kind+'.mpk'));indexes[kind]=archive.entries
 if kind=='system':
  for row in archive.entries:
   if row['name'] in ['FONT.PNG','FONT2.PNG','TITLE_CHIP.DDS']:(probe/row['name']).write_bytes(archive.read(row['id']))
(probe/'indexes.json').write_text(json.dumps(indexes,ensure_ascii=False,indent=2),'utf8')
print('Extracted original scripts and font/title resources read-only',probe)
