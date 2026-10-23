import {checkpoint,restore,chapterTitle} from './engine.js';
import {textFont,cleanText} from './text-font.js';
import {worldlineFor} from './worldline.js';
export const SLOT_COUNT=30;
export const LEGACY_KEY='steins2_rw5_unused_legacy';
export function slotKey(index){if(!Number.isInteger(index)||index<0||index>=30)throw Error('栏位无效');return 'steins2_rw5_slot_v2_'+(index+1);}
export function decodeSave(raw){if(!raw)return null;const s=JSON.parse(raw);if(s.version!==2)throw Error('存档版本不兼容');return {version:2,state:restore(s.state),savedAt:s.savedAt,sceneMode:s.sceneMode};}
export function createSave(state,sceneMode,savedAt){return {version:2,state:checkpoint(state),sceneMode,savedAt};}
export function decodeSlotMeta(raw){if(!raw)return null;const s=decodeSave(raw);return {version:2,state:{title:s.state.title,text:s.state.text,worldline:worldlineFor(s.state)},savedAt:s.savedAt,sceneMode:s.sceneMode};}
function two(i){return ('0'+i).slice(-2);}
export function slotRow(index,saved){
 const row={index,number:index+1,title:'存档 '+two(index+1),meta:'空栏位',preview:'',occupied:!!saved,metaFont:'sans-serif',previewFont:'sans-serif'};
 if(!saved)return row;if(saved.invalid){row.meta='存档无法读取';return row;}
 const d=new Date(saved.savedAt);row.meta=chapterTitle(saved.state)+' · '+two(d.getMonth()+1)+'/'+two(d.getDate())+' '+two(d.getHours())+':'+two(d.getMinutes());
 row.preview=saved.sceneMode==='choice'?'正在选择关键剧情操作':cleanText(saved.state.text||'章节开头').slice(0,24);row.metaFont=textFont(row.meta);row.previewFont=textFont(row.preview);return row;
}
