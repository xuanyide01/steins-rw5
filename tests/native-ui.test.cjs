const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function pendingPage(){
 const source=fs.readFileSync(path.join(__dirname,'../src/pages/index/index.ux'),'utf8').split('<script>')[1].split('</script>')[0].replace(/^import[^;]+;/gm,'').replace('export default','this.page=');
 let reads=0,advances=0,nextId=1;const timers=new Map();
 const ctx={console:{log(){}},Date,catalog:{scenes:{1:{length:1}}},readFrame:()=>++reads===1?{type:'yield'}:{type:'text',speaker:'',text:'complete dialogue'},next:()=>advances++,storyDate:()=>'(日期：07.28)',imagePath:x=>x,portraitBox:()=>({width:0,height:0,left:0,top:0}),cleanText:x=>x,dialogueText:x=>x,wrapText:x=>x,textFont:()=> 'sans-serif',setTimeout:fn=>{const id=nextId++;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(source,ctx);
 const page=Object.assign({},ctx.page,{loading:false,session:{chapter:1,cursor:0,background:'black',bodies:[],sceneLayers:[],ended:false},timer:null,_blockCache:{},_autoHops:0,fontSize:24,textSpeed:0,readChapter(ch,done){done();},syncProgress(){},$element(){return {scrollTo(){}};}});
 return {page,timers,advances:()=>advances};
}
test('a fast next tap cannot cancel the pending VM frame or advance its cursor',()=>{
 const {page,timers,advances}=pendingPage();page.renderFrame();assert.equal(page.loading,true);assert.equal(timers.size,1);page.advance();assert.equal(advances(),0);assert.equal(timers.size,1);const fn=[...timers.values()][0];timers.clear();fn();assert.equal(page.loading,false);assert.equal(page.displayText,'complete dialogue');page.advance();assert.equal(advances(),1);
});
test('hiding during a VM frame preserves the pending work and showing resumes it',()=>{
 const {page,timers,advances}=pendingPage();page.renderFrame();page.onHide();assert.equal(timers.size,0);assert.equal(page._renderPending,true);page.onShow();assert.equal(page.loading,false);assert.equal(page._renderPending,false);assert.equal(page.displayText,'complete dialogue');assert.equal(advances(),0);
});

test('dialogue taps advance once while dragging and scrolling never advance',()=>{
 const {page}=pendingPage();let advances=0;page.advance=()=>advances++;
 const event=(x,y)=>({touches:[{clientX:x,clientY:y}],changedTouches:[{clientX:x,clientY:y}]});
 page.dialogueTouchStart(event(200,380));page.dialogueTouchMove(event(201,381));page.dialogueTap();assert.equal(advances,1);
 page.dialogueTouchStart(event(200,420));page.dialogueTouchMove(event(200,350));page.dialogueTap();assert.equal(advances,1);
 page.dialogueTouchStart(event(200,380));page.dialogueScrolled();page.dialogueTap();assert.equal(advances,1);
 page.dialogueTouchStart(event(200,380));page.dialogueTap();assert.equal(advances,2);
});

test('new dialogue resets the scroll by coordinates supported by Vela scroll',()=>{
 const {page}=pendingPage();let argument;page.$element=()=>({scrollTo(value){argument=value;}});
 page.resetDialogueScroll();assert.equal(argument.top,0);assert.equal(argument.left,0);assert.equal(argument.behavior,'instant');assert.equal(argument.index,undefined);
});
