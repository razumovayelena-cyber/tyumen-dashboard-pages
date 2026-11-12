"""Локальный сервер дашборда: http://127.0.0.1:8765"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
PORT = 8765


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return


class DashboardServer(ThreadingHTTPServer):
    allow_reuse_address = True


def main():
    try:
        httpd = DashboardServer(("127.0.0.1", PORT), QuietHandler)
    except OSError:
        sys.exit(0)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
