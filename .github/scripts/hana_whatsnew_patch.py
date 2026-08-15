from pathlib import Path

app = Path('app.js')
t = app.read_text()

old = '    accountPromptSeen: false,\n    lastSeenUpdateVersion: "1.0.0"\n'
new = '    accountPromptSeen: false,\n    lastSeenUpdateVersion: "1.0.0",\n    lastSeenWhatsNewKey: ""\n'
if old not in t and 'lastSeenWhatsNewKey' not in t:
    raise SystemExit('settings anchor missing')
if old in t:
    t = t.replace(old, new, 1)

old_release = '''const HANA_APP_VERSION = "1.0.0";
const HANA_DISPLAY_VERSION = "1";
const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 15, 2026",
  title: "Welcome to Hana v1 🌸",
  intro: "This is Hana’s first complete release baseline. Everything built during pre-release development—including Smart Template Garden, Smart Packing, skincare planning, cloud backup and Hana’s planning tools—belongs to Version 1 from day one.",
  items: [
    { icon:"✨", title:"Smart Template Garden", text:"Browse the Smart Paste Guide, choose from more than 50 understood formats, or paste naturally into Brain Dump and let Smart Sort recognize useful structures while keeping examples as unsaved placeholders only." },
    { icon:"🧳", title:"Packing that learns with you", text:"Smart Packing uses 21 travel categories, editable category choices, custom categories and a local learning dictionary that remembers your corrections." },
    { icon:"🧴", title:"Weekly skincare planning", text:"Paste natural AM/PM routines, grouped weekdays and exceptions; Hana turns them into an editable weekly skincare planner with a time-aware Today shortcut." },
    { icon:"🌷", title:"Plan and organize in one garden", text:"Today, Tasks, Lists, Notes, Trackers, Calendar, Projects, Reminders, Templates, Brain Dump, Memory Threads and Hana’s focus tools work together without forcing one planning style." },
    { icon:"☁️", title:"Private first, cloud when you want it", text:"Hana stays local-first with autosave, safety snapshots, Trash and export. Optional Google or email sign-in adds cloud backup without making an account mandatory." },
    { icon:"🎀", title:"Made to be yours", text:"Customize themes, wallpaper, spaces, Quick Access, bottom navigation, categories, fields and practical defaults while keeping Hana mobile-first and iPhone-friendly." }
  ]
};'''
new_release = '''const HANA_APP_VERSION = "1.0.0";
const HANA_DISPLAY_VERSION = "1";
// Public Version 1 stays 1.0.0 while Hana is unreleased. This separate key lets
// meaningful pre-release updates show once without changing storage/version identity.
const HANA_WHATS_NEW_KEY = "hana-v1-2026-08-16-intelligence-stability";
const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 16, 2026",
  title: "Hana got smarter 🌸",
  intro: "A lot changed inside Version 1. Hana can understand more of what you save, help you review and plan it, keep routines easier to read, and protect your data more carefully—without changing Hana’s public Version 1 / 1.0.0 identity.",
  items: [
    { icon:"🧠", title:"Ask Hana & Smart Review", text:"Ask about your own tasks, notes, lists, projects, reminders and routines. Hana can find related things, unfinished work, possible duplicates, natural dates, follow-ups, conflicts and weekly-review items locally on your device." },
    { icon:"⏱️", title:"Smarter daily planning", text:"Time Pockets, priority suggestions, Rescue My Day, dependency checks, project clustering and safe conversion proposals help turn a busy Hana into a realistic plan without silently changing your data." },
    { icon:"✨", title:"A much bigger Smart Template Garden", text:"The Smart Paste Guide now covers 51 formats, including travel, recipes, medication, study, bills, cleaning, events, routines, health, home, projects and Life Reset—while examples stay placeholders only." },
    { icon:"🧴", title:"Skincare that fits the screen", text:"Normal routines use larger text and rows; longer routines automatically compact so the active routine stays readable on one iPhone screen without horizontal swiping." },
    { icon:"🛡️", title:"Safer account & recovery behavior", text:"A temporary Firebase sign-out state no longer removes locally cached Partner-shared items. Recovery Audit can also inspect retained safety snapshots for missing notes without restoring or overwriting anything." },
    { icon:"⚡", title:"Smoother as Hana grows", text:"Ask Hana now reuses one local index per operation instead of repeatedly rebuilding it. A 920-item stress check is part of Hana’s stability QA, alongside core navigation, Smart Packing and recovery checks." }
  ]
};'''
if old_release not in t and 'HANA_WHATS_NEW_KEY' not in t:
    raise SystemExit('release notes anchor missing')
