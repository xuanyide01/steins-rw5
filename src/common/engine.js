import {catalog} from './catalog.js';
import {criticalMail,criticalPhone,criticalDmail} from './phone-guide.js';
let memory={},mail=[],portraits={},channels=[],imageData={},visualRecovery={},mailTextOrder=[],mailTextSizes={},mailTextBytes=0,channelLoaded=-1;
export function configure(m,letters,images,threads,recovery){memory=m;mail=letters;imageData=images;portraits=images.portraits||{};channels=threads||[];visualRecovery=recovery||{};mailTextOrder=[];mailTextSizes={};mailTextBytes=0;channelLoaded=-1;}
export function provideMailText(id,row){Object.assign(mail[id],row);const old=mailTextOrder.indexOf(id);if(old>=0)mailTextOrder.splice(old,1);mailTextOrder.push(id);mailTextBytes-=mailTextSizes[id]||0;mailTextSizes[id]=JSON.stringify(row).length;mailTextBytes+=mailTextSizes[id];while(mailTextOrder.length>12||mailTextBytes>16000&&mailTextOrder.length>1){const drop=mailTextOrder.shift();delete mail[drop].text;delete mail[drop].keywords;mailTextBytes-=mailTextSizes[drop];delete mailTextSizes[drop];}}
export function provideChannelText(id,rows){if(channelLoaded>=0&&channelLoaded!==id)channels[channelLoaded]=Array(channels[channelLoaded].length).fill(null);channels[id]=rows;channelLoaded=id;}
function clone(o){return JSON.parse(JSON.stringify(o));}
export function newState(chapter,story,entry){
 const id=chapter||catalog.initial;return {runtimeVersion:3,chapter:id,rootChapter:id,cursor:catalog.scenes[String(id)].entries[String(entry===undefined?(id===catalog.initial?18:0):entry)]||0,background:'',regularBackground:'',bodies:[],body:'',speaker:'',text:'',variables:{'W:1420':-1,'W:1421':999,'W:6825':999,'W:6826':999,'W:6827':999,'W:6828':999,'W:6829':999},stack:[],banks:clone(catalog.banks),letters:{},inbox:[],mailChannels:{},pending:[],choice:null,choices:[],history:[],sprites:{},ended:false,progression:story?'story':'chapter',switches:{},loops:{}};
}
export function checkpoint(s){const o=Object.assign({},s);delete o.history;return clone(o);}
export function newChapterState(item){
 if(!item||!Number.isInteger(item.mainStart))throw Error('章节入口无效');
 const s=newState(catalog.flowScene,false);s.cursor=item.mainStart;return s;
}
export function restore(saved){
 if(!saved||!catalog.scenes[String(saved.chapter)]||!Number.isInteger(saved.cursor)||saved.cursor<0||saved.cursor>=catalog.scenes[String(saved.chapter)].length)throw Error('存档位置无效');
 if(!saved.variables||!saved.banks||!Array.isArray(saved.stack)||saved.stack.length>24||!Array.isArray(saved.pending)||!Array.isArray(saved.inbox))throw Error('存档状态无效');
 const s=Object.assign(newState(),clone(saved),{history:[]});
 if(!saved.runtimeVersion){
  // 0.1.1 restores the original mandatory incoming-call wait in SG04_18.
  if(s.chapter===76&&s.cursor>=24)s.cursor++;
  for(const frame of s.stack)if(frame[0]===76&&frame[1]>=24)frame[1]++;
  if(!s.phoneWindow){const ranges=(catalog.phoneRecovery||{})[String(s.chapter)]||[];const r=ranges.find(r=>s.cursor>=r.start&&s.cursor<r.end);if(r)s.phoneWindow=Object.assign({},clone(r.window),{announced:true,completed:!!(flag(s,2614)||flag(s,2615))});}
  if(s.choice&&s.choice.kind==='phone')s.phoneWindow=Object.assign({announced:true,completed:false},clone(s.choice));
  if(s.choice&&s.choice.kind==='reply')letterBit(s,s.choice.id,3,true);
 }
 if((saved.runtimeVersion||1)<3){
  const migrate=(id,cursor)=>{const ranges=(catalog.cursorMigrations||{})[String(id)]||[];const r=ranges.find(r=>cursor>=r[0]&&cursor<r[1]);return r?cursor+r[2]:cursor;};
  s.cursor=migrate(s.chapter,s.cursor);for(const frame of s.stack)frame[1]=migrate(frame[0],frame[1]);
  if(s.inlineSite){const site=s.inlineSite.split(':');s.inlineSite=site[0]+':'+migrate(Number(site[0]),Number(site[1]));}
  s.needsVisualRecovery=true;const id=s.rootChapter||s.chapter;
  if(!recoverGraphics(s,{states:visualRecovery.states||[],sites:(visualRecovery.sites||{})[id]||{}}))for(let slot=4;slot<8;slot++)put(s,'F',2410+slot,0);
 }
 s.runtimeVersion=3;return s;
}
export function recoverGraphics(s,data){
 const id=s.rootChapter||s.chapter,positions=data.sites||{};let cursor=s.cursor;
 if(s.chapter!==id){const frame=s.stack.slice().reverse().find(x=>x[0]===id);if(frame)cursor=frame[1]-1;}
 const location=positions[cursor]!==undefined?String(cursor):Object.keys(positions).filter(x=>Number(x)<=cursor).sort((a,b)=>Number(b)-Number(a))[0];
 const graphics=location===undefined?null:(data.states||[])[positions[location]];if(!graphics)return false;
 for(let slot=0;slot<8;slot++){put(s,'F',2400+slot,0);put(s,'F',2410+slot,0);}
 for(let kind=0;kind<2;kind++)for(const row of graphics[kind]){put(s,'F',(kind?2410:2400)+row[0],1);for(let field=1;field<row.length;field++)put(s,'W',(kind?5100:4500)+row[0]*40+field-1,row[field]);}
 delete s.needsVisualRecovery;return true;
}
function get(s,g,n){return s.variables[g+':'+n]||0;}
function put(s,g,n,v){const key=g+':'+n,value=g==='F'?(v?1:0):v;
 // Zero is the VM default. Alpha fields alone distinguish unset from zero.
 const alpha=g==='W'&&(n>=4500&&n<4820&&(n-4500)%40===13||n>=5100&&n<5420&&(n-5100)%40===7);
 if(value===0&&!alpha)delete s.variables[key];else s.variables[key]=value;
}
function flag(s,n){return get(s,'F',n);}
function assign(s,target,a,expression){const g=target[0],n=value(target[1],s),old=get(s,g,n),v=value(expression,s);let out=v;if(a==='++'||a==='+=')out=old+v;else if(a==='--'||a==='-=')out=old-v;else if(a==='*=')out=old*v;else if(a==='/=')out=v?Math.trunc(old/v):0;else if(a==='%=')out=v?old%v:0;else if(a==='&=')out=old&v;else if(a==='|=')out=old|v;else if(a==='^=')out=old^v;else if(a==='<<=')out=old<<v;else if(a==='>>=')out=old>>v;put(s,g,n,out);}
export function value(e,s){
 if(!Array.isArray(e))return e;const op=e[0];
 if(op==='W'||op==='T'||op==='F')return get(s,op,value(e[1],s));
 if(op==='L')return [s.chapter,value(e[1],s)];
 if(op==='R')return 0;
 if(op==='MR'){const address=value(e[1],s),offset=value(e[2],s);if(!Array.isArray(address))throw Error('数据表地址无效');const row=memory[String(address[0])]&&memory[String(address[0])][String(address[1])];if(!row||offset<0||offset>=row.length)throw Error('数据表越界 '+address+' '+offset);return row[offset];}
 const a=value(e[1],s);
 if(e.length===2){if(op==='-')return -a;if(op==='+')return +a;if(op==='!')return a?0:1;if(op==='~')return ~a;}
 const b=value(e[2],s);
 switch(op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return b?Math.trunc(a/b):0;case '%':return b?a%b:0;case '==':return a===b?1:0;case '!=':return a!==b?1:0;case '<':return a<b?1:0;case '<=':return a<=b?1:0;case '>':return a>b?1:0;case '>=':return a>=b?1:0;case '&':return a&b;case '|':return a|b;case '^':return a^b;case '<<':return a<<b;case '>>':return a>>b;default:throw Error('剧情表达式无效 '+op);}
}
function jump(s,id,label,call){
 const scene=catalog.scenes[String(id)];if(!scene||scene.entries[String(label)]===undefined)throw Error('剧情跳转目标无效 '+id+':'+label);
 if(call){if(s.stack.length>=24)throw Error('剧情调用次数过多');s.stack.push([s.chapter,s.cursor+1]);}
 s.chapter=id;s.cursor=scene.entries[String(label)];
 if(scene.source.indexOf('SG')===0)s.rootChapter=id;
}
function returned(s){if(s.stack.length){const f=s.stack.pop();s.chapter=f[0];s.cursor=f[1];return {type:'jump'};}s.ended=true;return {type:'end'};}
function letterBit(s,id,bit,on){if(id<0||id>=mail.length)return;const bits=on?((s.letters[id]||0)|(1<<bit)):((s.letters[id]||0)&~(1<<bit));if(bits)s.letters[id]=bits;else delete s.letters[id];}
function receive(s,id,channel,ask){
 if(!mail[id])throw Error('邮件编号无效 '+id);
 const first=!((s.letters[id]||0)&1);letterBit(s,id,0,true);if(s.inbox.indexOf(id)<0)s.inbox.push(id);
 if(channel!==undefined)s.mailChannels[id]=channel;
 if(!s.mailOwners)s.mailOwners={};if(s.mailOwners[id]===undefined)s.mailOwners[id]=get(s,'W',6856);
 if(first&&ask&&mail[id].type===2){letterBit(s,id,3,true);s.pending.push({kind:'mail',id});}
}
export function storyDate(s){const date=get(s,'W',1430),month=Math.floor(date/100),day=date%100;return month>=1&&month<=12&&day>=1&&day<=31?'（日期：'+(month<10?'0':'')+month+'.'+(day<10?'0':'')+day+'）':'';}
export function phoneOwner(s){return {0:'冈部伦太郎',1:'桐生萌郁',2:'FB（天王寺裕吾）',4:'绯莉丝'}[get(s,'W',6856)]||'借用手机';}
export function chapterTitle(s){const number=Number(chapterGroup(s));return number===10?((s.letters[334]||0)&2?'10 · 因果关系的溶解':'10 · 纯洁透明的星尘'):(catalog.chapters[number]||{}).name||'';}
function sent(s,id){if(!mail[id])return;if(!s.sent)s.sent=[];if(s.sent.indexOf(id)<0)s.sent.push(id);if(!s.mailOwners)s.mailOwners={};s.mailOwners[id]=get(s,'W',6856);}
function buffer(mask){for(let i=0;i<8;i++)if(mask&(1<<i))return i;throw Error('图像缓冲编号无效 '+mask);}
function swapBuffers(s,mask1,mask2,character){
 const a=buffer(mask1),b=buffer(mask2),start=character?5100:4500,flagStart=character?2410:2400;
 const f=flag(s,flagStart+a);put(s,'F',flagStart+a,flag(s,flagStart+b));put(s,'F',flagStart+b,f);
 for(let j=0;j<40;j++){const x=start+a*40+j,y=start+b*40+j,t=get(s,'W',x);put(s,'W',x,get(s,'W',y));put(s,'W',y,t);}
}
function view(s){
 const backgrounds=[];for(let slot=0;slot<8;slot++)if(flag(s,2400+slot)){const base=4500+slot*40,id=get(s,'W',base+7);if(id!==65535)backgrounds.push({id,priority:get(s,'W',base+8)});}
 backgrounds.sort((a,b)=>a.priority-b.priority);const background=backgrounds[backgrounds.length-1];s.background=background?(background.id>=0?'bg'+background.id:background.id===-1?'white':'black'):'black';s.regularBackground=s.background;
 const bodies=[];
 for(let slot=0;slot<8;slot++){
  if(!flag(s,2410+slot))continue;const base=5100+slot*40;const file=get(s,'W',base+9);const face=get(s,'W',base+12);
  const key=portraits[file+':'+face]||portraits[file+':1'];
  if(key)bodies.push({key,x:get(s,'W',base),priority:get(s,'W',base+10)});
 }
 bodies.sort((a,b)=>a.x-b.x);s.bodies=bodies.slice(0,3).map(x=>x.key);s.body=s.bodies[0]||'';
 s.sceneLayers=sceneLayers(s);
}
function sceneLayers(s){
 const layers=[],pixel=432/1920,script=432/1280,clamp=x=>Math.max(0,Math.min(1,x));
 const alpha=(base,offset)=>s.variables['W:'+(base+offset)]===undefined?1:clamp(get(s,'W',base+offset)/256);
 for(let slot=0;slot<8;slot++){
  if(flag(s,2400+slot)&&get(s,'W',4507+slot*40)!==65535){
   const b=4500+slot*40,id=get(s,'W',b+7);
   let key=id<0?((imageData.assets||{})['color'+id]?'color'+id:id===-1?'white':'black'):'bg'+id;
   const info=(imageData.backgroundGeometry||{})[id]||{size:[1920,1080]};
   let width=info.size[0]*pixel,height=info.size[1]*pixel,left=-get(s,'W',b)*script,top=-get(s,'W',b+1)*script;
   const mode=get(s,'W',b+9),size=get(s,'W',b+4)/1000;
   if(mode===2||mode===6){width*=size||1;height*=size||1;left=get(s,'W',b)*script-width/2;top=get(s,'W',b+1)*script-height/2;}
   if(mode===1){const crop=[id,get(s,'W',b+2),get(s,'W',b+3),get(s,'W',b+5),get(s,'W',b+6)].join(':');if((imageData.backgroundCrops||{})[crop])key=imageData.backgroundCrops[crop];width=432;height=243;left=0;top=0;}
   let opacity=alpha(b,13);const fade=get(s,'W',b+11);
   if(fade===1)opacity*=clamp(get(s,'W',b+10)/256);
   if(fade===15||fade===16){const mask=[id,fade,get(s,'W',b+14),get(s,'W',b+10),get(s,'W',b+15)].join(':');if((imageData.backgroundMasks||{})[mask])key=imageData.backgroundMasks[mask];else opacity*=clamp(fade===15?get(s,'W',b+10)/256:1-get(s,'W',b+10)/256);}
   if(opacity>0)layers.push({key:'bg:'+slot+':'+key,image:key,left:Math.round(left),top:Math.round(top),width:Math.round(width),height:Math.round(height),opacity,priority:get(s,'W',b+8)});
  }
  if(flag(s,2410+slot)){
   const b=5100+slot*40,file=get(s,'W',b+9),face=get(s,'W',b+12),key=portraits[file+':'+face]||portraits[file+':1'];if(!key||file===65535)continue;
   const geometry=(imageData.portraitGeometry||{})[key];if(!geometry)continue;
   const scaleX=get(s,'W',b+5)/1000||1,scaleY=get(s,'W',b+6)/1000||1;
   let opacity=alpha(b,7);if(get(s,'W',b+15)===1)opacity*=clamp(get(s,'W',b+14)/256);
   if(opacity>0)layers.push({key:'ch:'+slot+':'+key,image:key,left:Math.round(get(s,'W',b)*script+geometry.origin[0]*pixel*scaleX),top:Math.round(get(s,'W',b+1)*script+geometry.origin[1]*pixel*scaleY),width:Math.round(geometry.size[0]*pixel*scaleX),height:Math.round(geometry.size[1]*pixel*scaleY),opacity,priority:get(s,'W',b+10)});
  }
 }
 return layers.sort((a,b)=>a.priority-b.priority);
}
function phoneMacro(s,label){
 if(label===30){s.phoneWindow=null;put(s,'F',2602,0);put(s,'F',2603,0);put(s,'F',2620,0);return true;}
 if(label===154){const index=get(s,'W',6836);if(channels[index])s.article={thread:index,index:0};return true;}
 if(label===33||label===34||label===31||label===141||label===145||label===149||label===365||label===373||label===377||label===392||label===403||label===405||label===406||label===407||label===408||label===409||label===410||label===411||label===430||label===448||label===452||label===453||label===455)return true;
 if(label===66){put(s,'W',6822,get(s,'W',1423));return true;}
 if(label===75||label===87||label===57||label===59||label===61||label===62){
  const id=get(s,'W',1422);put(s,'W',6807,id);if(mail[id]){const unread=!((s.letters[id]||0)&2);receive(s,id,undefined,false);letterBit(s,id,1,true);if(unread)s.pending.push({kind:'mailView',id});}return true;
 }
 if(label===110){put(s,'W',6817,get(s,'W',1422));return true;}
 return false;
}
function phoneAvailable(s){const w=s.phoneWindow;return !!(w&&!w.completed&&(w.dmail||(w.calls||[]).length||(w.compose||[]).length));}
function phoneChoice(s,waiting,manual){return Object.assign({kind:phoneAvailable(s)&&s.phoneWindow.dmail?'dmail':'phone',waiting:!!waiting,manual:!!manual},clone(phoneAvailable(s)?s.phoneWindow:{calls:[],compose:[]}));}
export function openPhone(s){if(s.ended)return false;if(s.choice)return true;remember(s);s.choice=s.pending.length?s.pending.shift():phoneChoice(s,false,true);return true;}
function mailReplyAvailable(s,id){return !!(((s.letters[id]||0)&8)&&!((s.letters[id]||0)&16));}
function contactBook(s){if(!s.addressBooks)s.addressBooks={};const owner=get(s,'W',6856);if(!s.addressBooks[owner]){const rows=(catalog.contactRecovery||{})[s.rootChapter||s.chapter]||[];let ids=[0,1,2,9,3];if(owner===0)for(const r of rows)if(r[0]<=s.cursor)ids=r[1];s.addressBooks[owner]=owner===0?ids.slice():[];}return s.addressBooks[owner];}
export function phoneContacts(s){return contactBook(s).slice().sort((a,b)=>a-b);}
function articleFrame(s){const rows=channels[s.article.thread];if(typeof rows[s.article.index]!=='string')return {type:'resource',channel:s.article.thread};s.speaker='';s.text=rows[s.article.index];return {type:'text',speaker:'',text:s.text};}
function choiceFrame(s){
 const c=s.choice;
 if(['mail','reply','mailView'].indexOf(c.kind)>=0&&mail[c.id].text===undefined)return {type:'resource',mail:c.id};
 if(c.kind==='reply'){const row=mail[c.id],ids=row.replies.filter(id=>mail[id].type===3);for(let i=0;i<ids.length;i++)if(!(row.keywords||[])[i]&&mail[ids[i]].text===undefined)return {type:'resource',mail:ids[i]};}
 const source=catalog.scenes[String(s.rootChapter)].source;
 const importance=criticalMail(c.id)||(c.kind==='dmail'&&criticalDmail(source))||(c.kind==='phone'&&criticalPhone(source))?'关键选项':'一般选项';
 if(c.kind==='mail'){
  const row=mail[c.id];return {type:'choice',category:importance,items:[{text:'打开邮件',action:'read',id:c.id},{text:'暂不阅读',action:'ignore',id:c.id}],heading:row.sender+'\n'+row.title};
 }
 if(c.kind==='reply'){
  const row=mail[c.id];return {type:'choice',category:importance,items:(mailReplyAvailable(s,c.id)?row.replies.filter(id=>mail[id].type===3):[]).map((id,i)=>({text:(row.keywords||[])[i]||mail[id].text||mail[id].title,action:'reply',id,parent:c.id,label:importance+' · 回复关键词'})).concat([{text:'关闭邮件',action:'ignore',id:c.id}]),heading:row.sender+'\n'+row.title+'\n'+row.text};
 }
 if(c.kind==='dmail')return {type:'choice',category:phoneOwner(s)+'的手机',items:[{text:'发送 D-Mail',action:'send'},{text:'不发送，继续剧情',action:'noSend'}],heading:importance+'\n是否发送 D-Mail？'};
 if(c.kind==='phone')return {type:'choice',category:phoneOwner(s)+'的手机',items:(c.calls||[]).map(id=>({text:catalog.contacts[id]||('联系人 '+id),action:'call',id,label:importance+' · 拨打电话'})).concat((c.compose||[]).map(id=>({text:catalog.contacts[id]||('联系人 '+id),action:'compose',id,label:importance+' · 发送邮件'}))).concat(c.manual?[{text:'短信／邮件',action:'inbox'},{text:'联系人',action:'contacts'}]:[]).concat([{text:c.waiting?'返回剧情（仍等待手机操作）':'关闭手机，继续剧情',action:'noCall'}]),heading:importance+' · 手机\n'+(c.waiting?'剧情正在等待手机操作':phoneAvailable(s)?'选择操作；关闭后可用底部手机键再次打开':'当前没有可拨打或发送的操作')};
 if(c.kind==='inbox'){const page=c.page||0,owner=get(s,'W',6856),all=s.inbox.concat(s.sent||[]),ids=all.filter((id,i)=>all.indexOf(id)===i&&((s.mailOwners||{})[id]||0)===owner).slice().reverse(),items=ids.slice(page*8,page*8+8).map(id=>({text:mail[id].sender+'\n'+mail[id].title,action:'readInbox',id,label:((s.sent||[]).indexOf(id)>=0?'已发送 · ':'已接收 · ')+(criticalMail(id)?'关键邮件 · ':'')+(mailReplyAvailable(s,id)?'可回复':'只读')}));if(page>0)items.push({text:'上一页',action:'mailPage',page:page-1});if((page+1)*8<ids.length)items.push({text:'下一页',action:'mailPage',page:page+1});items.push({text:'返回手机',action:'phoneHome'});return {type:'choice',category:phoneOwner(s)+'的手机',items,heading:'短信／邮件 · '+ids.length+' 封\n已过回复时机的邮件只允许查看'};}
 if(c.kind==='contacts'){
  const w=phoneAvailable(s)?s.phoneWindow:{calls:[],compose:[]},allowed=(w.calls||[]).concat(w.compose||[]),ids=get(s,'W',6856)?allowed.filter((id,i)=>allowed.indexOf(id)===i):phoneContacts(s);
  const items=ids.map(id=>({text:catalog.contacts[id]||('联系人 '+id),action:'contact',id}));items.push({text:'返回手机',action:'phoneHome'});return {type:'choice',category:phoneOwner(s)+'的手机',items,heading:'联系人\n'+(get(s,'W',6856)?'当前借用手机开放的联系人':'选择联系人查看可用操作')};
 }
 if(c.kind==='contact'){
  const w=phoneAvailable(s)?s.phoneWindow:{calls:[],compose:[]},items=[];
  if((w.calls||[]).indexOf(c.id)>=0)items.push({text:'拨打电话',action:'call',id:c.id});
  if((w.compose||[]).indexOf(c.id)>=0)items.push({text:'发送邮件',action:'compose',id:c.id});
  const available=items.length>0;items.push({text:'返回联系人',action:'contacts'});return {type:'choice',category:available?'本段可用操作':'本段剧情没有开放通话或发送操作',heading:catalog.contacts[c.id]||('联系人 '+c.id),items};
 }
 if(c.kind==='mailView'){const row=mail[c.id];return {type:'choice',category:((s.sent||[]).indexOf(c.id)>=0?'已发送':'短信／邮件')+' · 向上滑动浏览正文',items:[{text:c.returnToPhone?'关闭短信，返回手机':'关闭短信，继续剧情',action:'ignore'}],heading:row.sender+'\n'+row.title+'\n'+row.text};}
 if(c.kind==='dial')return {type:'choice',items:[{text:'#120',action:'dial',value:0},{text:'120#',action:'dial',value:1},{text:'120',action:'dial',value:2}],heading:'电话微波炉（暂定）\n输入拨号顺序'};
 throw Error('手机状态无效');
}
export function readFrame(ops,s,base,total,deferView){
 base=base||0;total=total===undefined?ops.length:total;
 if(s.article)return articleFrame(s);
 if(s.choice)return choiceFrame(s);
 if(s.pending.length){s.choice=s.pending.shift();return choiceFrame(s);}
 const started=deferView?Date.now():0;
 for(let guard=0;guard<(deferView?2048:256);guard++){
  if(deferView&&guard&&guard%128===0&&Date.now()-started>=20)return {type:'yield'};
  if(s.ended)return {type:'end'};
  if(s.cursor>=total)return returned(s);
  const local=s.cursor-base;if(local<0||local>=ops.length)return {type:'yield'};const o=ops[local],op=o[0];
  if(op==='text'){if(phoneAvailable(s)&&!s.phoneWindow.announced){s.phoneWindow.announced=true;s.choice=phoneChoice(s,false,false);return choiceFrame(s);}if(!deferView)view(s);s.speaker=o[1];
   const site=s.chapter+':'+s.cursor;if(s.inlineSite!==site){s.inlineSite=site;s.inlineText=o[2];if(o[4])s.inlineText=o[4].map(p=>{if(typeof p==='string')return p;const n=get(s,p[1],p[2]);put(s,p[1],p[2],n-1);return String(n);}).join('');}s.text=s.inlineText;
   return {type:'text',speaker:o[1],text:s.text};}
  if(op==='assigns'||op==='batchAt'){
   const batch=op==='assigns'?o:ops[o[1]-base];if(!batch||batch[0]!=='assigns')throw Error('计算块边界无效');
   // Keep the original logical instruction budget: it also bounds phone waits.
   const cursor=s.cursor,budget=deferView?Math.min(2048-guard,128-guard%128):256-guard,end=Math.min(batch[2],cursor+budget);
   for(const step of batch[3])if(step[0]>=cursor&&step[0]<end&&(step.length<5||step[4]>=end))assign(s,step[1],step[2],step[3]);
   guard+=end-cursor-1;s.cursor=end;continue;
  }else if(op==='set'){
   assign(s,o[1],o[2],o[3]);
  }else if(op==='Jump'){jump(s,s.chapter,o[1]);continue;}
  else if(op==='If'||op==='IfInv'){const v=value(o[1],s);if(op==='If'?v:!v){jump(s,s.chapter,o[2]);continue;}}
  else if(op==='FlagOnJump'||op==='FlagOffJump'){const f=flag(s,value(o[1],s));if(op==='FlagOnJump'?f:!f){jump(s,s.chapter,o[2]);continue;}}
  else if(op==='FlagOnWait'){if(o[1]===2610&&phoneAvailable(s)&&!s.phoneWindow.completed){s.phoneWindow.announced=true;s.choice=phoneChoice(s,true,false);return choiceFrame(s);}}
  else if(op==='SetFlag'||op==='ResetFlag'){const id=value(o[1],s),on=op==='SetFlag';put(s,'F',id,on?1:0);if(id===2600)put(s,'W',6801,on?16:0);}
  else if(op==='CallRL'){jump(s,s.chapter,o[1],true);continue;}
  else if(op==='ScriptLoad'){s.banks[value(o[1],s)]=value(o[2],s);}
  else if(op==='CallFarRL'||op==='JumpFar'){
   const bank=value(o[1],s),label=o[2],id=s.banks[bank];
   if(id===6&&op==='CallFarRL'){
    const f={1:801,2:802,3:803,4:805,5:804,6:806}[label];if(f)put(s,'F',f,1);s.endingName={1:'牧濑红莉栖',2:'椎名真由理',3:'漆原琉华',4:'菲利斯',5:'阿万音铃羽',6:'真结局'}[label]||'本篇';s.ended=true;return {type:'end'};
   }
   else if(bank===6){const same=id===s.chapter;jump(s,id,label,op==='CallFarRL');if(same)continue;return {type:'jump'};}
   else if(bank===9||bank===11||bank===1){/* desktop phone rendering/image-cache threads */}
   else if(bank===7&&phoneMacro(s,label)){}
   else{jump(s,id,label,op==='CallFarRL');return {type:'jump'};}
  }else if(op==='Return'){const before=s.chapter,result=returned(s);if(result.type==='jump'&&s.chapter===before)continue;return result;}
  else if(op==='End'||op==='Halt'){if(op==='End'&&s.stack.length)return returned(s);s.ended=true;return {type:'end'};}
  else if(op==='Switch'){s.switches[s.chapter]=value(o[1],s);}
  else if(op==='Case'){if(s.switches[s.chapter]===value(o[1],s)){jump(s,s.chapter,o[2]);continue;}}
  else if(op==='Loop'){const k=s.chapter+':'+s.cursor;s.loops[k]=(s.loops[k]||0)+1;if(s.loops[k]<Math.min(2000,value(o[2],s))){jump(s,s.chapter,o[1]);continue;}delete s.loops[k];}
  else if(op==='BGload'){
   const slot=buffer(value(o[1],s)),id=value(o[2],s);put(s,'W',4500+slot*40+7,id);
  }else if(op==='CHAloadAtlas'){
   const slot=buffer(value(o[1],s)),id=value(o[2],s);put(s,'W',5100+slot*40+9,id);
  }else if(op==='BGswap'||op==='CHAswap'){
   swapBuffers(s,value(o[1],s),value(o[2],s),op==='CHAswap');
  }else if(op==='BGrelease'||op==='CHArelease'){
   const slot=buffer(value(o[1],s));put(s,'W',(op==='CHArelease'?5109:4507)+slot*40,65535);
  }else if(op==='SetSavePointMain'){
   // Desktop autosave runs asynchronously; watch saves use their own storage API.
   // Complete the presentation wait without changing player-selected save slots.
   put(s,'W',3373,100);
  }else if(op==='GetSystemStatus'){
   // This text-only player completes media immediately. Macro status 5 means
   // presentation skip; 1/2 are the inverse audio-playing state in the source VM.
   put(s,'T',7,1);
  }else if(op==='CalcMove'||op==='CalcAccel'){
   const target=value(o[1],s);if(op==='CalcMove')put(s,'W',target,value(o[2],s));
  }else if(op==='CreateThread'){
   const bank=value(o[2],s),label=o[3];
   if(bank===7&&label>=214&&label<=217){put(s,'W',1260,label-209);put(s,'W',6817,[233,253,279,286][label-214]);put(s,'W',6807,65535);put(s,'F',2614,0);put(s,'F',2615,0);s.phoneWindow={calls:[],compose:[],dmail:true,announced:true,completed:false};s.pending.push({kind:'dmail'});}
  }else if(op==='PhoneSG_00'||op==='PhoneSG_01'){
   const id=value(o[2],s);letterBit(s,id,o[1],op==='PhoneSG_00');if(op==='PhoneSG_00'&&o[1]===0&&mail[id])receive(s,id,undefined,false);
  }else if(op==='PhoneSG_02'||op==='PhoneSG_03'){
   const bit=(s.letters[value(o[2],s)]||0)&(1<<o[1]);if(op==='PhoneSG_02'?bit:!bit){jump(s,s.chapter,o[3]);continue;}
  }else if(op==='PhoneSG_12'){
   const channel=value(o[1],s),id=value(o[2],s);receive(s,id,channel,true);
  }else if(op==='PhoneSG_14'||op==='PhoneSG_15'){
   const contacts=o.slice(1).map(x=>value(x,s)).filter(x=>x!==255);if(!s.phoneWindow)s.phoneWindow={calls:[],compose:[]};s.phoneWindow[op==='PhoneSG_14'?'calls':'compose']=contacts;s.phoneWindow.announced=false;s.phoneWindow.completed=false;
  }else if(op==='PhoneSG_0F'||op==='PhoneSG_10'){
   const id=value(o[1],s),book=contactBook(s),index=book.indexOf(id);if(op==='PhoneSG_0F'&&index<0)book.push(id);if(op==='PhoneSG_10'&&index>=0)book.splice(index,1);
  }else if(op==='PhoneSG_11'){s.addressBooks={0:[]};
  }else if(op==='PhoneSG_13'){
   for(const id of s.inbox)letterBit(s,id,3,false);
  }else if(op==='PhoneSG_17'){s.pending.push({kind:'dial'});put(s,'W',6815,0);}
  else if(op==='PhoneSG_16'){put(s,'W',6822,get(s,'W',1423));}
  else if(op==='PhoneSG_06'){put(s,'W',6807,get(s,'W',1422));}
  else if(op.indexOf('PhoneSG_')===0){}
  else if(op==='LoadJump'){s.ended=true;return {type:'end'};}
  else if(op==='data'||op==='unsupported')throw Error('未支持的脚本 '+s.chapter+':'+s.cursor+' '+o[1]);
  else if(op==='JumpTable'){const index=value(o[1],s);if(!Array.isArray(o[2])||o[2][index]===undefined)throw Error('选择编号越界 '+index);jump(s,s.chapter,o[2][index]);continue;}
  else if(op==='Adr'||op==='Select_02')throw Error('尚未校对的选择指令 '+op);
  else throw Error('未知剧情指令 '+op);
  s.cursor++;
  if(s.article)return articleFrame(s);
  if(s.pending.length){s.choice=s.pending.shift();return choiceFrame(s);}
 }
 if(phoneAvailable(s)&&!s.phoneWindow.completed&&s.phoneWindow.announced){s.choice=phoneChoice(s,true,false);return choiceFrame(s);}return {type:'yield'};
}
// History stores compact strings, bounded independently of the 30 save slots.
function remember(s){const o=Object.assign({},s);delete o.history;const text=JSON.stringify(o);s.history.push(text);let bytes=s.history.reduce((n,x)=>n+(typeof x==='string'?x.length:JSON.stringify(x).length),0);while(s.history.length>8||bytes>48000&&s.history.length>1){const old=s.history.shift();bytes-=typeof old==='string'?old.length:JSON.stringify(old).length;}}
export function next(s){if(s.choice||s.pending.length)return;remember(s);if(s.article){s.article.index++;if(s.article.index>=channels[s.article.thread].length)s.article=null;return;}s.cursor++;}
export function choose(s,item,index){
 if(!s.choice||!item)throw Error('选项无效');remember(s);s.choices.push(index);if(s.choices.length>400)s.choices.shift();
 const returnToPhone=s.choice.returnToPhone;
 if(item.action==='inbox'){s.choice={kind:'inbox',page:0};return;}
 if(item.action==='contacts'){s.choice={kind:'contacts'};return;}
 if(item.action==='contact'){s.choice={kind:'contact',id:item.id};return;}
 if(item.action==='mailPage'){s.choice={kind:'inbox',page:item.page};return;}
 if(item.action==='phoneHome'){s.choice=phoneChoice(s,false,true);return;}
 if(item.action==='readInbox'){
  letterBit(s,item.id,1,true);if(mailReplyAvailable(s,item.id)){s.choice={kind:'mail',id:item.id,returnToPhone:true};return choose(s,{action:'read',id:item.id},0);}s.choice={kind:'mailView',id:item.id,returnToPhone:true};return;
 }
 if(item.action==='read'){
  letterBit(s,item.id,1,true);put(s,'W',6807,item.id);put(s,'F',2606,1);const row=mail[item.id],channel=s.mailChannels[item.id];
  const follow=row.replies.find(id=>mail[id].type===2);
  if(channel!==undefined&&follow!==undefined&&!row.replies.some(id=>mail[id].type===3))put(s,'W',6825+channel,follow);
  s.choice={kind:'reply',id:item.id,returnToPhone};return;
 }
 if(item.action==='reply'){
  if(!mailReplyAvailable(s,item.parent)||mail[item.parent].replies.indexOf(item.id)<0)throw Error('这封邮件已过回复时机');letterBit(s,item.parent,4,true);letterBit(s,item.id,0,true);letterBit(s,item.id,1,true);put(s,'W',6807,item.parent);put(s,'F',2607,1);
  sent(s,item.id);const channel=s.mailChannels[item.parent];
  if(channel!==undefined&&mail[item.id].replies.length)put(s,'W',6825+channel,mail[item.id].replies[0]);
  s.pending.push({kind:'mailView',id:item.id,returnToPhone});
 }else if(item.action==='dial'){put(s,'F',2609,1);put(s,'W',6833,item.value);}
 else if(item.action==='call'){put(s,'F',2614,1);put(s,'F',2610,1);put(s,'W',6822,item.id);if(s.phoneWindow)s.phoneWindow.completed=true;}
 else if(item.action==='compose'){put(s,'F',2615,1);put(s,'W',6822,item.id);sent(s,get(s,'W',6817));if(s.phoneWindow)s.phoneWindow.completed=true;}
 else if(item.action==='send'){put(s,'F',2615,1);sent(s,get(s,'W',6817));if(s.phoneWindow&&s.phoneWindow.dmail)s.phoneWindow.completed=true;}
 else if(item.action==='noSend')put(s,'F',2615,0);
 s.choice=returnToPhone&&item.action==='ignore'?phoneChoice(s,false,true):null;
}
export function previous(s){const last=s.history.pop();if(!last)return false;const history=s.history;Object.assign(s,typeof last==='string'?JSON.parse(last):last,{history});return true;}
function chapterGroup(s){const source=catalog.scenes[String(s.rootChapter)].source;return source.indexOf('SG')===0?source.slice(2,4):'00';}
export function nextChapter(s){if(s.ended)return null;remember(s);return {chapter:chapterGroup(s)};}
export function readChapterSkip(ops,s,context,base,total){
 const started=Date.now();
 for(let count=0;count<256;count++){
  if(!s.choice&&!s.pending.length&&phoneAvailable(s)&&s.phoneWindow.announced&&!s.phoneWindow.completed){s.choice=phoneChoice(s,true,false);view(s);return choiceFrame(s);}
  const f=readFrame(ops,s,base,total,true);
  if(f.type!=='text'||chapterGroup(s)!==context.chapter){if(f.type!=='jump'&&f.type!=='yield')view(s);return f;}
  if(s.article){s.article.index++;if(s.article.index>=channels[s.article.thread].length)s.article=null;}else s.cursor++;
  if(Date.now()-started>=24)break;
 }
 return {type:'yield'};
}
export function previewMap(){return [];}
