const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{execFile}=require('child_process'),{promisify}=require('util'),crypto=require('crypto');
const run=promisify(execFile),root=path.resolve(__dirname,'..'),out=path.join(root,'native-test-results/v030'),log=path.resolve(root,'../steins-rebuild-environment/emulator.log'),adb=path.resolve(root,'../starry-rw5/node_modules/@miwt/adb/bin/win/adb.exe');fs.mkdirSync(out,{recursive:true});
const logs=()=>fs.readFileSync(log,'utf8'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await run(adb,['-s','emulator-5556','wait-for-device'],{windowsHide:true,timeout:30000});
 const begin=logs().lastIndexOf('STEINS2_RW5 app created');assert.ok(begin>=0);assert.ok(logs().slice(begin).includes('/common/title-piano.wav'));
 const samples=[],start=Date.now();let next=0,finishedAt=0,guardCount=-1;
 while(Date.now()-start<520000){
  const text=logs().slice(begin),plays=[...text.matchAll(/\[\s*([\d.]+)\].*STEINS2_RW5 audio playing (\{.*\})/g)],guards=[...text.matchAll(/\[\s*([\d.]+)\].*STEINS2_RW5 title guarded stop/g)];
  assert.ok(!/STEINS2_RW5 audio ended|STEINS2_RW5 audio error|STEINS2_RW5 app destroyed|PANIC!!!|Data Abort/.test(text),'Unexpected EOF, audio error or restart');
  assert.equal((text.match(/STEINS2_RW5 app created/g)||[]).length,1);
  if(guardCount!==guards.length){guardCount=guards.length;console.log('GUARDED_RESTARTS',guardCount);}
  if(Date.now()>=next){
   const {stdout}=await run(adb,['-s','emulator-5556','shell','free'],{windowsHide:true,timeout:15000});const m=stdout.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+Umem/m);assert.ok(m,stdout);
   samples.push({elapsedMs:Date.now()-start,time:new Date().toISOString(),totalBytes:+m[1],usedBytes:+m[2],freeBytes:+m[3],maximumUsedBytes:+m[4],largestFreeBytes:+m[5],usedBlocks:+m[6],freeBlocks:+m[7]});fs.writeFileSync(path.join(out,'memory-progress.json'),JSON.stringify({samples,guards:guards.length},null,2));next=Date.now()+10000;
  }
  if(guards.length>=2&&plays.length>=3){
   if(!finishedAt)finishedAt=Date.now()+22000;
   if(Date.now()>=finishedAt){
    const med=v=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)],first=med(samples.slice(0,5).map(x=>x.usedBytes)),last=med(samples.slice(-5).map(x=>x.usedBytes));assert.ok(last-first<262144,'Persistent virtual heap growth exceeds 256KiB; investigate before delivery');
    const starts=plays.map(x=>+x[1]),stops=guards.map(x=>+x[1]),gaps=stops.slice(0,2).map((x,i)=>starts[i+1]-x);assert.ok(gaps.every(x=>x>=1.15&&x<2.5),JSON.stringify(gaps));assert.ok(stops.slice(0,2).every((x,i)=>x-starts[i]>231.5&&x-starts[i]<233.4));
    const snap=async name=>{const res=await fetch('http://127.0.0.1:43140/screen');assert.ok(res.ok);const b=Buffer.from(await res.arrayBuffer());fs.writeFileSync(path.join(out,name+'.png'),b);return b;};const a=await snap('title-after-guarded-cycles');await sleep(220);const b=await snap('title-after-guarded-cycles-next');assert.ok(!a.equals(b),'Title animation did not resume');
    const r={result:'passed',version:'0.3.0',sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist/com.codex.steins2.rw5.debug.0.3.0.rpk'))).digest('hex'),guardedStops:stops,nativeStarts:starts,restartGapsSeconds:gaps,noNaturalEOFObserved:true,noAppRestartOrPanic:true,titleAnimationResumed:true,titleCodec:'PCM s16le 8000Hz mono',initialWindowMedianUsedBytes:first,finalWindowMedianUsedBytes:last,medianGrowthBytes:last-first,peakObservedUsedBytes:Math.max(...samples.map(x=>x.usedBytes)),sampleCount:samples.length,samples,sdkNullCallbackWarnings:(text.match(/FeatureCheckCallbackId.*handle is null/g)||[]).length,scope:'Official 128MB simulator system heap sampled via native free; not physical-watch heap, not proof that every firmware has no leak.',physicalDeviceTested:false};fs.writeFileSync(path.join(out,'memory-loops.json'),JSON.stringify(r,null,2));console.log('MEMORY_AND_GUARDED_CYCLES_PASSED',JSON.stringify({sampleCount:r.sampleCount,growth:r.medianGrowthBytes,starts,gaps}));return;
   }
  }
  await sleep(300);
 }
 throw Error('Guarded cycles timed out');
})().catch(e=>{console.error(e);process.exitCode=1;});
