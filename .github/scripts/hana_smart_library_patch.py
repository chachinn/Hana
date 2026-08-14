from pathlib import Path
import re


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, got {count}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label, flags=0):
    out, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, got {count}")
    return out


app_path = Path("app.js")
index_path = Path("index.html")
css_path = Path("style.css")
sw_path = Path("service-worker.js")
app = app_path.read_text(encoding="utf-8")
index = index_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")
sw = sw_path.read_text(encoding="utf-8")

# -----------------------------------------------------------------------------
# Release metadata
# -----------------------------------------------------------------------------
app = replace_once(
    app,
    "HANA 🌸 Version 2 · internal build 2.0.35\n   Routine-first skincare import + Smart Sort refinements",
    "HANA 🌸 Version 2 · internal build 2.0.36\n   Smart Library + file-aware Smart Sort",
    "app header version",
)
app = replace_once(app, 'const HANA_APP_VERSION = "2.0.35";', 'const HANA_APP_VERSION = "2.0.36";', "runtime version")

release_pattern = re.compile(r"const HANA_RELEASE_NOTES = \{.*?\n\};", re.S)
release_new = '''const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 14, 2026",
  title: "A much smarter Hana library ✨🧩",
  intro: "Smart Sort can now recognize many more real-life structures, read text-friendly files locally, and turn them into useful Hana notes, lists and trackers. The template library is much bigger too — without adding demo data.",
  items: [
    { icon:"✨", title:"More structured Smart Sort", text:"Recipes, itineraries, workouts, study plans, medication schedules, meal plans, habits, media lists, subscriptions, applications, deliveries, inventories, content plans, decisions, bookmarks and ordinary routines can stay together instead of becoming loose notes." },
    { icon:"📄", title:"Import a file into Brain Dump", text:"Load TXT, Markdown, CSV, TSV, JSON or HTML locally on your device, review the extracted text, then let Smart Sort organize it. Hana does not upload the file just to read it." },
    { icon:"🧩", title:"A bigger template library", text:"New blank-first templates cover routines, home, travel, health, study, work, reference and many practical trackers. Templates still create nothing until you save them." },
    { icon:"🔎", title:"Templates are searchable", text:"Search the larger library by name or purpose and filter by note, list or tracker so the extra options do not make the page harder to use." }
  ]
};'''
app, count = release_pattern.subn(release_new, app, count=1)
if count != 1:
    raise SystemExit(f"release notes: expected 1 match, got {count}")

# -----------------------------------------------------------------------------
# Add blank-first template cards to the library
# -----------------------------------------------------------------------------
extra_templates = '''
  { id:"daily-routine-list", icon:"🌅", title:"Daily Routine", description:"A blank repeatable checklist for a morning, evening or any routine you define.", kind:"list", category:"Personal & routines" },
  { id:"cleaning-checklist", icon:"🧹", title:"Cleaning Checklist", description:"A blank home cleaning checklist with optional custom columns and details.", kind:"list", category:"Home & life" },
  { id:"travel-day-checklist", icon:"✈️", title:"Travel Day Checklist", description:"A blank checklist for departure-day tasks, documents and last-minute checks.", kind:"list", category:"Travel & events" },
  { id:"event-planning-checklist", icon:"🎉", title:"Event Planning Checklist", description:"A blank checklist for planning an event without preloading fake tasks.", kind:"list", category:"Travel & events" },
  { id:"recipe-card", icon:"🍳", title:"Recipe Card", description:"A structured recipe note for ingredients, method, timings and your own notes.", kind:"note", category:"Reference" },
  { id:"project-brief", icon:"🗂️", title:"Project Brief", description:"A structured project brief for scope, outcomes, deliverables, people, risks and dependencies.", kind:"note", category:"Work & school" },
  { id:"event-brief", icon:"🎟️", title:"Event Brief", description:"A structured event reference for schedule, venue, budget, guests, vendors and run-of-show notes.", kind:"note", category:"Travel & events" },
  { id:"travel-itinerary", icon:"🗺️", title:"Travel Itinerary", description:"A customizable tracker for dates, times, plans, locations, bookings and notes.", kind:"tracker", category:"Travel & events" },
  { id:"workout-plan", icon:"🏋️", title:"Workout Plan", description:"A customizable exercise tracker for sets, reps, load, rest and notes.", kind:"tracker", category:"Personal & routines" },
  { id:"study-plan", icon:"📚", title:"Study Plan", description:"Plan subjects, topics, dates, duration, progress and notes in a customizable tracker.", kind:"tracker", category:"Work & school" },
  { id:"medication-schedule", icon:"💊", title:"Medication / Supplement Schedule", description:"A personal reference tracker for item, dose, timing, days and notes.", kind:"tracker", category:"Personal & routines" },
  { id:"meal-planner", icon:"🍱", title:"Meal Planner", description:"A blank meal planning tracker for day, meal, dish and notes.", kind:"tracker", category:"Personal & routines" },
  { id:"habit-tracker", icon:"🌱", title:"Habit Tracker", description:"A customizable habit tracker for frequency, target, progress and notes.", kind:"tracker", category:"Personal & routines" },
  { id:"reading-list", icon:"📖", title:"Reading List", description:"Track books, status, author, rating and notes without preloading titles.", kind:"tracker", category:"Reference" },
  { id:"watch-list", icon:"🎬", title:"Watch List", description:"Track films, series, anime or anything else you want to watch.", kind:"tracker", category:"Reference" },
  { id:"subscription-tracker", icon:"🔁", title:"Subscription Tracker", description:"Track services, cost, billing date, frequency and status.", kind:"tracker", category:"Home & life" },
  { id:"application-tracker", icon:"📨", title:"Application Tracker", description:"Track job, school or other applications with dates, status and next steps.", kind:"tracker", category:"Work & school" },
  { id:"delivery-tracker", icon:"📦", title:"Order / Delivery Tracker", description:"Track orders, stores, dates, ETA, status and tracking links.", kind:"tracker", category:"Home & life" },
  { id:"home-inventory", icon:"🏠", title:"Home Inventory", description:"A customizable inventory for items, category, quantity, location and notes.", kind:"tracker", category:"Home & life" },
  { id:"content-calendar", icon:"🗓️", title:"Content Calendar", description:"Track content ideas, platform, publish date, status and notes.", kind:"tracker", category:"Work & school" },
  { id:"decision-log", icon:"⚖️", title:"Decision Log", description:"Keep decisions, rationale, owner, date and follow-up in one tracker.", kind:"tracker", category:"Work & school" },
  { id:"contact-list", icon:"👥", title:"Contact List", description:"A simple customizable contact reference for name, phone, email, context and notes.", kind:"tracker", category:"Reference" },
  { id:"bookmark-library", icon:"🔖", title:"Bookmark Library", description:"Keep useful links with a title, category and notes in one searchable tracker.", kind:"tracker", category:"Reference" }
'''.strip()

