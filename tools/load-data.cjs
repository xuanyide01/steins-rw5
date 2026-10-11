const fs=require('fs'),path=require('path'),vm=require('vm');
module.exports=function loadData(root){
 const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'src/common/catalog.js'),'utf8').replace('export const catalog','this.catalog'),ctx);
 const ops={};for(const id of Object.keys(ctx.catalog.scenes)){const dir=path.join(root,'src/common/story',id);ops[id]=fs.readdirSync(dir).filter(x=>x.endsWith('.txt')).sort((a,b)=>parseInt(a)-parseInt(b)).flatMap(n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')));}
 const read=n=>JSON.parse(fs.readFileSync(path.join(root,'src/common',n+'.txt'),'utf8'));return {catalog:ctx.catalog,ops,memory:read('memory'),mail:read('mail'),channels:read('channel')};
};
