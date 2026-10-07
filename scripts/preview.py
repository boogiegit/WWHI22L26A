#!/usr/bin/env python3
"""Read-only loopback preview, restricted to public application files."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit
from pathlib import Path
import argparse
import webbrowser
from package_app import ROOT, app_files

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=0)
parser.add_argument('--no-open', action='store_true')
args = parser.parse_args()
allowed = {str(p.relative_to(ROOT)) for p in app_files()
           if p.suffix != '.php' and not any(part.startswith('.') for part in p.relative_to(ROOT).parts)}

class Preview(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        relative = unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
        target = ROOT / relative
        if relative not in allowed or target.is_symlink() or not target.resolve().is_relative_to(ROOT):
            self.send_error(403, 'Only public app files are available in preview')
            return None
        return super().send_head()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

server = ThreadingHTTPServer(('127.0.0.1', args.port), Preview)
url = f'http://127.0.0.1:{server.server_port}/app.html?preview=1'
print(f'Local preview: {url}', flush=True)
print('Admin saving requires the configured PHP server. Control+C stops preview.', flush=True)
if not args.no_open:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    server.server_close()
