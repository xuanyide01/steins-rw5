// Preview only. Extrapolate the last native position between query events.
exports.makeAudioMonitor=function(now=()=>Date.now()){let pending='',state={playing:false,track:'title',loop:true,revision:0,position:0,duration:0,updatedAt:now()};
 return {get(){return {...state};},feed(chunk){pending+=chunk;const lines=pending.split('\n');pending=lines.pop().slice(-12000);for(const line of lines){
  const track=line.match(/STEINS2_RW5 audio track (title|opening)/);if(track){state.track=track[1];state.loop=track[1]==='title';state.position=0;state.duration=0;state.updatedAt=now();}
  if(/STEINS2_RW5 app (created|destroyed)|STEINS2_RW5 (frame|choice|ending|error|chapter card)\b/.test(line))state.playing=false;
  if(/STEINS2_RW5 audio stopped|STEINS2_RW5 audio ended|STEINS2_RW5 audio error/.test(line)){state.playing=false;state.position=0;state.updatedAt=now();}
  if(/STEINS2_RW5 audio playing /.test(line)){state.playing=true;state.revision++;state.position=0;state.updatedAt=now();const json=line.match(/audio playing (\{.*\})/);if(json){try{const data=JSON.parse(json[1]);if(Number.isFinite(data.duration))state.duration=data.duration;if(Number.isFinite(data.currentTime))state.position=data.currentTime;if(typeof data.loop==='boolean')state.loop=data.loop;}catch(e){}}}
  const m=line.match(/audio_media_player_query_cb\(\),volume:\d+ position:(\d+) duration:(\d+)/);if(m&&state.playing){state.position=Number(m[1])/1000;state.duration=Number(m[2])/1000;state.updatedAt=now();}
 }}};
};
