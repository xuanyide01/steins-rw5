import {glyphWidths,asciiWidths} from './glyph-widths.js';
export function textFont(text){return /[\uE000-\uF1FF]/.test(String(text||''))?'sgoriginal':'sans-serif';}
// Original atlas glyphs 216/217 are the dialogue corner brackets 「 」.
// Remove only the outer pair, retaining brackets inside the sentence.
export function cleanText(text){
 const western='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
 return String(text||'').replace(/[\uE001-\uE03E\uE080-\uE0BD]/g,ch=>western[ch.charCodeAt(0)-(ch.charCodeAt(0)>=0xE080?0xE080:0xE001)])
  .replace(/[\uE000\uE03F\u3000]/g,' ').replace(/[ \t]+/g,' ')
  .replace(/([\u3400-\u9FFF\uE100-\uF1FF]) +(?=[\u3400-\u9FFF\uE100-\uF1FF])/g,'$1')
  .replace(/ *\n */g,'\n').trim();
}
export function dialogueText(text){return cleanText(text).replace(/^[\uE0D8「]/,'').replace(/[\uE0D9」]$/,'').trim();}
// Private-use game glyphs do not have CJK line-breaking properties in Vela.
// Measure mixed Chinese and western glyphs using the generated font's advances.
export function glyphWidth(ch,original){const id=ch.charCodeAt(0)-0xE000;if(id>=0)return glyphWidths[id]===undefined?1:glyphWidths[id];if(original&&asciiWidths[ch]!==undefined)return asciiWidths[ch];if(ch===' ')return 0.33;return /[\u0000-\u007F]/.test(ch)?(original?1:0.6):1;}
export function wrapText(text,width,size){
 const original=textFont(text)==='sgoriginal',limit=Math.max(1,width/size),lines=[];
 for(const paragraph of cleanText(text).split('\n')){
  let line='',used=0;
  for(const ch of paragraph){const unit=glyphWidth(ch,original);
   if(line&&used+unit>limit){lines.push(line.trim());line='';used=0;}
   if(!line&&ch===' ')continue;line+=ch;used+=unit;
  }
  lines.push(line.trim());
 }
 return lines.join('\n');
}
