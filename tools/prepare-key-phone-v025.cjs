// Prove the original reopen window offline. No SC3 interpreter is shipped.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),source=path.resolve(root,'../steins-rw5'),d=require(path.join(source,'tools/load-data.cjs'))(source),g=JSON.parse(fs.readFileSync(path.join(root,'src/common/graph.txt'))),states=JSON.parse(fs.readFileSync(path.join(root,'reports/phone-states-v024.json')));
let code=fs.readFileSync(path.join(source,'src/common/engine.js'),'utf8').replace(/^import[^;]+;/gm,'').replace(/export /g,'').replace(/function remember\(s\)\{[\s\S]*?\nfunction next\(/,'function remember(s){}\nfunction next(');
const ctx={catalog:d.catalog};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(source,'src/common/phone-guide.js'),'utf8').replace(/export /g,'')+';'+code+';this.api={configure,readFrame,next,choose,openPhone,storyDate,chapterTitle};',ctx);const a=ctx.api,read=n=>JSON.parse(fs.readFileSync(path.join(source,'src/common',n+'.txt')));a.configure(d.memory,d.mail,read('runtime-assets'),d.channels);
const clone=x=>JSON.parse(JSON.stringify(x)),same=(x,y)=>JSON.stringify(x)===JSON.stringify(y),cache={};
function baseline(id){return cache[id]||(cache[id]=g.nodes[id].chunks.flatMap(c=>{const b=JSON.parse(fs.readFileSync(path.join(root,'src/common/story',c.file)));return b.frames.map(r=>[r[0],r[1],b.views[r[2]],...r.slice(3)]);}));}
function frame(s){for(let guard=0;guard<500000;guard++){const ops=d.ops[s.chapter],f=a.readFrame(ops,s,0,ops.length);if(f.type==='text')return {f,row:[f.speaker||'',f.text||'',(s.sceneLayers||[]).map(x=>[x.image,x.left,x.top,x.width,x.height,Math.round(x.opacity*1000),x.priority]),a.storyDate(s),a.chapterTitle(s),s.chapter+':'+s.cursor+(s.article?':'+s.article.index:'')]};if(f.type==='choice'){const c=s.choice;if(['phone','dmail'].includes(c.kind))return {f};const item=f.items.find(x=>x.action==='ignore')||f.items[0];a.choose(s,item,f.items.indexOf(item));}else if(f.type==='end')return {f};}throw Error('Guard');}
const windows={},report=[];
for(const [id,n]of Object.entries(g.nodes)){
 const c=n.choice;if(!c||!['phone','dmail'].includes(c.kind))continue;
 const yes=c.items.find(x=>x.action==='call'||x.action==='send'),no=c.items.find(x=>x.action==='noCall'||x.action==='noSend');assert.ok(yes&&no);
 const base=baseline(no.to),target=baseline(yes.to),s=clone(states[no.to]),rejoin=[];let limit=0;
 for(;limit<100;limit++){
  const x=frame(s);assert.equal(x.f.type,'text');assert.ok(same(x.row,base[limit]),id+' no-call prefix '+limit);
  if(!s.phoneWindow||s.phoneWindow.completed)break;
  const late=clone(s);a.openPhone(late);const options=a.readFrame(d.ops[late.chapter],late,0,d.ops[late.chapter].length).items;const item=options.find(x=>x.action===yes.action&&(yes.id===undefined||x.id===yes.id));assert.ok(item,id+' reopen '+limit);a.choose(late,item,options.indexOf(item));a.next(late);
  const first=frame(late);assert.equal(first.f.type,'text');const at=target.findIndex(r=>same(r,first.row));assert.ok(at>=0,id+' late rejoin '+limit);rejoin.push(at);
  // Compare 32 subsequent text records at every possible late input position.
  for(let k=0;k<Math.min(32,target.length-at);k++){const actual=k?frame(late):first;if(actual.f.type!=='text')break;assert.ok(same(actual.row,target[at+k]),id+' late text/layers/date '+limit+':'+k);a.next(late);}
  a.next(s);
 }
 assert.ok(limit>0&&limit<100,id+' window bounded');assert.equal(new Set(rejoin).size,1,id+' constant rejoin');
 windows[id]={skip:no.to,go:yes.to,limit,after:rejoin[0],source:c.source,sent:c.kind==='dmail'?states[no.to].variables['W:6817']:undefined};report.push({node:id,source:c.source,limit,rejoin:rejoin[0],lateInputsCompared:rejoin.length,recordsComparedPerInput:32});console.log('KEY_PHONE',id,limit,rejoin[0]);
}
fs.writeFileSync(path.join(root,'src/common/key-phone-windows.js'),'export const keyPhoneWindows='+JSON.stringify(windows)+';\n');fs.writeFileSync(path.join(root,'reports/key-phone-v025-proof.json'),JSON.stringify({result:'passed',windows:report},null,2));
