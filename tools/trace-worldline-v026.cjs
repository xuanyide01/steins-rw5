// Conversion only: original VM stays on the development computer.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),source=path.resolve(root,'../steins-rw5'),d=require(path.join(source,'tools/load-data.cjs'))(source),g=JSON.parse(fs.readFileSync(path.join(root,'src/common/graph.txt')));
let code=fs.readFileSync(path.join(source,'src/common/engine.js'),'utf8').replace(/^import[^;]+;/gm,'').replace(/export /g,'').replace(/function remember\(s\)\{[\s\S]*?\nfunction next\(/,'function remember(s){}\nfunction next(');
code=code.replace('function phoneMacro(s,label){',"function phoneMacro(s,label){if(label===377){s._worldlineMovie=get(s,'W',1);trace(s,'worldline',{movie:s._worldlineMovie});}");
code=code.replace('function receive(s,id,channel,ask){',"function receive(s,id,channel,ask){trace(s,'receive',{id});");
code=code.replace("const id=value(o[2],s);letterBit(s,id,o[1],op==='PhoneSG_00');","const id=value(o[2],s);trace(s,op,{id,bit:o[1]});letterBit(s,id,o[1],op==='PhoneSG_00');");
function family(id,seen=new Set()){if(seen.has(id)||!d.mail[id])return seen;seen.add(id);for(const next of d.mail[id].replies||[])family(next,seen);return seen;}
let events=[];const ctx={catalog:d.catalog,trace:(s,kind,x)=>{if(kind==='receive'){if(!s._possibleMail)s._possibleMail=[];for(const id of family(x.id))if(!s._possibleMail.includes(id))s._possibleMail.push(id);}else if(kind==='PhoneSG_01'&&x.bit===0&&s._possibleMail)s._possibleMail=s._possibleMail.filter(id=>id!==x.id);if(kind!=='receive'&&kind!=='worldline'&&!(kind==='PhoneSG_01'&&x.bit===0)&&x.bit!==1&&x.bit!==4)return;events.push({kind,...x,site:s.chapter+':'+s.cursor});}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(source,'src/common/phone-guide.js'),'utf8').replace(/export /g,'')+';'+code+';this.api={configure,readFrame,next,choose};',ctx);const a=ctx.api,read=n=>JSON.parse(fs.readFileSync(path.join(source,'src/common',n+'.txt')));a.configure(d.memory,d.mail,read('runtime-assets'),d.channels);
const kept=new Set(g.retainedMail),clone=x=>JSON.parse(JSON.stringify(x));
function important(s){const c=s.choice,src=d.catalog.scenes[s.rootChapter].source;return(['mail','reply'].includes(c.kind)&&kept.has(c.id))||(c.kind==='dmail'&&['SG06_23','SG07_13'].includes(src))||(c.kind==='phone'&&src==='SG08_12');}
function automatic(s,f){if(s.choice.kind==='dial')return f.items.find(x=>x.value===1);if(s.choice.kind==='dmail')return f.items.find(x=>x.action==='send');if(s.choice.kind==='phone')return f.items.find(x=>x.action==='call'||x.action==='compose')||f.items.find(x=>x.action==='noCall');return f.items.find(x=>x.action==='ignore')||f.items[0];}
const queue=[{id:g.initial,s:read('startup')}],seen=new Set(),traces={},starts={},ends={};
for(let q=0;q<queue.length;q++){
 const {id,s}=queue[q];if(seen.has(id))continue;seen.add(id);let index=0;events=[];const rows=[];starts[id]={movie:s._worldlineMovie===undefined?null:s._worldlineMovie,letters:clone(s.letters),possible:s._possibleMail||[]};
 for(let guard=0;guard<500000;guard++){
  const ops=d.ops[s.chapter],f=a.readFrame(ops,s,0,ops.length);
  if(f.type==='text'){if(events.length){rows.push({at:index,events});events=[];}index++;a.next(s);}
  else if(f.type==='choice'){
   if(important(s)){assert.equal(index,g.nodes[id].count,id);if(events.length)rows.push({at:index,events});for(let i=0;i<f.items.length;i++){const n=clone(s);events=[];a.choose(n,f.items[i],i);queue.push({id:g.nodes[id].choice.items[i].to,s:n});}break;}
   if(s.choice.kind==='mailView'&&d.mail[s.choice.id].type!==3){if(events.length){rows.push({at:index,events});events=[];}index++;}
   const item=automatic(s,f);a.choose(s,item,f.items.indexOf(item));
  }else if(f.type==='end'){assert.equal(index,g.nodes[id].count,id);if(events.length)rows.push({at:index,events});ends[id]={ending:s.endingName,movie:s._worldlineMovie,letters:s.letters};break;}
  if(guard===499999)throw Error('Guard '+id);
 }
 traces[id]=rows;console.log('TRACE',id,index,rows.length,starts[id].movie);
}
const report={nodes:seen.size,traces,starts,ends};fs.writeFileSync(path.join(root,'reports/worldline-trace-v026.json'),JSON.stringify(report));
console.log(JSON.stringify({nodes:seen.size,movies:[...new Set(Object.values(traces).flatMap(x=>x.flatMap(r=>r.events.filter(e=>e.kind==='worldline').map(e=>e.movie))))],ends:Object.entries(ends).map(([node,x])=>({node,ending:x.ending,movie:x.movie}))}));
