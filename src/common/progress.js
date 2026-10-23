import {worldlineFor,titleRate,validWorldline} from './worldline.js';
import {INITIAL_WORLDLINE} from './worldline-data.js';
export const PROGRESS_KEY='steins2_rw5_progress_v2';
export function emptyProgress(){return {version:2,endings:{},titleWorldline:INITIAL_WORLDLINE,titleChangedAt:0,titleSource:'initial'};}
export function decodeProgress(raw){if(!raw)return emptyProgress();const p=JSON.parse(raw);if(p.version!==2||!p.endings)throw Error('通关记录无效');return p;}
export function progressFromState(s,previous,now){const p=Object.assign(emptyProgress(),previous||{});p.endings=Object.assign({},p.endings,s.endings);if(s.ended){p.titleWorldline=worldlineFor(s);p.titleSource='ending';p.titleChangedAt=now||0;}p.titleWorldline=titleRate(p);return p;}
export function titleProgress(previous,rate,source,at){const p=Object.assign({},previous);p.titleWorldline=validWorldline(rate)?rate:INITIAL_WORLDLINE;p.titleSource=source;p.titleChangedAt=at||0;p.titleWorldline=titleRate(p);return p;}
export function withProgress(s,p){Object.assign(s.endings,p.endings);return s;}
