// Compare every visible text/choice and the complete VM state on six routes.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),data=require('./load-data.cjs')(root),reference=JSON.parse(fs.readFileSync(path.join(root,'tools/story-reference.json'),'utf8'));
function machine(){let dispatches=0;const c={catalog:data.catalog,count:()=>dispatches++};vm.createContext(c);const code=fs.readFileSync(path.join(root,'src/common/engine.js'),'utf8').replace(/^import[^;]+;/gm,'').replace(/export /g,'').replace('const o=ops[local],op=o[0];','const o=ops[local],op=o[0];count();');vm.runInContext(fs.readFileSync(path.join(root,'src/common/phone-guide.js'),'utf8').replace(/export /g,'')+code+';this.api={configure,newState,readFrame,choose,next,nextChapter,readChapterSkip};',c);c.api.configure(data.memory,data.mail,JSON.parse(fs.readFileSync(path.join(root,'src/common/assets.txt'),'utf8')),data.channels);return {api:c.api,count:()=>dispatches};}
function equal(a,b){if(a===b)return true;if(typeof a!==typeof b||!a||!b||typeof a!=='object')return false;const keys=Object.keys(a).filter(k=>k!=='history'),other=Object.keys(b).filter(k=>k!=='history');if(keys.length!==other.length)return false;return keys.every(k=>Object.prototype.hasOwnProperty.call(b,k)&&equal(a[k],b[k]));}
function visible(m,ops,s,skip){for(let n=0;n<10000;n++){const f=skip?m.api.readChapterSkip(ops[s.chapter],s,skip,0,ops[s.chapter].length):m.api.readFrame(ops[s.chapter],s,0,ops[s.chapter].length);if(!['yield','jump'].includes(f.type))return f;}throw Error('no frame');}
const replies=[299,303,306,312,318,329,336,342,346,362,378,383,387],results=[];
for(const route of ['suzuha','faris','luka','mayuri','kurisu','true']){
 const old=machine(),fast=machine(),a=old.api.newState(undefined,true),b=fast.api.newState(undefined,true);let frames=0,choices=0;
 for(let guard=0;guard<40000;guard++){
  const first=visible(old,reference,a),second=visible(fast,data.ops,b);
  if(!equal(first,second)||!equal(a,b)){fs.writeFileSync(path.join(root,'reports/optimization-failure.json'),JSON.stringify({route,frame:frames,reference:a,optimized:b,first,second},null,2));throw Error('State mismatch '+route+' '+a.chapter+':'+a.cursor);}
  frames++;
  if(first.type==='end')break;
  if(first.type==='text'){old.api.next(a);fast.api.next(b);a.history=[];b.history=[];continue;}
  assert.equal(first.type,'choice');choices++;let action='ignore',wanted;const scene=data.catalog.scenes[a.rootChapter].source;
  if(a.choice.kind==='dmail')action=(route==='suzuha'||route==='faris'&&scene.startsWith('SG07'))?'noSend':'send';
  else if(a.choice.kind==='phone')action=route==='luka'&&scene==='SG08_12'?'noCall':'call';
  else if(a.choice.kind==='dial')wanted=first.items.find(i=>i.value===1);
  else if(a.choice.kind==='mail')action=['kurisu','true'].includes(route)?'read':'ignore';
  else if(a.choice.kind==='reply'&&['kurisu','true'].includes(route))wanted=first.items.find(i=>i.action==='reply'&&replies.includes(i.id)&&(route!=='kurisu'||i.id!==387));
  const item=wanted||first.items.find(i=>i.action===action)||first.items.find(i=>i.action==='noCall')||first.items[0],index=first.items.indexOf(item);old.api.choose(a,item,index);fast.api.choose(b,second.items[index],index);a.history=[];b.history=[];
 }
 assert.equal(a.ended,true);results.push({route,visibleFramesCompared:frames,choicesCompared:choices,completeStateEqual:true,ending:a.endingName,originalDispatches:old.count(),optimizedDispatches:fast.count(),reductionPercent:Math.round((1-fast.count()/old.count())*10000)/100});console.log(results.at(-1));
}
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/story-optimization.json'),'utf8'));report.result='passed';report.differentialRoutes=results;report.scope='Full registers, stack, loops, switches, date, graphics, mail, contacts and visible text/choice match at every frame on six selected ending paths; not exhaustive over every optional reply combination.';fs.writeFileSync(path.join(root,'reports/story-optimization.json'),JSON.stringify(report,null,2));