starter_pattern = re.compile(r'(const STARTER_TEMPLATES = \[.*?)(\n\];\n\nconst QUICK_ACCESS_MENU = \{)', re.S)
match = starter_pattern.search(app)
if not match:
    raise SystemExit("starter templates anchor not found")
if 'id:"recipe-card"' not in match.group(1):
    replacement = match.group(1).rstrip() + ",\n" + extra_templates + match.group(2)
    app = app[:match.start()] + replacement + app[match.end():]

# -----------------------------------------------------------------------------
# Add structured note schemas used by new blank templates and recipe Smart Sort
# -----------------------------------------------------------------------------
schema_insert = r'''

// Extended blank-first note schemas. These define editable field structure only;
// no user values are created until the template is explicitly saved.
["recipe-card","project-brief","event-brief"].forEach(type=>{if(!CUSTOM_STRUCTURED_NOTE_TYPES.includes(type))CUSTOM_STRUCTURED_NOTE_TYPES.push(type);});
Object.assign(STRUCTURED_NOTE_SCHEMAS, {
  "recipe-card": {
    title:"Recipe Card", icon:"🍳",
    fields:[
      ["Servings","text","Recipe"], ["Prep time","text","Recipe"], ["Cook time","text","Recipe"],
      ["Ingredients","textarea","Ingredients"], ["Method / instructions","textarea","Method"], ["Notes / substitutions","textarea","Notes"]
    ]
  },
  "project-brief": {
    title:"Project Brief", icon:"🗂️",
    fields:[
      ["Objective / problem","textarea","Direction"], ["Desired outcome","textarea","Direction"], ["Scope","textarea","Direction"],
      ["Deliverables","textarea","Plan"], ["Timeline / milestones","textarea","Plan"], ["Stakeholders / owners","textarea","People"],
      ["Risks / constraints","textarea","Execution"], ["Dependencies","textarea","Execution"], ["Notes","textarea","Execution"]
    ]
  },
  "event-brief": {
    title:"Event Brief", icon:"🎟️",
    fields:[
      ["Date","date","Event"], ["Start time","text","Event"], ["End time","text","Event"], ["Venue / location","text","Event"],
      ["Purpose / theme","textarea","Plan"], ["Guest count / attendees","text","Plan"], ["Budget","number","Plan"],
      ["Vendors / contacts","textarea","Coordination"], ["Run of show","textarea","Coordination"], ["Notes","textarea","Coordination"]
    ]
  }
});
'''
app = replace_once(app, 'function structuredNoteSchema(type){', schema_insert + '\nfunction structuredNoteSchema(type){', "structured schema insert")

