const fs = require('fs');
const vm = require('vm');

const app = fs.readFileSync('app.js','utf8');
const index = fs.readFileSync('index.html','utf8');
const sw = fs.readFileSync('service-worker.js','utf8');
const style = fs.readFileSync('style.css','utf8');

function assert(ok, message){ if(!ok) throw new Error(message); }

// Syntax is checked separately with node --check; these are behavior/consistency guards.
assert(app.includes('const HANA_APP_VERSION = "2.0.20";'), 'internal build missing');
assert(app.includes('const HANA_DISPLAY_VERSION = "2";'), 'display version missing');
assert(app.includes('version: HANA_DISPLAY_VERSION'), 'release notes not using display version');
assert(index.includes('data-hana-version>2</span>'), 'menu does not show Version 2');
assert(index.includes('hana-app-version" content="2.0.20"'), 'update meta build mismatch');
assert(index.includes('style.css?v=2.0.20'), 'style cache query mismatch');
assert(index.includes('app.js?v=2.0.20'), 'app cache query mismatch');
assert(sw.includes('hana-shell-v53'), 'service worker cache mismatch');
assert(sw.includes('./style.css?v=2.0.20'), 'service worker style build mismatch');
assert(sw.includes('./app.js?v=2.0.20'), 'service worker app build mismatch');
assert(style.includes('HANA VERSION 2 OPTIONAL SKINCARE ALTERNATE'), 'optional alternate styling missing');
assert(app.includes('function skincareOptionalAlternateEditor'), 'optional alternate helper missing');
assert(app.includes('if(hasAlternate)return skincareRoutineBatchEditor'), 'existing alternate does not reveal table');
assert(app.includes('+ Add alternate ${meta.routine==="am"?"AM":"PM"} routine'), 'alternate add CTA missing');
assert(app.includes('if(!category&&!product&&!notes)return;'), 'blank skincare rows are not discarded');
assert(app.includes('skincareOptionalAlternateEditor("am",rows)'), 'AM optional alternate not rendered');
assert(app.includes('skincareOptionalAlternateEditor("pm",rows)'), 'PM optional alternate not rendered');
assert(app.includes('variant:step.variant==="alternate"?"alternate":"primary"'), 'alternate variant not preserved on save');
assert(app.includes('const source=(skincareEditorDraft.days[activeSkincareEditDay]||[]).map(step=>({...step,times:[...step.times]}))'), 'day copy path missing');

// Existing routines with no variant must remain primary.
const normalizeSource = app.match(/function normalizeSkincareRoutine\(routine = \{\}\) \{[\s\S]*?\n\}/)?.[0];
assert(normalizeSource && normalizeSource.includes('step.variant === "alternate" ? "alternate" : "primary"'), 'legacy routines are not normalized to primary');

console.log('Hana Version 2 optional alternate QA passed');
