// The original MAIN00 movie 32 belongs between prologue and chapter 1.
export const OPENING_DURATION=114583.15;
export const OPENING_FRAMES=1375;
export const OPENING_INTERVAL=83.3332;
export function wantsOpening(s){return s.chapter==='n0'&&s.cursor===557&&s.openingDone!==true;}
// Elapsed-time clock prevents slow image loads from extending the movie/audio.
// One clipped image and at most one timeout; no desktop VM on the watch.
export function makeOpeningClock(schedule,cancel,now,draw,done){
 let timer=null,elapsed=0,started=0,running=false,index=-1;
 function path(strip){return '/common/opening/'+('00'+strip).slice(-3)+'.jpg';}
 function show(){const frame=Math.min(OPENING_FRAMES-1,Math.floor(elapsed/OPENING_INTERVAL));if(frame===index)return;index=frame;const tile=frame%8;draw(path(Math.floor(frame/8)),-(tile%4)*384,-Math.floor(tile/4)*216,frame);}
 function position(){return Math.min(OPENING_DURATION,elapsed+(running?Math.max(0,now()-started):0));}
 function pause(){elapsed=position();running=false;if(timer!==null)cancel(timer);timer=null;}
 function tick(){timer=null;elapsed=position();started=now();if(elapsed>=OPENING_DURATION){running=false;done();return;}show();timer=schedule(tick,Math.max(1,(Math.floor(elapsed/OPENING_INTERVAL)+1)*OPENING_INTERVAL-elapsed));}
 return {reset(){pause();elapsed=0;index=-1;show();},resume(){if(running)return;running=true;started=now();tick();},pause,position,stop(){pause();elapsed=0;index=-1;}};
}
