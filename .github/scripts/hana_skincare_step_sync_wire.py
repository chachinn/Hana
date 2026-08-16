from pathlib import Path

index = Path('index.html')
text = index.read_text()
css = '  <link rel="stylesheet" href="skincare-step-sync.css?v=1.0.0" />\n'
if 'skincare-step-sync.css?v=1.0.0' not in text:
    anchor = '  <link rel="stylesheet" href="intelligence.css?v=1.0.0" />\n'
    if anchor not in text:
        raise SystemExit('CSS anchor missing')
    text = text.replace(anchor, anchor + css, 1)
script = '  <script src="skincare-step-sync.js?v=1.0.0"></script>\n'
if 'skincare-step-sync.js?v=1.0.0' not in text:
    anchor = '  <script src="smart-templates.js?v=1.0.0"></script>\n'
    if anchor not in text:
        raise SystemExit('script anchor missing')
    text = text.replace(anchor, anchor + script, 1)
index.write_text(text)

sw = Path('service-worker.js')
text = sw.read_text()
if '"./skincare-step-sync.css?v=1.0.0"' not in text:
    anchor = '  "./intelligence.css?v=1.0.0",\n'
    if anchor not in text:
        raise SystemExit('service-worker CSS anchor missing')
    text = text.replace(anchor, anchor + '  "./skincare-step-sync.css?v=1.0.0",\n', 1)
if '"./skincare-step-sync.js?v=1.0.0"' not in text:
    anchor = '  "./intelligence.js?v=1.0.0"\n'
    if anchor not in text:
        raise SystemExit('service-worker JS anchor missing')
    text = text.replace(anchor, '  "./intelligence.js?v=1.0.0",\n  "./skincare-step-sync.js?v=1.0.0"\n', 1)
sw.write_text(text)

print('Skincare step sync wiring prepared')
