#!/usr/bin/env python3
"""Local server for development.

Like `python3 -m http.server`, but it tells the browser not to keep the files. With the plain server a
browser can go on using an older copy of one JavaScript module for a while after it changed, and a page
that imports a newer name from it then stays blank.

Usage: python3 tools/serve.py [port]   (default 8000, only on this computer)
"""
import http.server
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f'Serving on http://localhost:{port}', flush=True)
http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
