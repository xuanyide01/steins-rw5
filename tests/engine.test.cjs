const {test}=require('node:test'),assert=require('assert/strict'),{api,data,root}=require('./harness.cjs');
function read(s,skip){for(let n=0;n<10000;n++){const ops=data.ops[s.chapter],f=skip?api.readChapterSkip(ops,s,skip,0,ops.length):api.readFrame(ops,s,0,ops.length);if(!['jump','yield'].includes(f.type))return f;}throw Error('no frame');}

test('accelerated skipping matches sequential original flow at phone boundaries',()=>{
 for(const item of [null,data.catalog.chapters.find(x=>x.name.startsWith('04'))]){
  const start=item?api.newChapterState(item):api.newState(undefined,true);read(start);
  const fast=api.restore(api.checkpoint(start)),reference=api.restore(api.checkpoint(start));
  const context=api.nextChapter(fast),group=context.chapter;let frame;
  for(let count=0;count<30000;count++){
   frame=read(reference);const source=data.catalog.scenes[String(reference.rootChapter)].source;
   if(frame.type!=='text'||(source.startsWith('SG')?source.slice(2,4):'00')!==group)break;
   api.next(reference);
  }
  const skipped=read(fast,context);assert.equal(skipped.type,frame.type);
  for(const key of ['chapter','rootChapter','cursor','variables','stack','letters','inbox','pending','choice','phoneWindow','inlineSite','inlineText','ended'])assert.equal(JSON.stringify(fast[key]),JSON.stringify(reference[key]),key);
 }
});
test('original flow skip stops before choosing a mail and snapshot preserves it',()=>{let s=api.newState(undefined,true),f=read(s);assert.equal(f.type,'text');const context=api.nextChapter(s);f=read(s,context);assert.equal(f.type,'choice');assert.equal(s.rootChapter,12);assert.equal(s.choice.kind,'mailView');const original=JSON.stringify(api.checkpoint(s));for(let i=0;i<30;i++){const restored=api.restore(JSON.parse(original));assert.equal(JSON.stringify(api.checkpoint(restored)),original);assert.equal(read(restored).items[0].action,'ignore');}});
test('PhoneWave choices follow the original jump-table destination',()=>{const id=15,ops=data.ops[id],phone=ops.findIndex(x=>x[0]==='PhoneSG_17');assert.ok(phone>=0);const table=ops.find(x=>x[0]==='JumpTable');for(let i=0;i<3;i++){const s=api.newState(id,false);s.cursor=phone;const f=read(s);assert.equal(f.type,'choice');api.choose(s,f.items.find(x=>x.value===i),i);assert.equal(api.value(['W',6833],s),i);assert.equal(s.variables['F:2609'],1);assert.equal(table[2].length,3);}});
test('source VM precedence is retained for mask comparison',()=>{const s=api.newState();s.variables['W:1000']=2;assert.equal(api.value(['==',['&',['W',1000],1],0],s),1);s.variables['W:1000']=3;assert.equal(api.value(['==',['&',['W',1000],1],0],s),0);});
test('original inline countdown executes once and survives save restoration',()=>{const id=Object.keys(data.ops).find(id=>data.ops[id].some(o=>o[0]==='text'&&o[4]));const cursor=data.ops[id].findIndex(o=>o[0]==='text'&&o[4]);const s=api.newState(Number(id),false);s.cursor=cursor;s.variables['W:1000']=4;const f=read(s);assert.match(f.text,/4/);assert.equal(s.variables['W:1000'],1);assert.equal(read(s).text,f.text);assert.equal(s.variables['W:1000'],1);const restored=api.restore(api.checkpoint(s));assert.equal(read(restored).text,f.text);assert.equal(restored.variables['W:1000'],1);});
test('all twelve chapter entries yield text or a phone interaction',()=>{for(const c of data.catalog.chapters){const s=api.newChapterState(c);assert.ok(['text','choice'].includes(read(s).type),c.name);}});
test('30 independent slot keys preserve the full phone and branch state',()=>{const fs=require('fs'),vm=require('vm');const ctx={catalog:data.catalog,checkpoint:api.checkpoint,restore:api.restore,textFont:()=>''};vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'/src/common/saves.js','utf8').replace(/import[^;]+;/g,'').replace(/export /g,'')+';this.saves={slotKey,decodeSave,createSave,SLOT_COUNT}',ctx);const stores={},keys=new Set();for(let i=0;i<30;i++){const s=api.newState(undefined,true);s.variables['W:1023']=i;s.letters[334]=3;s.choice={kind:'reply',id:386};stores[ctx.saves.slotKey(i)]=JSON.stringify(ctx.saves.createSave(s,'choice',i+1));keys.add(ctx.saves.slotKey(i));}assert.equal(keys.size,30);for(let i=0;i<30;i++){const s=ctx.saves.decodeSave(stores[ctx.saves.slotKey(i)]).state;assert.equal(s.variables['W:1023'],i);assert.equal(s.letters[334],3);assert.equal(s.choice.id,386);}assert.throws(()=>ctx.saves.slotKey(30));assert.throws(()=>api.restore({chapter:999,cursor:0}));});
test('chapter one cancel remains callable and skip stops without changing branch flags',()=>{
 const id=Number(Object.keys(data.catalog.scenes).find(k=>data.catalog.scenes[k].source==='SG01_03')),ops=data.ops[id];
 const s=api.newState(id,false);s.cursor=ops.findIndex(o=>o[0]==='PhoneSG_14');let f=read(s);assert.equal(s.choice.kind,'phone');api.choose(s,f.items.find(i=>i.action==='noCall'),0);assert.equal(read(s).type,'text');
 const snapshot=api.checkpoint(s),before=JSON.stringify(s.variables),context=api.nextChapter(s);f=read(s,context);assert.equal(s.choice.waiting,true);assert.equal(JSON.stringify(s.variables),before);assert.equal(f.items.some(i=>i.action==='call'),true);
 const restored=api.restore(snapshot);assert.equal(api.openPhone(restored),true);f=read(restored);api.choose(restored,f.items.find(i=>i.action==='call'),0);assert.equal(restored.variables['F:2614'],1);assert.ok(['text','choice'].includes(read(restored).type));
});
test('phone permissions close at the original macro and cannot remain stale',()=>{
 const s=api.newState();s.phoneWindow={calls:[3],compose:[4],announced:true};const ops=[['CallFarRL',7,30],['text','','after close']];s.cursor=0;assert.equal(api.readFrame(ops,s,0,2).type,'text');assert.equal(s.phoneWindow,null);api.openPhone(s);assert.equal(api.readFrame(ops,s,0,2).items.some(i=>['call','compose'].includes(i.action)),false);
});
test('ignored current mail can be reopened and expired mail is read-only',()=>{
 const s=api.newState();s.cursor=0;const ops=[['PhoneSG_12',0,297],['text','','next'],['PhoneSG_13'],['text','','expired']];let f=api.readFrame(ops,s,0,4);api.choose(s,f.items.find(i=>i.action==='ignore'),0);assert.equal(api.readFrame(ops,s,0,4).type,'text');
 api.openPhone(s);f=api.readFrame(ops,s,0,4);api.choose(s,f.items.find(i=>i.action==='inbox'),0);f=api.readFrame(ops,s,0,4);api.choose(s,f.items.find(i=>i.id===297),0);f=api.readFrame(ops,s,0,4);assert.equal(f.category,'关键选项');assert.ok(f.items.some(i=>i.id===299));
 api.choose(s,f.items.find(i=>i.action==='ignore'),0);f=api.readFrame(ops,s,0,4);api.choose(s,f.items.find(i=>i.action==='noCall'),0);api.next(s);assert.equal(api.readFrame(ops,s,0,4).type,'text');api.openPhone(s);f=api.readFrame(ops,s,0,4);api.choose(s,f.items.find(i=>i.action==='inbox'),0);f=api.readFrame(ops,s,0,4);api.choose(s,f.items.find(i=>i.id===297),0);f=api.readFrame(ops,s,0,4);assert.equal(s.choice.kind,'mailView');assert.equal(f.items.some(i=>i.action==='reply'),false);
});
test('dialogue removes only outer corner brackets in original and Unicode encodings',()=>{
 const fs=require('fs'),vm=require('vm'),ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'/src/common/glyph-widths.js','utf8').replace(/export /g,'')+fs.readFileSync(root+'/src/common/text-font.js','utf8').replace(/^import[^;]+;/gm,'').replace(/export /g,'')+';this.format=dialogueText;',ctx);
 assert.equal(ctx.format('\uE0D8\uE123\uE0D9'),'\uE123');assert.equal(ctx.format('「句中「引用」保留」'),'句中「引用」保留');assert.equal(ctx.format('无外层括号'),'无外层括号');
});
test('legacy cancelled-phone saves recover the chapter-one phone and new wait offsets migrate',()=>{
 const id=Number(Object.keys(data.catalog.scenes).find(k=>data.catalog.scenes[k].source==='SG01_03')),ops=data.ops[id];const s=api.newState(id,false);s.cursor=ops.findIndex(o=>o[0]==='PhoneSG_14');let f=read(s);api.choose(s,f.items.find(i=>i.action==='noCall'),0);read(s);const old=api.checkpoint(s);delete old.runtimeVersion;old.phoneWindow=null;
 const repaired=api.restore(old);api.openPhone(repaired);f=read(repaired);assert.ok(f.items.some(i=>i.action==='call'&&i.id===3));
 const offset=api.checkpoint(api.newState(76,false));delete offset.runtimeVersion;offset.cursor=30;offset.stack=[[76,34]];const migrated=api.restore(offset);assert.equal(migrated.cursor,31);assert.equal(migrated.stack[0][1],35);assert.equal(api.restore(api.checkpoint(migrated)).cursor,31);
});
test('the original no-text incoming-call wait cannot be skipped',()=>{
 const id=76,ops=data.ops[id],s=api.newState(id,false);s.cursor=ops.findIndex(o=>o[0]==='PhoneSG_14');let f=read(s);assert.equal(f.type,'choice');assert.equal(s.choice.waiting,true);api.choose(s,f.items.find(i=>i.action==='noCall'),0);f=read(s,api.nextChapter(s));assert.equal(f.type,'choice');api.choose(s,f.items.find(i=>i.action==='call'),0);assert.equal(read(s).type,'text');
});
test('declined D-Mail remains accessible until the original phone window closes',()=>{
 const s=api.newState(),ops=[['CreateThread',5,7,214],['text','','consider'],['CallFarRL',7,30],['text','','closed']];s.cursor=0;let f=api.readFrame(ops,s,0,4);api.choose(s,f.items.find(i=>i.action==='noSend'),0);assert.equal(api.readFrame(ops,s,0,4).type,'text');const restored=api.restore(api.checkpoint(s));api.openPhone(restored);f=api.readFrame(ops,restored,0,4);assert.equal(restored.choice.kind,'dmail');api.choose(restored,f.items.find(i=>i.action==='send'),0);assert.equal(restored.variables['F:2615'],1);assert.equal(api.readFrame(ops,restored,0,4).type,'text');api.next(restored);api.readFrame(ops,restored,0,4);assert.equal(restored.phoneWindow,null);
});

