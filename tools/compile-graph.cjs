// All original SC3 work runs on the desktop. The watch receives only frames and edges.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),source=process.env.STEINS_REFERENCE_ROOT||path.resolve(root,'../steins-rw5');
const data=require(path.join(source,'tools/load-data.cjs'))(source);
let code=fs.readFileSync(path.join(source,'src/common/engine.js'),'utf8').replace(/^import[^;]+;/gm,'').replace(/export /g,'');
code=code.replace(/function remember\(s\)\{[\s\S]*?\nfunction next\(/,'function remember(s){}\nfunction next(');
const ctx={catalog:data.catalog};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(source,'src/common/phone-guide.js'),'utf8').replace(/export /g,'')+';'+code+';this.api={configure,newState,readFrame,next,choose,storyDate,chapterTitle};',ctx);
const api=ctx.api,read=n=>JSON.parse(fs.readFileSync(path.join(source,'src/common',n+'.txt'),'utf8'));
api.configure(data.memory,data.mail,read('runtime-assets'),data.channels);
const copy=s=>JSON.parse(JSON.stringify(s)),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const direct=new Set([334,338,377,379,386]);
// Retain every ancestor of a letter directly queried by the story, plus guide keys.
const kept=new Set([297,301,304,308,316,324,335,341,344,354,377,381,386,...direct]);
let changed=true;while(changed){changed=false;data.mail.forEach((m,i)=>{if(i>=297&&i<=387&&m.replies.some(x=>kept.has(x))&&!kept.has(i)){kept.add(i);changed=true;}});}
function important(s){const c=s.choice,src=data.catalog.scenes[s.rootChapter].source;return (['mail','reply'].includes(c.kind)&&kept.has(c.id))||(c.kind==='dmail'&&['SG06_23','SG07_13'].includes(src))||(c.kind==='phone'&&src==='SG08_12');}
function automatic(s,f){const kind=s.choice.kind;
 if(kind==='dial')return f.items.find(x=>x.value===1);
 if(kind==='dmail')return f.items.find(x=>x.action==='send');
 if(kind==='phone')return f.items.find(x=>x.action==='call'||x.action==='compose')||f.items.find(x=>x.action==='noCall');
 return f.items.find(x=>x.action==='ignore')||f.items[0];
}
function key(s){
 const vars=Object.entries(s.variables).filter(([k])=>!(k.startsWith('W:')&&Number(k.slice(2))>=4500&&Number(k.slice(2))<5500)).sort(([a],[b])=>a.localeCompare(b));
 // Desktop compilation keeps all letter bits and pending work when merging.
 // None of this VM state is shipped to the watch.
 return hash(JSON.stringify([s.chapter,s.cursor,s.rootChapter,s.stack,s.banks,s.choice,s.phoneWindow,s.pending,s.article,s.switches,s.loops,vars,Object.entries(s.letters).sort(([a],[b])=>Number(a)-Number(b))]));
}
const nodes={},queue=[],memo=new Map(),visuals=[],vmap=new Map(),blocks=new Map(),texts=new Map();
const stats={processed:0,computedFrames:0,removedChoices:0,mandatoryMailFrames:0,mergedStarts:0};
const dir=path.join(root,'reports/raw-story');fs.mkdirSync(dir,{recursive:true});
function enqueue(s){const k=key(s);if(memo.has(k)){stats.mergedStarts++;return memo.get(k);}const id='n'+memo.size;memo.set(k,id);nodes[id]={};queue.push({id,state:copy(s)});return id;}
function visual(s){const layers=(s.sceneLayers||[]).map(x=>[x.image,x.left,x.top,x.width,x.height,Math.round(x.opacity*1000),x.priority]);const k=JSON.stringify(layers);if(!vmap.has(k)){vmap.set(k,visuals.length);visuals.push(layers);}return vmap.get(k);}
function frame(s,f){const row=[f.speaker||'',f.text||'',visual(s),api.storyDate(s),api.chapterTitle(s),s.chapter+':'+s.cursor+(s.article?':'+s.article.index:'')];const k=JSON.stringify(row);if(!texts.has(k))texts.set(k,row);return texts.get(k);}
function chunks(rows){const chunks=[];for(let i=0;i<rows.length;i+=96){const block=rows.slice(i,i+96),json=JSON.stringify(block),k=hash(json);let file=blocks.get(k);if(!file){file=blocks.size+'.txt';blocks.set(k,file);fs.writeFileSync(path.join(dir,file),json);}chunks.push({file,count:block.length});}return chunks;}
const initialState=read('startup');initialState.history=[];
const initial=enqueue(initialState),chapterStarts={};let totalChoices=0;
const limit=Number(process.env.GRAPH_NODE_LIMIT||1500);
for(let qi=0;qi<queue.length;qi++){
 if(qi>=limit)throw Error('Graph limit '+limit+'; inspect state merging');
 const {id,state:s}=queue[qi],rows=[],node=nodes[id];let lastChapter='';
 for(let guard=0;guard<500000;guard++){
  const ops=data.ops[s.chapter],f=api.readFrame(ops,s,0,ops.length);
  if(f.type==='text'){
   const chapter=api.chapterTitle(s);if(chapter!==lastChapter){lastChapter=chapter;if(!chapterStarts[chapter])chapterStarts[chapter]={node:id,index:rows.length};}
   rows.push(frame(s,f));stats.computedFrames++;api.next(s);
  }else if(f.type==='choice'){
   if(important(s)){
    node.choice={kind:s.choice.kind,id:s.choice.id,source:data.catalog.scenes[s.rootChapter].source,heading:f.heading||'选择下一步',category:'关键剧情操作',items:[]};
    for(const item of f.items){const next=copy(s);api.choose(next,item,f.items.indexOf(item));node.choice.items.push({...copy(item),to:enqueue(next)});}
    totalChoices++;break;
   }
   if(s.choice.kind==='mailView'&&data.mail[s.choice.id].type!==3){rows.push(frame(s,{speaker:'手机信息',text:f.heading}));stats.mandatoryMailFrames++;}
   const item=automatic(s,f);if(!item)throw Error('Automatic choice missing '+s.choice.kind);api.choose(s,item,f.items.indexOf(item));stats.removedChoices++;
  }else if(f.type==='end'){node.ending=s.endingName||'本篇';break;}
  else if(f.type!=='jump'&&f.type!=='yield')throw Error('Unexpected '+f.type);
  if(guard===499999)throw Error('VM guard '+id);
 }
 node.chunks=chunks(rows);node.count=rows.length;
 stats.processed++;if(qi%10===0)console.log(JSON.stringify({node:id,queued:queue.length,...stats}));
}
const graph={format:2,initial,nodes,chapterStarts,retainedMail:[...kept].sort((a,b)=>a-b)};
fs.writeFileSync(path.join(root,'src/common/graph.txt'),JSON.stringify(graph));
fs.writeFileSync(path.join(root,'src/common/visuals.txt'),JSON.stringify(visuals));
const report={result:'compiled',source:'Existing SC3 converter 0.1.4, desktop-only VM',...stats,nodes:Object.keys(nodes).length,choices:totalChoices,blocks:blocks.size,uniqueFrames:texts.size,visuals:visuals.length,retainedMail:graph.retainedMail};
fs.writeFileSync(path.join(root,'reports/graph-compile.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
