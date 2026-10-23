// Offline reference trace only. Never shipped as a watch interpreter.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),source=path.resolve(root,'../steins-rw5'),d=require(path.join(source,'tools/load-data.cjs'))(source),g=JSON.parse(fs.readFileSync(path.join(root,'src/common/graph.txt')));
let code=fs.readFileSync(path.join(source,'src/common/engine.js'),'utf8').replace(/^import[^;]+;/gm,'').replace(/export /g,'').replace(/function remember\(s\)\{[\s\S]*?\nfunction next\(/,'function remember(s){}\nfunction next(');
code=code.replace('function receive(s,id,channel,ask){','function receive(s,id,channel,ask){trace(s,"receive",{id,channel,ask});');
code=code.replace('function put(s,g,n,v){',"function put(s,g,n,v){if(g==='W'&&n>=6825&&n<=6829)trace(s,'queue',{channel:n-6825,id:v});");
code=code.replace('function put(s,g,n,v){',"function put(s,g,n,v){if(g==='W'&&(n===6817||n===6807)&&catalog.scenes[s.rootChapter]&&catalog.scenes[s.rootChapter].source.indexOf('SG09')===0&&mail[v]&&mail[v].text)trace(s,'moekaMail',{id:v,presentationType:n===6817?'draft':'view'});");
// Observed original script assignments and delivery attempts, including empty channels.
code=code.replace('const o=ops[local],op=o[0];',"const o=ops[local],op=o[0];if(s.chapter===8&&s.cursor===402)trace(s,'dispatch',{channel:get(s,'W',1421),timer:get(s,'W',1420)});");
code=code.replace('const o=ops[local],op=o[0];',"const o=ops[local],op=o[0];if(s.chapter===8&&[1627,1630,1635].includes(s.cursor))trace(s,'readRule',{pc:s.cursor});");
code=code.replace('const o=ops[local],op=o[0];',"const o=ops[local],op=o[0];if(s.chapter===8&&s.cursor===713&&catalog.scenes[s.rootChapter].source.indexOf('SG09')===0)trace(s,'moekaMail',{id:get(s,'W',6817),presentationType:'send'});");
code=code.replace('function choose(s,item,index){',"function choose(s,item,index){if(item.action==='send'&&catalog.scenes[s.rootChapter].source.indexOf('SG09')===0)trace(s,'moekaMail',{id:get(s,'W',6817),presentationType:'send'});");
code=code.replace("const id=value(o[2],s);letterBit(s,id,o[1],op==='PhoneSG_00');","const id=value(o[2],s);trace(s,op,{id,bit:o[1]});letterBit(s,id,o[1],op==='PhoneSG_00');");
code=code.replace("}else if(op==='PhoneSG_13'){","}else if(op==='PhoneSG_13'){trace(s,'expire',{});");
let events=[];const ctx={catalog:d.catalog,trace:(s,kind,x)=>{if(kind==='PhoneSG_01'&&x.bit!==3)return;events.push({kind,...x,site:s.chapter+':'+s.cursor,owner:s.variables['W:6856']||0});}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(source,'src/common/phone-guide.js'),'utf8').replace(/export /g,'')+';'+code+';this.api={configure,readFrame,next,choose};',ctx);const a=ctx.api,read=n=>JSON.parse(fs.readFileSync(path.join(source,'src/common',n+'.txt')));a.configure(d.memory,d.mail,read('runtime-assets'),d.channels);
const kept=new Set(g.retainedMail),clone=x=>JSON.parse(JSON.stringify(x));
function important(s){const c=s.choice,src=d.catalog.scenes[s.rootChapter].source;return(['mail','reply'].includes(c.kind)&&kept.has(c.id))||(c.kind==='dmail'&&['SG06_23','SG07_13'].includes(src))||(c.kind==='phone'&&src==='SG08_12');}
function automatic(s,f){if(s.choice.kind==='dial')return f.items.find(x=>x.value===1);if(s.choice.kind==='dmail')return f.items.find(x=>x.action==='send');if(s.choice.kind==='phone')return f.items.find(x=>x.action==='call'||x.action==='compose')||f.items.find(x=>x.action==='noCall');return f.items.find(x=>x.action==='ignore')||f.items[0];}
const queue=[{id:g.initial,s:read('startup')}],seen=new Set(),traces={},snapshots={},calls={};
for(let q=0;q<queue.length;q++){
 const {id,s}=queue[q];if(seen.has(id))continue;seen.add(id);let index=0;events=[];const rows=[];snapshots[id]=clone(s);
 for(let guard=0;guard<500000;guard++){
  const ops=d.ops[s.chapter],f=a.readFrame(ops,s,0,ops.length);
  if(f.type==='text'){
   if(events.length){rows.push({at:index,events});events=[];}index++;a.next(s);
  }else if(f.type==='choice'){
   if(important(s)){assert.equal(index,g.nodes[id].count,id);assert.equal(s.choice.id,g.nodes[id].choice.id,id);if(events.length)rows.push({at:index,events});
    for(let i=0;i<f.items.length;i++){const n=clone(s);events=[];a.choose(n,f.items[i],i);queue.push({id:g.nodes[id].choice.items[i].to,s:n});}break;
   }
   if(['phone','dmail'].includes(s.choice.kind)&&!calls[s.chapter+':'+s.cursor])calls[s.chapter+':'+s.cursor]={node:id,at:index,state:clone(s),frame:clone(f)};
   events.push({kind:'choice',choice:clone(s.choice),items:clone(f.items),heading:f.heading,site:s.chapter+':'+s.cursor,owner:s.variables['W:6856']||0,waiting:!!s.choice.waiting});
   if(s.choice.kind==='mailView'&&d.mail[s.choice.id].type!==3){if(events.length){rows.push({at:index,events});events=[];}index++;}
   const item=automatic(s,f);a.choose(s,item,f.items.indexOf(item));
  }else if(f.type==='end'){assert.equal(index,g.nodes[id].count,id);if(events.length)rows.push({at:index,events});break;}
  if(guard===499999)throw Error('Guard '+id);
 }
 traces[id]=rows;console.log('TRACE',q,id,index,rows.length);
}
fs.writeFileSync(path.join(root,'reports/phone-trace-v024.json'),JSON.stringify(traces));
fs.writeFileSync(path.join(root,'reports/phone-states-v024.json'),JSON.stringify(snapshots));
fs.writeFileSync(path.join(root,'reports/phone-calls-v024.json'),JSON.stringify(calls));
const summary={nodes:seen.size,events:Object.values(traces).flatMap(x=>x.flatMap(r=>r.events)).reduce((o,e)=>(o[e.kind]=(o[e.kind]||0)+1,o),{})};fs.writeFileSync(path.join(root,'reports/phone-trace-v024-summary.json'),JSON.stringify(summary,null,2));console.log(summary);
