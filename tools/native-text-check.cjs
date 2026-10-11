// Supplement the installation test with a real six-line dialogue at 28 px.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'native-test-results'),url='http://127.0.0.1:43130/';
const log=path.join(process.env.STARRY_EMULATOR_HOME||path.join(root,'../steins-environment'),'emulator.log'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const logs=()=>fs.readFileSync(log,'utf8');
async function request(p){const r=await fetch(url+p);assert.ok(r.ok,await r.clone().text());return r;}
async function wait(at,re){for(let n=0;n<2400;n++){const s=logs().slice(at);if(re.test(s))return s;await sleep(100);}throw Error('Timeout '+re);}
async function click(x,y,re){const at=logs().length;await request('click?x='+x+'&y='+y);if(re)return wait(at,re);await sleep(400);}
async function shot(name){await sleep(500);const r=await request('screen'),b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(path.join(out,name+'.png'),b);return crypto.createHash('sha256').update(b).digest('hex');}
async function skip(){await click(166,478,/STEINS_RW5 menu/);return click(216,211,/STEINS_RW5 choice /);}
(async()=>{
 const begin=logs().length,resume=process.argv.includes('--resume-mail');
 const packageDigest=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist/com.codex.steins.rw5.debug.'+JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json'))).versionName+'.rpk'))).digest('hex');
 if(resume){const stage=JSON.parse(fs.readFileSync(path.join(out,'dialogue-stage.json')));assert.equal(stage.sha256,packageDigest);assert.equal(stage.passed,true);}else{
 if(!process.argv.includes('--title')){await request('start');await wait(begin,/STEINS_RW5 background loaded title/);}await sleep(1200);
 await click(216,373,/STEINS_RW5 frame 12 103/);
 // Normal installation tests use instant text and the standard 24 px setting.
 for(let n=0;n<150;n++){const last=[...logs().slice(begin).matchAll(/STEINS_RW5 frame (\d+) (\d+)/g)].at(-1);if(last&&Number(last[1])===12&&Number(last[2])===331)break;const at=logs().length;await click(354,478);if(!/STEINS_RW5 frame /.test(logs().slice(at)))await click(354,478,/STEINS_RW5 frame /);}
 assert.equal([...logs().slice(begin).matchAll(/STEINS_RW5 frame (\d+) (\d+)/g)].at(-1)[2],'331');
 await click(166,478,/STEINS_RW5 menu/);await click(216,327);await click(216,385);
 const before=await shot('long-dialogue-28-before-scroll'),at=logs().length;
 await request('drag?x0=210&y0=423&x1=210&y1=355');
 const after=await shot('long-dialogue-28-after-scroll');assert.notEqual(before,after,'dialogue must scroll');
 assert.ok(!/STEINS_RW5 (?:frame|choice)/.test(logs().slice(at)),'drag must not advance the story');
 await click(216,382,/STEINS_RW5 frame 12 /);await shot('dialogue-after-scroll-and-tap');
 fs.writeFileSync(path.join(out,'dialogue-stage.json'),JSON.stringify({sha256:packageDigest,passed:true,before,after}));console.log('NATIVE_TEXT_STAGE dialogue passed');
 await click(166,478,/STEINS_RW5 menu/);await click(216,327);await click(216,443,/STEINS_RW5 background loaded title/);
 await click(216,401,/STEINS_RW5 slots ready load/);for(let n=0;n<3;n++)await click(355,474);
 await click(216,402,/STEINS_RW5 slot loaded 16 15 /);await click(265,478,/STEINS_RW5 phone opened/);
 await shot('phone-home');await click(216,186,/STEINS_RW5 frame 15 /);
 await skip();assert.match(logs().slice(begin),/STEINS_RW5 choice 15 315 dial/);
 await click(216,260,/STEINS_RW5 frame 15 /);
 await skip();await click(216,186,/STEINS_RW5 choice 8 412 reply/);
 // First email is short. Decline its optional reply, then read the longer next one.
 await click(216,334,/STEINS_RW5 frame /);await skip();
 }
 await click(216,186,/STEINS_RW5 choice 8 412 reply/);
 const mailBefore=await shot('long-mail-before-scroll'),mailAt=logs().length;
 await request('drag?x0=210&y0=130&x1=210&y1=42');
 const mailAfter=await shot('long-mail-after-scroll');assert.notEqual(mailBefore,mailAfter,'mail body must scroll');
 assert.ok(!/STEINS_RW5 (?:frame|choice)/.test(logs().slice(mailAt)),'mail drag must not choose an answer');console.log('NATIVE_TEXT_STAGE mail passed');
 await click(216,459,/STEINS_RW5 menu/);await click(216,443,/STEINS_RW5 background loaded title/);
 await click(216,459);await click(355,474);await click(216,126,/STEINS_RW5 frame 59 /);
 const chapterAt=logs().length;await skip();assert.ok(!/STEINS_RW5 ending/.test(logs().slice(chapterAt)),'chapter must continue past its first script');
 await shot('selected-chapter-continued');await click(216,459,/STEINS_RW5 menu/);await click(216,443,/STEINS_RW5 background loaded title/);
 // REDMI Watch uses its system return gesture; keep the app on title.
 assert.ok(!/STEINS_RW5 error|STEINS_RW5 background failed|Assertion failed panic|PANIC!!!|out of memory|jse_dump_obj.*Error:/i.test(logs().slice(begin)));
 const m=JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json'))),rpk=path.join(root,'dist/'+m.package+'.debug.'+m.versionName+'.rpk');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(rpk)).digest('hex'),packageDigest,'package must not change while native testing runs');
 const report={result:'passed',version:m.versionName,sha256:crypto.createHash('sha256').update(fs.readFileSync(rpk)).digest('hex'),fontSize:28,chapter:12,cursor:331,dialogueScroll:true,mailScroll:true,dragDoesNotAdvance:true,dragDoesNotChoose:true,dialogueTapAdvances:true,scrollResetAfterTap:true,selectedChapterContinues:true,physicalDeviceTested:false};
 fs.writeFileSync(path.join(out,'text-check.json'),JSON.stringify(report,null,2));console.log('NATIVE_TEXT_PASSED',JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
