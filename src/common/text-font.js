import {glyphWidths,asciiWidths,unicodeWidths} from './glyph-widths.js';
const glyphAliases={"64":"/","65":":","66":"-","67":";","68":"!","69":"?","70":"'","71":".","72":"@","73":"#","74":"%","75":"~","76":"*","77":"&","78":"`","79":"(","80":")","81":"°","82":"^","83":">","84":"+","85":"<","86":"ﾉ","87":"･","88":"=","89":"″","90":"$","91":"′","92":",","93":"[","94":"\\","95":"]","96":"_","97":"{","98":"|","99":"}","190":"、","191":"。","192":"，","193":"．","194":"：","195":"；","196":"？","197":"！","200":"‘","201":"’","202":"“","203":"”","204":"（","205":"）","206":"〔","207":"〕","208":"［","209":"］","210":"｛","211":"｝","212":"〈","213":"〉","214":"《","215":"》","216":"「","217":"」","218":"『","219":"』","220":"【","221":"】","222":"＜","223":"＞","226":"・","227":"…","228":"～","229":"ー","230":"♪","231":"─"};
export function textFont(text){return /[\uE000-\uF1FF]/.test(String(text||''))?'sgoriginal':'sans-serif';}
// Original atlas glyphs 216/217 are the dialogue corner brackets 「 」.
// Remove only the outer pair, retaining brackets inside the sentence.
export function cleanText(text){
 const western='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
 return String(text||'').replace(/[\uE001-\uE03E\uE080-\uE0BD]/g,ch=>western[ch.charCodeAt(0)-(ch.charCodeAt(0)>=0xE080?0xE080:0xE001)])
  .replace(/[\uE040-\uE063\uE0BE-\uE0E7]/g,ch=>glyphAliases[ch.charCodeAt(0)-0xE000]||ch)
  .replace(/[\uE000\uE03F\u3000]/g,' ').replace(/[ \t]+/g,' ')
  .replace(/([\u3400-\u9FFF\uE100-\uF1FF]) +(?=[\u3400-\u9FFF\uE100-\uF1FF])/g,'$1')
  .replace(/ +([，。！？、；：,.!?;:%])/g,'$1')
  .replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
export function dialogueText(text){return cleanText(text).replace(/^[\uE0D8「]/,'').replace(/[\uE0D9」]$/,'').trim();}
// Private-use game glyphs do not have CJK line-breaking properties in Vela.
// Measure mixed Chinese and western glyphs using the generated font's advances.
export function glyphWidth(ch,original){const id=ch.charCodeAt(0)-0xE000;if(id>=0)return glyphWidths[id]===undefined?1:glyphWidths[id];if(original&&asciiWidths[ch]!==undefined)return asciiWidths[ch];if(original&&unicodeWidths[ch]!==undefined)return unicodeWidths[ch];if(ch===' ')return 0.33;return /[\u0000-\u007F]/.test(ch)?(original?1:0.6):1;}
export function wrapText(text,width,size){
 const original=textFont(text)==='sgoriginal',limit=Math.max(1,width/size),lines=[],opening='（〔［｛〈《「『【＜“‘([{',closing='、。，．：；？！）」』】＞”’)]},.!?;:%';
 const measure=s=>Array.from(s).reduce((n,ch)=>n+glyphWidth(ch,original),0);
 for(const paragraph of cleanText(text).split('\n')){
  let line='',used=0;
  for(const ch of paragraph){const unit=glyphWidth(ch,original);
   if(line&&used+unit>limit){let cut=line.length;
    while(cut>0&&opening.indexOf(line.charAt(cut-1))>=0)cut--;
    if(closing.indexOf(ch)>=0){while(cut>0&&closing.indexOf(line.charAt(cut-1))>=0)cut--;if(cut>0)cut--;}
    if(cut<=0)cut=line.length;
    lines.push(line.slice(0,cut).trim());line=line.slice(cut);used=measure(line);
   }
   if(!line&&ch===' ')continue;line+=ch;used+=unit;
  }
  lines.push(line.trim());
 }
 return lines.join('\n');
}