# -----------------------------------------------------------------------------
# Extended template definitions and preview routing
# -----------------------------------------------------------------------------
extended_template_helpers = r'''

const EXTRA_LIST_TEMPLATE_DEFINITIONS = {
  "daily-routine-list": {name:"Daily Routine",icon:"🌅"},
  "cleaning-checklist": {name:"Cleaning Checklist",icon:"🧹"},
  "travel-day-checklist": {name:"Travel Day Checklist",icon:"✈️"},
  "event-planning-checklist": {name:"Event Planning Checklist",icon:"🎉"}
};
const EXTRA_NOTE_TEMPLATE_DEFINITIONS = {
  "recipe-card": {title:"Recipe Card",structuredType:"recipe-card"},
  "project-brief": {title:"Project Brief",structuredType:"project-brief"},
  "event-brief": {title:"Event Brief",structuredType:"event-brief"}
};
const EXTRA_TABLE_TEMPLATE_DEFINITIONS = {
  "travel-itinerary": {name:"Travel Itinerary",columns:[{name:"Date",type:"date"},{name:"Time",type:"text"},{name:"Plan",type:"text"},{name:"Location",type:"text"},{name:"Booking / reference",type:"text"},{name:"Notes",type:"text"}]},
  "workout-plan": {name:"Workout Plan",columns:[{name:"Exercise",type:"text"},{name:"Sets",type:"number"},{name:"Reps",type:"text"},{name:"Load",type:"text"},{name:"Rest",type:"text"},{name:"Notes",type:"text"}]},
  "study-plan": {name:"Study Plan",columns:[{name:"Subject",type:"text"},{name:"Topic",type:"text"},{name:"Date",type:"date"},{name:"Duration",type:"text"},{name:"Progress",type:"progress"},{name:"Notes",type:"text"}]},
  "medication-schedule": {name:"Medication / Supplement Schedule",columns:[{name:"Item",type:"text"},{name:"Dose",type:"text"},{name:"Time",type:"text"},{name:"Days / frequency",type:"text"},{name:"Notes",type:"text"}]},
  "meal-planner": {name:"Meal Planner",columns:[{name:"Day / date",type:"text"},{name:"Meal",type:"text"},{name:"Dish",type:"text"},{name:"Notes",type:"text"}]},
  "habit-tracker": {name:"Habit Tracker",columns:[{name:"Habit",type:"text"},{name:"Frequency",type:"text"},{name:"Target",type:"text"},{name:"Progress",type:"progress"},{name:"Notes",type:"text"}]},
  "reading-list": {name:"Reading List",columns:[{name:"Title",type:"text"},{name:"Author",type:"text"},{name:"Status",type:"status"},{name:"Rating",type:"number"},{name:"Notes",type:"text"}]},
  "watch-list": {name:"Watch List",columns:[{name:"Title",type:"text"},{name:"Type",type:"text"},{name:"Status",type:"status"},{name:"Rating",type:"number"},{name:"Notes",type:"text"}]},
  "subscription-tracker": {name:"Subscription Tracker",columns:[{name:"Service",type:"text"},{name:"Amount",type:"money"},{name:"Billing date",type:"date"},{name:"Frequency",type:"text"},{name:"Status",type:"status"},{name:"Notes",type:"text"}]},
  "application-tracker": {name:"Application Tracker",columns:[{name:"Organization",type:"text"},{name:"Role / program",type:"text"},{name:"Applied",type:"date"},{name:"Status",type:"status"},{name:"Next step",type:"text"},{name:"Notes",type:"text"}]},
  "delivery-tracker": {name:"Order / Delivery Tracker",columns:[{name:"Order",type:"text"},{name:"Store",type:"text"},{name:"Ordered",type:"date"},{name:"ETA",type:"date"},{name:"Status",type:"status"},{name:"Tracking",type:"link"},{name:"Notes",type:"text"}]},
  "home-inventory": {name:"Home Inventory",columns:[{name:"Item",type:"text"},{name:"Category",type:"text"},{name:"Quantity",type:"number"},{name:"Location",type:"text"},{name:"Notes",type:"text"}]},
  "content-calendar": {name:"Content Calendar",columns:[{name:"Content",type:"text"},{name:"Platform",type:"text"},{name:"Publish date",type:"date"},{name:"Status",type:"status"},{name:"Link",type:"link"},{name:"Notes",type:"text"}]},
  "decision-log": {name:"Decision Log",columns:[{name:"Decision",type:"text"},{name:"Rationale",type:"text"},{name:"Owner",type:"text"},{name:"Date",type:"date"},{name:"Follow-up",type:"text"}]},
  "contact-list": {name:"Contact List",columns:[{name:"Name",type:"text"},{name:"Phone",type:"text"},{name:"Email",type:"text"},{name:"Context",type:"text"},{name:"Notes",type:"text"}]},
  "bookmark-library": {name:"Bookmark Library",columns:[{name:"Title",type:"text"},{name:"Link",type:"link"},{name:"Category",type:"text"},{name:"Notes",type:"text"}]}
};
function openExtendedListTemplateDraft(definition={}){
  openListModal();pendingListTemplateItems=[];
  document.getElementById("listName").value="";document.getElementById("listName").placeholder=definition.name||"List name";document.getElementById("listIcon").value=definition.icon||"☑️";
  document.getElementById("listModalEyebrow").textContent="TEMPLATE PREVIEW";document.getElementById("listModalTitle").textContent=definition.name||"List template";document.getElementById("saveListButton").textContent="Create list";
  showTemplateDraftBanner("listModal","Blank structure only. Add your own items after creating it; closing this preview saves nothing.");
}
function useExtendedTemplate(templateId,space=preferredSpace()){
  const listDef=EXTRA_LIST_TEMPLATE_DEFINITIONS[templateId];if(listDef){openExtendedListTemplateDraft(listDef);return true;}
  const noteDef=EXTRA_NOTE_TEMPLATE_DEFINITIONS[templateId];if(noteDef){openNoteTemplateDraft({title:noteDef.title,type:"note",structuredType:noteDef.structuredType,space});return true;}
  const tableDef=EXTRA_TABLE_TEMPLATE_DEFINITIONS[templateId];if(tableDef){openTableTemplateDraft({name:tableDef.name,space,columns:tableDef.columns,statusOptions:DEFAULT_TABLE_STATUSES.slice()});return true;}
  return false;
}
'''
app = replace_once(app, 'function useTemplate(templateId) {', extended_template_helpers + '\nfunction useTemplate(templateId) {', "extended template helper insert")
app = replace_once(app, '  const space=preferredSpace();\n  if(templateId==="smart-template")', '  const space=preferredSpace();\n  if(useExtendedTemplate(templateId,space))return;\n  if(templateId==="smart-template")', "extended template route")

# -----------------------------------------------------------------------------
# Searchable larger template library
# -----------------------------------------------------------------------------
new_render_templates = r'''function templateLibraryCategories(){
  return ["Build your own","Meetings","Personal & routines","Travel & events","Home & life","Work & school","Work & reference","Reference","Trackers"];
}
function templateCardHTML(template){
  const search=[template.title,template.description,template.kind,template.category].join(" ").toLowerCase();
  return `<article class="template-card" data-template-library-card data-template-kind="${escapeHTML(template.kind)}" data-template-search="${escapeHTML(search)}"><div class="template-icon">${template.icon}</div><div><h3>${escapeHTML(template.title)}</h3><p>${escapeHTML(template.description)}</p><span class="badge badge-personal">${escapeHTML(template.kind)}</span></div><button class="secondary-button" data-use-template="${template.id}">Preview</button></article>`;
}
function filterTemplateLibrary(){
  const query=String(document.getElementById("templateSearchInput")?.value||"").trim().toLowerCase(),kind=document.getElementById("templateKindFilter")?.value||"all";
  document.querySelectorAll("[data-template-library-card]").forEach(card=>{const matchesText=!query||String(card.dataset.templateSearch||"").includes(query),matchesKind=kind==="all"||card.dataset.templateKind===kind;card.classList.toggle("hidden",!(matchesText&&matchesKind));});
  document.querySelectorAll("[data-template-category-section]").forEach(section=>{section.classList.toggle("hidden",!section.querySelector("[data-template-library-card]:not(.hidden)"));});
  const empty=document.getElementById("templateSearchEmpty");if(empty)empty.classList.toggle("hidden",Boolean(document.querySelector("[data-template-library-card]:not(.hidden)")));
}
function renderTemplates() {
  const c=document.getElementById("pageContent"),categories=templateLibraryCategories();
  c.innerHTML=`<div class="page-heading"><p class="eyebrow">REUSABLE, BUT NEVER FORCED</p><h1>Templates</h1><p>Choose a ready-made structure, let Smart Template guide you, or start from a completely empty canvas.</p></div><div class="template-customization-note"><span>✨</span><div><strong>Smart guides you. Blank assumes nothing.</strong><small>Every template below is blank-first: structure and placeholders can be provided, but no sample rows or fake entries are saved.</small></div></div><div class="template-library-toolbar"><label class="template-library-search"><span>🔎</span><input id="templateSearchInput" type="search" placeholder="Search templates — travel, workout, recipe..." /></label><select id="templateKindFilter" aria-label="Filter templates by type"><option value="all">All types</option><option value="note">Notes</option><option value="list">Lists</option><option value="tracker">Trackers</option><option value="guide">Guides</option><option value="blank">Blank</option></select></div>${categories.map(category=>{const items=STARTER_TEMPLATES.filter(template=>template.category===category);return items.length?`<section class="template-category" data-template-category-section><div class="template-category-head"><h2>${escapeHTML(category)}</h2><span>${items.length}</span></div><div class="template-grid">${items.map(templateCardHTML).join("")}</div></section>`:"";}).join("")}<div id="templateSearchEmpty" class="empty-state hidden"><div class="empty-icon">🔎</div><h3>No matching template</h3><p>Try another word or switch the type filter.</p></div>`;
}
'''
app = regex_once(app, r'function renderTemplates\(\) \{.*?\n\}\n\nfunction clearTemplateDraftBanner', new_render_templates + '\nfunction clearTemplateDraftBanner', "renderTemplates replacement", flags=re.S)

