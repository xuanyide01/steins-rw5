// Lossless content-defined chunking. Shared branch prefixes reference one file;
// watch row format, node/cursor save addresses and reader code remain unchanged.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),common=path.join(root,'src/common');
const graph=JSON.parse(fs.readFileSync(path.join(common,'graph.txt')));
const original=JSON.parse(JSON.stringify(graph)),cache=new Map(),packed=new Map();
const sourceFolder=path.join(common,'story'),target=path.join(root,'reports/install-compact-candidate');
fs.mkdirSync(target,{recursive:true});
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function read(name){if(!cache.has(name))cache.set(name,JSON.parse(fs.readFileSync(path.join(sourceFolder,name))));return cache.get(name);}
function rows(node){const all=[];for(const c of node.chunks){const b=read(c.file);assert.equal(b.frames.length,c.count);for(const r of b.frames)all.push([r[0],r[1],b.views[r[2]],...r.slice(3)]);}assert.equal(all.length,node.count);return all;}
function encode(frames){const views=[],index=new Map();return JSON.stringify({frames:frames.map(r=>{const k=JSON.stringify(r[2]);if(!index.has(k)){index.set(k,views.length);views.push(r[2]);}return [r[0],r[1],index.get(k),...r.slice(3)];}),views});}
const maxBytes=19781;let frameCount=0,oldReferences=0,newReferences=0,largest=0;
for(const node of Object.values(graph.nodes)){
 const all=rows(node);oldReferences+=node.chunks.length;node.chunks=[];let block=[];
 function flush(){if(!block.length)return;const text=encode(block),bytes=Buffer.byteLength(text);assert.ok(bytes<=maxBytes);const name='c-'+hash(text).slice(0,24)+'.txt';if(packed.has(name))assert.equal(packed.get(name),text);else packed.set(name,text);node.chunks.push({file:name,count:block.length});largest=Math.max(largest,bytes);block=[];newReferences++;}
 for(const r of all){const next=block.concat([r]);if(Buffer.byteLength(encode(next))>maxBytes)flush();block.push(r);frameCount++;if(block.length>=12&&parseInt(hash(r[5]+'\0'+r[1]).slice(0,8),16)%48===0)flush();}
 flush();
}
// Every frame including source location, date and all layers must stay identical.
for(const id of Object.keys(graph.nodes)){
 const before=rows(original.nodes[id]),after=[];
 for(const c of graph.nodes[id].chunks){const b=JSON.parse(packed.get(c.file));for(const r of b.frames)after.push([r[0],r[1],b.views[r[2]],...r.slice(3)]);}
 assert.deepEqual(after,before,id);
 const a={...original.nodes[id]},b={...graph.nodes[id]};delete a.chunks;delete b.chunks;assert.deepEqual(a,b,id+' branch metadata');
}
for(const [name,text] of packed)fs.writeFileSync(path.join(target,name),text);
fs.writeFileSync(path.join(target,'graph.json'),JSON.stringify(graph));
const oldBytes=[...cache.values()].reduce((sum,b)=>sum+Buffer.byteLength(JSON.stringify(b)),0),newBytes=[...packed.values()].reduce((sum,s)=>sum+Buffer.byteLength(s),0);
const report={result:'passed',allNodeFramesDateLayersSourceIdentical:true,branchMetadataIdentical:true,saveNodeCursorUnchanged:true,frameCount,oldStoryFiles:cache.size,newStoryFiles:packed.size,oldReferences,newReferences,oldStoryBytes:oldBytes,newStoryBytes:newBytes,maximumChunkBytes:largest,watchFormatUnchanged:true};
if(process.argv.includes('--apply')){
 const baseline=path.join(root,'reports/install-v020-baseline');fs.mkdirSync(baseline,{recursive:true});
 const oldDir=path.join(baseline,'story');for(const p of [sourceFolder,oldDir,target])assert.ok(path.resolve(p).startsWith(root+path.sep));
 assert.ok(!fs.existsSync(oldDir),'Baseline already exists; do not overwrite');fs.copyFileSync(path.join(common,'graph.txt'),path.join(baseline,'graph.txt'));fs.renameSync(sourceFolder,oldDir);fs.mkdirSync(sourceFolder);
 for(const [name,text] of packed)fs.writeFileSync(path.join(sourceFolder,name),text);fs.writeFileSync(path.join(common,'graph.txt'),JSON.stringify(graph));report.applied=true;
}
fs.writeFileSync(path.join(root,'reports/install-data-compaction.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
