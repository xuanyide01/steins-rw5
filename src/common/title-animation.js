// All 299 original frames. Four poses share one transparent 640x160 atlas.
export const TITLE_FRAME_COUNT=299;
export function makeTitleAnimation(schedule,cancel,allowed,show){let timer=null,index=0;
 function stop(){if(timer!==null)cancel(timer);timer=null;}
 function display(){show('/common/title-machine/atlas'+('0'+Math.floor(index/4)).slice(-2)+'.png',-(index%4)*160);}
 function tick(){timer=null;if(!allowed())return;index=(index+1)%TITLE_FRAME_COUNT;display();timer=schedule(tick,33.3333);}
 return {update(){if(!allowed()){stop();return;}if(timer!==null)return;index=0;display();timer=schedule(tick,33.3333);},stop};
}