# -----------------------------------------------------------------------------
# Much broader Smart Sort recognition
# -----------------------------------------------------------------------------
app = regex_once(
    app,
    r'const SMART_STRUCTURED_CAPTURE_TYPES = new Set\(\[[^\]]+\]\);',
    'const SMART_STRUCTURED_CAPTURE_TYPES = new Set(["packing","grocery","meeting-agenda","meeting-minutes","expenses","tracker","project","recipe","travel-itinerary","workout","study-plan","medication","meal-plan","habit-tracker","reading-list","watch-list","subscriptions","applications","deliveries","inventory","content-calendar","decision-log","bookmarks","routine"]);',
    "smart type set",
)

smart_label_fn = r'''function smartStructuredCaptureLabel(kind) {
  return ({
    packing:"🧳 Packing List · structured block", grocery:"🛒 Grocery List · structured block", "meeting-agenda":"📋 Meeting Agenda · structured block", "meeting-minutes":"📝 Meeting Minutes · structured block",
    expenses:"💳 Expense Tracker · structured block", tracker:"📒 Tracker · structured rows", project:"🌷 Project Plan · structured block", recipe:"🍳 Recipe Card · ingredients + method",
    "travel-itinerary":"🗺️ Travel Itinerary · schedule detected", workout:"🏋️ Workout Plan · exercises detected", "study-plan":"📚 Study Plan · study structure detected", medication:"💊 Medication / Supplement Schedule",
    "meal-plan":"🍱 Meal Planner · meals detected", "habit-tracker":"🌱 Habit Tracker · routine detected", "reading-list":"📖 Reading List · titles detected", "watch-list":"🎬 Watch List · titles detected",
    subscriptions:"🔁 Subscription Tracker · billing detected", applications:"📨 Application Tracker · status flow detected", deliveries:"📦 Order / Delivery Tracker", inventory:"🏠 Inventory · quantities / locations detected",
    "content-calendar":"🗓️ Content Calendar · publishing plan detected", "decision-log":"⚖️ Decision Log · decisions detected", bookmarks:"🔖 Bookmark Library · links detected", routine:"🌅 Routine Checklist · repeated steps detected"
  })[kind] || "✨ Structured capture";
}
'''
app = regex_once(app, r'function smartStructuredCaptureLabel\(kind\) \{.*?\n\}', smart_label_fn.rstrip(), "smart label function", flags=re.S)

