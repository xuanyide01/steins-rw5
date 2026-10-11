// Create bounded runtime resources from the verified, unchanged story.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),common=path.join(root,'src/common'),read=n=>JSON.parse(fs.readFileSync(path.join(common,n+'.txt'),'utf8'));
function write(name,data){const p=path.join(common,name+'.txt');fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(data));return fs.statSync(p).size;}
const letters=read('mail'),threads=read('channel'),images=read('assets');
const metadata=letters.map(row=>({type:row.type,replies:row.replies,sender:row.sender,title:row.title}));
const mailBytes=write('mail-index',metadata),channelBytes=write('channel-index',threads.map(rows=>Array(rows.length).fill(null)));
letters.forEach((row,id)=>write('mail/'+id,{text:row.text,keywords:row.keywords}));threads.forEach((rows,id)=>write('channel/'+id,rows));
// Names, paths and dimensions already exist in assets.js or are not used by VM.
const runtime={portraits:images.portraits,portraitGeometry:images.portraitGeometry,backgroundCrops:images.backgroundCrops,backgroundMasks:images.backgroundMasks,backgroundGeometry:{},assets:{}};
for(const [id,g] of Object.entries(images.backgroundGeometry))if(g.size[0]!==1920||g.size[1]!==1080)runtime.backgroundGeometry[id]={size:g.size};
for(const key of Object.keys(images.assets))if(key.startsWith('color'))runtime.assets[key]=true;
const assetBytes=write('runtime-assets',runtime);
const data=require('./load-data.cjs')(root),catalog=data.catalog;let book=[0,1,2,9,3],owner=0,recovery={};
// Metadata scans use the original logical stream; runtime batches preserve PCs.
if(Object.values(data.ops).some(ops=>ops.some(o=>o[0]==='assigns')))data.ops=JSON.parse(fs.readFileSync(path.join(root,'tools/story-reference.json'),'utf8'));
// Original MAIN00 order, including contact additions/removals between scenes.
for(let i=catalog.scenes[catalog.flowScene].entries[18];i<data.ops[catalog.flowScene].length;i++){
 const op=data.ops[catalog.flowScene][i];
 if(op[0]==='PhoneSG_0F'&& !book.includes(op[1]))book.push(op[1]);
 if(op[0]==='PhoneSG_10')book=book.filter(id=>id!==op[1]);
 if(op[0]!=='ScriptLoad'||op[1]!==3)continue;
 const id=op[2];if(!catalog.scenes[id].source.startsWith('SG'))continue;
 const rows=[[0,book.slice()]];owner=0;
 data.ops[id].forEach((o,cursor)=>{if(o[0]==='set'&&o[1][0]==='W'&&o[1][1]===6856&&Number.isInteger(o[3]))owner=o[3];if(owner!==0)return;if(o[0]==='PhoneSG_0F'&&!book.includes(o[1])){book.push(o[1]);rows.push([cursor+1,book.slice()]);}if(o[0]==='PhoneSG_10'){book=book.filter(x=>x!==o[1]);rows.push([cursor+1,book.slice()]);}});
 recovery[id]=rows;
}
catalog.contactRecovery=recovery;fs.writeFileSync(path.join(common,'catalog.js'),'export const catalog='+JSON.stringify(catalog)+';\n');
const {api}=require('../tests/harness.cjs');
function initial(progress){const s=api.newState(undefined,true);Object.assign(s.variables,progress);let f,hops=0;do{f=api.readFrame(data.ops[s.chapter],s);assert.ok(++hops<20000);}while(['jump','yield'].includes(f.type));assert.equal(f.type,'text');return {s,hops};}
const {s,hops}=initial({}),snapshot=api.checkpoint(s),flags=['F:800','F:801','F:802','F:803','F:804','F:805','F:806','F:807','F:860','F:864','F:863'];
// Keep progress-dependent initialization, deduplicating tiny variable patches.
const patches=[],indices=[],keys={};
for(let mask=0;mask<(1<<flags.length);mask++){
 const progress={};flags.forEach((flag,i)=>{if(mask&(1<<i))progress[flag]=1;});
 const live=initial(progress).s,prepared=api.restore(snapshot);Object.assign(prepared.variables,progress);
 const patch={};for(const key of new Set(Object.keys(live.variables).concat(Object.keys(prepared.variables))))if(live.variables[key]!==prepared.variables[key])patch[key]=live.variables[key]===undefined?null:live.variables[key];
 for(const [k,v] of Object.entries(patch))if(v===null)delete prepared.variables[k];else prepared.variables[k]=v;
 assert.deepEqual(JSON.parse(JSON.stringify(api.checkpoint(prepared))),JSON.parse(JSON.stringify(api.checkpoint(live))));
 const key=JSON.stringify(patch);if(keys[key]===undefined){keys[key]=patches.length;patches.push(patch);}indices.push(keys[key]);
}
fs.writeFileSync(path.join(common,'startup-patches.js'),'export const startupPatches='+JSON.stringify({flags,indices,patches})+';\n');
const startupBytes=write('startup',snapshot);
const report={result:'passed',initialCursor:[s.chapter,s.cursor],initializationHopsRemoved:hops-1,progressFlagsCompared:flags.length,fontBytes:fs.statSync(path.join(common,'sg-original.ttf')).size,eagerTextBytesBefore:fs.statSync(path.join(common,'mail.txt')).size+fs.statSync(path.join(common,'channel.txt')).size+fs.statSync(path.join(common,'assets.txt')).size,eagerTextBytesAfter:mailBytes+channelBytes+assetBytes,mailBodies:letters.length,forumThreads:threads.length,startupBytes,storyCacheMaxBlocks:3,storyCacheMaxSourceChars:40000,historyMaxChars:48000,mailBodyMaxChars:16000,physicalCrashCause:'not confirmed without firmware log; mitigations target font, eager resources, startup macros and caches'};
fs.writeFileSync(path.join(root,'reports/memory-optimization.json'),JSON.stringify(report,null,2));console.log(report);
