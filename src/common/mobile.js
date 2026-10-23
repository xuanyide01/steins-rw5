import {mobileEventFiles} from './mobile-event-map.js';
import {mobileWindows} from './mobile-windows.js';
import {mailIndex} from './mail-index.js';
import {callIndex,callClips} from './call-index.js';
import {keyPhoneWindows} from './key-phone-windows.js';
let mobileGraph=null,mobileNode='',mobileEvents=[];
export function configureMobile(graph){mobileGraph=graph;for(const id of Object.keys(callClips)){const c=callClips[id];graph.nodes[id]={count:c.chunks.reduce((n,x)=>n+x.count,0),chunks:c.chunks,breaks:[],callClip:true};}}
export function mobileEventPath(node){return '/common/mobile-packs/'+mobileEventFiles[node]+'.txt';}
export function setMobileEvents(node,events){mobileNode=node;mobileEvents=events;}
export function ensureMobile(s){if(!s.mobile)s.mobile={unread:[],read:[],replied:[],open:{},channels:[999,999,999,999,999],lastNode:'',lastAt:-1,call:null};if(!s.sent)s.sent=[];if(!s.mailOwners)s.mailOwners={};return s.mobile;}
export function mailPath(id){return '/common/letter-packs/'+Math.floor(id/16)+'.txt';}
export function fullMessageInfo(id){const m=mailIndex[id];return m?{sender:m[0],title:m[1],type:m[2],replies:m[3]}:null;}
function receiveMobile(s,id,channel,open,owner){const m=ensureMobile(s);if(!mailIndex[id])return;if(s.inbox.indexOf(id)<0){s.inbox.push(id);if((mailIndex[id][2]===0||mailIndex[id][2]===2)&&m.read.indexOf(id)<0)m.unread.push(id);}s.mailOwners[id]=owner||0;if(open&&m.replied.indexOf(id)<0)m.open[id]=channel;}
function eraseMail(s,first,last){const m=ensureMobile(s),keep=id=>id<first||id>last;s.inbox=s.inbox.filter(keep);s.sent=s.sent.filter(keep);m.unread=m.unread.filter(keep);for(const id of Object.keys(m.open))if(!keep(Number(id)))delete m.open[id];}
function allowFamily(allowed,id){if(!mailIndex[id]||allowed[id])return;allowed[id]=true;for(const next of mailIndex[id][3])allowFamily(allowed,next);}
function migrateMail(s){if(s.mailLifeVersion===1||!mobileEvents.some(r=>r[0]===-1))return;const allowed={};for(const row of mobileEvents){if(row[0]>s.cursor)break;for(const e of row[1]){if(e[0]==='seed')for(const id of e[1])allowed[id]=true;else if(e[0]==='receive')allowFamily(allowed,e[1]);else if(e[0]==='erase')for(let id=e[1];id<=e[2];id++)delete allowed[id];}}const m=ensureMobile(s);s.inbox=s.inbox.filter(id=>allowed[id]);s.sent=s.sent.filter(id=>allowed[id]);m.unread=m.unread.filter(id=>allowed[id]);for(const id of Object.keys(m.open))if(!allowed[id])delete m.open[id];s.mailLifeVersion=1;}
export function syncMobile(s){const m=ensureMobile(s);if(mobileNode!==s.chapter)return;migrateMail(s);const from=m.lastNode===s.chapter?m.lastAt:-1;
 for(const row of mobileEvents){if(row[0]<=from||row[0]>s.cursor)continue;let dispatched={};for(const e of row[1]){
  if(e[0]==='erase')eraseMail(s,e[1],e[2]);
  else if(e[0]==='readBit'){m.read=m.read.filter(id=>id!==e[1]);m.unread=m.unread.filter(id=>id!==e[1]);if(e[2])m.read.push(e[1]);else if(s.inbox.indexOf(e[1])>=0&&mailIndex[e[1]]&&(mailIndex[e[1]][2]===0||mailIndex[e[1]][2]===2))m.unread.push(e[1]);}
  else if(e[0]==='replyBit'){m.replied=m.replied.filter(id=>id!==e[1]);if(e[2])m.replied.push(e[1]);}
  else if(e[0]==='expire')m.open={};
  else if(e[0]==='queue')m.channels[e[1]]=e[2];
  else if(e[0]==='rule'){if(e[1]===1627&&m.read.indexOf(404)>=0)m.channels[1]=405;if(e[1]===1630&&(m.read.indexOf(451)>=0||m.read.indexOf(452)>=0))m.channels[1]=453;if(e[1]===1635&&m.read.indexOf(464)>=0)m.channels[1]=467;}
  else if(e[0]==='dispatch'){dispatched[e[1]]=true;const id=m.channels[e[1]];if(mailIndex[id]&&mailIndex[id][2]===2)receiveMobile(s,id,e[1],true,0);}
  else if(e[0]==='receive'){if(e[2]>0){if(!dispatched[e[2]])receiveMobile(s,e[1],e[2],e[3],e[4]);}else receiveMobile(s,e[1],e[2],e[3],e[4]);}
  else if(e[0]==='call')m.call={site:e[1],owner:e[2],kind:e[3],items:e[4],waiting:e[5],node:s.chapter,at:row[0]};
  else if(e[0]==='presentation'){if(m.presentationEntry&&m.presentationEntry.node===s.chapter&&row[0]<m.presentationEntry.at)continue;if(!m.presentations)m.presentations=[];const key=s.chapter+':'+row[0]+':'+e[1]+':'+e[2]+':'+e[3];if(!(m.presentationRead||[]).includes(key)&&!m.presentations.some(x=>x.key===key))m.presentations.push({key,id:e[1],kind:e[2],owner:e[3]});}
 }}m.lastNode=s.chapter;m.lastAt=s.cursor;
}
export function pendingMail(s,owner){const m=ensureMobile(s);return m.unread.some(id=>mailIndex[id]&&(mailIndex[id][2]===0||mailIndex[id][2]===2)&&(owner===undefined||((s.mailOwners||{})[id]||0)===owner));}
export function markMailRead(s,id){const m=ensureMobile(s);m.unread=m.unread.filter(x=>x!==id);if(m.read.indexOf(id)<0)m.read.push(id);const row=mailIndex[id];if(!row)return;
 const pending=s.deferred;if(pending&&pending.id===id){pending.read=true;const window=mobileWindows[pending.root];s.chapter=window.read;if(!window.options.length){s.deferred=null;delete m.open[id];}}
 if(m.open[id]!==undefined&&!row[3].some(x=>mailIndex[x][2]===3)){const follow=row[3].find(x=>mailIndex[x][2]===2);if(follow!==undefined&&m.open[id]>0)m.channels[m.open[id]]=follow;}
}
export function markOrdinaryInboxRead(s,owner){let count=0;const critical=mobileGraph.retainedMail||[];for(const id of s.inbox){const row=mailIndex[id];if(!row||row[2]!==0&&row[2]!==2||critical.indexOf(id)>=0||((s.mailOwners||{})[id]||0)!==owner)continue;if(ensureMobile(s).unread.indexOf(id)>=0)count++;markMailRead(s,id);}return count;}
export function keyPhoneChoice(s){const pending=ensureMobile(s).keyPhone;if(pending)return mobileGraph.nodes[pending.root].choice;const c=s.choice;return c&&['phone','dmail'].indexOf(c.kind)>=0?c:null;}
export function keyPhoneActions(s){const c=keyPhoneChoice(s);return c?(c.items||[]).map((x,index)=>Object.assign({},x,{keyIndex:index})).filter(x=>x.action==='call'||x.action==='send'):[];}
export function deferKeyPhone(s,owner){const w=keyPhoneWindows[s.chapter];if(!w)return false;const m=ensureMobile(s);m.keyPhone={root:s.chapter,owner};s.chapter=w.skip;s.cursor=0;s.choice=null;return true;}
export function keyPhoneLimit(s){const d=ensureMobile(s).keyPhone;return d?keyPhoneWindows[d.root].limit:null;}
export function keyPhoneBoundary(s){const d=ensureMobile(s).keyPhone;if(!d||s.cursor<keyPhoneWindows[d.root].limit)return null;const c=mobileGraph.nodes[d.root].choice;return Object.assign({},c,{type:'choice',category:'即将超过电话操作时限',heading:'最后确认本段手机操作',items:c.items.map((x,index)=>Object.assign({},x,{keyPhone:true,keyIndex:index,text:x.action==='noCall'?'确认不拨打，继续剧情':x.action==='noSend'?'确认不发送，继续剧情':x.text}))});}
export function answerKeyPhone(s,index){const m=ensureMobile(s),d=m.keyPhone;if(!d)throw Error('关键电话窗口不存在');const c=mobileGraph.nodes[d.root].choice,w=keyPhoneWindows[d.root],item=c.items[index];if(!item)throw Error('关键电话选项无效');delete m.keyPhone;s.choice=null;if(item.action==='call'||item.action==='send'){s.chapter=w.go;s.cursor=w.after;if(Number.isInteger(w.sent)){if(s.sent.indexOf(w.sent)<0)s.sent.push(w.sent);s.mailOwners[w.sent]=d.owner;}}return item;}
export function canReply(s,id){const m=ensureMobile(s);return !!(s.deferred&&s.deferred.id===id||m.open[id]!==undefined)&&mailIndex[id][3].some(x=>mailIndex[x][2]===3)&&m.replied.indexOf(id)<0;}
export function sendOptional(s,parent,id){const m=ensureMobile(s);if(!canReply(s,parent)||mailIndex[parent][3].indexOf(id)<0)throw Error('这封邮件已过回复时机');markMailRead(s,parent);if(s.sent.indexOf(id)<0)s.sent.push(id);s.mailOwners[id]=s.mailOwners[parent]||0;m.replied.push(parent);const channel=m.open[parent],follow=mailIndex[id][3].find(x=>mailIndex[x][2]===2);if(channel>0)m.channels[channel]=follow===undefined?999:follow;delete m.open[parent];}
export function beginDeferred(s){const w=mobileWindows[s.chapter];if(s.deferred||!w||s.cursor<mobileGraph.nodes[s.chapter].count)return false;const root=s.chapter,m=ensureMobile(s);syncMobile(s);receiveMobile(s,w.id,0,true,s.mailOwners[w.id]||0);s.deferred={root,id:w.id,read:m.read.indexOf(w.id)>=0};s.chapter=s.deferred.read?w.read:w.skip;s.cursor=0;s.choice=null;m.lastNode=s.chapter;m.lastAt=-1;return true;}
export function deferredBoundary(s){if(!s.deferred)return null;const d=s.deferred,w=mobileWindows[d.root];if(s.cursor<w.limit)return null;const m=fullMessageInfo(d.id);const items=w.options.map(x=>Object.assign({},x,{deferred:true,parent:d.id}));if(!items.length)items.push({text:'阅读邮件',action:'readDeferred',id:d.id,deferred:true});items.push({text:d.read?'不回复，继续剧情':'不阅读／不回复，继续剧情',action:'expireDeferred',id:d.id,deferred:true});return {type:'choice',kind:'deferred',id:d.id,heading:m.sender+'\n'+m.title,category:'即将超过回复时限',items};}
export function answerDeferred(s,item){const d=s.deferred;if(!d)throw Error('回复窗口不存在');const w=mobileWindows[d.root],m=ensureMobile(s),cursor=s.cursor;let target;
 if(item.action==='reply'){const original=w.options.find(x=>x.id===item.id);if(!original)throw Error('无效回复');sendOptional(s,d.id,item.id);target=original.to;}
 else if(item.action==='readDeferred'){markMailRead(s,d.id);target=w.read;}else if(item.action==='expireDeferred')target=d.read?w.read:w.skip;else throw Error('无效回复操作');
 if(cursor>=w.limit)m.open={};s.chapter=target;s.cursor=cursor;s.deferred=null;s.choice=null;delete m.open[d.id];m.lastNode=target;m.lastAt=cursor-1;
}
export function deferredLimit(s){return s.deferred?mobileWindows[s.deferred.root].limit:null;}
export function currentCall(s){const c=ensureMobile(s).call;if(!c)return null;const spec=callIndex[c.site];return spec&&s.chapter===c.node&&s.cursor>=c.at&&s.cursor<c.at+spec.limit?Object.assign({},c,{items:spec.options}):null;}
export function takeCall(s,index){const c=currentCall(s);if(!c||!c.items[index])throw Error('电话操作已结束');const item=c.items[index];ensureMobile(s).call=null;if(item.clip){s.callReturn={chapter:s.chapter,cursor:c.at+item.join};s.cursor-=c.at;s.chapter=item.clip;}return item;}
export function returnCall(s){if(s.callReturn&&mobileGraph.nodes[s.chapter].callClip&&s.cursor>=mobileGraph.nodes[s.chapter].count){const at=s.callReturn;s.callReturn=null;s.chapter=at.chapter;s.cursor=at.cursor;return true;}return false;}
export function plotPresentation(s){return (ensureMobile(s).presentations||[])[0]||null;}
export function finishPresentation(s){const m=ensureMobile(s),p=(m.presentations||[]).shift();if(!p)return;if(!m.presentationRead)m.presentationRead=[];m.presentationRead.push(p.key);s.mailOwners[p.id]=p.owner;if(p.kind==='send'){if(!s.sent.includes(p.id))s.sent.push(p.id);if(m.call&&m.call.kind==='dmail')m.call=null;}else if(p.kind!=='draft'&&mailIndex[p.id][2]!==1&&mailIndex[p.id][2]!==3){receiveMobile(s,p.id,-1,false,p.owner);markMailRead(s,p.id);}delete m.activePhoneOwner;}
export function nextPresentationBoundary(s,to){if(mobileNode!==s.chapter)return to;const row=mobileEvents.find(r=>r[0]>s.cursor&&r[0]<=to&&r[1].some(e=>e[0]==='presentation'));return row?row[0]:to;}