smart_kind_fn = r'''function smartStructuredCaptureKind(text, forcedType="auto") {
  if (SMART_STRUCTURED_CAPTURE_TYPES.has(forcedType)) return forcedType;
  const raw=String(text||"").trim();if(!raw)return "";
  const lines=raw.split(/\r?\n/).map(line=>line.trim()).filter(Boolean),first=lines[0]||"";
  if(/\bpacking\s+list\b|\bwhat\s+to\s+pack\b|^packing\s*:/i.test(raw))return "packing";
  if(/\bgrocery\s+list\b|\bgroceries\s*[:\n]|^groceries?\s*:/i.test(raw))return "grocery";
  if(/\b(minutes\s+of\s+the\s+meeting|meeting\s+minutes|minutes\s+of\s+meeting)\b/i.test(raw)||(/\bdecisions?\s+(?:made|reached)\b/i.test(raw)&&/\b(action\s+items?|meeting|attendees?)\b/i.test(raw)))return "meeting-minutes";
  if(/\bmeeting\s+agenda\b/i.test(raw)||(/^agenda\s*:/i.test(first)&&/\b(objective|attendees?|topics?|agenda)\b/i.test(raw)))return "meeting-agenda";
  if(/\b(expense\s+tracker|expenses?\s*[:\n]|travel\s+expenses?|budget\s+spent)\b/i.test(raw)&&/(?:₱|\$|€|£|¥)\s*\d|\d[\d,]*\.\d{2}/.test(raw))return "expenses";
  if(/^\s*(?:project\s+plan|project)\s*[:\-–—]/i.test(first)||/^#{1,6}\s*project\s+plan\b/i.test(first))return "project";
  if(/\bingredients?\b/i.test(raw)&&/\b(instructions?|method|directions?|steps?)\b/i.test(raw))return "recipe";
  if(/\b(?:travel\s+)?itinerary\b/i.test(raw)||(/\bday\s*\d+\b/i.test(raw)&&/\b(hotel|flight|check[- ]?in|train|visit|tour|reservation|depart|arrive)\b/i.test(raw)))return "travel-itinerary";
  if(/\bworkout\s*(?:plan|routine)?\b/i.test(raw)||(/\bsets?\b/i.test(raw)&&/\breps?\b/i.test(raw))||/\b\d+\s*[x×]\s*\d+\b/i.test(raw))return "workout";
  if(/\bstudy\s+(?:plan|schedule)\b/i.test(raw)||(/\b(subject|chapter|topic|review)\b/i.test(raw)&&/\b(study|exam|quiz|lesson)\b/i.test(raw)))return "study-plan";
  if(/\b(medication|medicine|supplement|vitamin)\s+(?:schedule|routine|list)\b/i.test(raw)||(/\b(?:mg|mcg|tablet|capsule|dose|dosage)\b/i.test(raw)&&/\b(?:daily|morning|night|am|pm|after|before)\b/i.test(raw)))return "medication";
  if(/\bmeal\s+plan(?:ner)?\b/i.test(raw)||(/\bbreakfast\b/i.test(raw)&&/\b(?:lunch|dinner)\b/i.test(raw)))return "meal-plan";
  if(/\bhabit\s+tracker\b/i.test(raw)||(/\bhabit\b/i.test(raw)&&/\b(?:daily|weekly|streak|target|frequency)\b/i.test(raw)))return "habit-tracker";
  if(/\breading\s+list\b|\bbooks?\s+to\s+read\b|\bcurrently\s+reading\b/i.test(raw))return "reading-list";
  if(/\bwatch\s+list\b|\b(?:movies?|series|shows?|anime)\s+to\s+watch\b/i.test(raw))return "watch-list";
  if(/\bsubscription\s+(?:tracker|list)\b/i.test(raw)||(/\b(?:monthly|annual|yearly)\b/i.test(raw)&&/\b(?:renew|billing|subscription|plan)\b/i.test(raw)&&/(?:₱|\$|€|£|¥)\s*\d/i.test(raw)))return "subscriptions";
  if(/\bapplication\s+tracker\b/i.test(raw)||(/\b(?:applied|interview|application)\b/i.test(raw)&&/\b(?:company|role|position|school|program|status)\b/i.test(raw)))return "applications";
  if(/\b(?:order|delivery)\s+tracker\b/i.test(raw)||(/\b(?:tracking|shipped|delivered|eta)\b/i.test(raw)&&/\b(?:order|package|parcel)\b/i.test(raw)))return "deliveries";
  if(/\b(?:home\s+)?inventory\b/i.test(raw)||(/\bquantity\b/i.test(raw)&&/\blocation\b/i.test(raw)&&/\bitem\b/i.test(raw)))return "inventory";
  if(/\bcontent\s+calendar\b/i.test(raw)||(/\b(?:publish|post|platform)\b/i.test(raw)&&/\b(?:caption|content|draft|scheduled)\b/i.test(raw)))return "content-calendar";
  if(/\bdecision\s+log\b/i.test(raw)||(/\bdecision\b/i.test(raw)&&/\brationale\b/i.test(raw)&&/\bowner\b/i.test(raw)))return "decision-log";
  const urls=[...raw.matchAll(/https?:\/\/[^\s)]+/g)];if(/\bbookmarks?\b|\blink\s+library\b/i.test(raw)||(urls.length>=3&&lines.length>=3))return "bookmarks";
  if(/\b(?:morning|evening|night|daily|weekly)\s+routine\b/i.test(raw)&&lines.length>=3&&!/\b(cleanser|toner|serum|moisturizer|sunscreen)\b/i.test(raw))return "routine";
  const delimited=lines.filter(line=>line.includes("\t")||line.split("|").length>=2);
  const csvish=lines.length>=2&&lines.filter(line=>(line.match(/,/g)||[]).length>=2).length>=2;
  if(lines.length>=2&&(delimited.length>=2||csvish))return "tracker";
  return "";
}
'''
app = regex_once(app, r'function smartStructuredCaptureKind\(text, forcedType="auto"\) \{.*?\n\}\n\nfunction smartCleanBullet', smart_kind_fn + '\nfunction smartCleanBullet', "smart kind function", flags=re.S)

