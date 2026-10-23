from pathlib import Path
from PIL import Image
import subprocess,json,hashlib,wave
r=Path(__file__).resolve().parents[1];dest=r/'src/common/opening';raw=sorted((r/'artwork/v028/raw').glob('frame*.png'));assert len(raw)==2750
for p in dest.glob('*.jpg'):p.unlink()
rows=[]
for start in range(0,1375,8):
 atlas=Image.new('RGB',(768,216))
 for j,i in enumerate(range(start,min(start+8,1375))):
  with Image.open(raw[i*2]) as im:frame=im.convert('RGB').resize((192,108),Image.Resampling.LANCZOS)
  atlas.paste(frame,((j%4)*192,(j//4)*108))
 p=dest/f'{start//8:03d}.jpg';atlas.save(p,quality=18,optimize=True,subsampling=2)
 rows.append({'file':p.name,'firstFrame':start,'count':min(8,1375-start),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
ff=r.parent/'sg-media-runtime/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';audio=r/'src/common/title-piano.wav'
subprocess.run([str(ff),'-y','-v','error','-i',str(r/'artwork/v026/BGM03.ogg'),'-af','atrim=duration=232.0806349206,afade=t=out:st=231.9606:d=0.12,apad=pad_dur=2','-map_metadata','-1','-ac','1','-ar','8000','-c:a','pcm_s16le',str(audio)],check=True)
with wave.open(str(audio)) as w:assert w.getnchannels()==1 and w.getsampwidth()==2 and w.getframerate()==8000;duration=w.getnframes()/8000
old=r/'src/common/title-piano.mp3'
if old.exists():
 assert old.read_bytes()==(r/'reports/before-v030/src/common/title-piano.mp3').read_bytes();old.unlink()
data={'result':'passed','source':'Steam OP.bk2 and BGM03.ogg, original files read-only','openingFrames':1375,'openingFPS':12.0000192,'openingDurationMilliseconds':114583.15,'frameSize':[192,108],'displaySize':[384,216],'viewport':[24,149,384,216],'atlasSize':[768,216],'atlasCount':len(rows),'framesPerAtlas':8,'jpegQuality':18,'totalImageBytes':sum(x['bytes'] for x in rows),'singleAtlasRGBABytes':768*216*4,'singleDisplaySheetRGBABytes':1536*432*4,'frames':rows,'titleAudio':{'file':'common/title-piano.wav','bytes':audio.stat().st_size,'sha256':hashlib.sha256(audio.read_bytes()).hexdigest(),'codec':'PCM signed 16-bit little-endian','sampleRate':8000,'channels':1,'durationSeconds':duration,'contentSeconds':232.0806349206,'guardSilenceSeconds':2,'stopBeforeEOFMilliseconds':2000,'fadeOutMilliseconds':120},'standaloneVideoExported':False}
(r/'reports/media-v030-source.json').write_text(json.dumps(data,indent=2),'utf8');print(json.dumps({k:v for k,v in data.items() if k!='frames'}))

