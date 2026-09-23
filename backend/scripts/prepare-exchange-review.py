"""Copy source only to temporary verification workspaces; never copy production env or DB files."""
from pathlib import Path
import shutil
import tempfile
import hashlib
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
temp = Path(tempfile.gettempdir())
targets = {
    'backend': (temp / 'hipo-exchange-runtime-20260922', ['src', '__tests__', 'scripts'], ['package.json', 'package-lock.json', 'server.js', 'jest.config.js']),
    'frontend': (temp / 'hipo-exchange-web-20260922', ['src', 'assets'], ['package.json', 'package-lock.json', 'App.js', 'index.js', 'app.json']),
}
copied = []
def copy_changed(source, target):
    source, target = Path(source), Path(target)
    content = source.read_bytes()
    if not target.exists() or hashlib.sha256(content).digest() != hashlib.sha256(target.read_bytes()).digest():
        target.write_bytes(content)
        copied.append(str(source.relative_to(root)))
    return str(target)

if '--files' in sys.argv or '--changed' in sys.argv:
    names = set()
    if '--files' in sys.argv:
        names.update(sys.argv[sys.argv.index('--files') + 1:])
    else:
        for args in [['diff', '--name-only'], ['ls-files', '--others', '--exclude-standard']]:
            names.update(subprocess.check_output(['git', *args], cwd=root, text=True).splitlines())
    for name in sorted(names):
        parts = Path(name).parts
        if not parts or '..' in parts or parts[0] not in targets or Path(name).suffix not in ['.js', '.json', '.py']:
            continue
        source = root / name
        if not source.is_file():
            continue
        target = targets[parts[0]][0].joinpath(*parts[1:])
        target.parent.mkdir(parents=True, exist_ok=True)
        copy_changed(source, target)
    print(f'Updated {len(copied)} changed source files', flush=True)
    sys.exit(0)

for project, (target, directories, files) in targets.items():
    target.mkdir(parents=True, exist_ok=True)
    for directory in directories:
        shutil.copytree(root / project / directory, target / directory, dirs_exist_ok=True, copy_function=copy_changed)
    for name in files:
        copy_changed(root / project / name, target / name)
    print(f'Prepared {project}: {target}', flush=True)
print(f'Updated {len(copied)} files; source content verified', flush=True)