# -----------------------------------------------------------------------------
# Creators for the new Smart Sort structures
# -----------------------------------------------------------------------------
new_smart_creators = r'''

const SMART_PRESET_TRACKERS = {
  "travel-itinerary": EXTRA_TABLE_TEMPLATE_DEFINITIONS["travel-itinerary"], workout: EXTRA_TABLE_TEMPLATE_DEFINITIONS["workout-plan"], "study-plan": EXTRA_TABLE_TEMPLATE_DEFINITIONS["study-plan"],
  medication: EXTRA_TABLE_TEMPLATE_DEFINITIONS["medication-schedule"], "meal-plan": EXTRA_TABLE_TEMPLATE_DEFINITIONS["meal-planner"], "habit-tracker": EXTRA_TABLE_TEMPLATE_DEFINITIONS["habit-tracker"],
  "reading-list": EXTRA_TABLE_TEMPLATE_DEFINITIONS["reading-list"], "watch-list": EXTRA_TABLE_TEMPLATE_DEFINITIONS["watch-list"], subscriptions: EXTRA_TABLE_TEMPLATE_DEFINITIONS["subscription-tracker"],
  applications: EXTRA_TABLE_TEMPLATE_DEFINITIONS["application-tracker"], deliveries: EXTRA_TABLE_TEMPLATE_DEFINITIONS["delivery-tracker"], inventory: EXTRA_TABLE_TEMPLATE_DEFINITIONS["home-inventory"],
  "content-calendar": EXTRA_TABLE_TEMPLATE_DEFINITIONS["content-calendar"], "decision-log": EXTRA_TABLE_TEMPLATE_DEFINITIONS["decision-log"], bookmarks: EXTRA_TABLE_TEMPLATE_DEFINITIONS["bookmark-library"]
};
function smartMeaningfulLines(text){
  return String(text||"").replace(/\r/g,"").split("\n").map(smartCleanBullet).map(line=>line.replace(/^#{1,6}\s*/,"").trim()).filter(line=>line&&!/^[\s⸻━─—–-]+$/.test(line));
}
function smartSplitLooseRow(line){
  const text=String(line||"").trim();if(!text)return[];
  if(text.includes("\t"))return text.split("\t").map(x=>x.trim());
  if(text.includes("|"))return text.split("|").map(x=>x.trim());
  if((text.match(/,/g)||[]).length>=2)return text.split(",").map(x=>x.trim());
  if(/\s+[–—-]\s+/.test(text))return text.split(/\s+[–—-]\s+/).map(x=>x.trim());
  return [text];
}
function smartPresetRecords(text,kind){
  let lines=smartMeaningfulLines(text).filter((line,index)=>{
    if(index>1)return true;
    return !new RegExp(`^(?:${kind.replace(/[-]/g,"[ -]")}|${String(SMART_PRESET_TRACKERS[kind]?.name||"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})\\s*:?$`,"i").test(line);
  });
  const records=[];
  for(const line of lines){
    if(/^(ingredients?|instructions?|method|notes?|schedule|exercises?|plan|items?)\s*:?$/i.test(line))continue;
    if(kind==="workout"){
      const m=line.match(/^(.+?)\s*(?:[-:])?\s*(\d+)\s*[x×]\s*([\d-]+)(?:\s*(?:@|[-–—])\s*([^|]+))?$/i);if(m){records.push([m[1].trim(),m[2],m[3],String(m[4]||"").trim(),"",""]);continue;}
    }
    if(kind==="meal-plan"){
      const m=line.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:\s*[-–—:]\s*)(Breakfast|Lunch|Dinner|Snack)?\s*:?[\s]*(.+)$/i);if(m){records.push([m[1],m[2]||"",m[3],""]);continue;}
      const meal=line.match(/^(Breakfast|Lunch|Dinner|Snack)\s*[:\-–—]\s*(.+)$/i);if(meal){records.push(["",meal[1],meal[2],""]);continue;}
    }
    if(kind==="bookmarks"){
      const url=line.match(/https?:\/\/[^\s)]+/i);if(url){const title=line.replace(url[0],"").replace(/^[\s:|–—-]+|[\s:|–—-]+$/g,"").trim();records.push([title||url[0],url[0],"",""]);continue;}
    }
    const parts=smartSplitLooseRow(line);records.push(parts);
  }
  return records.filter(row=>row.some(value=>String(value||"").trim()));
}
function createSmartPresetTracker(text,space,kind,options={}){
  const definition=SMART_PRESET_TRACKERS[kind];if(!definition)return `invalid-${kind}`;
  const records=smartPresetRecords(text,kind);if(!records.length)return `invalid-${kind}`;
  const columns=definition.columns.map(column=>({id:createId(),name:column.name,type:column.type}));
  const rows=records.map(record=>({id:createId(),values:Object.fromEntries(columns.map((column,index)=>[column.id,String(record[index]??"").trim()])),createdAt:Date.now(),updatedAt:Date.now()}));
  const table=normalizeTable({id:createId(),name:definition.name,space,project:"",columns,statusOptions:DEFAULT_TABLE_STATUSES.slice(),sortMode:"manual",sortColumnId:columns[0]?.id||"",sortDirection:"asc",rowView:"compact",rows,createdAt:Date.now(),updatedAt:Date.now()});
  state.tables.push(table);state.activeTableId=table.id;saveState();if(!options.quiet)showToast(`${definition.name} created · ${rows.length} row${rows.length===1?"":"s"} ✨`);if(options.open)changePage("tables");return kind;
}
function createSmartPlainList(text,space,kind,options={}){
  const meta=kind==="routine"?{name:"Routine",icon:"🌅"}:{name:"Cleaning Checklist",icon:"🧹"};
  let lines=smartMeaningfulLines(text).filter((line,index)=>!(index===0&&/\b(?:routine|cleaning checklist)\b/i.test(line))).filter(line=>!/^(morning|evening|night|daily|weekly)\s+routine\s*:?$/i.test(line));
  if(!lines.length)return `invalid-${kind}`;
  const list=normalizeList({id:createId(),name:meta.name,icon:meta.icon,space,templateType:"",items:lines.map(title=>({id:createId(),title,quantity:"",detail:"",completed:false,createdAt:Date.now(),updatedAt:Date.now()})),createdAt:Date.now(),updatedAt:Date.now()});
  state.lists.push(list);state.activeListId=list.id;saveState();if(!options.quiet)showToast(`${meta.name} created · ${lines.length} item${lines.length===1?"":"s"} ☑️`);if(options.open)changePage("lists");return kind;
}
function smartRecipeSections(text){
  const lines=String(text||"").replace(/\r/g,"").split("\n");let section="",title="",ingredients=[],method=[],notes=[];
  for(const source of lines){let line=smartCleanBullet(source).replace(/^#{1,6}\s*/,"").trim();if(!line||/^[\s⸻━─—–-]+$/.test(line))continue;
    if(/^ingredients?\s*:?$/i.test(line)){section="ingredients";continue;}if(/^(instructions?|method|directions?|steps?)\s*:?$/i.test(line)){section="method";continue;}if(/^notes?\s*:?$/i.test(line)){section="notes";continue;}
    if(!title&&!/^(recipe|ingredients?|instructions?|method)\b/i.test(line)){title=line.replace(/^recipe\s*[:\-–—]\s*/i,"").trim();if(lines.length>2)continue;}
    if(section==="ingredients")ingredients.push(line);else if(section==="method")method.push(line);else if(section==="notes")notes.push(line);
  }
  if(!title){const first=smartMeaningfulLines(text)[0]||"Recipe";title=first.replace(/^recipe\s*[:\-–—]?\s*/i,"").trim()||"Recipe";}
  return{title:title.slice(0,80),ingredients,method,notes};
}
function createSmartRecipe(text,space,options={}){
  const parsed=smartRecipeSections(text);if(!parsed.ingredients.length||!parsed.method.length)return"invalid-recipe";
  const stateDef=structuredSchemaState("recipe-card"),valueMap={"Ingredients":parsed.ingredients.join("\n"),"Method / instructions":parsed.method.join("\n"),"Notes / substitutions":parsed.notes.join("\n")};
  const raw=String(text||"");const servings=raw.match(/\bserv(?:es|ings?)\s*[:\-]?\s*([^\n]+)/i),prep=raw.match(/\bprep(?:\s*time)?\s*[:\-]?\s*([^\n]+)/i),cook=raw.match(/\bcook(?:\s*time)?\s*[:\-]?\s*([^\n]+)/i);if(servings)valueMap["Servings"]=servings[1].trim();if(prep)valueMap["Prep time"]=prep[1].trim();if(cook)valueMap["Cook time"]=cook[1].trim();
  const fields=stateDef.fields.map(field=>({...field,value:valueMap[field.label]||""}));
  const note=normalizeNote({id:createId(),title:parsed.title,type:"note",space,tags:["recipe"],content:"",checklist:[],resettable:false,pinned:false,structuredType:"recipe-card",structuredGroups:stateDef.groups,structuredFields:fields,createdAt:Date.now(),updatedAt:Date.now()});
  state.notes.push(note);saveState();if(!options.quiet)showToast("Recipe Card created 🍳");if(options.open){state.currentPage="notes";render();setTimeout(()=>openNoteModal(note.id),20);}return"recipe";
}
'''
app = replace_once(app, 'function createSmartStructuredCapture(text,space,kind,options={}) {', new_smart_creators + '\nfunction createSmartStructuredCapture(text,space,kind,options={}) {', "new smart creators insert")
app = replace_once(
    app,
    '  if(kind==="project")return createSmartProjectFromText(text,space,options);\n  return "";',
    '  if(kind==="project")return createSmartProjectFromText(text,space,options);\n  if(kind==="recipe")return createSmartRecipe(text,space,options);\n  if(kind==="routine")return createSmartPlainList(text,space,kind,options);\n  if(SMART_PRESET_TRACKERS[kind])return createSmartPresetTracker(text,space,kind,options);\n  return "";',
    "smart creator routing",
)

