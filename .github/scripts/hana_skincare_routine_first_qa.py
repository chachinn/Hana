from pathlib import Path
import subprocess
import textwrap

app = Path("app.js").read_text(encoding="utf-8")
index = Path("index.html").read_text(encoding="utf-8")
sw = Path("service-worker.js").read_text(encoding="utf-8")

subprocess.run(["node", "--check", "app.js"], check=True)
print("PASS JavaScript syntax")

checks = {
    "internal build": "internal build 2.0.35" in app,
    "public Version 2 preserved": 'const HANA_DISPLAY_VERSION = "2";' in app,
    "app version": 'const HANA_APP_VERSION = "2.0.35";' in app,
    "routine-first parser exists": "function parseSkincareRoutineFirstText" in app,
    "routine-first hook exists": "const routineFirst=parseSkincareRoutineFirstText(raw,{allowSingleDay});" in app,
    "day group parser exists": "function skincareRoutineFirstDaySet" in app,
    "all other days support": '/^all\\s+other\\s+days$/i.test(left)' in app,
    "grouped day separators": 'replace(/\\band\\b|[,&/+|]/g' in app,
    "arrow products": '(?:→|->|=>)' in app,
    "daily support": 'daily|every\\s*day|all\\s*days|everyday' in app,
    "packing exact behavior retained": "PACKING_SHORTCUT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000" in app,
    "2 AM skincare cutoff retained": 'return hour >= 18 || hour < 2 ? "pm" : "am";' in app,
    "index build": 'hana-app-version" content="2.0.35"' in index,
    "index app cache": "app.js?v=2.0.35" in index,
    "service worker v68": "Service Worker v68" in sw and 'hana-shell-v68' in sw,
    "service worker app cache": "app.js?v=2.0.35" in sw,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL"), name)
if failed:
    raise SystemExit("Static QA failed: " + ", ".join(failed))

node_test = r'''
const fs = require('fs');
const app = fs.readFileSync('app.js','utf8');
const start = app.indexOf('function canonicalSkincareImportCategory');
const end = app.indexOf('function skincareTextLooksStructured');
if (start < 0 || end <= start) throw new Error('Could not isolate skincare parser functions');
const SKINCARE_PRODUCT_TYPES = [
  'Cleanser','Toner','Serum','Moisturizer','Sunscreen','Eye Serum / Cream','Spot Treatment','Other'
];
eval(app.slice(start,end));

const sample = `Morning Routine ☀️
(Daily)

Cleanser → Melano CC Vitamin C Brightening Enzyme Face Wash

Toner:
• Tuesday & Saturday → Y.O.U. 7% Acid Deep Exfoliating Toner
• All other days → Numbuzin NAD+ PDRN Glow Boosting Toner

Serum → iUNIK Beta-Glucan Power Moisture Serum
Moisturizer → Snail White Sakura Hazel Soothing Essence Gel
Sunscreen → Isntree Hyaluronic Acid Watery Sun Gel

⸻

Night Routine 🌙

Tuesday / Thursday / Saturday / Sunday

Cleanser → Melano CC Vitamin C Brightening Enzyme Face Wash
Toner → Garnier Micellar Cleansing Water with Salicylic Acid (BHA) 
Serum → COSRX The Alpha Arbutin 2 Discoloration Care Serum
Moisturizer → Centellian24 Madeca Cream Time Reverse

⸻

Monday / Wednesday / Friday

Cleanser → Pond’s Men Acne Solution Anti Acne Face Wash
Toner → Garnier Micellar Cleansing Water with Salicylic Acid (BHA) 
Serum → iUNIK Beta-Glucan Power Moisture Serum
Eye Care → Seoul 1988 Eye Cream: Retinal Liposome 4% + Fermented Bean
Spot Care (if needed) → Y.O.U. AcnePlus Triple Action Spot Care
Moisturizer → Centellian24 Madeca Cream Time Reverse`;

const parsed = parseSkincareRoutineText(sample,{allowSingleDay:false});
if (!parsed) throw new Error('Routine-first sample was not recognized');
if (parsed.dayCount !== 7) throw new Error(`Expected 7 days, got ${parsed.dayCount}`);
const products = (day,time) => parsed.days[day].filter(step => step.times.includes(time)).map(step => step.product);
const has = (day,time,fragment) => products(day,time).some(product => product.includes(fragment));
const no = (day,time,fragment) => !has(day,time,fragment);
const expect = (condition,message) => { if(!condition) throw new Error(message); console.log('PASS',message); };

expect(has(2,'am','Y.O.U. 7% Acid'), 'Tuesday AM gets acid toner');
expect(has(6,'am','Y.O.U. 7% Acid'), 'Saturday AM gets acid toner');
expect(has(1,'am','Numbuzin NAD+'), 'Monday AM gets all-other-days toner');
expect(has(0,'am','Numbuzin NAD+'), 'Sunday AM gets all-other-days toner');
expect(no(2,'am','Numbuzin NAD+'), 'Tuesday AM does not duplicate hydrating toner');
expect(has(4,'pm','Melano CC'), 'Thursday PM uses first night group');
expect(has(0,'pm','Melano CC'), 'Sunday PM uses first night group');
expect(has(1,'pm','Pond’s Men'), 'Monday PM uses second night group');
expect(has(3,'pm','Pond’s Men'), 'Wednesday PM uses second night group');
expect(has(5,'pm','Seoul 1988 Eye Cream'), 'Friday PM keeps Eye Care');
expect(no(2,'pm','Seoul 1988 Eye Cream'), 'Tuesday PM does not receive Mon/Wed/Fri Eye Care');
expect(has(1,'am','Isntree Hyaluronic Acid'), 'Daily morning sunscreen reaches Monday');
expect(has(0,'am','Isntree Hyaluronic Acid'), 'Daily morning sunscreen reaches Sunday');

const mondaySpot = parsed.days[1].find(step => step.product.includes('AcnePlus Triple Action'));
expect(Boolean(mondaySpot), 'Monday PM keeps conditional Spot Care product');
expect(String(mondaySpot.notes||'').toLowerCase().includes('if needed'), 'Spot Care keeps if-needed note');

const legacy = `Monday
AM:
Cleanser: Cleanser A
PM:
Moisturizer: Cream A
Tuesday
AM:
Cleanser: Cleanser B
PM:
Moisturizer: Cream B`;
const oldParsed = parseSkincareRoutineText(legacy,{allowSingleDay:false});
expect(Boolean(oldParsed), 'existing day-first skincare import still parses');
expect(oldParsed.dayCount === 2, 'existing day-first import keeps its two days');
console.log('PASS routine-first skincare fixture');
'''
Path("/tmp/hana_skincare_fixture.js").write_text(node_test, encoding="utf-8")
subprocess.run(["node", "/tmp/hana_skincare_fixture.js"], check=True)
print("PASS Hana 2.0.35 routine-first skincare release QA")
