from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
p=r/'src/pages/index/index.ux';s=p.read_text('utf8')
old=s.splitlines()[2]
assert 'openingSrcA' in old
s=s.replace(old,'    <div if="{{mode === \'opening\'}}" class="opening-page" onclick="skipOpening"><div class="opening-viewport"><image class="opening-sheet" style="left:{{openingLeft}}px;top:{{openingTop}}px;" src="{{openingSrc}}" oncomplete="openingLoaded" onerror="openingError"></image></div></div>')
s=s.replace("mode === 'title' && titleAnimationEnabled","mode === 'title' && titleAnimationEnabled && !titleMediaBusy")
s=s.replace("private:{openingSrcA:'/common/opening/000.jpg',openingSrcB:'/common/opening/001.jpg',openingLeftA:0,openingLeftB:0,openingActive:0,","private:{titleMediaBusy:false,openingSrc:'/common/opening/000.jpg',openingLeft:0,openingTop:0,")
s=s.replace('(src,left,top,frame,nextSrc)=>this.paintOpening(src,left,frame,nextSrc)','(src,left,top)=>this.paintOpening(src,left,top)')
s=s.replace("this.mode==='title'&&this._settingsReady","this.mode==='title'&&!this.titleMediaBusy&&this._settingsReady")
s=s.replace('makeTitleMusic(audio,available=>{this.musicAvailable=available;', 'makeTitleMusic(audio,(available,busy)=>{this.titleMediaBusy=!!busy;if(this._titleAnimator)this._titleAnimator.update();this.musicAvailable=available;')
start=s.index('  paintOpening(');end=s.index('  openingLoaded()',start)
s=s[:start]+"  paintOpening(src,left,top){if(this.openingSrc!==src)this.openingSrc=src;if(this.openingLeft!==left)this.openingLeft=left;if(this.openingTop!==top)this.openingTop=top;},\n"+s[end:]
s=s.replace("this.openingSrcA='';this.openingSrcB='';","this.openingSrc='';")
s=s.replace('left:40px;top:158px;width:352px;height:198px;overflow:hidden;','left:24px;top:149px;width:384px;height:216px;overflow:hidden;')
s=s.replace('top:0px;width:3520px;height:198px;object-fit:contain;','top:0px;width:1536px;height:432px;object-fit:contain;')
assert 'openingSrcA' not in s and 'openingBufferReady' not in s
p.write_text(s,'utf8')
for name in ['src/manifest.json','src/config-watch.json','package.json']:
 p=r/name;m=json.loads(p.read_text('utf8'))
 if 'versionName' in m:m['versionName']='0.3.0';m['versionCode']=12
 else:m['version']='0.3.0'
 p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n','utf8')
p=r/'tools/audit-package.py';s=p.read_text('utf8').replace('im.size==(1760,99)','im.size==(768,216)');p.write_text(s,'utf8')
p=r/'tools/verify-installed.py';s=p.read_text('utf8').replace('common/title-piano.mp3','common/title-piano.wav').replace('opening/274.jpg','opening/171.jpg');p.write_text(s,'utf8')
p=r/'tools/emulator-server.cjs';s=p.read_text('utf8').replace("url.pathname==='/title-audio.mp3'||url.pathname==='/opening-audio.mp3'","url.pathname==='/title-audio.mp3'||url.pathname==='/title-audio.wav'||url.pathname==='/opening-audio.mp3'").replace("'../src/common/title-piano.mp3'","'../src/common/title-piano.wav'").replace("'Content-Type':'audio/mpeg','Content-Length'","'Content-Type':url.pathname==='/opening-audio.mp3'?'audio/mpeg':'audio/wav','Content-Length'");p.write_text(s,'utf8')
p=r/'tools/emulator-audio-client.js';s=p.read_text('utf8').replace("'/title-audio.mp3'","'/title-audio.wav'");p.write_text(s,'utf8')
p=r/'tests/features-v023.test.cjs';s=p.read_text('utf8').replace('/common/title-piano.mp3','/common/title-piano.wav').replace('[p.openingSrcA,p.openingSrcB,p.openingLeftA,p.openingLeftB,p.openingActive]','[p.openingSrc,p.openingLeft,p.openingTop]')
start=s.index("test('title music closes and restarts after ended")
s=s[:start]+'''test('guarded title restart happens before EOF and cancels at every transition',()=>{const {p,audio,tick}=host();p.toggleTitleAnimation();const n=audio.plays;tick(231580);assert.equal(p.titleMediaBusy,true);tick(500);assert.equal(audio.stops,1);tick(1199);assert.equal(audio.plays,n);tick(1);assert.equal(audio.plays,n+1);audio.onplay();assert.equal(p.titleMediaBusy,false);tick(232080);p.onHide();const m=audio.plays;tick(5000);assert.equal(audio.plays,m);p.onShow();tick(232080);p.onDestroy();tick(5000);assert.equal(audio.onended,null);});
test('late stop and natural EOF cannot orphan a native decoder or queue a title replay',()=>{const {p,audio,tick}=host();audio.onstop();p.startNew();assert.equal(audio.stops,1);p.toTitle();const n=audio.plays;audio.onended();assert.equal(p.musicAvailable,false);assert.equal(audio.stops,2);tick(300000);assert.equal(audio.plays,n);p.startNew();assert.equal(p.mode,'play');});
test('1000 guarded title cycles have bounded timers and complete cleanup',()=>{const {p,audio,tick,timers}=host();p.toggleTitleAnimation();for(let i=0;i<1000;i++){tick(232080);assert.ok(timers.size<=1);tick(1200);audio.onplay();assert.equal(audio.plays,i+2);assert.ok(timers.size<=1);}p.onHide();assert.equal(timers.size,0);p.onDestroy();assert.equal(timers.size,0);});
test('OP ended still releases its owned native stream when leaving EXTRA',()=>{const {p,audio,tick}=host();p.openExtra();p.watchOpening();p.openingLoaded();const n=audio.stops;audio.onended();p.skipOpening();assert.ok(audio.stops>n);const m=audio.plays;p.startNew();tick(300000);assert.equal(audio.plays,m);});
'''
p.write_text(s,'utf8')
print('Runtime, UI, version and tests updated for 0.3.0')
