const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{performance}=require('perf_hooks');
const root=path.resolve(__dirname,'..'),source=process.env.STEINS_REFERENCE_ROOT||path.resolve(root,'../steins-rw5'),load=require('./load-runtime.cjs'),live=load(root),engine=live.api,graph=JSON.parse(fs.readFileSync(path.join(root,'src/common/graph.txt')));
const data=require(path.join(source,'tools/load-data.cjs'))(source),read=n=>JSON.parse(fs.readFileSync(path.join(source,'src/common',n+'.txt')));
let code=fs.readFileSync(path.join(source,'src/common/engine.js'),'utf8').replace(/^import[^;]+;/gm,'').replace(/export /g,'');code=code.replace(/function remember\(s\)\{[\s\S]*?\nfunction next\(/,'function remember(s){}\nfunction next(');
const ctx={catalog:data.catalog};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(source,'src/common/phone-guide.js'),'utf8').replace(/export /g,'')+';'+code+';this.api={configure,readFrame,next,choose,openPhone,storyDate,chapterTitle};',ctx);const original=ctx.api;original.configure(data.memory,data.mail,read('runtime-assets'),data.channels);
const kept=new Set(graph.retainedMail),correct=[299,303,306,312,318,329,336,342,346,362,378,383,387];
function important(s){const c=s.choice,src=data.catalog.scenes[s.rootChapter].source;return (['mail','reply'].includes(c.kind)&&kept.has(c.id))||(c.kind==='dmail'&&['SG06_23','SG07_13'].includes(src))||(c.kind==='phone'&&src==='SG08_12');}
function automatic(s,f){if(s.choice.kind==='dial')return f.items.find(x=>x.value===1);if(s.choice.kind==='dmail')return f.items.find(x=>x.action==='send');if(s.choice.kind==='phone')return f.items.find(x=>x.action==='call'||x.action==='compose')||f.items.find(x=>x.action==='noCall');return f.items.find(x=>x.action==='ignore')||f.items[0];}
function nextOriginal(s){for(let i=0;i<500000;i++){const ops=data.ops[s.chapter],f=original.readFrame(ops,s,0,ops.length);if(f.type==='text'||f.type==='end')return f;if(f.type==='choice'){if(important(s)&&s.choice.kind!=='mail')return f;const mailFrame=s.choice.kind==='mailView'&&data.mail[s.choice.id].type!==3?{type:'mailText',speaker:'手机信息',text:f.heading}:null;const item=automatic(s,f);original.choose(s,item,f.items.indexOf(item));if(mailFrame)return mailFrame;}}throw Error('Reference guard');}
function action(s,f,route){const c=s.choice,src=data.catalog.scenes[s.rootChapter].source;let wanted;
 if(c.kind==='dmail')wanted=f.items.find(x=>x.action===((route==='suzuha'||route==='faris'&&src==='SG07_13')?'noSend':'send'));
 if(c.kind==='phone')wanted=f.items.find(x=>x.action===(route==='luka'?'noCall':'call'));
 if(c.kind==='mail')wanted=f.items.find(x=>x.action===(['kurisu','true'].includes(route)?'read':'ignore'));
 if(c.kind==='reply'&&['kurisu','true'].includes(route))wanted=f.items.find(x=>x.action==='reply'&&correct.includes(x.id)&&(route!=='kurisu'||x.id!==387));
 return wanted||f.items.find(x=>x.action==='ignore')||f.items[0];
}
const json=x=>JSON.stringify(x);function visual(s){return (s.sceneLayers||[]).map(x=>[x.image,x.left,x.top,x.width,x.height,Math.round(x.opacity*1000),x.priority]);}
function watch(s){const p=engine.locate(s);if(p.type!=='text')return p;engine.setMobileEvents(s.chapter,JSON.parse(fs.readFileSync(path.join(root,'src',engine.mobileEventPath(s.chapter))))[s.chapter]);return engine.readFrame(JSON.parse(fs.readFileSync(path.join(root,'src/common/story',p.file))),s,p.base);}
const results=[];for(const route of (process.argv.length>2?process.argv.slice(2):['suzuha','faris','luka','mayuri','kurisu','true'])){
 const a=read('startup');a.history=[];let b=engine.newState(undefined,true),frames=0,choices=0;
 for(let guard=0;guard<100000;guard++){
  engine.locate(b);
  if(b.deferred&&b.cursor===engine.mobileWindows[b.deferred.root].limit-1&&['kurisu','true'].includes(route)){
   const d=b.deferred,w=engine.mobileWindows[d.root],reply=w.options.find(x=>correct.includes(x.id)&&(route!=='kurisu'||x.id!==387));
   original.openPhone(a);original.choose(a,{action:'readInbox',id:d.id},0);
   engine.markMailRead(b,d.id);
   if(reply){original.choose(a,{action:'reply',id:reply.id,parent:d.id},0);engine.answerDeferred(b,{action:'reply',id:reply.id,parent:d.id});}else original.choose(a,{action:'ignore'},0);
  }
  engine.locate(b);
  if(b.choice&&b.choice.kind==='deferred'){engine.choose(b,b.choice.items.at(-1),b.choice.items.length-1);continue;}
  if(b.mobile&&b.mobile.keyPhone&&engine.keyPhoneLimit(b)!==null&&b.cursor>=engine.keyPhoneLimit(b)){const c=engine.locate(b);engine.choose(b,c.items.at(-1),c.items.length-1);continue;}
  const f=nextOriginal(a),g=watch(b);assert.equal(g.type,f.type==='mailText'?'text':f.type,route+' frame kind at '+a.chapter+':'+a.cursor+' '+JSON.stringify(a.choice)+' watch '+b.chapter+':'+b.cursor);
  if(g.type==='text'){
   assert.equal(g.text,f.text,route+' text '+a.chapter+':'+a.cursor);assert.equal(g.speaker,f.speaker,route+' speaker');
   if(f.type!=='mailText'){assert.equal(json(visual(b)),json(visual(a)),route+' graphic');assert.equal(b.date,original.storyDate(a));assert.equal(b.title,original.chapterTitle(a));
    if(b.mobile&&b.mobile.keyPhone){const d=b.mobile.keyPhone,w=engine.keyPhoneWindows[d.root],c=graph.nodes[d.root].choice;const positive=c.kind==='phone'?route!=='luka':!(route==='suzuha'||route==='faris'&&c.source==='SG07_13');if(positive&&b.cursor===w.limit-1){original.openPhone(a);const pf=original.readFrame(data.ops[a.chapter],a,0,data.ops[a.chapter].length),item=pf.items.find(x=>x.action==='call'||x.action==='send');assert.ok(item);original.choose(a,item,pf.items.indexOf(item));original.next(a);const index=c.items.findIndex(x=>x.action===item.action);engine.choose(b,{...c.items[index],keyPhone:true},index);frames++;choices++;continue;}}
    original.next(a);}
   engine.next(b);frames++;
  }else if(g.type==='choice'){
   assert.equal(g.kind,a.choice.kind);assert.equal(g.id,a.choice.id);assert.equal(g.heading,f.heading);
   assert.equal(json(g.items.map(x=>[x.action,x.id,x.text])),json(f.items.map(x=>[x.action,x.id,x.text])));
   const item=['phone','dmail'].includes(a.choice.kind)?f.items.find(x=>x.action==='noCall'||x.action==='noSend'):action(a,f,route),index=f.items.indexOf(item);original.choose(a,item,index);engine.choose(b,g.items[index],index);choices++;
  }else if(g.type==='end'){
   assert.equal(b.endingName,a.endingName,route+' ending');assert.equal(b.endingName,{suzuha:'阿万音铃羽',faris:'菲利斯',luka:'漆原琉华',mayuri:'椎名真由理',kurisu:'牧濑红莉栖',true:'真结局'}[route]);
   results.push({route,ending:b.endingName,frames,choices,matchedTextDateGraphics:true});console.log(json(results.at(-1)));break;
  }
  if(guard===99999)throw Error('Watch route limit');
 }
}
const result={result:'passed',criticalReplyTiming:'One frame before original expiry for selected routes',criticalPhoneTiming:'Closed, then manually reopened and used at the last original permitted text record on positive routes',routes:results,graphNodes:Object.keys(graph.nodes).length};fs.writeFileSync(path.join(root,'reports/graph-v025-phone-validation.json'),json(result));console.log(json(result));
