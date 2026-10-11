const {test}=require('node:test'),assert=require('node:assert/strict'),{api}=require('./harness.cjs');
const scalar=(pc,n)=>[pc,['W',99],'=',n];
test('merged calculations preserve logical yield boundaries and intermediate writes',()=>{
 const prefix=Array.from({length:250},()=>['set',['T',88],'=',0]);
 const steps=Array.from({length:10},(_,i)=>scalar(250+i,i===9?2:1));
 steps[0].push(259);
 const ops=prefix.concat([['assigns',250,260,steps]],Array.from({length:9},()=>['batchAt',250]),[['text','','done']]);
 const raw=prefix.concat(steps.map(s=>['set',s[1],s[2],s[3]]),[['text','','done']]);
 const a=api.newState(),b=api.newState();a.cursor=b.cursor=0;
 assert.equal(api.readFrame(raw,a).type,'yield');assert.equal(api.readFrame(ops,b).type,'yield');
 assert.equal(a.cursor,256);assert.equal(b.cursor,256);assert.equal(api.value(['W',99],b),1);
 assert.equal(api.readFrame(raw,a).type,'text');assert.equal(api.readFrame(ops,b).type,'text');
 assert.equal(b.cursor,260);assert.equal(api.value(['W',99],b),2);
});
test('an old save can resume inside a merged assignment group',()=>{
 const steps=[scalar(0,3),scalar(1,4),scalar(2,5)],ops=[['assigns',0,3,steps],['batchAt',0],['batchAt',0],['text','','done']];
 const s=api.newState();s.cursor=1;s.variables['W:99']=3;
 const restored=api.restore(JSON.parse(JSON.stringify(api.checkpoint(s))));
 assert.equal(api.readFrame(ops,restored).type,'text');assert.equal(restored.cursor,3);assert.equal(api.value(['W',99],restored),5);
});
