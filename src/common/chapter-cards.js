// BGload IDs from SG01_01 ... SG11_01; chapter 10 has two original variants.
// The prologue has no equivalent still title card in the source script.
export function takeChapterCard(s){
 const title=s.title||'';if(s.chapterCardTitle===title)return null;
 s.chapterCardTitle=title;
 let id=0;const n=parseInt(title,10);
 if(n>=1&&n<=9)id=486+n;
 if(n===10)id=title.indexOf('因果关系')>=0?496:497;
 if(n===11)id=498;
 return id?{id,src:'/common/chapters/'+id+'.png',title}:null;
}
// Original MACROSYS 935 waits W(1)=128 frames and permits a key press.
export const CHAPTER_CARD_HOLD_MS=2133;
