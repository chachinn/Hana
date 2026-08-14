from pathlib import Path
import subprocess

app = Path("app.js").read_text(encoding="utf-8")
html = Path("index.html").read_text(encoding="utf-8")
css = Path("style.css").read_text(encoding="utf-8")
sw = Path("service-worker.js").read_text(encoding="utf-8")

subprocess.run(["node", "--check", "app.js"], check=True)

start = app.index("function skincarePeriodForTime")
end = app.index("function savedSkincareNotes", start)
block = app[start:end]
test = '''
const cases=[[new Date(2026,7,14,15,20),"am"],[new Date(2026,7,14,17,59),"am"],[new Date(2026,7,14,18,0),"pm"],[new Date(2026,7,15,2,0),"pm"],[new Date(2026,7,15,4,0),"am"]];
for(const [date,want] of cases){const got=skincarePeriodForTime(date);if(got!==want)throw new Error(`${date}: ${got} != ${want}`);}
console.log("PASS time-aware skincare period");
'''
Path("/tmp/hana-skincare-time-test.js").write_text(block + test, encoding="utf-8")
subprocess.run(["node", "/tmp/hana-skincare-time-test.js"], check=True)

checks = {
    "version": 'const HANA_APP_VERSION = "2.0.32";' in app,
    "shortcut helper": "function openTodaysSkincareRoutine" in app and "function refreshSkincareQuickButton" in app,
    "render refresh": "refreshSkincareQuickButton();" in app,
    "period state": 'let activeSkincareViewPeriod = "all";' in app,
    "period controls": 'data-skincare-view-period="am"' in app and 'data-skincare-view-period="pm"' in app,
    "today button": 'id="skincareQuickButton"' in html and "data-open-today-skincare" in html,
    "button beside search": html.index('id="globalSearchButton"') < html.index('id="skincareQuickButton"') < html.index('id="headerQuickAccessButton"'),
    "css": "SKINCARE TODAY SHORTCUT v2.0.32" in css,
    "cache": "hana-shell-v65" in sw and "app.js?v=2.0.32" in sw and "style.css?v=2.0.32" in sw,
    "index version": "app.js?v=2.0.32" in html and "style.css?v=2.0.32" in html and 'content="2.0.32"' in html,
}
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL"), name)
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit("QA failed: " + ", ".join(failed))

subprocess.run(["git", "diff", "--check"], check=True)
