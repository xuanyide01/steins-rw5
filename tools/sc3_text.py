"""Preserve Chinese SC3 glyph IDs without assuming a Japanese character map.

Private-use characters are paired with a font derived from the ORIGINAL atlas.
No OCR or guessed dialogue is used. Rich-text tokens remain in the audit data.
"""
import struct

BASE = 0xE000
def expression_end(data, pos):
    while pos < len(data):
        c=data[pos]
        if c==0: return pos+1
        pos += ((c & 0xE0)-0x80)//0x20+2 if c>=0x80 else 2
    raise ValueError('Unterminated expression')

def strings(data):
    if data[:4]!=b'SC3\0': raise ValueError('Not SC3')
    start, end=struct.unpack_from('<II',data,4)
    if not 12<=start<=end<=len(data) or (end-start)%4: raise ValueError('Invalid strings index')
    result=[]
    for i in range((end-start)//4):
        pos=struct.unpack_from('<I',data,start+i*4)[0]; original=pos
        out=[];name=[];tokens=[];target=out;ruby=False;glyphs=[]
        while pos<len(data):
            c=data[pos];pos+=1
            if c==255:break
            if c>=128:
                ident=((c<<8)|data[pos])-0x8000;pos+=1
                if not 0<=ident<4608:raise ValueError('Invalid glyph '+str(ident))
                glyphs.append(ident);tokens.append(['g',ident])
                if not ruby:target.append(chr(BASE+ident))
            elif c in (4,21):
                e=expression_end(data,pos);tokens.append([c,data[pos:e].hex()]);pos=e
            elif c in (12,17,18,19):
                v=struct.unpack_from('>H',data,pos)[0];pos+=2;tokens.append([c,v])
            elif c in (0,1,2,3,5,8,9,10,11,14,15,24,25,26,30,31):
                tokens.append([c])
                if c==1:target=name
                elif c==2:target=out
                elif c==10:ruby=True
                elif c==11:ruby=False
                elif c in (0,31) and not ruby:target.append('\n')
            else:raise ValueError(f'Unknown text opcode {c:02x} at {pos-1:x} string {i}')
        else:raise ValueError('Unterminated string')
        result.append(dict(speaker=''.join(name),text=''.join(out),glyphs=glyphs,tokens=tokens,offset=original,end=pos))
    return result