if old_release in t:
    t = t.replace(old_release, new_release, 1)

old_finish = '''function finishTutorial(){
  state.settings.tutorialCompleted=true;
  state.settings.lastSeenUpdateVersion=HANA_APP_VERSION;
  saveState();
  closeModal("tutorialModal");
}'''
new_finish = '''function finishTutorial(){
  state.settings.tutorialCompleted=true;
  state.settings.lastSeenUpdateVersion=HANA_APP_VERSION;
  state.settings.lastSeenWhatsNewKey=HANA_WHATS_NEW_KEY;
  saveState();
  closeModal("tutorialModal");
}'''
if old_finish not in t and 'state.settings.lastSeenWhatsNewKey=HANA_WHATS_NEW_KEY;' not in t:
    raise SystemExit('finish tutorial anchor missing')
if old_finish in t:
    t = t.replace(old_finish, new_finish, 1)

old_render = '  if(title)title.textContent=`What\'s new in Hana v${HANA_RELEASE_NOTES.version}`;'
new_render = '  if(title)title.textContent=HANA_RELEASE_NOTES.title||`What\'s new in Hana v${HANA_RELEASE_NOTES.version}`;'
if old_render in t:
    t = t.replace(old_render, new_render, 1)
elif new_render not in t:
    raise SystemExit('render What’s New anchor missing')

old_open = '''function openWhatsNew({markSeen=true}={}){
  closeNavDrawer();
  closeHeaderQuickAccess();
  renderWhatsNew();
  if(markSeen&&state.settings.lastSeenUpdateVersion!==HANA_APP_VERSION){
    state.settings.lastSeenUpdateVersion=HANA_APP_VERSION;
    saveState({snapshot:false});
  }
  openModal("whatsNewModal");
}'''
new_open = '''function openWhatsNew({markSeen=true}={}){
  closeNavDrawer();
  closeHeaderQuickAccess();
  renderWhatsNew();
  if(markSeen){
    let changed=false;
    if(state.settings.lastSeenUpdateVersion!==HANA_APP_VERSION){state.settings.lastSeenUpdateVersion=HANA_APP_VERSION;changed=true;}
    if(state.settings.lastSeenWhatsNewKey!==HANA_WHATS_NEW_KEY){state.settings.lastSeenWhatsNewKey=HANA_WHATS_NEW_KEY;changed=true;}
    if(changed)saveState({snapshot:false});
  }
  openModal("whatsNewModal");
}'''
if old_open not in t and 'state.settings.lastSeenWhatsNewKey!==HANA_WHATS_NEW_KEY' not in t:
    raise SystemExit('open What’s New anchor missing')
if old_open in t:
    t = t.replace(old_open, new_open, 1)

old_maybe = '''function maybeOpenUpdateNote(){
  if(state.settings.tutorialCompleted!==true)return;
  if(state.settings.lastSeenUpdateVersion!==HANA_APP_VERSION)setTimeout(()=>openWhatsNew(),240);
}'''
new_maybe = '''function maybeOpenUpdateNote(){
  if(state.settings.tutorialCompleted!==true)return;
  if(state.settings.lastSeenWhatsNewKey!==HANA_WHATS_NEW_KEY)setTimeout(()=>openWhatsNew(),240);
}'''
if old_maybe not in t and 'if(state.settings.lastSeenWhatsNewKey!==HANA_WHATS_NEW_KEY)' not in t:
    raise SystemExit('update prompt anchor missing')
if old_maybe in t:
    t = t.replace(old_maybe, new_maybe, 1)

app.write_text(t)

sw = Path('service-worker.js')
s = sw.read_text()
if 'hana-shell-v1-intelligence-3' in s:
    s = s.replace('hana-shell-v1-intelligence-3', 'hana-shell-v1-whats-new-1', 1)
elif 'hana-shell-v1-whats-new-1' not in s:
    raise SystemExit('unexpected service worker cache marker')
sw.write_text(s)
