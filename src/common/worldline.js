import {worldlineData,INITIAL_WORLDLINE,TRUE_WORLDLINE} from './worldline-data.js';
export function validWorldline(value){return typeof value==='string'&&/^-?[01]\.[0-9]{6}$/.test(value);}
export function worldlineFor(state){const s=state.callReturn||state,row=worldlineData[s.chapter];if(!row)return validWorldline(state.worldline)?state.worldline:INITIAL_WORLDLINE;let rate=row[0];for(const change of row[1]){if(change[0]>s.cursor)break;rate=change[1];}return rate;}
export function titleRate(progress){return progress.endings['真结局']?TRUE_WORLDLINE:validWorldline(progress.titleWorldline)?progress.titleWorldline:INITIAL_WORLDLINE;}
