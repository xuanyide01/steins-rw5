// Preserve logical PCs, labels and save positions while reducing VM dispatch.
// Only pure register assignments are merged. No phone/choice/call/graphics op
// is removed; a constant write is removed only if overwritten before any read.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),common=path.join(root,'src/common'),data=require('./load-data.cjs')(root),backup=path.join(root,'tools/story-reference.json');
if(Object.values(data.ops).some(ops=>ops.some(o=>o[0]==='assigns'))){if(!fs.existsSync(backup))throw Error('Unoptimized reference missing');data.ops=JSON.parse(fs.readFileSync(backup,'utf8'));}else fs.writeFileSync(backup,JSON.stringify(data.ops));
const ctx={catalog:data.catalog};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(common,'engine.js'),'utf8').replace(/^import[^;]+;/gm,'').replace(/export /g,'')+';this.constant=value;',ctx);
const stats={result:'pending',referenceSHA256:crypto.createHash('sha256').update(fs.readFileSync(backup)).digest('hex'),logicalPositions:0,batches:0,batchedAssignments:0,deadConstantWrites:0,constantExpressions:0,phoneInstructionsRemoved:0,logicalPCsUnchanged:true,branchesAndLabelsRetained:true};
function fold(e){if(!Array.isArray(e))return e;if(typeof e[0]!=='string')return e.map(fold);const a=e.map((x,i)=>i?fold(x):x);if(['+','-','*','/','%','==','!=','<','>','<=','>=','&','|','^','<<','>>','!','~'].includes(a[0])&&a.slice(1).every(x=>typeof x==='number')){stats.constantExpressions++;return ctx.constant(a,{variables:{}});}return a;}
function references(e,out){if(!Array.isArray(e))return;if(['W','T','F'].includes(e[0])){out.add(e[0]+':'+(Number.isInteger(e[1])?e[1]:'*'));references(e[1],out);return;}for(let i=1;i<e.length;i++)references(e[i],out);}
for(const [id,original] of Object.entries(data.ops)){
 const ops=original.map(o=>o[0]==='text'?o: o.map((x,i)=>i?fold(x):x)),protectedPCs=new Set(Object.values(data.catalog.scenes[id].entries));stats.logicalPositions+=ops.length;
 // Every label is a boundary. Every control instruction is outside a batch.
 for(let start=0;start<ops.length;start++){
  if(ops[start][0]!=='set')continue;
  let end=start+1;while(end<ops.length&&end%512!==0&&!protectedPCs.has(end)&&ops[end][0]==='set')end++;
  if(end-start<2)continue;
  const overwrite=new Map(),steps=[];
  for(let pc=end-1;pc>=start;pc--){const o=ops[pc],target=o[1],key=typeof target[1]==='number'?target[0]+':'+target[1]:null;
   if(key&&o[2]==='='&&typeof o[3]==='number'&&overwrite.has(key)){stats.deadConstantWrites++;steps.push([pc,target,o[2],o[3],overwrite.get(key)]);continue;}
   const reads=new Set();references(o[3],reads);references(target[1],reads);if(o[2]!=='='&&key)reads.add(key);if(o[2]!=='='&&!key)reads.add(target[0]+':*');
   for(const r of reads){if(r.endsWith(':*')){for(const k of Array.from(overwrite.keys()))if(k.startsWith(r.slice(0,2)))overwrite.delete(k);}else overwrite.delete(r);}
   if(key&&o[2]==='=')overwrite.set(key,pc);else if(key)overwrite.delete(key);
   steps.push([pc,target,o[2],o[3]]);
  }
  steps.reverse();stats.batches++;stats.batchedAssignments+=end-start;
  ops[start]=['assigns',start,end,steps];for(let pc=start+1;pc<end;pc++)ops[pc]=['batchAt',start];start=end-1;
 }
 for(let block=0;block*512<ops.length;block++)fs.writeFileSync(path.join(common,'story',id,block+'.txt'),JSON.stringify(ops.slice(block*512,(block+1)*512)));
}
stats.result='converted; differential verification required';fs.writeFileSync(path.join(root,'reports/story-optimization.json'),JSON.stringify(stats,null,2));console.log(stats);