# -----------------------------------------------------------------------------
# More manual Smart Sort destinations
# -----------------------------------------------------------------------------
old_dest_tail = '''  {value:"expenses",label:"💳 Expense tracker"},
  {value:"tracker",label:"📒 Tracker"},
  {value:"project",label:"🌷 Project plan"},
  {value:"someday",label:"🌱 Someday"}'''
new_dest_tail = '''  {value:"expenses",label:"💳 Expense tracker"},
  {value:"tracker",label:"📒 Tracker"},
  {value:"project",label:"🌷 Project plan"},
  {value:"recipe",label:"🍳 Recipe card"},
  {value:"travel-itinerary",label:"🗺️ Travel itinerary"},
  {value:"workout",label:"🏋️ Workout plan"},
  {value:"study-plan",label:"📚 Study plan"},
  {value:"medication",label:"💊 Medication / supplements"},
  {value:"meal-plan",label:"🍱 Meal plan"},
  {value:"habit-tracker",label:"🌱 Habit tracker"},
  {value:"reading-list",label:"📖 Reading list"},
  {value:"watch-list",label:"🎬 Watch list"},
  {value:"subscriptions",label:"🔁 Subscriptions"},
  {value:"applications",label:"📨 Applications"},
  {value:"deliveries",label:"📦 Orders / deliveries"},
  {value:"inventory",label:"🏠 Inventory"},
  {value:"content-calendar",label:"🗓️ Content calendar"},
  {value:"decision-log",label:"⚖️ Decision log"},
  {value:"bookmarks",label:"🔖 Bookmarks"},
  {value:"routine",label:"🌅 Routine checklist"},
  {value:"someday",label:"🌱 Someday"}'''
app = replace_once(app, old_dest_tail, new_dest_tail, "brain dump destinations")

