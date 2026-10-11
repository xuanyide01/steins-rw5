"""Vectorize the installed game's glyph atlas. Original game license applies.
This is a private-use glyph encoding, NOT a recovered Unicode transcription.
"""
from pathlib import Path
import sys,json,hashlib
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from sc3_text import strings,BASE

ROOT=Path(__file__).resolve().parents[1]
PROBE=ROOT.parent/'steins-probe'
OUT=ROOT/'src/common';OUT.mkdir(parents=True,exist_ok=True)
REPORT=ROOT/'reports';REPORT.mkdir(exist_ok=True)
used=set(); decoded={};counts=0
for path in sorted((PROBE/'scripts').glob('*.SCX')):
    rows=strings(path.read_bytes()); decoded[path.stem]=rows;counts+=len(rows)
    for row in rows:used.update(row['glyphs'])
atlas=Image.open(PROBE/'FONT.PNG').convert('RGBA')
assert atlas.size==(3072,3456)
fb=FontBuilder(960,isTTF=True);order=['.notdef']+['g'+str(i) for i in sorted(used)]
fb.setupGlyphOrder(order);glyphs={};metrics={};empty=[]
pen=TTGlyphPen(None);glyphs['.notdef']=pen.glyph();metrics['.notdef']=(960,0)
for i in sorted(used):
    tile=atlas.crop(((i%64)*48,(i//64)*48,(i%64+1)*48,(i//64+1)*48))
    alpha=np.asarray(tile.getchannel('A'))
    # Upsampling before tracing retains anti-aliased boundaries at the source size.
    mask=(cv2.resize(alpha,None,fx=4,fy=4,interpolation=cv2.INTER_CUBIC)>=112).astype('uint8')*255
    contours,hierarchy=cv2.findContours(mask,cv2.RETR_TREE,cv2.CHAIN_APPROX_SIMPLE)
    pen=TTGlyphPen(None)
    for contour in contours:
        # Half a source pixel, a quarter pixel at 24px: bound font complexity.
        points=cv2.approxPolyDP(contour,2.0,True).reshape(-1,2)
        if len(points)<3:continue
        pts=[(int(x)*5,800-int(y)*5) for x,y in points]
        pen.moveTo(pts[0])
        for p in pts[1:]:pen.lineTo(p)
        pen.closePath()
    key='g'+str(i);glyphs[key]=pen.glyph();metrics[key]=(960,0)
    # Both western alphabets retain PUA IDs for old saves, with natural width.
    if 1<=i<=62 or 128<=i<=189:
        box=tile.getchannel('A').getbbox()
        if box:metrics[key]=(max(240,(box[2]+2)*20),0)
    elif i in (0,63):metrics[key]=(320,0)
    if not contours:empty.append(i)
cmap={BASE+i:'g'+str(i) for i in used}
prefix=json.loads((ROOT/'tools/font-ascii-prefix.json').read_text('utf8'))
for i,ch in enumerate(prefix):
    if i in used and (32<=ord(ch)<127 or ch=='…'):cmap[ord(ch)]='g'+str(i)
fb.setupCharacterMap(cmap)
fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=800,descent=-160)
fb.setupNameTable({'familyName':'SGOriginalGlyphs','styleName':'Regular','uniqueFontIdentifier':'SGOriginalGlyphs-1','fullName':'SG Original Glyphs','psName':'SGOriginalGlyphs'})
fb.setupOS2(sTypoAscender=800,sTypoDescender=-160,usWinAscent=800,usWinDescent=160)
fb.setupPost();fb.setupMaxp();font=OUT/'sg-original.ttf';fb.save(font)
assert {BASE+i for i in used}.issubset(TTFont(font).getBestCmap())
(PROBE/'decoded-glyphs.json').write_text(json.dumps(decoded,ensure_ascii=False,separators=(',',':')),'utf8')
advances={str(i):metrics['g'+str(i)][0]/960 for i in used if metrics['g'+str(i)][0]!=960}
ascii_widths={chr(code):metrics[glyph][0]/960 for code,glyph in cmap.items() if 32<=code<127}
(OUT/'glyph-widths.js').write_text('export const glyphWidths='+json.dumps(advances,separators=(',',':'))+';\nexport const asciiWidths='+json.dumps(ascii_widths,separators=(',',':'))+';\n','utf8')
report={'encoding':'private-use U+E000 + original SC3 glyph ID','notUnicodeTranscription':True,'outlineToleranceSourcePixels':0.5,'westernProportional':True,'scriptFiles':len(decoded),'strings':counts,'glyphs':len(used),'emptyGlyphs':empty,'fontBytes':font.stat().st_size,'sourceAtlasSHA256':hashlib.sha256((PROBE/'FONT.PNG').read_bytes()).hexdigest()}
(REPORT/'original-font.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8')
preview=Image.new('RGB',(960,640),'#0b1420');draw=ImageDraw.Draw(preview);f=ImageFont.truetype(str(font),30)
for n,row in enumerate(decoded['SG00_01'][:7]):
    text=row['speaker']+' '+row['text'];text='\n'.join(text[i:i+28] for i in range(0,len(text),28))
    draw.multiline_text((24,10+n*86),text,font=f,fill='white',spacing=3)
preview.save(REPORT/'original-font-preview.png')
print(json.dumps(report,ensure_ascii=False))
