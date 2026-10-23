const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),source=path.resolve(root,'../steins-rw5');
const d=require(path.join(source,'tools/load-data.cjs'))(source),g=JSON.parse(fs.readFileSync(path.join(root,'src/common/graph.txt')));
const decoded=JSON.parse(fs.readFileSync(path.join(root,'../steins-probe/decoded-glyphs.json')))._MAIL;
const ids=new Set(Object.keys(g.messages).map(Number));
for(const n of Object.values(g.nodes))for(const x of n.choice?n.choice.items:[])if(x.action==='reply')ids.add(x.id);
// Original D-Mail macro labels 214/215 use message IDs 233/253.
ids.add(233);ids.add(253);
const messages={};for(const id of ids){const m=d.mail[id];if(!m||!m.text)throw Error('Missing original message '+id);messages[id]={sender:m.sender,title:m.title,type:m.type,stamp:m.stamp};fs.writeFileSync(path.join(root,'src/common/mail',id+'.txt'),JSON.stringify({sender:m.sender,title:m.title,text:m.text,stamp:m.stamp,type:m.type}));}
const owners={};for(const [id,ops]of Object.entries(d.ops)){if(!d.catalog.scenes[id].source.startsWith('SG'))continue;const rows=[];ops.forEach((o,i)=>{if(o[0]==='set'&&JSON.stringify(o[1])==='["W",6856]'&&o[2]==='='&&Number.isInteger(o[3]))rows.push([i+1,o[3]]);});if(rows.length)owners[id]=rows;}
const phoneData={sources:Object.fromEntries(Object.entries(d.catalog.scenes).map(([id,x])=>[x.source,id])),contacts:d.catalog.contacts.map((name,id)=>({id,name,number:decoded[84+id*2].text})),books:d.catalog.contactRecovery,owners,messages,dmail:{SG06_23:233,SG07_13:253}};
fs.writeFileSync(path.join(root,'src/common/phone-data.js'),'export const phoneData='+JSON.stringify(phoneData)+';\n');
fs.writeFileSync(path.join(root,'reports/phone-v023-data.json'),JSON.stringify({messages:ids.size,contacts:phoneData.contacts.length,ownerScripts:Object.keys(owners),source:'Original extracted _MAIL rows, old converter contactRecovery and explicit W6856 changes. No runtime VM added.'},null,2));
console.log('PHONE_DATA',ids.size,phoneData.contacts.length);
