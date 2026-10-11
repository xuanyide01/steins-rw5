const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const data=require('./load-data.cjs')(root);
const code=fs.readFileSync(path.join(root,'src/common/engine.js'),'utf8').replace(/^import[^;]+;/gm,'').replace(/export /g,'');
const ctx={catalog:data.catalog,console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'src/common/phone-guide.js'),'utf8').replace(/export /g,'')+';'+code+';this.api={configure,newState,readFrame,next,choose,checkpoint,restore};',ctx);
ctx.api.configure(data.memory,data.mail,JSON.parse(fs.readFileSync(path.join(root,'src/common/assets.txt'),'utf8')),data.channels);
const args=process.argv.slice(2);const target=args.find(x=>/^\d+$/.test(x));
let state=ctx.api.newState(target?Number(target):undefined,!target,target?Number(args[args.indexOf(target)+1]||0):undefined);
let frames=0,choices=0,loops=0,sites=new Set(),calls=0,first=[];const history=[];
for(let guard=0;guard<100000;guard++){
 const chapter=String(state.chapter),ops=data.ops[chapter];
 try{
  const f=ctx.api.readFrame(ops,state,0,ops.length);calls++;
  if(f.type==='text'){
   if(first.length<10)first.push({source:data.catalog.scenes[chapter].source,cursor:state.cursor,speaker:f.speaker,text:f.text,background:state.background,bodies:state.bodies});
   frames++;const site=chapter+':'+state.cursor;if(frames>50&&!state.article&&history.slice(-6).every(x=>x[0]===state.chapter&&x[1]===state.cursor))throw Error('Repeated text '+site);sites.add(site);ctx.api.next(state);state.history=[];loops=0;
   if(frames%1000===0)console.log('TRACE',frames,choices,data.catalog.scenes[chapter].source,state.cursor);
  }else if(f.type==='choice'){
   choices++;const prefer=args.includes('--send')?'send':'noSend';
   let item=f.items.find(x=>x.action===prefer)||f.items.find(x=>x.action===(args.includes('--read')?'read':'ignore'))||f.items.find(x=>x.action==='reply')||f.items[0];
   if(state.choice.kind==='dial')item=f.items.find(x=>x.value===1);
   if(state.choice.kind==='reply'&&args.includes('--read'))item=f.items.find(x=>x.action==='reply')||item;
   ctx.api.choose(state,item,f.items.indexOf(item));loops=0;
  }else if(f.type==='end'){
   const report={result:'ended',frames,choices,sites:sites.size,calls,rootChapter:state.rootChapter,endingFlags:Object.fromEntries(Object.entries(state.variables).filter(([k])=>/^F:80[0-7]$/.test(k))),first};
   fs.writeFileSync(path.join(root,'reports/trace-'+(target||'full')+(args.includes('--send')?'-send':'')+(args.includes('--read')?'-read':'')+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,first:first.slice(0,1)}));break;
  }else if(++loops>3000)throw Error('Execution loop without a frame');
  history.push([state.chapter,state.cursor]);if(history.length>8)history.shift();
 }catch(e){const result={error:e.message,frames,choices,history,state};fs.writeFileSync(path.join(root,'reports/trace-error.json'),JSON.stringify(result,null,2));console.error(JSON.stringify({error:e.message,frames,choices,history,stack:state.stack}));process.exitCode=1;break;}
}
