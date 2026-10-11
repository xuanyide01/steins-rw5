const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {api,data,root}=require('../tests/harness.cjs');
function read(s,skip){for(let n=0;n<10000;n++){const ops=data.ops[s.chapter],f=skip?api.readChapterSkip(ops,s,skip,0,ops.length):api.readFrame(ops,s,0,ops.length);if(!['yield','jump'].includes(f.type))return f;}throw Error('No visible frame');}
const windows=[],dmails=[],noninteractive=[],interactions=[],guideReplyIds=[299,303,306,312,318,329,336,342,346,362,378,383,387];
for(const [id,ops] of Object.entries(data.ops)){
 if(!data.catalog.scenes[id].source.startsWith('SG'))continue;
 for(let cursor=0;cursor<ops.length;cursor++){
  const o=ops[cursor];
  if(o[0]==='CreateThread'&&o[2]===7&&o[3]>=214&&o[3]<=217){const s=api.newState(Number(id),false);s.cursor=cursor;let f=read(s);assert.equal(s.choice.kind,'dmail');api.choose(s,f.items.find(i=>i.action==='noSend'),0);assert.equal(read(s).type,'text');const saved=api.checkpoint(s);f=read(s,api.nextChapter(s));assert.equal(s.choice.kind,'dmail');const restored=api.restore(saved);api.openPhone(restored);f=read(restored);api.choose(restored,f.items.find(i=>i.action==='send'),0);assert.equal(restored.variables['F:2615'],1);dmails.push({source:data.catalog.scenes[id].source,cursor,cancelThenReopen:true,cancelThenSkipStops:true,saveRestore:true});continue;}
  if(!['PhoneSG_14','PhoneSG_15'].includes(o[0])||o.slice(1).every(v=>v===255))continue;
  const s=api.newState(Number(id),false);s.cursor=cursor;let f=read(s);if(!s.choice&&s.phoneWindow===null){noninteractive.push({source:data.catalog.scenes[id].source,cursor,reason:'original macro closes this window before any text frame'});continue;}assert.equal(s.choice?.kind,'phone',id+':'+cursor);
  const initial=api.checkpoint(s),actions=f.items.filter(i=>['call','compose'].includes(i.action));assert.ok(actions.length);
  api.choose(s,f.items.find(i=>i.action==='noCall'),0);assert.ok(['text','choice'].includes(read(s).type));const saved=api.checkpoint(s),flags=JSON.stringify(s.variables);
  f=read(s,api.nextChapter(s));assert.equal(s.choice.waiting,true);assert.equal(JSON.stringify(s.variables),flags);
  const restored=api.restore(saved);api.openPhone(restored);f=read(restored);assert.ok(f.items.some(i=>['call','compose'].includes(i.action)));
  for(const item of actions){const fork=api.restore(initial);api.choose(fork,item,0);assert.equal(api.value(['W',6822],fork),item.id);assert.equal(fork.variables[item.action==='call'?'F:2614':'F:2615'],1);const next=read(fork);assert.ok(['text','choice','end'].includes(next.type));}
  windows.push({source:data.catalog.scenes[id].source,cursor,actions:actions.map(i=>({action:i.action,id:i.id})),cancelThenReopen:true,cancelThenSkipStops:true,saveRestore:true});
 }
}
for(const route of ['suzuha','faris','luka','mayuri','kurisu','true']){
 const report=JSON.parse(fs.readFileSync(path.join(root,'reports/route-'+route+'.json'),'utf8'));interactions.push(...report.actions.map(x=>({...x,route})));
}
const guide=guideReplyIds.map(id=>{const parent=data.mail.find(m=>m.replies.includes(id));assert.ok(parent);const n=parent.replies.indexOf(id);assert.ok(parent.keywords[n]);assert.ok(interactions.some(x=>x.action==='reply'&&x.id===id));return {incomingId:data.mail.indexOf(parent),replyId:id,keywordIndex:n,keywordGlyphs:parent.keywords[n],matchedOriginalMail:true,selectedInValidatedRoute:true};});
let replyVariants=0,mailWindows=0;
for(const row of data.mail.filter(m=>m.type===2)){
 const id=row.id,s=api.newState();s.cursor=0;const ops=[['PhoneSG_12',0,id],['text','','mail test'],['PhoneSG_13'],['text','','expired']];let f=api.readFrame(ops,s,0,4);assert.equal(s.choice.kind,'mail');api.choose(s,f.items.find(i=>i.action==='read'),0);f=api.readFrame(ops,s,0,4);const start=api.checkpoint(s);
 for(const item of f.items.filter(i=>i.action==='reply')){const branch=api.restore(start);api.choose(branch,item,0);assert.ok((branch.letters[id]||0)&16);assert.ok((branch.letters[item.id]||0)&3);assert.equal(api.readFrame(ops,branch,0,4).type,'choice');replyVariants++;}
 api.choose(s,f.items.find(i=>i.action==='ignore'),0);assert.equal(api.readFrame(ops,s,0,4).type,'text');api.next(s);api.readFrame(ops,s,0,4);assert.equal((s.letters[id]||0)&8,0);mailWindows++;
}
const report={result:'passed',guide:'https://www.bilibili.com/opus/1009312096192561201',guideAuthor:'罪域0811',guideCheckedVia:'browser-visible article and original game glyph font',phoneWindows:windows.length,dmailWindows:dmails.length,dmails,noninteractive,actionVariants:windows.reduce((n,w)=>n+w.actions.length,0),mailWindows,replyVariants,routeInteractionsChecked:interactions.length,criticalReplies:guide,windows,scope:'Every PhoneSG_14/15 and D-Mail thread site in all SG scripts; every incoming mail record and reply transition; choices on six ending paths. Does not exhaust every combination of all optional replies or every sentence presentation.',physicalDeviceTested:false};
fs.writeFileSync(path.join(root,'reports/phone-audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({result:report.result,phoneWindows:report.phoneWindows,dmailWindows:dmails.length,actionVariants:report.actionVariants,mailWindows,replyVariants,routeInteractionsChecked:report.routeInteractionsChecked,guideReplies:guide.length}));