test('original date is a calendar date, not the SC3 scene number',()=>{
 const s=api.newState(undefined,true);read(s);assert.equal(api.storyDate(s),'（日期：07.28）');
 s.variables['W:1430']=803;assert.equal(api.storyDate(s),'（日期：08.03）');
 s.variables['W:1430']=0;assert.equal(api.storyDate(s),'');
});
test('preloaded characters remain hidden until the original transition displays them',()=>{
 const s=api.newState();s.cursor=0;s.variables['W:5272']=1;
 const ops=[['CHAloadAtlas',16,126],['BGload',1,59],['SetFlag',2400],['text','','before'],['SetFlag',2414],['text','','after']];
 api.readFrame(ops,s,0,ops.length);assert.equal(s.bodies.length,0);assert.equal(s.background,'bg59');
 api.next(s);api.readFrame(ops,s,0,ops.length);assert.equal(s.bodies.length,1);
});
test('loading a background buffer cannot replace the active scene before a swap',()=>{
 const s=api.newState();s.cursor=0;s.variables['W:4508']=0;s.variables['W:4548']=14;
 const ops=[['BGload',1,59],['SetFlag',2400],['BGload',2,36],['text','','before'],['BGswap',1,2],['text','','after']];
 api.readFrame(ops,s,0,ops.length);assert.equal(s.background,'bg59');
 api.next(s);api.readFrame(ops,s,0,ops.length);assert.equal(s.background,'bg59');assert.equal(s.variables['W:4507'],36);assert.equal(s.variables['W:4547'],59);
});
test('private-use dialogue and mail wrap within the available width and remove CJK padding',()=>{
 const fs=require('fs'),vm=require('vm'),ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'/src/common/glyph-widths.js','utf8').replace(/export /g,'')+fs.readFileSync(root+'/src/common/text-font.js','utf8').replace(/^import[^;]+;/gm,'').replace(/export /g,'')+';this.format={cleanText,wrapText};',ctx);
 assert.equal(ctx.format.cleanText('\uE123\uE000\uE03F\uE234'),'\uE123\uE234');
 assert.equal(ctx.format.cleanText('Hello   world'),'Hello world');
 const result=ctx.format.wrapText('\uE123'.repeat(90),384,24);assert.ok(result.split('\n').every(x=>x.length<=16));assert.equal(result.replace(/\n/g,'').length,90);
});

