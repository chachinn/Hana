from pathlib import Path

index = Path('index.html')
text = index.read_text()
anchor = '  <script src="skincare-step-sync.js?v=1.0.0"></script>\n'
insert = anchor + '  <script src="list-scroll-memory.js?v=1.0.0"></script>\n'
if 'list-scroll-memory.js?v=1.0.0' not in text:
    if anchor not in text:
        raise SystemExit('index script anchor missing')
    text = text.replace(anchor, insert, 1)
index.write_text(text)

sw = Path('service-worker.js')
text = sw.read_text()
text = text.replace('const CACHE_NAME = "hana-shell-v1-weekend-reminders-1";', 'const CACHE_NAME = "hana-shell-v1-list-column-scroll-1";', 1)
anchor = '  "./skincare-step-sync.js?v=1.0.0"\n'
replacement = '  "./skincare-step-sync.js?v=1.0.0",\n  "./list-scroll-memory.js?v=1.0.0"\n'
if 'list-scroll-memory.js?v=1.0.0' not in text:
    if anchor not in text:
        raise SystemExit('service worker shell anchor missing')
    text = text.replace(anchor, replacement, 1)
sw.write_text(text)