# -----------------------------------------------------------------------------
# File-aware Brain Dump + live detection preview
# -----------------------------------------------------------------------------
brain_helpers = r'''
function smartSortPreview(text){
  const raw=String(text||"").trim();if(!raw)return{icon:"✨",title:"Paste anything",detail:"Hana will keep recognized structures together or sort ordinary lines individually."};
  if(skincareTextLooksStructured(raw,{allowSingleDay:false}))return{icon:"🧴",title:"Weekly Skincare Planner",detail:"This block will stay together."};
  const kind=smartStructuredCaptureKind(raw);if(kind)return{icon:smartStructuredCaptureLabel(kind).split(" ")[0],title:smartStructuredCaptureLabel(kind).replace(/^\S+\s*/,"").split(" · ")[0],detail:"Recognized as one structured block."};
  const count=parseLines(raw).length;return{icon:"🌱",title:`${count} separate item${count===1?"":"s"}`,detail:"No whole-block structure detected; Smart Sort will classify each line."};
}
function updateBrainDumpSmartPreview(){
  const box=document.getElementById("brainDumpSmartPreview"),input=document.getElementById("brainDumpText");if(!box||!input)return;const preview=smartSortPreview(input.value);box.innerHTML=`<span>${preview.icon}</span><div><strong>${escapeHTML(preview.title)}</strong><small>${escapeHTML(preview.detail)}</small></div>`;
}
function importedJSONToText(raw){
  const value=JSON.parse(raw);if(Array.isArray(value)&&value.every(item=>item&&typeof item==="object"&&!Array.isArray(item))){const keys=[...new Set(value.flatMap(item=>Object.keys(item)))].slice(0,16);return [keys.join("\t"),...value.map(item=>keys.map(key=>{const v=item[key];return typeof v==="object"&&v!==null?JSON.stringify(v):String(v??"");}).join("\t"))].join("\n");}
  if(value&&typeof value==="object"&&!Array.isArray(value))return ["Key\tValue",...Object.entries(value).map(([key,v])=>`${key}\t${typeof v==="object"&&v!==null?JSON.stringify(v):String(v??"")}`)].join("\n");
  return String(value??"");
}
async function importBrainDumpFile(input){
  const file=input?.files?.[0];if(!file)return;if(file.size>1500000){input.value="";return showToast("Keep Smart Sort files under 1.5 MB so Hana stays smooth.");}
  const ext=(file.name.split(".").pop()||"").toLowerCase(),allowed=new Set(["txt","md","csv","tsv","json","html","htm"]);if(!allowed.has(ext)){input.value="";return showToast("Hana can currently read TXT, Markdown, CSV, TSV, JSON and HTML files.");}
  try{let text=await file.text();if(ext==="json")text=importedJSONToText(text);if(ext==="html"||ext==="htm")text=new DOMParser().parseFromString(text,"text/html").body?.innerText||"";const area=document.getElementById("brainDumpText");if(area){area.value=text.trim();area.focus();updateBrainDumpSmartPreview();showToast(`${file.name} loaded locally · review, then Organize ✨`);}}catch(error){console.warn("Brain Dump file import failed",error);showToast("Hana couldn’t read that file.");}finally{input.value="";}
}
'''
new_render_inbox = r'''function renderInbox(){
  const container=document.getElementById("pageContent"),defaultSpace=preferredSpace();
  container.innerHTML=`<div class="page-heading"><p class="eyebrow">MESSY BRAIN, CLEAN GARDEN</p><h1>Brain Dump</h1><p>Paste thoughts, structured plans, or load a text-friendly file. Hana can suggest what each thing should become, and you stay in control.</p></div><div class="inbox-compose"><textarea id="brainDumpText" class="large-textarea" placeholder="Paste thoughts, a recipe, itinerary, workout, meeting notes, spreadsheet rows..."></textarea><div class="brain-dump-import-row"><label class="secondary-button brain-dump-file-button" for="brainDumpFileInput">📄 Import file</label><input id="brainDumpFileInput" class="hidden" type="file" accept=".txt,.md,.csv,.tsv,.json,.html,.htm,text/plain,text/markdown,text/csv,application/json,text/html" /><small>TXT · MD · CSV · TSV · JSON · HTML · read locally</small></div><div id="brainDumpSmartPreview" class="brain-dump-smart-preview"><span>✨</span><div><strong>Paste anything</strong><small>Hana will keep recognized structures together or sort ordinary lines individually.</small></div></div><div class="brain-dump-controls" style="margin-top:9px;"><label><span>Where should these go?</span><select id="brainDumpDestination">${brainDumpDestinationOptions("auto")}</select></label><label><span>Space</span><select id="brainDumpSpace">${spaceOptionsHTML(defaultSpace," default")}</select></label><button class="primary-button" id="brainDumpAddButton">Organize ✨</button></div><small class="brain-dump-help">Smart Sort recognizes skincare, packing, groceries, meetings, recipes, itineraries, workouts, study plans, medication schedules, meal plans, habits, media lists, expenses, trackers, projects and more. If nothing matches, Hana safely falls back to line-by-line sorting.</small></div><section class="section"><div class="section-header"><h2>Inbox <span class="brain-dump-count">${state.inbox.length}</span></h2>${state.inbox.length?`<button data-plant-all-inbox>Plant all</button>`:""}</div>${state.inbox.length?state.inbox.map(inboxCard).join(""):emptyState("🧠","Inbox zero","Nothing is waiting to be organized.","","")}</section>`;
}
'''
app = regex_once(app, r'function renderInbox\(\)\{.*?\nfunction inboxCard', brain_helpers + '\n' + new_render_inbox + '\nfunction inboxCard', "Brain Dump UI replacement", flags=re.S)

# Add lightweight listeners once. Existing delegated handlers continue to work.
listener_insert = r'''
document.addEventListener("input",event=>{if(event.target?.id==="brainDumpText")updateBrainDumpSmartPreview();if(event.target?.id==="templateSearchInput")filterTemplateLibrary();});
document.addEventListener("change",event=>{if(event.target?.id==="brainDumpFileInput")importBrainDumpFile(event.target);if(event.target?.id==="templateKindFilter")filterTemplateLibrary();});
'''
app = replace_once(app, '/* ================= HANA LIFE FLOW ================= */', listener_insert + '\n/* ================= HANA LIFE FLOW ================= */', "Smart UI listeners")

# -----------------------------------------------------------------------------
# Cache bust / PWA release
# -----------------------------------------------------------------------------
index = index.replace('content="2.0.35"', 'content="2.0.36"').replace('style.css?v=2.0.35', 'style.css?v=2.0.36').replace('app.js?v=2.0.35', 'app.js?v=2.0.36')
sw = sw.replace('Service Worker v68 · routine-first skincare import', 'Service Worker v69 · Smart Library release')
sw = sw.replace('hana-shell-v68', 'hana-shell-v69').replace('style.css?v=2.0.35', 'style.css?v=2.0.36').replace('app.js?v=2.0.35', 'app.js?v=2.0.36')

css_append = r'''

/* =====================================================
   HANA 2.0.36 · SMART LIBRARY + FILE-AWARE SMART SORT
   ===================================================== */
.template-library-toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center;margin:14px 0 18px}.template-library-search{min-width:0;display:flex;align-items:center;gap:8px;padding:0 12px;border:1px solid rgba(112,76,91,.14);border-radius:15px;background:rgba(255,255,255,.88)}.template-library-search input{width:100%;min-width:0;border:0!important;background:transparent!important;padding:12px 0!important;box-shadow:none!important}.template-library-toolbar select{min-height:44px;border-radius:14px}.brain-dump-import-row{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:9px}.brain-dump-file-button{display:inline-flex!important;align-items:center;justify-content:center;margin:0!important;cursor:pointer}.brain-dump-import-row small{color:var(--muted);font-size:11px}.brain-dump-smart-preview{display:flex;align-items:flex-start;gap:10px;margin-top:10px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.66);border:1px solid rgba(112,76,91,.09)}.brain-dump-smart-preview>span{font-size:18px;line-height:1.2}.brain-dump-smart-preview div{min-width:0;display:flex;flex-direction:column;gap:2px}.brain-dump-smart-preview strong{font-size:12px}.brain-dump-smart-preview small{font-size:11px;color:var(--muted);line-height:1.35}@media(max-width:520px){.template-library-toolbar{grid-template-columns:1fr}.template-library-toolbar select{width:100%}.template-grid{grid-template-columns:1fr}.brain-dump-import-row{align-items:flex-start;flex-direction:column}.brain-dump-file-button{width:100%}}
'''
if 'HANA 2.0.36 · SMART LIBRARY' not in css:
    css += css_append

app_path.write_text(app, encoding="utf-8")
index_path.write_text(index, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")
sw_path.write_text(sw, encoding="utf-8")
print("Hana 2.0.36 patch applied")
