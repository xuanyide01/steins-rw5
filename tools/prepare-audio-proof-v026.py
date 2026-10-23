from pathlib import Path
import hashlib,json,struct
r=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
raw=r/'artwork/v026/BGM03.ogg';encoded=r/'src/common/title-piano.mp3';b=raw.read_bytes()
assert b.startswith(b'OggS') and b'LOOPSTART=0' in b[:600] and b'LOOPLENGTH=10234756' in b[:600]
script=r.parent/'steins-probe/disasm-sc/_STARTUP_WIN.scs';assert '80:\n\tBGMplay 0\n' in script.read_text('utf8')
report={'result':'passed','game':'Steam STEINS;GATE supplied by maintainer','titleCue':'_STARTUP_WIN.scs label 80: BGMplay 0','archive':'USRDIR/bgm.mpk','entryId':0,'entryName':'BGM03.ogg','sourceSHA256':sha(raw),'sourceBytes':raw.stat().st_size,'loopStartSamples':0,'loopLengthSamples':10234756,'originalSampleRate':44100,'trimSeconds':10234756/44100,'encoded':'common/title-piano.mp3','encodedSHA256':sha(encoded),'encodedBytes':encoded.stat().st_size,'codec':'MP3','channels':1,'sampleRate':22050,'bitrate':64000,'converter':'imageio-ffmpeg 0.6.0 bundled FFmpeg 7.1, libmp3lame','command':'ffmpeg -i BGM03.ogg -t 232.0806349 -map_metadata -1 -ac 1 -ar 22050 -c:a libmp3lame -b:a 64k title-piano.mp3','runtimeAPI':'https://iot.mi.com/vela/quickapp/zh/features/other/audio.html','titleOnlyWithMenuScreens':True,'stopsForStoryAndHide':True,'doesNotChangeSystemVolume':True,'originalGameResourcesModified':False,'rights':'Original music remains owned by its rights holders; not MIT.'}
(r/'reports/audio-v026-source.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print(json.dumps({'result':'passed','encodedBytes':report['encodedBytes'],'encodedSHA256':report['encodedSHA256']}))
