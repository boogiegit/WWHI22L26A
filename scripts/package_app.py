#!/usr/bin/env python3
"""Build only this tour's reviewed application files for Hostinger."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

ROOT = Path(__file__).resolve().parents[1]
FILES = ['.htaccess', 'index.html', 'app.html', 'api.php', 'manifest.json', 'sw.js',
         'colosseum-tickets.html', 'venice-passes.html', 'pantheon-tickets/index.html',
         'server/bootstrap.php', 'server/onward.php', 'server/resource-preview.php',
         'server/config.example.php', 'server/.htaccess', 'data/.htaccess']
DIRS = ['assets', 'css', 'js', 'config', 'tours/WWHI22L26A']

def app_files():
    files = {ROOT / name for name in FILES}
    files.update(ROOT.glob('*.png'))
    files.update(ROOT.glob('*.ico'))
    files.update(ROOT.glob('*.jpg'))
    for directory in DIRS:
        files.update(p for p in (ROOT / directory).rglob('*') if p.is_file())
    for p in files:
        if p.is_symlink() or not p.resolve().is_relative_to(ROOT):
            raise ValueError(f'External path is not permitted: {p}')
        if any(part.startswith('.') for part in p.relative_to(ROOT).parts) and p.name != '.htaccess':
            raise ValueError(f'Unexpected hidden file: {p}')
        if '.local.' in p.name or p.suffix.lower() not in {'.html','.php','.json','.js','.css','.png','.jpg','.jpeg','.webp','.gif','.svg','.ico','.pdf','.htaccess'}:
            if p.name != '.htaccess':
                raise ValueError(f'Unreviewed file type: {p}')
    return sorted(files)

if __name__ == '__main__':
    destination = ROOT / 'dist'
    destination.mkdir(exist_ok=True)
    archive = destination / 'WWHI22L26A-app.zip'
    files = app_files()
    with ZipFile(archive, 'w', ZIP_DEFLATED) as bundle:
        for file in files:
            bundle.write(file, str(file.relative_to(ROOT)))
    (destination / 'manifest.json').write_text(json.dumps([str(p.relative_to(ROOT)) for p in files], indent=2)+'\n')
    print(f'{archive}: {len(files)} application files; no passwords, runtime data or tests.')
