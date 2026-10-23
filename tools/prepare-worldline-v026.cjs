const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),common=path.join(root,'src/common'),g=JSON.parse(fs.readFileSync(path.join(common,'graph.txt'))),trace=JSON.parse(fs.readFileSync(path.join(root,'reports/worldline-trace-v026.json'))),old=JSON.parse(fs.readFileSync(path.join(root,'reports/phone-trace-v024.json')));
// Read settled frame 125, not the intermediate digit rolls at frame 105.
const rates={7:'0.571024',11:'0.571015',12:'0.523299',13:'0.456903',14:'0.409420',15:'0.337187',16:'0.409431',17:'0.456914',18:'0.523307',19:'0.571046',21:'1.130205',22:'1.130238',24:'-0.275349'},initial='1.130426',trueEnd='1.048596';
const sources=require(path.resolve(root,'../steins-rw5/tools/load-data.cjs'))(path.resolve(root,'../steins-rw5')).catalog.scenes;
const world={},all={};let deletes=0,readOps=0;
function anchor(e){return e.kind==='receive'||e.kind==='PhoneSG_00'&&(e.bit===1||e.bit===4);}
function same(a,b){return a.kind===b.kind&&a.site===b.site&&a.id===b.id&&a.bit===b.bit;}
function compactLife(events){const result=[];for(const e of events){if(e.kind==='PhoneSG_01'&&e.bit===0){deletes++;const last=result.at(-1);if(last&&last[0]==='erase'&&last[2]+1===e.id)last[2]=e.id;else result.push(['erase',e.id,e.id]);}else if(e.bit===1||e.bit===4){readOps++;result.push([e.bit===1?'readBit':'replyBit',e.id,e.kind==='PhoneSG_00']);}}return result;}
for(const [node,records]of Object.entries(old)){
 const rows=[],life=new Map(trace.traces[node].map(r=>[r.at,r.events]));
 for(const row of records){const added=life.get(row.at)||[],originalAnchors=row.events.filter(anchor),newAnchors=added.filter(anchor);assert.deepEqual(newAnchors.map(x=>[x.kind,x.site,x.id,x.bit]),originalAnchors.map(x=>[x.kind,x.site,x.id,x.bit]),node+':'+row.at);let at=0;const combined=[];
  for(const e of row.events){if(anchor(e)){const before=[];while(at<added.length&&!same(added[at],e))before.push(added[at++]);assert.ok(at<added.length);before.push(added[at++]);combined.push(...compactLife(before));}combined.push(e);}
  combined.push(...compactLife(added.slice(at)));life.delete(row.at);
  const out=[];let expired=false;for(const e of combined){if(Array.isArray(e)){out.push(e);continue;}
   if(e.kind==='expire'||e.kind==='PhoneSG_01'&&e.bit===3){if(!expired){out.push(['expire']);expired=true;}}
   if(e.kind==='queue'&&e.channel>0)out.push(['queue',e.channel,e.id]);
   if(e.kind==='readRule')out.push(['rule',e.pc]);
   if(e.kind==='dispatch'&&e.channel>0&&e.channel<5&&e.timer>=0)out.push(['dispatch',e.channel]);
   if(e.kind==='receive')out.push(['receive',e.id,e.channel===undefined?-1:e.channel,!!e.ask,e.owner]);
   if(e.kind==='moekaMail')out.push(['presentation',e.id,e.presentationType,e.owner]);
   if(e.kind==='choice'&&['phone','dmail'].includes(e.choice.kind))out.push(['call',e.site,e.owner,e.choice.kind,e.items.filter(i=>['call','compose','send'].includes(i.action)).map(i=>({id:i.id,action:i.action,text:i.text})),!!e.waiting]);
  }
  const sent=out.filter(e=>e[0]==='presentation'&&e[2]==='send');const compact=out.filter(e=>!(e[0]==='presentation'&&e[2]==='draft'&&sent.some(x=>x[1]===e[1]&&x[3]===e[3])));if(compact.length)rows.push([row.at,compact]);
 }
 for(const [at,events]of life){const compact=compactLife(events);if(compact.length)rows.push([at,compact]);}rows.sort((a,b)=>a[0]-b[0]);rows.unshift([-1,[['seed',trace.starts[node].possible]]]);all[node]=rows;
 const changes=trace.traces[node].flatMap(r=>r.events.filter(e=>e.kind==='worldline').map(e=>[r.at,rates[e.movie]]));assert.ok(changes.every(x=>x[1]));
 let index=0;for(const part of g.nodes[node].chunks){const block=JSON.parse(fs.readFileSync(path.join(common,'story',part.file)));for(const row of block.frames){if(sources[row[5].split(':')[0]].source==='SG11_08'&&!changes.some(x=>x[1]===trueEnd)){changes.push([index,trueEnd]);}index++;}}
 changes.sort((a,b)=>a[0]-b[0]);world[node]=[rates[trace.starts[node].movie]||initial,changes];
}
// Bounds stay at 16 KB; no VM and no large event file is loaded on the watch.
let group={},pack=0,max=0;const map={};const folder=path.join(common,'mobile-packs');const oldFiles=fs.readdirSync(folder).filter(x=>/^[0-9]+\.txt$/.test(x));
function flush(){if(!Object.keys(group).length)return;const text=JSON.stringify(group);max=Math.max(max,Buffer.byteLength(text));fs.writeFileSync(path.join(folder,pack+'.txt'),text);}
for(const [node,rows]of Object.entries(all)){const probe={...group,[node]:rows};if(Object.keys(group).length&&Buffer.byteLength(JSON.stringify(probe))>16000){flush();group={};pack++;}group[node]=rows;map[node]=pack;}flush();assert.ok(max<=16000);
for(const file of oldFiles)if(Number(file.slice(0,-4))>pack)fs.unlinkSync(path.join(folder,file));
fs.writeFileSync(path.join(common,'mobile-event-map.js'),'export const mobileEventFiles='+JSON.stringify(map)+';\n');
fs.writeFileSync(path.join(common,'worldline-data.js'),'export const worldlineData='+JSON.stringify(world)+';\nexport const INITIAL_WORLDLINE='+JSON.stringify(initial)+';\nexport const TRUE_WORLDLINE='+JSON.stringify(trueEnd)+';\n');
const report={result:'passed',originalDeleteInstructions:deletes,originalReadAndReplyBitInstructions:readOps,nodes:Object.keys(all).length,eventPacks:pack+1,maxReadBytes:max,originalMovieRates:rates,initialWorldline:initial,trueWorldline:trueEnd,numberEvidence:'artwork/v026/worldline-settled-contact.png (original 1280x720 Bink frame 125); first beta: inspect-7-35.png',trueWorldlineEvidence:'https://us.super-groupies.com/collections/steins-gate/products/okabe-rintaro-model-watch-steins-gate',trueWorldlineEntry:'First original SG11_08 hospital frame after successful operation; permanent title lock only after actual True End',legacyMigration:'Filter existing mail using original erase/acquire events and possible reply descendants; no new mail synthesized by migration'};
fs.writeFileSync(path.join(root,'reports/worldline-v026-proof.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
