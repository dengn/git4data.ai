#!/usr/bin/env python3
"""Build a deterministic, instruction-only skill archive and public manifest."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
manifest_path = ROOT / 'data/agent-skill.json'
manifest = json.loads(manifest_path.read_text())
source = ROOT / 'skills' / manifest['name']
assert source.is_dir() and (source / 'SKILL.md').is_file()
assert f'version: "{manifest["version"]}"' in (source / 'SKILL.md').read_text()
output = ROOT / 'outputs/skill-release'
output.mkdir(parents=True, exist_ok=True)
archive = output / manifest['asset']
files = sorted(p for p in source.rglob('*') if p.is_file())
with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as z:
    for path in files:
        assert not path.is_symlink(), f'Refusing symlink: {path}'
        assert path.suffix in ('.md', '.yaml') or path.name == 'LICENSE', path
        item = ZipInfo(str(path.relative_to(source.parent)), date_time=(2026, 9, 26, 0, 0, 0))
        item.compress_type = ZIP_DEFLATED
        item.external_attr = 0o100644 << 16
        z.writestr(item, path.read_bytes())
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(output / 'SHA256SUMS').write_text(f'{digest}  {archive.name}\n')
manifest.update(sha256=digest, bytes=archive.stat().st_size, files=len(files))
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
print(f'{archive}\n{len(files)} files; {manifest["bytes"]} bytes; sha256={digest}')
