"""Compile disassembled MAGES control flow to a bounded, data-only watch VM."""
from pathlib import Path
import re,json,struct,collections,shutil,difflib,subprocess
ROOT=Path(__file__).resolve().parents[1];PROBE=ROOT.parent/'steins-probe'
BASELINE=PROBE/'vm-full-0.1.1.json'
PACKAGED_BASELINE=ROOT/'tools/legacy-cursor-baseline.json'
if not BASELINE.exists() and (PROBE/'vm-full.json').exists():shutil.copyfile(PROBE/'vm-full.json',BASELINE)
baseline=json.loads((PACKAGED_BASELINE if PACKAGED_BASELINE.exists() else BASELINE).read_text('utf8')) if PACKAGED_BASELINE.exists() or BASELINE.exists() else {'ops':{}}
OUT=ROOT/'src/common';STORY=OUT/'story';STORY.mkdir(exist_ok=True)
texts=json.loads((PROBE/'decoded-glyphs.json').read_text('utf8'))
# MAGES precedence differs from C/JavaScript: comparisons bind below bitwise ops.
# See MgsScriptTools OperatorsSpec.cs; retain the source VM's ordering exactly.
PREC={'==':1,'!=':1,'<':1,'>':1,'<=':1,'>=':1,'^':3,'|':4,'&':5,'<<':6,'>>':6,'+':7,'-':7,'%':8,'*':9,'/':9}
TOKEN=re.compile(r'\s*(\$[A-Za-z]+|0x[\da-fA-F]+|\d+|<<|>>|==|!=|<=|>=|[()+\-*/%~!<>&|^\[\]])')
def expression(src):
    tokens=[];p=0
    while p<len(src):
        m=TOKEN.match(src,p)
        if not m:raise ValueError('Invalid expression '+repr(src[p:]))
        tokens.append(m[1]);p=m.end()
    j=0
    def parse(minimum=0):
        nonlocal j
        tok=tokens[j];j+=1
        if tok in ('-','+','~','!'):left=[tok,parse(2 if tok=='!' else 10)]
        elif tok=='(':left=parse();assert tokens[j]==')';j+=1
        elif tok.startswith('$'):
            group=tok[1:]
            if group=='MR':
                assert tokens[j]=='[';j+=1;address=parse();assert tokens[j]==']';j+=1
                assert tokens[j]=='(';j+=1;offset=parse();assert tokens[j]==')';j+=1
                left=['MR',address,offset]
            else:
                assert tokens[j]=='(';j+=1;arg=parse();assert tokens[j]==')';j+=1;left=[group,arg]
        else:left=int(tok,0) if tok.startswith('0x') else int(tok)
        while j<len(tokens) and tokens[j] in PREC and PREC[tokens[j]]>=minimum:
            op=tokens[j];j+=1;left=[op,left,parse(PREC[op]+1)]
        return left
    result=parse();assert j==len(tokens),(src,tokens[j:]);return result
def split(src):
    level=0;out=[];start=0
    for i,c in enumerate(src):
        if c in '([':level+=1
        elif c in ')]':level-=1
        elif c==',' and level==0:out.append(src[start:i].strip());start=i+1
    if src[start:].strip():out.append(src[start:].strip())
    return out
