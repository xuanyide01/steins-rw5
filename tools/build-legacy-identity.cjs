// Controlled full candidate: retain 0.2.1 game data/UI, restore the
// physically installable 0.1.4 identity and its original compression pipeline.
const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../steins-rw5-compat');
const toolkit=process.env.WATCH_COMPAT_TOOLKIT;
(async()=>{
 if(fs.existsSync(project))throw Error('Refusing to overwrite an existing candidate project');
 fs.mkdirSync(project,{recursive:true});
 fs.cpSync(path.join(root,'src'),path.join(project,'src'),{recursive:true});
 for(const name of ['quickapp.config.js','LICENSE','THIRD_PARTY_NOTICES.md'])fs.copyFileSync(path.join(root,name),path.join(project,name));
 const req=createRequire(path.join(toolkit,'package.json')),JSZip=req('jszip');
 const old=await JSZip.loadAsync(fs.readFileSync(path.resolve(root,'../../outputs/命运石之门-REDMIWatch5-0.1.4.bin')));
 const manifest=JSON.parse(await old.file('manifest-watch.json').async('string'));
 Object.assign(manifest,{versionName:'0.2.2',versionCode:6});
 for(const name of ['manifest.json','config-watch.json'])fs.writeFileSync(path.join(project,'src',name),JSON.stringify(manifest,null,2));
 fs.writeFileSync(path.join(project,'package.json'),JSON.stringify({name:'steins-rw5-compat',version:'0.2.2',private:true},null,2));
 process.chdir(project);
 const result=await require(path.join(toolkit,'lib/commands/compile')).compile('native','prod',false,{signMode:'BUILD'});
 if(result.compileError||result.stats.hasErrors())throw Error('Compatibility build failed');
 const rpk=path.join(project,'dist',manifest.package+'.debug.'+manifest.versionName+'.rpk');
 // Exactly the old 0.1.4 finalization: no additional STORE recompression.
 const report=await require('./repack-rpk.cjs').repackRpk(rpk,rpk,toolkit);
 fs.writeFileSync(path.join(root,'reports/legacy-identity-candidate.json'),JSON.stringify({...report,rpk,package:manifest.package,version:manifest.versionName,versionCode:6,physicalStatus:'unverified',changes:['legacy package identity','monotonic versionCode','legacy DEFLATE packaging'],gamePayload:'unchanged from 0.2.1'},null,2));
 console.log('COMPAT_CANDIDATE',JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
