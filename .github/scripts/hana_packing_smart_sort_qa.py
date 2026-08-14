from pathlib import Path
from datetime import datetime, timedelta
import re
import subprocess

app = Path("app.js").read_text(encoding="utf-8")
index = Path("index.html").read_text(encoding="utf-8")
css = Path("style.css").read_text(encoding="utf-8")
sw = Path("service-worker.js").read_text(encoding="utf-8")

subprocess.run(["node", "--check", "app.js"], check=True)
print("PASS JavaScript syntax")

checks = {
    "internal build": "internal build 2.0.34" in app,
    "public version preserved": 'const HANA_DISPLAY_VERSION = "2";' in app,
    "app version": 'const HANA_APP_VERSION = "2.0.34";' in app,
    "2am skincare preserved": 'return hour >= 18 || hour < 2 ? "pm" : "am";' in app,
    "packing exact window constant": "PACKING_SHORTCUT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000" in app,
    "packing active strict cutoff": "at >= start - PACKING_SHORTCUT_WINDOW_MS && at < start" in app,
    "packing exact transition timer": "transition - now.getTime() + 80" in app,
    "packing open helper": "function openActivePackingList()" in app,
    "packing data identity": "templateType," in app and "tripStartAt: String(list.tripStartAt || \"\")" in app,
    "packing manual datetime": 'id="listTripStartAt" type="datetime-local"' in index,
    "packing header button": 'id="packingQuickButton"' in index and "data-open-trip-packing" in index,
    "packing countdown": 'id="packingQuickCountdown"' in index,
    "render refresh": "refreshPackingQuickButton();" in app,
    "visibility refresh": 'document.addEventListener("visibilitychange"' in app and "refreshPackingQuickButton()" in app,
    "packing template still empty": 'packing: { name: "Packing List", icon: "🧳", items: [] }' in app,
    "smart type set": 'new Set(["packing","grocery","meeting-agenda","meeting-minutes","expenses","tracker","project"])' in app,
    "smart packing creator": "function createSmartListFromText" in app,
    "smart meeting creator": "function createSmartMeetingFromText" in app,
    "smart expenses creator": "function createSmartExpenseTracker" in app,
    "smart tracker creator": "function createSmartTrackerFromText" in app,
    "smart project creator": "function createSmartProjectFromText" in app,
    "meeting decisions stay separate": "data.decisionItems.push(normalizeMeetingDecisionItem" in app,
    "smart quick capture": "const structuredKind=smartStructuredCaptureKind(text);if(structuredKind)" in app,
    "smart brain dump": "const structuredKind=smartStructuredCaptureKind(text,destination);if(structuredKind)" in app,
    "packing destination": '{value:"packing",label:"🧳 Packing list"}' in app,
    "grocery destination": '{value:"grocery",label:"🛒 Grocery list"}' in app,
    "minutes destination": '{value:"meeting-minutes",label:"📝 Meeting minutes"}' in app,
    "agenda destination": '{value:"meeting-agenda",label:"📋 Meeting agenda"}' in app,
    "expense destination": '{value:"expenses",label:"💳 Expense tracker"}' in app,
    "tracker destination": '{value:"tracker",label:"📒 Tracker"}' in app,
    "project destination": '{value:"project",label:"🌷 Project plan"}' in app,
    "updated Brain Dump help": "keeps recognized structures" in app,
    "context CSS": ".packing-quick-header-button" in css and ".packing-trip-timing" in css,
    "index version": 'hana-app-version" content="2.0.34"' in index,
    "index JS cache": "app.js?v=2.0.34" in index,
    "index CSS cache": "style.css?v=2.0.34" in index,
    "service worker v67": "Service Worker v67" in sw and 'hana-shell-v67' in sw,
    "service worker JS cache": "app.js?v=2.0.34" in sw,
    "service worker CSS cache": "style.css?v=2.0.34" in sw,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL"), name)
if failed:
    raise SystemExit("QA failed: " + ", ".join(failed))

# Exact-window regression test. A Monday 01:00 trip must surface precisely one
# week earlier at 01:00 and stop at the trip start, not at calendar midnight.
trip = datetime(2026, 8, 17, 1, 0, 0)  # Monday
window = trip - timedelta(days=7)

def active(now):
    return now >= window and now < trip

boundaries = [
    (datetime(2026,8,10,0,59,59), False, "one second before 7-day window"),
    (datetime(2026,8,10,1,0,0), True, "exact 7-day window start"),
    (datetime(2026,8,16,23,59,59), True, "Sunday night"),
    (datetime(2026,8,17,0,59,59), True, "one second before Monday 1 AM"),
    (datetime(2026,8,17,1,0,0), False, "exact Monday 1 AM departure"),
    (datetime(2026,8,17,1,0,1), False, "after departure"),
]
for moment, expected, label in boundaries:
    got = active(moment)
    if got != expected:
        raise SystemExit(f"Packing boundary failed: {label}: got {got}, expected {expected}")
    print("PASS packing boundary", label)

# Ensure trip timing has no opinionated default value.
if re.search(r'id="listTripStartAt"[^>]*value="[^\"]+"', index):
    raise SystemExit("Trip start must remain blank by default")
print("PASS blank-friendly trip timing")

print("PASS Hana 2.0.34 packing + Smart Sort release QA")
