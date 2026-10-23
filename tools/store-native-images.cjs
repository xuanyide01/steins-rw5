// Same strategy as the physically verified anemoi 0.2.2+: keep PNG/JPEG
// bytes native, without an additional ZIP inflate stage during installation.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{createRequire}=require('module');
module.exports=async function(file,toolkit){
 const req=createRequire(path.join(path.resolve(toolkit),'package.json')),JSZip=req('jszip');
 const algorithm=req.resolve('@aiot-toolkit/packager/lib/signature/algorithm'),pem=path.join(path.dirname(algorithm),'../pem');
 const zip=await JSZip.loadAsync(fs.readFileSync(file),{checkCRC32:true});zip.comment='';const files=[];let images=0,bytes=0;
 for(const [name,entry] of Object.entries(zip.files)){
  if(entry.dir)continue;const data=await entry.async('nodebuffer');files.push({name,hash:crypto.createHash('sha256').update(data).digest()});
  if(/\.(png|jpg)$/.test(name)){entry.options.compression='STORE';images++;bytes+=data.length;}
 }
 const unsigned=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9}});
 const signed=require(algorithm).doSign(unsigned,files,fs.readFileSync(path.join(pem,'private.pem')),fs.readFileSync(path.join(pem,'certificate.pem')));
 fs.writeFileSync(file,signed);fs.writeFileSync(path.resolve(__dirname,'../reports/install-packaging.json'),JSON.stringify({storedImages:images,storedImageBytes:bytes,imageBytesUnchanged:true,otherFiles:'DEFLATE',physicalFailureCauseConfirmed:false},null,2));
};
