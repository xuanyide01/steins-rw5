// Repeated new-game entry and real English / evolving contact-list screenshots.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'native-test-results'),log=path.join(root,'../steins-environment/emulator.log'),url='http://127.0.0.1:43130/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),logs=()=>fs.readFileSync(log,'utf8'),manifest=JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json'))),rpk=path.join(root,'dist/'+manifest.package+'.debug.'+manifest.versionName+'.rpk'),digest=()=>crypto.createHash('sha256').update(fs.readFileSync(rpk)).digest('hex');
async function request(p){const r=await fetch(url+p);assert.ok(r.ok,await r.clone().text());return r;}
async function wait(at,re){for(let n=0;n<300;n++){const s=logs().slice(at);if(re.test(s))return s;await sleep(100);}throw Error('Timeout '+re);}
async function click(x,y,re){const at=logs().length;await request('click?x='+x+'&y='+y);if(re)await wait(at,re);await sleep(350);}
async function shot(name){await sleep(500);const r=await request('screen'),b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(path.join(out,name+'.png'),b);return crypto.createHash('sha256').update(b).digest('hex');}
async function title(choice){await click(choice?216:166,choice?459:478,/STEINS_RW5 menu/);await click(216,443,/STEINS_RW5 background loaded title/);}
function memory(){return execFileSync(process.env.WATCH_ADB_PATH||path.join(root,'../starry-rw5/node_modules/@miwt/adb/bin/win/adb.exe'),['-s','emulator-5556','shell','free'],{windowsHide:true,encoding:'utf8'}).trim();}
(async()=>{
 const begin=logs().length,sha256=digest(),starts=[];
 for(let n=0;n<8;n++){const at=Date.now();await click(216,373,/STEINS_RW5 frame 12 103/);starts.push({iteration:n+1,entryCheckMillisecondsIncluding350msUiWait:Date.now()-at,systemMemory:memory()});await title(false);}
 await click(216,373,/STEINS_RW5 frame 12 103/);
 for(let n=0;n<50;n++){const frame=[...logs().slice(begin).matchAll(/STEINS_RW5 frame (\d+) (\d+)/g)].at(-1);if(frame&&frame[1]==='12'&&frame[2]==='155')break;const at=logs().length;await click(354,478);if(!/STEINS_RW5 frame /.test(logs().slice(at)))await click(354,478,/STEINS_RW5 frame /);}
 assert.equal([...logs().slice(begin).matchAll(/STEINS_RW5 frame (\d+) (\d+)/g)].at(-1)[2],'155');await shot('english-el-psy-kongroo');
 await click(265,478,/STEINS_RW5 phone opened/);await click(216,260,/STEINS_RW5 choice .*contacts/);await shot('contacts-prologue-top');await request('drag?x0=210&y0=418&x1=210&y1=195');const early=await shot('contacts-prologue');await title(true);
 await click(216,459);await click(355,474);await click(216,126,/STEINS_RW5 frame 59 /);await click(265,478,/STEINS_RW5 phone opened/);
 await click(216,260,/STEINS_RW5 choice .*contacts/);await shot('contacts-chapter-four-top');await request('drag?x0=210&y0=418&x1=210&y1=195');const later=await shot('contacts-chapter-four');assert.notEqual(early,later,'later chapter must expose a different address book');await title(true);
 assert.ok(!/STEINS_RW5 error|STEINS_RW5 background failed|Assertion failed panic|PANIC!!!|out of memory|jse_dump_obj.*Error:/i.test(logs().slice(begin)));assert.equal(digest(),sha256);
 const report={result:'passed',version:manifest.versionName,sha256,physicalDeviceTested:false,starts,realEnglishScene:[12,155],contactScreensDifferent:true,systemMemoryMeaning:'Whole simulator system, not an isolated app heap measurement; no controlled before/after performance claim.'};fs.writeFileSync(path.join(out,'start-check.json'),JSON.stringify(report,null,2));console.log('NATIVE_START_PASSED',JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
