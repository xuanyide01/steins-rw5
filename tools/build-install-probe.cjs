// Same identity, icon, feature list and compiler as failed 0.2.1.
// Only a tiny, clearly labelled page replaces the game payload.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../steins-install-probe');
const toolkit=process.env.WATCH_COMPAT_TOOLKIT;
(async()=>{
 fs.mkdirSync(path.join(project,'src/pages/index'),{recursive:true});
 fs.mkdirSync(path.join(project,'src/common'),{recursive:true});
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json')));
 Object.assign(manifest,{package:'com.codex.steins2.rw5',name:'命运石之门',versionName:'0.2.2-probe',versionCode:3});
 for(const file of ['manifest.json','config-watch.json'])fs.writeFileSync(path.join(project,'src',file),JSON.stringify(manifest,null,2));
 fs.writeFileSync(path.join(project,'package.json'),JSON.stringify({name:'steins-install-probe',version:'0.2.2',private:true}));
 fs.copyFileSync(path.join(root,'quickapp.config.js'),path.join(project,'quickapp.config.js'));
 fs.copyFileSync(path.join(root,'src/common/logo.png'),path.join(project,'src/common/logo.png'));
 fs.writeFileSync(path.join(project,'src/app.ux'),'<script>export default {onCreate(){console.log("STEINS_INSTALL_PROBE created");}}</script>');
 fs.writeFileSync(path.join(project,'src/pages/index/index.ux'),`<template><div class="page"><image class="icon" src="/common/logo.png" oncomplete="ready"></image><text class="title">安装检测 P1</text><text class="line">此包不含游戏剧情</text><text class="line">图标和此页面显示即通过</text><text class="line">仅用于区分安装失败阶段</text><text class="line">版本：0.2.2-probe</text></div></template>
<script>export default {ready(){console.log('STEINS_INSTALL_PROBE ready');}}</script>
<style>.page{width:432px;height:514px;flex-direction:column;align-items:center;justify-content:center;background-color:#081018;}.icon{width:96px;height:96px;object-fit:contain;margin-bottom:22px;}.title{font-size:30px;color:#ffffff;height:52px;}.line{font-size:22px;color:#bbdfea;height:40px;}</style>`);
 process.chdir(project);
 const result=await require(path.join(toolkit,'lib/commands/compile')).compile('native','prod',false,{signMode:'BUILD'});
 if(result.compileError||result.stats.hasErrors())throw Error('Probe compile failed');
 const rpk=path.join(project,'dist',manifest.package+'.debug.'+manifest.versionName+'.rpk');
 const report=await require('./repack-rpk.cjs').repackRpk(rpk,rpk,toolkit);
 const output=path.resolve(root,'../../outputs/命运石之门-安装检测-P1.bin');
 fs.copyFileSync(rpk,output);
 fs.writeFileSync(path.join(root,'reports/install-probe-p1.json'),JSON.stringify({...report,file:output,package:manifest.package,containsGame:false,physicalStatus:'awaiting'},null,2));
 console.log('PROBE',JSON.stringify({output,...report}));
})().catch(e=>{console.error(e);process.exitCode=1;});
