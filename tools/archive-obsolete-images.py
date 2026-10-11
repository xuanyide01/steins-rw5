"""Keep replaced assets outside src so old unused JPEGs are not packaged."""
from pathlib import Path
import json,shutil
root=Path(__file__).resolve().parents[1];images=(root/'src/common/images').resolve()
archive=(root/'asset-backups/0.1.1-replaced-images').resolve()
assert archive.is_relative_to(root.resolve())
data=json.loads((root/'src/common/assets.txt').read_text('utf8'))
used=set(data['assets'].values());archive.mkdir(parents=True,exist_ok=True);count=0
for path in images.iterdir():
    assert path.resolve().parent==images
    if path.is_file() and path.name not in used:
        target=archive/path.name
        if target.exists():assert target.read_bytes()==path.read_bytes();continue
        shutil.move(str(path),str(target));count+=1
print('archived unused images',count,'referenced image bytes',sum((images/f).stat().st_size for f in used))