test('borrowed phones expose their owner, allowed contacts and isolated messages',()=>{
 const s=api.newState();s.cursor=0;s.variables['W:6856']=4;
 const ops=[['PhoneSG_12',0,297],['text','','phone']];let f=api.readFrame(ops,s,0,2);
 api.choose(s,f.items.find(i=>i.action==='ignore'),0);api.readFrame(ops,s,0,2);api.openPhone(s);f=api.readFrame(ops,s,0,2);
 assert.equal(f.category,'绯莉丝的手机');api.choose(s,f.items.find(i=>i.action==='inbox'),0);f=api.readFrame(ops,s,0,2);assert.ok(f.items.some(i=>i.id===297));
 s.variables['W:6856']=1;assert.equal(api.phoneOwner(s),'桐生萌郁');assert.equal(api.readFrame(ops,s,0,2).items.some(i=>i.id===297),false);
 s.variables['W:6856']=2;assert.equal(api.phoneOwner(s),'FB（天王寺裕吾）');s.choice=null;s.phoneWindow={calls:[3],compose:[],announced:true,completed:false};api.openPhone(s);f=api.readFrame(ops,s,0,2);api.choose(s,f.items.find(i=>i.action==='contacts'),0);f=api.readFrame(ops,s,0,2);assert.deepEqual(Array.from(f.items.filter(i=>i.action==='contact'),i=>i.id),[3]);
});

