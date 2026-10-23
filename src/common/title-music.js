// PCM stream has a two-second silent tail. Stop before decoder EOF, never seek.
export const TITLE_CONTENT_MS=232080;
export const TITLE_RESTART_GAP_MS=1200;
export function makeTitleMusic(audio,changed){
 let owned=false,failed=false,track='title',seek=0,wanted=false,timer=null,destroyed=false,generation=0,busy=false,announced=false;
 function cancel(){if(timer!==null)clearTimeout(timer);timer=null;}
 function notify(value){if(busy===value)return;busy=value;if(changed)changed(!failed,busy);}
 function state(event){console.log('STEINS2_RW5 audio '+event,JSON.stringify({track,loop:false,currentTime:seek,duration:track==='title'?234.080625:114.625,positionIsEventEstimate:true}));}
 // A late stop notification from the old stream must not mark a new stream idle.
 function close(){if(!owned)return;owned=false;try{audio.stop();}catch(e){}}
 function stop(){wanted=false;generation++;cancel();close();notify(false);}
 function fail(data,code){failed=true;console.error('STEINS2_RW5 audio error',JSON.stringify(data),code);stop();if(changed)changed(false,false);}
 function later(fn,ms,token){cancel();timer=setTimeout(()=>{timer=null;if(token!==generation||destroyed)return;fn();},ms);}
 function arm(token){if(!wanted||track!=='title'||!owned||failed)return;
  later(()=>{notify(true);later(()=>{close();console.log('STEINS2_RW5 title guarded stop');later(()=>{if(wanted&&!failed)title();},TITLE_RESTART_GAP_MS,token);},500,token);},TITLE_CONTENT_MS-500,token);
 }
 function title(){if(!wanted||destroyed||failed||!audio)return;const token=++generation;announced=false;
  try{track='title';seek=0;audio.autoplay=false;audio.loop=false;console.log('STEINS2_RW5 audio track title');audio.src='/common/title-piano.wav';owned=true;audio.play();if(!announced)arm(token);if(changed)changed(true,busy);}catch(e){fail(String(e));}
 }
 if(audio){audio.onerror=fail;audio.onstop=()=>state('stopped');
  audio.onplay=()=>{state('playing');if(track==='title'&&owned&&wanted&&!announced){announced=true;notify(false);arm(generation);}};
  audio.onloadeddata=()=>{if(track==='opening'&&owned&&seek>0){try{audio.currentTime=seek;}catch(e){}}state('loaded');};
  audio.onended=()=>{state('ended');if(track==='title'&&owned&&wanted)fail('Unexpected title EOF; automatic replay disabled');};
 }
 return {update(value){if(!value){stop();return;}wanted=true;if(owned||timer!==null||failed||!audio||destroyed)return;title();},
  playOpening(offset){stop();if(failed||!audio||destroyed)return;try{track='opening';seek=Math.max(0,offset||0)/1000;console.log('STEINS2_RW5 audio track opening');audio.autoplay=false;audio.loop=false;audio.src='/common/opening/op.mp3';owned=true;audio.play();if(seek>0)audio.currentTime=seek;}catch(e){fail(String(e));}},
  stop,retry(){failed=false;},destroy(){stop();destroyed=true;if(audio){audio.onerror=null;audio.onstop=null;audio.onplay=null;audio.onloadeddata=null;audio.onended=null;}}
 };
}
