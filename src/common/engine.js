import {configureMobile,ensureMobile,syncMobile,beginDeferred,deferredBoundary,answerDeferred,deferredLimit,returnCall,nextPresentationBoundary,deferKeyPhone,keyPhoneBoundary,keyPhoneLimit,answerKeyPhone} from './mobile.js';
import {catalog} from './catalog.js';
import {phoneContext,outgoingId} from './phone.js';
import {worldlineFor} from './worldline.js';
let graph=null;
function clone(x){return JSON.parse(JSON.stringify(x));}
export function configure(data){
 if(!data||data.format!==2||!data.nodes[data.initial])throw Error('剧情目录无效');graph=data;configureMobile(data);catalog.initial=data.initial;
 catalog.scenes={};Object.keys(data.nodes).forEach(id=>catalog.scenes[id]={length:data.nodes[id].count+1,chunks:data.nodes[id].chunks});
 catalog.chapters=Object.keys(data.chapterStarts).map(name=>({name,id:data.chapterStarts[name].node,cursor:data.chapterStarts[name].index,route:0}));
 catalog.routes[0].scenes=catalog.chapters.map(x=>x.id);catalog.messages=data.messages||{};
}
export function newState(chapter,story,entry){return {format:2,mailLifeVersion:1,chapter:chapter||catalog.initial,cursor:entry||0,progression:story?'story':'chapter',inbox:[],sent:[],mailOwners:{},endings:{},history:[],choice:null,ended:false,text:'',title:'',chapterCardTitle:'',openingDone:false,date:''};}
export function newChapterState(item){const s=newState(item.id,false,item.cursor);ensureMobile(s).presentationEntry={node:item.id,at:item.cursor};s.openingDone=item.id!=='n0'||item.cursor>=557;return s;}
export function checkpoint(s){return {format:2,mailLifeVersion:s.mailLifeVersion,worldline:worldlineFor(s),chapter:s.chapter,cursor:s.cursor,progression:s.progression,inbox:s.inbox.slice(),sent:(s.sent||[]).slice(),mailOwners:clone(s.mailOwners||{}),sourceSite:s.sourceSite||'',mobile:clone(ensureMobile(s)),deferred:s.deferred?clone(s.deferred):null,callReturn:s.callReturn?clone(s.callReturn):null,endings:clone(s.endings),text:(s.text||'').slice(0,100),title:s.title||'',chapterCardTitle:s.chapterCardTitle||'',openingDone:s.openingDone===true,date:s.date||''};}
export function restore(saved){
 if(!saved||saved.format!==2||!graph.nodes[saved.chapter]||!Number.isInteger(saved.cursor)||saved.cursor<0||saved.cursor>graph.nodes[saved.chapter].count||!Array.isArray(saved.inbox)||saved.inbox.length>700)throw Error('新版存档位置无效');
 if(saved.sent!==undefined&&(!Array.isArray(saved.sent)||saved.sent.length>700||saved.sent.some(id=>!Number.isInteger(id))))throw Error('已发送记录无效');
 const s=Object.assign(newState(),clone(saved),{history:[],choice:null,ended:false,mailLifeVersion:saved.mailLifeVersion===1?1:0,chapterCardTitle:typeof saved.chapterCardTitle==='string'?saved.chapterCardTitle:(saved.title||'')});
 if(typeof saved.openingDone!=='boolean')s.openingDone=saved.chapter!=='n0'||saved.cursor>=557;
 if(!saved.mobile)ensureMobile(s).presentationEntry={node:s.chapter,at:s.cursor};return s;
}
function remember(s){s.history.push(checkpoint(s));if(s.history.length>16)s.history.shift();}
function incoming(s,id){if(Number.isInteger(id)&&s.inbox.indexOf(id)<0){s.inbox.push(id);s.mailOwners[id]=phoneContext(s).owner;}}
export function locate(s){
 ensureMobile(s);returnCall(s);syncMobile(s);beginDeferred(s);const boundary=keyPhoneBoundary(s)||deferredBoundary(s);if(boundary){s.choice=boundary;return boundary;}
 const node=graph.nodes[s.chapter];if(!node)throw Error('剧情节点无效');
 if(s.cursor>=node.count){
  if(node.choice){s.choice=node.choice;incoming(s,node.choice.id);return {type:'choice',...node.choice};}
  if(!node.ending)throw Error('剧情连接缺失');s.ended=true;s.endingName=node.ending;s.endings[node.ending]=true;return {type:'end'};
 }
 let at=0;for(const part of node.chunks){if(s.cursor<at+part.count)return {type:'text',file:part.file,base:at};at+=part.count;}
 throw Error('剧情分块索引无效');
}
export function readFrame(chunk,s,base){
 const f=locate(s);if(f.type!=='text')return f;syncMobile(s);
 const i=s.cursor-(base||0);if(!chunk||!chunk.frames||i<0||i>=chunk.frames.length)return {type:'yield'};
 const row=chunk.frames[i];s.choice=null;s.speaker=row[0];s.text=row[1];s.date=row[3];s.title=row[4];s.sourceSite=row[5];
 s.sceneLayers=chunk.views[row[2]].map((v,i)=>({key:'layer:'+i+':'+v[0],image:v[0],left:v[1],top:v[2],width:v[3],height:v[4],opacity:v[5]/1000,priority:v[6]}));
 return {type:'text',speaker:s.speaker,text:s.text,skipBlank:/^[\s\uE000\uE03F]*$/.test(s.text)};
}
export function next(s){if(locate(s).type!=='text')return;remember(s);s.cursor++;}
export function choose(s,item,index){
 if(ensureMobile(s).keyPhone&&item.keyPhone){remember(s);answerKeyPhone(s,index);return;}
 if(s.deferred&&item.deferred){remember(s);answerDeferred(s,item);return;}
 const f=locate(s);if(f.type!=='choice'||!Number.isInteger(index)||!f.items[index]||item.to!==f.items[index].to)throw Error('当前选项无效');
 remember(s);if((item.action==='noCall'||item.action==='noSend')&&deferKeyPhone(s,phoneContext(s).owner))return;incoming(s,f.id);const sentId=outgoingId(f,f.items[index]);
 if(Number.isInteger(sentId)){if(s.sent.indexOf(sentId)<0)s.sent.push(sentId);s.mailOwners[sentId]=phoneContext(s).owner;}
 s.chapter=f.items[index].to;s.cursor=0;s.choice=null;s.ended=false;
}
export function previous(s){const old=s.history.pop();if(!old)return false;const history=s.history;Object.assign(s,restore(old),{history});return true;}
export function nextChapter(s){
 if(locate(s).type!=='text')return null;remember(s);const n=graph.nodes[s.chapter],next=(n.breaks||[]).find(x=>x[0]>s.cursor);s.cursor=nextPresentationBoundary(s,next?next[0]:n.count);for(const limit of [deferredLimit(s),keyPhoneLimit(s)])if(limit!==null)s.cursor=Math.min(s.cursor,limit);return {direct:true};
}
export function storyDate(s){return s.date||'';}
export function chapterTitle(s){return s.title||'章节开头';}
