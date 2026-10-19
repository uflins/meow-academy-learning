# 開發用靜態伺服器：關閉快取，改完檔案重新整理就看得到。
# 用法：python3 tools/dev-server.py [port]
import http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCache).serve_forever()