def write(path,obj):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':')),'utf8')
index=ROOT.parent/'steins-probe/script.mpk'
from mpk import MPK
rows=MPK(index).entries;fileIDs={Path(x['name']).stem:x['id'] for x in rows}
scenes={};allops={};opCounts=collections.Counter();unsupported=[];memory={}
presentation=re.compile(r'^(?:Mess|MesSetSave|MesVoice|Mes2V|BGM|SE|SSE|Voice|AutoSave|SetSave|SetPlay|SetEV|SetDic|SetAchievement|Ach|Play|SCPlay|EndMovie|Movie|Presence|GetSystem|Mouse|Pad|BGset|BGswap|BGrelease|BGmake|BGlink|CHArelease|CharaLayer|Eff|Anime|Clear|SetColor|SetFont|SetWindow|Release|CreateSurface|DelSurface|Draw|Fade|Press|Debug|Save|Unk|SetPresence)')
for path in sorted((PROBE/'disasm-sc').glob('*.scs')):
    name=path.stem
    if not(name.startswith('SG') or name in ('MAIN00','MACROSYS','MACROSYS2','CLRFLG')):continue
    ident=fileIDs[name];ops=[];entries={};label=None
    for line in path.read_text('utf8').splitlines():
        if line.startswith('//') or not line.strip():continue
        m=re.fullmatch(r'(\*?)(\d+):',line)
        if m:
            if not m[1]:label=int(m[2]);entries[str(label)]=len(ops)
            continue
        if not line.startswith('\t'):continue
        src=line.strip()
        if src.startswith('$'):
            m=re.fullmatch(r'(\$[WTF]\(.+?\))\s*(\+\+|--|<<=|>>=|[+\-*/%&|^]?=)\s*(.*?)\s*;',src)
            if not m:raise ValueError('Assignment '+src)
            target=expression(m[1]);op=m[2];val=1 if op in ('++','--') else expression(m[3].strip())
            ops.append(['set',target,op,val]);continue
        head,_,arg=src.partition(' ');args=split(arg);opCounts[head]+=1
        if head in ('MesSetMesScx','Mes2VSetMesScx'):
            row=texts[name][int(args[-1])];operation=['text',row['speaker'],row['text'].strip(chr(0xE000)+chr(0xE03F)+'\n'),int(args[-1])]
            if any(t[0]==21 for t in row['tokens']):
                # This installation has exactly four inline W1000 decrement displays.
                # Preserve their side effects once per displayed frame, including saves.
                parts=[];buffer=[];ruby=False;inName=False
                for t in row['tokens']:
                    if t[0]==1:inName=True
                    elif t[0]==2:inName=False
                    elif t[0]==10:ruby=True
                    elif t[0]==11:ruby=False
                    elif t[0]=='g' and not ruby and not inName:buffer.append(chr(0xE000+t[1]))
                    elif t[0] in (0,31) and not ruby and not inName:buffer.append('\n')
                    elif t[0]==21:
                        assert t[1]=='280aa3e814210000','Unsupported inline expression '+t[1]
                        parts.extend([''.join(buffer),['postDecrement','W',1000]]);buffer=[]
                parts.append(''.join(buffer));operation.append(parts)
            ops.append(operation);continue
        if head=='MesMain':continue
        if head in ('Jump','CallRL'):ops.append([head,int(args[0])]);continue
        if head in ('If','IfInv'):ops.append([head,expression(args[0]),int(args[1])]);continue
        if head in ('FlagOnJump','FlagOffJump'):ops.append([head,expression(args[0]),int(args[1])]);continue
        if head in ('SetFlag','ResetFlag','Switch','PhoneSG_0F','PhoneSG_10'):ops.append([head,expression(args[0])]);continue
        if head=='FlagOnWait' and args==['2610']:ops.append([head,2610]);continue
        if head in ('CallFarRL','JumpFar','LoadJump'):ops.append([head,expression(args[0]),int(args[1])]);continue
        if head in ('ScriptLoad','BGload','CHAloadAtlas','PhoneSG_12'):
            ops.append([head]+[expression(x) for x in args]);continue
        if head in ('BGswap','CHAswap','BGrelease','CHArelease'):
            ops.append([head]+[expression(x) for x in args]);continue
        if name=='MACROSYS' and head=='GetSystemStatus':ops.append([head,expression(args[0])]);continue
        if name=='MACROSYS' and head=='SetSavePointMain':ops.append([head]);continue
        if name=='MACROSYS' and head in ('CalcSinL','CHAmoveSetSeq','SetRevMesScx','PackFileAddBind','SetBgCutin2'):continue
        if head=='CreateThread':ops.append([head,expression(args[0]),expression(args[1]),int(args[2])]);continue
        if head in ('Return','End','Halt'):ops.append([head]);continue
        if head=='Case':ops.append([head,expression(args[0]),int(args[1])]);continue
        if head=='Loop':ops.append([head,int(args[0]),expression(args[1])]);continue
        if head in ('JumpTable','Select_02'):ops.append([head]+[expression(x) for x in args]);continue
        if head.startswith(('PhoneSG_00','PhoneSG_01','PhoneSG_02','PhoneSG_03')):
            ops.append([head,int(args[0]),expression(args[1])]+([int(args[2])] if len(args)>2 else []));continue
        if head.startswith('PhoneSG_'):ops.append([head]+[expression(x) for x in args]);continue
        if head in ('CalcMove','CalcAccel'):ops.append([head]+[expression(x) for x in args]);continue
        if head=='Adr':ops.append([head,int(args[0])]);continue
        if head in ('Wait','Mwait','FlagOnWait','FlagOffWait','LoadMovie','SetBgCutin') or presentation.match(head):continue
        if head in ('dd','dw','db','hex'):
            # Data tables are retained as read-only int32 memory. Executing them is an error.
            ops.append(['data',label]);continue
        if head.startswith(('KeyOnJump','KeyOffJump','ScriptKeyWait')):continue
        unsupported.append({'script':name,'label':label,'instruction':src});ops.append(['unsupported',src])
    for operation in ops:
        if operation[0]=='JumpTable' and isinstance(operation[2],int):
            table=[];k=entries[str(operation[2])]
            while k<len(ops) and ops[k][0]=='Adr':table.append(ops[k][1]);k+=1
            if not table:raise ValueError('Empty jump table '+name)
            operation[2]=table
    binary=(PROBE/'scripts'/f'{name}.SCX').read_bytes()
    first=struct.unpack_from('<I',binary,12)[0];n=(first-12)//4
    labelOffsets=[struct.unpack_from('<I',binary,12+i*4)[0] for i in range(n)]
    end=struct.unpack_from('<I',binary,4)[0]
    mem={}
    # Only expression-referenced labels need a data window.
    for referenced in set(map(int,re.findall(r'\$L\((\d+)\)',path.read_text('utf8')))):
        offset=labelOffsets[referenced];limit=min((x for x in labelOffsets if x>offset),default=end)
        mem[str(referenced)]=[struct.unpack_from('<i',binary,k)[0] for k in range(offset,limit-3,4)]
    memory[str(ident)]=mem
    routeName=name.replace('SG','').replace('_',' · ')
    scenes[str(ident)]={'length':len(ops),'entries':entries,'name':routeName,'source':name}
    allops[str(ident)]=ops
    for block in range((len(ops)+511)//512):write(STORY/str(ident)/(str(block)+'.txt'),ops[block*512:(block+1)*512])
# Mail metadata is 646 fixed-size records, followed by uint16 sentinel 255.
b=(PROBE/'scripts/_MAIL.SCX').read_bytes();offset=struct.unpack_from('<I',b,12+114*4)[0]
mail=[]
keywordMismatches=[]
for i in range(646):
    fields=list(struct.unpack_from('<15H',b,offset+i*30));a,z,c=fields[-3:]
    assert max(a,z,c)<len(texts['_MAIL'])
    links=[x for x in fields[4:12] if x!=999]
    keywords=[];active=None
    for token in texts['_MAIL'][c]['tokens']:
        if token[0]==9:active=[]
        elif token[0] in (10,11):
            if active:keywords.append(''.join(active))
            active=None
        elif token[0]=='g' and active is not None:active.append(chr(0xE000+token[1]))
    replyIDs=[x for x in links if struct.unpack_from('<H',b,offset+x*30)[0]==3]
    if keywords and len(keywords)!=len(replyIDs):keywordMismatches.append({'mail':i,'keywords':len(keywords),'replyIDs':replyIDs})
    mail.append({'id':i,'type':fields[0],'stamp':fields[1:3],'group':fields[3],'replies':links,'keywords':keywords if len(keywords)==len(replyIDs) else [],'title':texts['_MAIL'][a]['text'],'sender':texts['_MAIL'][z]['text'],'text':texts['_MAIL'][c]['text'],'textIndex':[a,z,c]})
assert struct.unpack_from('<H',b,offset+646*30)[0]==255
write(OUT/'mail.txt',mail);write(OUT/'memory.txt',memory)
at=(PROBE/'scripts/_ATCH.SCX').read_bytes();channels=[]
for label in range(2,29):
    position=struct.unpack_from('<I',at,12+label*4)[0];ids=[]
    while position+2<=len(at):
        ident=struct.unpack_from('<H',at,position)[0];position+=2
        if ident==65535:break
        assert ident<len(texts['_ATCH']);ids.append(ident)
    channels.append([texts['_ATCH'][i]['text'] for i in ids])
write(OUT/'channel.txt',channels)
chapterStarts=[(12,1,'序章'),(13,0,'01 · 时间跳跃的偏执狂'),(26,0,'02 · 不切实际的交汇'),(45,0,'03 · 蝴蝶翅膀的分歧'),(59,0,'04 · 美丽梦幻的永恒'),(84,0,'05 · 时空界限的教条'),(101,0,'06 · 形而上的死亡'),(126,1,'07 · 虚幻失真的复杂'),(142,0,'08 · 自我相似的两性体'),(156,0,'09 · 无限连锁的凋亡'),(168,0,'10 · 因果关系的溶解'),(180,0,'11 · 境界面上的命运石之门')]
chapters=[{'id':i,'entry':e,'route':0,'name':name} for i,e,name in chapterStarts]
catalog={'initial':9,'flowScene':9,'initialEntry':18,'scenes':scenes,'chapters':chapters,'routes':[{'name':'完整故事','scenes':[c['id'] for c in chapters]}],'endings':{'6':'结局'},'banks':{'3':12,'6':7,'7':8,'9':1,'11':0},'contacts':[texts['_MAIL'][83+i*2]['text'] for i in range(13)]}
catalog['chapterTitles']=[row['text'] for row in texts['MACROSYS'][2:15]]
for ident,scene in scenes.items():
    source=scene['source']
    if source.startswith('SG'):
        number=int(source[2:4]);scene['name']=chapters[number]['name'] if number<len(chapters) else source
# Chapter 10 has two official titles, selected by the original mail-read flag.
chapters[10]['name']='10 · 纯洁透明的星尘'
chapters.append({'id':168,'entry':0,'route':0,'name':'10 · 因果关系的溶解','mailRead':334})
# Start chapter reading at its original MAIN00 call, retaining the caller that
# sequences every later scene. Loading the first SG script alone ends at Return.
main=allops['9']
for chapter in chapters:
    starts=[i for i,op in enumerate(main[:-1]) if op==['ScriptLoad',3,chapter['id']] and main[i+1][:2]==['CallFarRL',3]]
    assert len(starts)==1,(chapter,starts)
    chapter['mainStart']=starts[0]-1
    chapter['entry']=main[starts[0]+1][2]
catalog['cursorMigrations']={}
for ident,oldops in baseline['ops'].items():
    if ident not in allops:continue
    matcher=difflib.SequenceMatcher(None,[json.dumps(x,ensure_ascii=False) for x in oldops],[json.dumps(x,ensure_ascii=False) for x in allops[ident]],autojunk=False)
    changes=[]
    for block in matcher.get_matching_blocks():
        if block.size:changes.append([block.a,block.a+block.size,block.b-block.a])
    if any(x[2] for x in changes):catalog['cursorMigrations'][ident]=changes
recovery={}
for ident,ops in allops.items():
    if not scenes[ident]['source'].startswith('SG'):continue
    window={'calls':[],'compose':[]};start=0;ranges=[]
    for cursor,op in enumerate(ops):
        kind=op[0]
        closes=kind=='CallFarRL' and op[1:]==[7,30]
        if kind not in ('PhoneSG_14','PhoneSG_15') and not closes:continue
        if window['calls'] or window['compose']:ranges.append({'start':start,'end':cursor,'window':json.loads(json.dumps(window))})
        if closes:window={'calls':[],'compose':[]}
        else:window['calls' if kind=='PhoneSG_14' else 'compose']=[x for x in op[1:] if isinstance(x,int) and x!=255]
        start=cursor+1
    if window['calls'] or window['compose']:ranges.append({'start':start,'end':len(ops),'window':window})
    if ranges:recovery[ident]=ranges
catalog['phoneRecovery']=recovery
(OUT/'catalog.js').write_text('export const catalog='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\n','utf8')
write(ROOT/'reports/story-compile.json',{'scripts':len(scenes),'instructions':sum(len(x) for x in allops.values()),'textFrames':opCounts['MesSetMesScx']+opCounts['Mes2VSetMesScx'],'unsupported':unsupported,'opcodes':dict(opCounts),'mailRecords':len(mail),'mailKeywordMismatches':keywordMismatches,'allMainStoryDecoded':True})
write(PROBE/'vm-full.json',{'ops':allops,'catalog':catalog,'memory':memory,'mail':mail,'channels':channels})
print('COMPILE',len(scenes),'scripts',sum(len(x) for x in allops.values()),'ops',len(unsupported),'unsupported',len(mail),'mail records')
print('UNSUPPORTED',unsupported[:10])
# Conversion optimization never renumbers logical positions or original labels.
subprocess.run(['node',str(ROOT/'tools/optimize-story.cjs')],check=True,cwd=ROOT)
