// Practical SDK observations; dispatch counts are measured separately offline.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json'))),rpk=path.join(root,'dist/'+manifest.package+'.debug.'+manifest.versionName+'.rpk');
let log=fs.readFileSync(path.join(root,'../steins-environment/emulator.log'),'utf8');log=log.slice(log.lastIndexOf('INFO    | Boot completed'));
const rx=/\[\s*(\d+\.\d+)\].*?\[quickapp\] STEINS_RW5 (safe chapter skip|frame|choice) (\d+) (\d+)/g,samples=[];let pending;
for(const m of log.matchAll(rx)){if(m[2]==='safe chapter skip')pending={time:Number(m[1]),start:[Number(m[3]),Number(m[4])]};else if(pending){samples.push({start:pending.start,stop:[Number(m[3]),Number(m[4])],type:m[2],seconds:Math.round((Number(m[1])-pending.time)*1000)/1000});pending=null;}}
const assert=require('assert/strict');assert.ok(samples.length);
const report={version:manifest.versionName,sha256:crypto.createHash('sha256').update(fs.readFileSync(rpk)).digest('hex'),runtime:'Official Vela watch 5.0 emulator, 432x514, RAM128MB',samples,method:'Current boot log timestamps from safe chapter skip to following frame or choice; practical observations, not a controlled benchmark. Cache state, cursor and host load vary. Does not measure physical firmware.',physicalDeviceTested:false};fs.writeFileSync(path.join(root,'reports/skip-performance.json'),JSON.stringify(report,null,2));console.log(report);
