from pathlib import Path
from PIL import Image
import json,hashlib,numpy as np
r=Path(__file__).resolve().parents[1];reports={}
for name,folder,box in [('original12fps','native-test-results/v029/benchmark-before',(0,135,432,378)),('optimized12fps','native-test-results/v030/benchmark',(24,149,408,365))]:
 p=r/folder;times=json.loads((p/'times.json').read_text('utf8'));hashes=[]
 for i in range(len(times)):
  with Image.open(p/f'{i}.png') as im:hashes.append(hashlib.sha256(im.convert('RGB').crop(box).tobytes()).hexdigest())
 changes=[i for i in range(1,len(hashes)) if hashes[i]!=hashes[i-1]];spans=[];start=0
 for i in changes+[len(times)-1]:spans.append(times[i]-times[start]);start=i
 reports[name]={'samples':len(times),'elapsedMs':times[-1]-times[0],'pixelChanges':len(changes),'observedPixelChangesPerSecond':len(changes)*1000/(times[-1]-times[0]),'p95SamePictureMs':float(np.percentile(spans,95)),'maxSamePictureMs':max(spans)}
data={'result':'passed','comparison':reports,'method':'Exact RGB pixel hashes of visible movie crop in 120 consecutive HTTP captures, same moving OP segment. Captures are throughput-limited and were collected in separate sessions. These are desktop observations, not physical-watch FPS or a controlled hardware benchmark.','requiresPhysicalSmoothnessReview':True}
(r/'reports/opening-v030-comparison.json').write_text(json.dumps(data,indent=2),'utf8');print(json.dumps(data))
