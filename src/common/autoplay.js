export function autoDelay(length,speed){return [2600,1500,800][speed===0?0:speed===2?2:1]+Math.max(0,length-60)*35;}
// Exactly one waiting timer; generation invalidates callbacks after any interruption.
export function makeAutoClock(schedule,cancel){
 let timer=null,generation=0;
 return {cancel(){generation++;if(timer!==null)cancel(timer);timer=null;},arm(delay,allowed,advance){this.cancel();const current=generation;timer=schedule(()=>{timer=null;if(current===generation&&allowed())advance();},delay);},pending(){return timer!==null;}};
}
