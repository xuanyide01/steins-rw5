"""Read-only, bounds-checked MAGES MPK archive reader (Steam SG)."""
import struct
from pathlib import Path

class MPK:
    def __init__(self, path):
        self.path = Path(path)
        length = self.path.stat().st_size
        with self.path.open('rb') as f:
            header = f.read(64)
            if header[:4] != b'MPK\0': raise ValueError('Not MPK')
            count = struct.unpack_from('<I', header, 8)[0]
            if not 0 < count < 100000: raise ValueError('Invalid entry count')
            self.entries = []
            for _ in range(count):
                row = f.read(256)
                if len(row) != 256: raise ValueError('Truncated index')
                compression, ident, offset, size, raw = struct.unpack_from('<IIQQQ', row)
                name = row[32:].split(b'\0')[0].decode('utf8')
                if offset < 64+count*256 or offset+size > length:
                    raise ValueError('Out-of-bounds entry: '+name)
                if compression != 0 or size != raw:
                    raise ValueError('Unsupported compressed entry: '+name)
                self.entries.append(dict(id=ident,name=name,offset=offset,size=size))
        self.by_id = {x['id']:x for x in self.entries}
    def read(self, ident):
        row = self.by_id[ident]
        with self.path.open('rb') as f:
            f.seek(row['offset']); data = f.read(row['size'])
        if len(data) != row['size']: raise ValueError('Truncated resource')
        return data
