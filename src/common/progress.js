import {startupPatches} from './startup-patches.js';
export const PROGRESS_KEY='steins_rw5_progress_v1';
export function emptyProgress(){return {version:1,variables:{}};}
export function decodeProgress(raw){if(!raw)return emptyProgress();const p=JSON.parse(raw);if(!p.variables)throw Error('通关记录无效');return p;}
export function progressFromState(s){const v={};Object.keys(s.variables).filter(k=>/^F:(80[0-7]|860|864|863)$/.test(k)).forEach(k=>v[k]=s.variables[k]);return {version:1,variables:v};}
export function withProgress(s,p){Object.assign(s.variables,p.variables);return s;}
export function initializeProgress(s,p){withProgress(s,p);let mask=0;startupPatches.flags.forEach((flag,i)=>{if(p.variables[flag])mask|=1<<i;});const patch=startupPatches.patches[startupPatches.indices[mask]];Object.keys(patch).forEach(key=>{if(patch[key]===null)delete s.variables[key];else s.variables[key]=patch[key];});return s;}
