"""Retain original outlines; correct half-width punctuation advances and aliases."""
from pathlib import Path
import json
from PIL import Image
from fontTools.ttLib import TTFont
r=Path(__file__).resolve().parents[1];font=TTFont(r/'reports/before-v024/src/common/sg-original.ttf');atlas=Image.open(r.parent/'steins-probe/FONT.PNG')
prefix=json.loads((r.parent/'steins-rw5/tools/font-ascii-prefix.json').read_text('utf8'))
for i in range(64,100):
 key='g'+str(i)
 if key not in font['hmtx'].metrics:continue
 box=atlas.crop((i%64*48,i//64*48,(i%64+1)*48,(i//64+1)*48)).getchannel('A').getbbox()
 if box:font['hmtx'].metrics[key]=(max(240,(box[2]+2)*20),font['hmtx'].metrics[key][1])
punct={190:'、',191:'。',192:'，',193:'．',194:'：',195:'；',196:'？',197:'！',200:'‘',201:'’',202:'“',203:'”',204:'（',205:'）',206:'〔',207:'〕',208:'［',209:'］',210:'｛',211:'｝',212:'〈',213:'〉',214:'《',215:'》',216:'「',217:'」',218:'『',219:'』',220:'【',221:'】',222:'＜',223:'＞',226:'・',227:'…',228:'～',229:'ー',230:'♪',231:'─'}
aliases={}
for i,ch in enumerate(prefix):
 if i<100 and 'g'+str(i) in font['hmtx'].metrics:aliases[ord(ch)]='g'+str(i)
for i,ch in punct.items():
 if 'g'+str(i) in font['hmtx'].metrics:aliases[ord(ch)]='g'+str(i)
aliases[ord('·')]='g226'
for table in font['cmap'].tables:
 if table.isUnicode():table.cmap.update(aliases)
font.save(r/'src/common/sg-original.ttf')
cmap=font.getBestCmap();metrics=font['hmtx'].metrics
widths={str(cp-0xe000):metrics[key][0]/960 for cp,key in cmap.items() if 0xe000<=cp<0xf200 and metrics[key][0]!=960}
ascii_widths={chr(cp):metrics[key][0]/960 for cp,key in cmap.items() if 32<=cp<127}
unicode_widths={chr(cp):metrics[key][0]/960 for cp,key in cmap.items() if 127<=cp<0xe000}
(r/'src/common/glyph-widths.js').write_text('export const glyphWidths='+json.dumps(widths,separators=(',',':'))+';\nexport const asciiWidths='+json.dumps(ascii_widths,separators=(',',':'))+';\nexport const unicodeWidths='+json.dumps(unicode_widths,separators=(',',':'))+';\n','utf8')
(r/'reports/text-font-v025.json').write_text(json.dumps({'originalOutlinesPreserved':True,'halfWidthPunctuationIds':[64,99],'unicodePunctuationAliases':len(punct),'fontBytes':(r/'src/common/sg-original.ttf').stat().st_size},indent=2),'utf8')