test('chapter ten title follows the original Kurisu-mail read condition',()=>{
 const s=api.newState(168,true);assert.equal(api.chapterTitle(s),'10 · 纯洁透明的星尘');s.letters[334]=2;assert.equal(api.chapterTitle(s),'10 · 因果关系的溶解');
 assert.ok(data.catalog.chapters.some(c=>c.mailRead===334&&c.id===168));
});

test('512-instruction native chunks reach the first mail without a false ending',()=>{
 const s=api.newState(undefined,true);const step=context=>{let f,hops=0;do{const base=Math.floor(s.cursor/512)*512,ops=data.ops[s.chapter];f=context?api.readChapterSkip(ops.slice(base,base+512),s,context,base,ops.length):api.readFrame(ops.slice(base,base+512),s,base,ops.length);assert.ok(++hops<20000);}while(['jump','yield'].includes(f.type));return {f,hops};};
 assert.equal(step().f.type,'text');const result=step(api.nextChapter(s));assert.equal(result.f.type,'choice');assert.equal(s.choice.kind,'mailView');assert.equal(s.ended,false);
});

test('original transparent BG layers, masks and face coordinates form one ordered scene',()=>{
 const fs=require('fs');const views=JSON.parse(fs.readFileSync(root+'/reports/visual-suzuha.json','utf8'));
 const sample=views.find(v=>v.source==='SG00_01'&&v.cursor===224);assert.ok(sample);
 const s=api.newState(12,false);s.cursor=0;
 for(const [kind,base,flag] of [['backgrounds',4500,2400],['characters',5100,2410]])for(const row of sample[kind]){s.variables['F:'+(flag+row[0])]=1;for(let i=1;i<row.length;i++)s.variables['W:'+(base+row[0]*40+i-1)]=row[i];}
 api.readFrame([['text','','original scene']],s,0,1);
 assert.ok(s.sceneLayers.some(x=>x.image==='p126_2'));assert.ok(s.sceneLayers.some(x=>x.image.startsWith('mask-')));assert.ok(s.sceneLayers.every((x,i)=>i===0||x.priority>=s.sceneLayers[i-1].priority));
 const face=s.sceneLayers.find(x=>x.image==='p126_2');assert.equal(face.left,28);assert.equal(face.top,-25);assert.ok(face.height>243);
});

test('an actual 0.1.1 snapshot restores original graphics without changing mail flags',()=>{
 const fs=require('fs'),fixture=JSON.parse(fs.readFileSync(root+'/tests/fixtures/legacy-0.1.1.json','utf8')),s=api.restore(fixture);
 assert.equal(s.runtimeVersion,3);assert.equal(JSON.stringify(s.letters),JSON.stringify(fixture.letters));assert.equal(read(s).type,'text');assert.ok(s.sceneLayers.some(x=>x.image.startsWith('p')));assert.ok(s.sceneLayers.some(x=>x.image.startsWith('bg')));assert.ok(s.sceneLayers.every(x=>!/^p\d+_0$/.test(x.image)));
});

test('chapter selection retains MAIN00 and continues past the first script Return',()=>{
 const c=data.catalog.chapters.find(c=>c.id===59),s=api.newChapterState(c);let reached=false;for(let n=0;n<600;n++){const f=read(s);assert.notEqual(f.type,'end','the opening scene must not end the chapter');if(s.rootChapter!==59&&data.catalog.scenes[s.rootChapter].source.startsWith('SG04_')){reached=true;break;}if(f.type==='text')api.next(s);else if(f.type==='choice')api.choose(s,f.items.find(i=>['ignore','noCall','noSend'].includes(i.action))||f.items[0],0);}assert.equal(reached,true);assert.ok(s.stack.some(x=>x[0]===data.catalog.flowScene));
});
