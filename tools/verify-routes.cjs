const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),data=require('./load-data.cjs')(root),lazy=process.argv.includes('--lazy'),read=n=>JSON.parse(fs.readFileSync(path.join(root,'src/common',n+'.txt'),'utf8'));
const code=fs.readFileSync(path.join(root,'src/common/engine.js'),'utf8').replace(/^import[^;]+;/gm,'').replace(/export /g,'');
const ctx={catalog:data.catalog};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'src/common/phone-guide.js'),'utf8').replace(/export /g,'')+';'+code+';this.api={configure,provideMailText,provideChannelText,newState,readFrame,next,choose,checkpoint,restore,nextChapter,readChapterSkip,value};',ctx);
ctx.api.configure(data.memory,lazy?read('mail-index'):data.mail,read(lazy?'runtime-assets':'assets'),lazy?read('channel-index'):data.channels);
const replies=[299,303,306,312,318,329,336,342,346,362,378,383,387];
function run(route){let s=ctx.api.newState(undefined,true),frames=0,choices=0,calls=0,visits=new Set(),actions=[],visual=new Map(),indexes=new Map(),recovery=[];const target={suzuha:804,faris:805,luka:803,mayuri:802,kurisu:801,true:806}[route];
 let idle=0;
 for(let guard=0;guard<750000;guard++){
  const ops=data.ops[s.chapter],f=ctx.api.readFrame(ops,s,0,ops.length);calls++;
  if(f.type==='resource'){if(f.mail!==undefined)ctx.api.provideMailText(f.mail,read('mail/'+f.mail));else ctx.api.provideChannelText(f.channel,read('channel/'+f.channel));continue;}
  if(f.type==='text'){idle=0;frames++;visits.add(s.chapter+':'+s.cursor);
   const v={backgrounds:[],characters:[]};for(let slot=0;slot<8;slot++){const get=n=>s.variables['W:'+n]||0;if(s.variables['F:'+(2400+slot)]){const b=4500+slot*40;v.backgrounds.push([slot,...Array.from({length:22},(_,i)=>get(b+i))]);}if(s.variables['F:'+(2410+slot)]){const b=5100+slot*40;v.characters.push([slot,...Array.from({length:22},(_,i)=>get(b+i))]);}}
   const key=JSON.stringify(v);if(!visual.has(key)){indexes.set(key,visual.size);visual.set(key,{source:data.catalog.scenes[s.rootChapter].source,cursor:s.cursor,text:f.text,...v});}recovery.push([s.chapter,s.cursor,indexes.get(key)]);
   ctx.api.next(s);s.history=[];}
  else if(f.type==='choice'){
   idle=0;choices++;let action='ignore',wanted;
   const scene=data.catalog.scenes[s.rootChapter].source;
   if(s.choice.kind==='dmail')action=(route==='suzuha'||(route==='faris'&&scene.startsWith('SG07')))?'noSend':'send';
   else if(s.choice.kind==='phone')action=route==='luka'&&scene==='SG08_12'?'noCall':'call';
   else if(s.choice.kind==='dial')wanted=f.items.find(i=>i.value===1);
   else if(s.choice.kind==='mail')action=['kurisu','true'].includes(route)?'read':'ignore';
   else if(s.choice.kind==='reply'&&['kurisu','true'].includes(route))wanted=f.items.find(i=>i.action==='reply'&&replies.includes(i.id)&&(route!=='kurisu'||i.id!==387));
   const item=wanted||f.items.find(i=>i.action===action)||f.items.find(i=>i.action==='noCall')||f.items[0];
   actions.push({scene,kind:s.choice.kind,parent:s.choice.id,action:item.action,id:item.id});ctx.api.choose(s,item,f.items.indexOf(item));
  }else if(f.type==='end'){
   const result={route,frames,choices,calls,ending:s.endingName,endingFlags:Object.fromEntries(Object.entries(s.variables).filter(([k])=>/^F:80[0-7]$/.test(k))),mailFlags:Object.fromEntries(Object.entries(s.letters).filter(([k])=>Number(k)>=297&&Number(k)<=387)),actions};
   fs.writeFileSync(path.join(root,'reports/route-'+route+'.json'),JSON.stringify(result,null,2));fs.writeFileSync(path.join(root,'reports/visual-'+route+'.json'),JSON.stringify([...visual.values()]));fs.writeFileSync(path.join(root,'reports/recovery-'+route+'.json'),JSON.stringify({views:[...visual.values()].map(v=>[v.backgrounds,v.characters]),sites:recovery}));assert.equal(s.variables['F:'+target],1,'Wrong ending for '+route);return {route,ending:s.endingName,frames,choices,uniqueTextSites:visits.size,passed:true};
  }else if(++idle>10000)break;
 }fs.writeFileSync(path.join(root,'reports/presentation-flow-failure.json'),JSON.stringify({route,frames,choices,calls,source:data.catalog.scenes[s.chapter].source,cursor:s.cursor,operation:data.ops[s.chapter][s.cursor],stack:s.stack,state:ctx.api.checkpoint(s)},null,2));throw Error('Route execution exhausted '+route);
}
const requested=process.argv.slice(2).filter(x=>x!=='--lazy');const results=[];for(const route of requested.length?requested:['suzuha','faris','luka','mayuri','kurisu','true']){try{results.push(run(route));console.log(JSON.stringify(results.at(-1)));}catch(e){console.error(route,e.message);process.exitCode=1;}}
fs.writeFileSync(path.join(root,lazy?'reports/lazy-route-validation.json':'reports/route-validation.json'),JSON.stringify({physicalDeviceTested:false,lazyPhoneBodies:lazy,method:'Execute original MAIN00 story flow; choose phone/mail actions, without setting route flags directly',results},null,2));
