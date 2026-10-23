const fs=require('fs'),path=require('path'),assert=require('assert/strict');const root=path.resolve(__dirname,'..'),common=path.join(root,'src/common'),g=JSON.parse(fs.readFileSync(path.join(common,'graph.txt'))),t=JSON.parse(fs.readFileSync(path.join(root,'reports/phone-trace-v024.json'))),d=require('../..//steins-rw5/tools/load-data.cjs')(path.resolve(root,'../steins-rw5'));
const windows={},proof=[],cache={};function rows(id){return cache[id]||(cache[id]=g.nodes[id].chunks.flatMap(c=>{const b=JSON.parse(fs.readFileSync(path.join(common,'story',c.file)));return b.frames.map(r=>[r[0],r[1],b.views[r[2]],...r.slice(3)]);}));}
for(const [id,n]of Object.entries(g.nodes)){
 if(n.choice?.kind!=='mail')continue;
 const original=n.choice,read=original.items.find(i=>i.action==='read'),skip=original.items.find(i=>i.action==='ignore'),reply=g.nodes[read.to].choice;
 assert.equal(reply.kind,'reply');const options=reply.items.map(x=>({...x})),targets=[skip.to,...options.map(i=>i.to)],all=targets.map(rows);let commonCount=0;
 while(all.every(a=>a[commonCount]&&JSON.stringify(a[commonCount])===JSON.stringify(all[0][commonCount])))commonCount++;
 const expiry=targets.map(target=>t[target].find(r=>r.events.some(e=>e.kind==='expire'||e.kind==='PhoneSG_01'&&e.bit===3&&e.id===original.id))?.at);
 assert.ok(expiry.every(e=>Number.isInteger(e)&&e>0&&e===expiry[0]&&e<=commonCount),id+' unsafe window '+expiry+' / '+commonCount);
 windows[id]={id:original.id,limit:expiry[0],skip:skip.to,read:options.find(i=>i.action==='ignore').to,options:options.filter(i=>i.action==='reply')};
 proof.push({node:id,mail:original.id,originalExpiry:expiry[0],identicalPrefix:commonCount,targets});
}
fs.writeFileSync(path.join(common,'mobile-windows.js'),'export const mobileWindows='+JSON.stringify(windows)+';\n');
fs.mkdirSync(path.join(common,'mobile'),{recursive:true});let max=0,total=0;
for(const [id,records]of Object.entries(t)){
 const result=[];
 for(const r of records){const e=[];let expired=false;for(const x of r.events){
  if(x.kind==='expire'||x.kind==='PhoneSG_01'&&x.bit===3){if(!expired){e.push(['expire']);expired=true;}}
  if(x.kind==='queue'&&x.channel>0)e.push(['queue',x.channel,x.id]);
  if(x.kind==='readRule')e.push(['rule',x.pc]);
  if(x.kind==='dispatch'&&x.channel>0&&x.channel<5&&x.timer>=0)e.push(['dispatch',x.channel]);
  if(x.kind==='receive')e.push(['receive',x.id,x.channel===undefined?-1:x.channel,!!x.ask,x.owner]);
  if(x.kind==='moekaMail')e.push(['presentation',x.id,x.presentationType,x.owner]);
  if(x.kind==='choice'&&['phone','dmail'].includes(x.choice.kind))e.push(['call',x.site,x.owner,x.choice.kind,x.items.filter(i=>['call','compose','send'].includes(i.action)).map(i=>({id:i.id,action:i.action,text:i.text})),!!x.waiting]);
 }
 // A draft followed by its send animation before the next dialogue is one action.
 const sent=e.filter(x=>x[0]==='presentation'&&x[2]==='send');
 const compact=e.filter(x=>!(x[0]==='presentation'&&x[2]==='draft'&&sent.some(y=>y[1]===x[1]&&y[3]===x[3])));
 if(compact.length)result.push([r.at,compact]);}
 const text=JSON.stringify(result),dir=String(Math.floor(Number(id.slice(1))/48));fs.mkdirSync(path.join(common,'mobile',dir),{recursive:true});fs.writeFileSync(path.join(common,'mobile',dir,id+'.txt'),text);max=Math.max(max,Buffer.byteLength(text));total+=Buffer.byteLength(text);
}
// Keep small directories like the successfully installed 0.2.2 package.
for(let i=0;i<d.mail.length;i++){const dir=String(Math.floor(i/48)).padStart(2,'0');fs.mkdirSync(path.join(common,'letters',dir),{recursive:true});fs.writeFileSync(path.join(common,'letters',dir,i+'.txt'),JSON.stringify(d.mail[i]));}
fs.writeFileSync(path.join(common,'mail-index.js'),'export const mailIndex='+JSON.stringify(d.mail.map(m=>[m.sender,m.title,m.type,m.replies]))+';\n');
fs.writeFileSync(path.join(root,'reports/mobile-v024-proof.json'),JSON.stringify({criticalWindows:proof,maximumEventFile:max,totalEventBytes:total,allOriginalLetters:d.mail.length},null,2));console.log('MOBILE',max,total,proof.length,d.mail.length);
