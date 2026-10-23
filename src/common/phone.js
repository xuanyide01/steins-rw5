import {fullMessageInfo} from './mobile.js';
import {phoneData} from './phone-data.js';
export function phoneContext(state){
 const site=String(state.sourceSite||((state.choice&&phoneData.sources[state.choice.source]||'12')+':0')).split(':'),cursor=Number(site[1])||0;
 let owner=0,ids=[0,1,2,9,3];
 for(const row of phoneData.owners[site[0]]||[])if(row[0]<=cursor)owner=row[1];
 for(const row of phoneData.books[site[0]]||[])if(row[0]<=cursor)ids=row[1];
 if(state.choice&&state.choice.kind==='dmail'&&state.choice.source==='SG07_13')owner=4;
 if(state.mobile&&Number.isInteger(state.mobile.activePhoneOwner))owner=state.mobile.activePhoneOwner;
 if(state.mobile&&state.mobile.keyPhone)owner=state.mobile.keyPhone.owner;
 if(owner!==0)ids=[];
 return {owner,name:({0:'冈部伦太郎',1:'桐生萌郁',2:'FB',4:'菲利斯'})[owner]||'借用手机',contacts:ids.map(id=>phoneData.contacts[id]).filter(x=>x&&x.name.trim()&&x.name!=='\ue000')};
}
export function messageInfo(id){return fullMessageInfo(id)||phoneData.messages[id]||null;}
export function outgoingId(choice,item){return item.action==='reply'?item.id:item.action==='send'?phoneData.dmail[choice.source]:undefined;}
export function contactInfo(id){return phoneData.contacts[id]||null;}
export function phoneMessages(state,sent,owner){const ids=sent?(state.inbox||[]).filter(id=>{const m=messageInfo(id);return m&&(m.type===1||m.type===3);}).concat(state.sent||[]):state.inbox||[];return ids.filter((id,i)=>{const m=messageInfo(id);return ids.indexOf(id)===i&&m&&(sent||m.type===0||m.type===2)&&((state.mailOwners||{})[id]||0)===owner;}).slice().reverse();}
