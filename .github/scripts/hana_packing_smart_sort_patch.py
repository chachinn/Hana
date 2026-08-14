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
# Release/version metadata
# -----------------------------------------------------------------------------
app = replace_once(
    app,
    "HANA 🌸 Version 2 · internal build 2.0.33\n   Skincare Today shortcut + 2 AM morning cutoff",
    "HANA 🌸 Version 2 · internal build 2.0.34\n   Trip-aware packing shortcut + expanded Smart Sort",
    "app header version",
)
app = replace_once(app, 'const HANA_APP_VERSION = "2.0.33";', 'const HANA_APP_VERSION = "2.0.34";', "app version")

release_pattern = re.compile(r"const HANA_RELEASE_NOTES = \{.*?\n\};", re.S)
release_new = '''const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 14, 2026",
  title: "Smart packing & smarter sorting 🧳✨",
  intro: "Hana can now surface a packing list only when a trip is close, while Smart Sort understands more complete real-life formats instead of breaking everything into loose notes.",
  items: [
    { icon:"🧳", title:"Packing when you need it", text:"Give a Packing List an exact Trip starts date and time. Its header shortcut appears exactly 7 days before departure and disappears when the trip begins." },
    { icon:"⏰", title:"Exact departure cutoff", text:"A Monday 1:00 AM trip keeps Packing available until Monday 1:00 AM — not midnight and not the end of the day." },
    { icon:"✨", title:"More Smart Sort structures", text:"Smart Sort can now keep packing lists, groceries, meeting agendas, meeting minutes, expenses, trackers and project plans together, alongside the Weekly Skincare Planner." },
    { icon:"☀️", title:"Skincare mornings start at 2 AM", text:"The skincare shortcut treats 2:00 AM through 5:59 PM as Morning; Night runs from 6:00 PM through 1:59 AM." }
  ]
};'''
app, count = release_pattern.subn(release_new, app, count=1)
if count != 1:
    raise SystemExit(f"release notes: expected 1 match, got {count}")

# -----------------------------------------------------------------------------
# Preserve packing identity + exact trip start in list data
# -----------------------------------------------------------------------------
old_normalize_intro = '''function normalizeList(list = {}) {
  const hasColumnMode = Object.prototype.hasOwnProperty.call(list, "columnMode");
  const inferredGroceryColumns = /\\bgrocer(?:y|ies)\\b/i.test(String(list.name || "")) || String(list.icon || "") === "🛒";
  const labels = list.columnLabels && typeof list.columnLabels === "object" ? list.columnLabels : {};'''
new_normalize_intro = '''function normalizeList(list = {}) {
  const hasColumnMode = Object.prototype.hasOwnProperty.call(list, "columnMode");
  const inferredGroceryColumns = /\\bgrocer(?:y|ies)\\b/i.test(String(list.name || "")) || String(list.icon || "") === "🛒";
  const rawTemplateType = String(list.templateType || "");
  const inferredPacking = rawTemplateType === "packing" || String(list.icon || "") === "🧳" || /\\bpack(?:ing)?\\b/i.test(String(list.name || ""));
  const templateType = inferredPacking ? "packing" : (rawTemplateType === "grocery" || inferredGroceryColumns ? "grocery" : rawTemplateType);
  const labels = list.columnLabels && typeof list.columnLabels === "object" ? list.columnLabels : {};'''
app = replace_once(app, old_normalize_intro, new_normalize_intro, "normalizeList intro")
app = replace_once(
    app,
    '''    icon: String(list.icon || "☑️").slice(0, 4),
    space: String(list.space || "personal"),''',
    '''    icon: String(list.icon || "☑️").slice(0, 4),
    space: String(list.space || "personal"),
    templateType,
    tripStartAt: String(list.tripStartAt || ""),''',
    "normalizeList packing fields",
)

# -----------------------------------------------------------------------------
# Packing list timing + exact contextual shortcut
# -----------------------------------------------------------------------------
packing_helpers = r'''

/* ================= TRIP-AWARE PACKING SHORTCUT ================= */
const PACKING_SHORTCUT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
let packingShortcutTimer = null;

function isPackingList(list) {
  return Boolean(list && (list.templateType === "packing" || list.icon === "🧳" || /\bpack(?:ing)?\b/i.test(String(list.name || ""))));
}

function packingTripStartDate(list) {
  const raw = String(list?.tripStartAt || "").trim();
  if (!raw) return null;
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? null : value;
}

function packingTripEntries() {
  return (state.lists || []).filter(isPackingList).map(list => ({ list, start: packingTripStartDate(list) })).filter(entry => entry.start);
}

function activePackingShortcut(now = new Date()) {
  const at = now.getTime();
  return packingTripEntries()
    .filter(entry => {
      const start = entry.start.getTime();
      return at >= start - PACKING_SHORTCUT_WINDOW_MS && at < start;
    })
    .sort((a,b) => a.start - b.start)[0] || null;
}

function nextPackingShortcutTransition(now = new Date()) {
  const at = now.getTime();
  const transitions = [];
  packingTripEntries().forEach(entry => {
    const start = entry.start.getTime(), windowStart = start - PACKING_SHORTCUT_WINDOW_MS;
    if (at < windowStart) transitions.push(windowStart);
    else if (at < start) transitions.push(start);
  });
  return transitions.filter(value => value > at).sort((a,b) => a-b)[0] || 0;
}

function packingShortcutCountdown(ms) {
  const value = Math.max(0, Number(ms || 0));
  if (value <= 60 * 60 * 1000) return `${Math.max(1, Math.ceil(value / 60000))}m`;
  if (value < 24 * 60 * 60 * 1000) return `${Math.ceil(value / 3600000)}h`;
  return `${Math.ceil(value / 86400000)}d`;
}

function refreshPackingQuickButton() {
  const button = document.getElementById("packingQuickButton");
  if (!button) return;
  const now = new Date(), match = activePackingShortcut(now);
  button.classList.toggle("hidden", !match);
  if (match) {
    const remaining = match.start.getTime() - now.getTime();
    const when = match.start.toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
    const title = `Open ${match.list.name} · trip starts ${when}`;
    button.title = title;
    button.setAttribute("aria-label", title);
    const badge = document.getElementById("packingQuickCountdown");
    if (badge) badge.textContent = packingShortcutCountdown(remaining);
  }
  if (packingShortcutTimer) clearTimeout(packingShortcutTimer);
  packingShortcutTimer = null;
  const transition = nextPackingShortcutTransition(now);
  if (transition) {
    const delay = Math.max(100, Math.min(2147480000, transition - now.getTime() + 80));
    packingShortcutTimer = setTimeout(refreshPackingQuickButton, delay);
  }
}

function openActivePackingList() {
  const match = activePackingShortcut(new Date());
  if (!match) { refreshPackingQuickButton(); return showToast("That packing window has ended or has not started yet 🧳"); }
  const list = match.list;
  const visibleInMode = state.currentMode === "all" || (state.currentMode === "shared" ? list.sharedWithPartner : state.currentMode === list.space);
  if (!visibleInMode) state.currentMode = "all";
  state.activeListId = list.id;
  changePage("lists");
}

function packingListTimingSummaryHTML(list) {
  if (!isPackingList(list)) return "";
  const start = packingTripStartDate(list);
  if (!start) return "";
  const windowStart = new Date(start.getTime() - PACKING_SHORTCUT_WINDOW_MS);
  const startLabel = start.toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
  const windowLabel = windowStart.toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
  return `<div class="packing-trip-summary"><span>🧳</span><small>Trip starts <strong>${escapeHTML(startLabel)}</strong> · shortcut from ${escapeHTML(windowLabel)}</small></div>`;
}

function updateListTripTimingVisibility() {
  const wrap = document.getElementById("listTripTimingWrap");
  if (!wrap) return;
  const template = document.getElementById("listTemplateType")?.value || "";
  const icon = document.getElementById("listIcon")?.value.trim() || "";
  const name = document.getElementById("listName")?.value.trim() || "";
  const packing = template === "packing" || icon === "🧳" || /\bpack(?:ing)?\b/i.test(name);
  wrap.classList.toggle("hidden", !packing);
  if (packing && document.getElementById("listTemplateType") && !template) document.getElementById("listTemplateType").value = "packing";
}
'''
marker = "/* ================= REMINDERS ================= */"
# Put the helpers before reminders; all functions are declarations, so later list code can use them safely.
app = replace_once(app, marker, packing_helpers + "\n\n" + marker, "packing helpers insertion")

app = replace_once(
    app,
    '''          <p>${completed}/${total} checked${list.columnMode ? ` · ${listVisibleLanes(list).map(lane => escapeHTML(lane.label)).join(" / ")}` : ""}</p>
        </div>''',
    '''          <p>${completed}/${total} checked${list.columnMode ? ` · ${listVisibleLanes(list).map(lane => escapeHTML(lane.label)).join(" / ")}` : ""}</p>
          ${packingListTimingSummaryHTML(list)}
        </div>''',
    "packing list timing summary",
)

# List form reset/open/save
app = replace_once(
    app,
    '''  document.getElementById("listEditId").value = "";
  document.getElementById("listIcon").value = "☑️";''',
    '''  document.getElementById("listEditId").value = "";
  document.getElementById("listTemplateType").value = "";
  document.getElementById("listTripStartAt").value = "";
  document.getElementById("listIcon").value = "☑️";''',
    "clear list packing fields",
)
app = replace_once(
    app,
    '''  updateListColumnSettingsVisibility();
  document.getElementById("listModalEyebrow").textContent = "NEW CHECKLIST";''',
    '''  updateListColumnSettingsVisibility();
  updateListTripTimingVisibility();
  document.getElementById("listModalEyebrow").textContent = "NEW CHECKLIST";''',
    "clear list packing visibility",
)
app = replace_once(
    app,
    '''    document.getElementById("listName").value = list.name;
    document.getElementById("listSpace").value = list.space;
    document.getElementById("listQuantityLabel").value = list.quantityLabel ?? "";''',
    '''    document.getElementById("listName").value = list.name;
    document.getElementById("listSpace").value = list.space;
    document.getElementById("listTemplateType").value = list.templateType || (isPackingList(list) ? "packing" : "");
    document.getElementById("listTripStartAt").value = String(list.tripStartAt || "").slice(0,16);
    document.getElementById("listQuantityLabel").value = list.quantityLabel ?? "";''',
    "open list packing fields",
)
app = replace_once(
    app,
    '''    document.getElementById("listColumnFiveLabel").value = labels.column5;
    updateListColumnSettingsVisibility();
    document.getElementById("listModalEyebrow").textContent = "CHECKLIST DETAILS";''',
    '''    document.getElementById("listColumnFiveLabel").value = labels.column5;
    updateListColumnSettingsVisibility();
    updateListTripTimingVisibility();
    document.getElementById("listModalEyebrow").textContent = "CHECKLIST DETAILS";''',
    "open list packing visibility",
)

save_list_intro_old = '''  const old = id ? state.lists.find(list => list.id === id) : null;
  const name = document.getElementById("listName").value.trim();
  if (!name) return showToast("Give the checklist a name 🌸");
  const list = normalizeList({'''
save_list_intro_new = '''  const old = id ? state.lists.find(list => list.id === id) : null;
  const name = document.getElementById("listName").value.trim();
  if (!name) return showToast("Give the checklist a name 🌸");
  const icon = document.getElementById("listIcon").value.trim() || "☑️";
  const rawTemplateType = document.getElementById("listTemplateType")?.value || old?.templateType || "";
  const packing = rawTemplateType === "packing" || icon === "🧳" || /\\bpack(?:ing)?\\b/i.test(name);
  const templateType = packing ? "packing" : rawTemplateType;
  const list = normalizeList({'''
app = replace_once(app, save_list_intro_old, save_list_intro_new, "save list intro")
app = replace_once(
    app,
    '''    name,
    icon: document.getElementById("listIcon").value.trim() || "☑️",
    space: document.getElementById("listSpace").value,
    quantityLabel:''',
    '''    name,
    icon,
    space: document.getElementById("listSpace").value,
    templateType,
    tripStartAt: packing ? (document.getElementById("listTripStartAt")?.value || "") : "",
    quantityLabel:''',
    "save list packing data",
)

app = replace_once(
    app,
    '''  document.getElementById("listName").value="";document.getElementById("listName").placeholder=template.name||"List name";document.getElementById("listIcon").value=template.icon||"☑️";
  document.getElementById("listColumnMode").checked=templateId==="grocery";document.getElementById("listColumnCount").value="3";updateListColumnSettingsVisibility();''',
    '''  document.getElementById("listName").value="";document.getElementById("listName").placeholder=template.name||"List name";document.getElementById("listIcon").value=template.icon||"☑️";
  document.getElementById("listTemplateType").value=templateId;document.getElementById("listTripStartAt").value="";
  document.getElementById("listColumnMode").checked=templateId==="grocery";document.getElementById("listColumnCount").value="3";updateListColumnSettingsVisibility();updateListTripTimingVisibility();''',
    "packing template draft fields",
)
app = replace_once(
    app,
    '''    name: template.name,
    icon: template.icon,
    space: preferredSpace(),
    columnMode: templateId === "grocery",''',
    '''    name: template.name,
    icon: template.icon,
    space: preferredSpace(),
    templateType: templateId,
    tripStartAt: "",
    columnMode: templateId === "grocery",''',
    "create list template identity",
)

# -----------------------------------------------------------------------------
# Expanded Smart Sort: whole-block parsers and creators
# -----------------------------------------------------------------------------
smart_helpers = r'''
/* ================= EXPANDED SMART SORT ================= */
const SMART_STRUCTURED_CAPTURE_TYPES = new Set(["packing","grocery","meeting-agenda","meeting-minutes","expenses","tracker","project"]);

function smartStructuredCaptureLabel(kind) {
  return ({
    packing:"🧳 Packing List · structured block",
    grocery:"🛒 Grocery List · structured block",
    "meeting-agenda":"📋 Meeting Agenda · structured block",
    "meeting-minutes":"📝 Meeting Minutes · structured block",
    expenses:"💳 Expense Tracker · structured block",
    tracker:"📒 Tracker · structured rows",
    project:"🌷 Project Plan · structured block"
  })[kind] || "✨ Structured capture";
}

function smartStructuredCaptureKind(text, forcedType="auto") {
  if (SMART_STRUCTURED_CAPTURE_TYPES.has(forcedType)) return forcedType;
  const raw=String(text||"").trim();if(!raw)return "";
  const lines=raw.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const first=lines[0]||"";
  if(/\bpacking\s+list\b|\bwhat\s+to\s+pack\b|^packing\s*:/i.test(raw))return "packing";
  if(/\bgrocery\s+list\b|\bgroceries\s*[:\n]|^groceries?\s*:/i.test(raw))return "grocery";
  if(/\b(minutes\s+of\s+the\s+meeting|meeting\s+minutes|minutes\s+of\s+meeting)\b/i.test(raw)||(/\bdecisions?\s+(?:made|reached)\b/i.test(raw)&&/\b(action\s+items?|meeting|attendees?)\b/i.test(raw)))return "meeting-minutes";
  if(/\bmeeting\s+agenda\b/i.test(raw)||(/^agenda\s*:/i.test(first)&&/\b(objective|attendees?|topics?|agenda)\b/i.test(raw)))return "meeting-agenda";
  if(/\b(expense\s+tracker|expenses?\s*[:\n]|travel\s+expenses?|budget\s+spent)\b/i.test(raw)&&/(?:₱|\$|€|£|¥)\s*\d|\d[\d,]*\.\d{2}/.test(raw))return "expenses";
  if(/^\s*(?:project\s+plan|project)\s*[:\-–—]/i.test(first)||/^#{1,6}\s*project\s+plan\b/i.test(first))return "project";
  const delimited=lines.filter(line=>line.includes("\t")||line.split("|").length>=2);
  if(lines.length>=2&&delimited.length>=2)return "tracker";
  return "";
}

function smartCleanBullet(line="") {
  return String(line||"").trim().replace(/^[-*•▪◦‣]+\s*/,"").replace(/^\[[ x✓]?\]\s*/i,"").trim();
}

function smartHeadingTail(line, pattern) {
  const clean=smartCleanBullet(line).replace(/^#{1,6}\s*/,"").trim();
  const match=clean.match(pattern);return match?String(match[1]||"").trim():"";
}

function smartTripStartFromText(text) {
  const lines=String(text||"").split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const line=lines.find(value=>/\b(trip\s+starts?|departure|depart(?:ure|ing)?|travel\s+starts?|flight\s+(?:is|at|leaves?))\b/i.test(value));
  if(!line)return "";
  const meta=parseCaptureMeta(line,preferredSpace());
  const iso=line.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const date=iso?.[1]||meta.date||"";
  if(date&&meta.time)return `${date}T${meta.time}`;
  const month=line.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(20\d{2}))?/i);
  if(month&&meta.time){
    const year=Number(month[3]||new Date().getFullYear());
    let parsed=new Date(`${month[1]} ${month[2]}, ${year} 12:00:00`);
    if(!month[3]&&!Number.isNaN(parsed.getTime())&&parsed.getTime()<Date.now()-86400000)parsed=new Date(`${month[1]} ${month[2]}, ${year+1} 12:00:00`);
    if(!Number.isNaN(parsed.getTime()))return `${localDateISO(parsed)}T${meta.time}`;
  }
  return "";
}

function smartListItemsFromText(text, kind) {
  const raw=String(text||"").replace(/\r/g,"").trim();
  const lines=raw.split("\n").map(line=>line.trim()).filter(Boolean).filter(line=>!/^[-–—━─⸻\s]+$/.test(line));
  const items=[];
  lines.forEach((source,index)=>{
    const plain=smartCleanBullet(source).replace(/^#{1,6}\s*/,"").trim();
    if(!plain)return;
    if(kind==="packing"&&/\b(trip\s+starts?|departure|depart(?:ure|ing)?|travel\s+starts?|flight\s+(?:is|at|leaves?))\b/i.test(plain))return;
    if(kind==="packing"&&/^(?:packing\s+list|packing|what\s+to\s+pack)\s*(?:[:\-–—]\s*)?/i.test(plain)){
      const tail=plain.replace(/^(?:packing\s+list|packing|what\s+to\s+pack)\s*(?:[:\-–—]\s*)?/i,"").trim();
      if(tail&&index===0&&tail.includes(","))tail.split(",").map(value=>value.trim()).filter(Boolean).forEach(value=>items.push({title:value,quantity:"",detail:""}));
      return;
    }
    if(kind==="grocery"&&/^(?:grocery\s+list|groceries?|shopping\s+list)\s*(?:[:\-–—]\s*)?/i.test(plain)){
      const tail=plain.replace(/^(?:grocery\s+list|groceries?|shopping\s+list)\s*(?:[:\-–—]\s*)?/i,"").trim();
      if(tail)tail.split(",").map(value=>value.trim()).filter(Boolean).forEach(value=>items.push({title:value,quantity:"",detail:""}));
      return;
    }
    if(/^[^|]{1,45}:$/.test(plain))return;
    const parts=plain.split("|").map(value=>value.trim());
    const title=parts[0]||"";if(!title)return;
    items.push({title,quantity:parts[1]||"",detail:parts.slice(2).join(" | ")||""});
  });
  return items;
}

function createSmartListFromText(text,space,kind,options={}) {
  const items=smartListItemsFromText(text,kind);
  const first=String(text||"").split(/\r?\n/).map(line=>line.trim()).find(Boolean)||"";
  let name=kind==="packing"?"Packing List":"Grocery List";
  if(kind==="packing"){
    const tail=smartHeadingTail(first,/^(?:packing\s+list|packing|what\s+to\s+pack)\s*(?:[:\-–—]\s*(.+))?$/i);
    if(tail&&!tail.includes(","))name=`${tail} Packing List`;
  }else{
    const tail=smartHeadingTail(first,/^(?:grocery\s+list|groceries?|shopping\s+list)\s*(?:[:\-–—]\s*(.+))?$/i);
    if(tail&&!tail.includes(","))name=`${tail} Grocery List`;
  }
  const hasQty=items.some(item=>item.quantity),hasDetail=items.some(item=>item.detail);
  const list=normalizeList({id:createId(),name,icon:kind==="packing"?"🧳":"🛒",space,templateType:kind,tripStartAt:kind==="packing"?smartTripStartFromText(text):"",quantityLabel:hasQty?"Quantity":"",detailLabel:hasDetail?"Detail":"",columnMode:false,columnCount:3,columnLabels:{partner:"Column 1",me:"Column 2",both:"Column 3",column4:"Column 4",column5:"Column 5"},items:items.map(item=>({id:createId(),...item,lane:"both",completed:false,createdAt:Date.now(),updatedAt:Date.now()})),createdAt:Date.now(),updatedAt:Date.now()});
  state.lists.push(list);state.activeListId=list.id;saveState();
  if(!options.quiet)showToast(`${list.name} created · ${items.length} item${items.length===1?"":"s"} ${list.icon}`);
  if(options.open)changePage("lists");
  return kind;
}

function smartMeetingTitle(text,kind) {
  const first=String(text||"").split(/\r?\n/).map(line=>smartCleanBullet(line).replace(/^#{1,6}\s*/,"").trim()).find(Boolean)||"";
  const pattern=kind==="meeting-minutes"?/^(?:minutes\s+of\s+the\s+meeting|meeting\s+minutes|minutes\s+of\s+meeting)\s*(?:[:\-–—]\s*(.+))?$/i:/^meeting\s+agenda\s*(?:[:\-–—]\s*(.+))?$/i;
  const match=first.match(pattern),tail=String(match?.[1]||"").trim();
  if(!tail)return kind==="meeting-minutes"?"Minutes of the Meeting":"Meeting Agenda";
  return kind==="meeting-minutes"?`${tail} · Minutes`:`${tail} · Agenda`;
}

function smartMeetingDataFromText(text,kind) {
  const lines=String(text||"").replace(/\r/g,"").split("\n").map(line=>line.trim()).filter(Boolean);
  const data={kind:kind==="meeting-minutes"?"minutes":"agenda",agendaItems:[],decisionItems:[],discussion:""};
  let section="",currentDecision=null;const discussion=[];
  const flushDecision=()=>{if(currentDecision&&(currentDecision.topic||currentDecision.discussion||currentDecision.decision||currentDecision.action||currentDecision.owner||currentDecision.dueDate))data.decisionItems.push(normalizeMeetingDecisionItem(currentDecision));currentDecision=null;};
  lines.forEach((source,index)=>{
    let line=smartCleanBullet(source).replace(/^#{1,6}\s*/,"").trim();if(!line||/^[-–—━─⸻\s]+$/.test(line))return;
    if(index===0&&/(meeting\s+agenda|meeting\s+minutes|minutes\s+of)/i.test(line))return;
    let match;
    if((match=line.match(/^date\s*:\s*(.+)$/i))){const iso=extractDate(match[1])||match[1].match(/20\d{2}-\d{2}-\d{2}/)?.[0]||"";if(iso)data.date=iso;return;}
    if((match=line.match(/^(?:start\s+time|time)\s*:\s*(.+)$/i))){const meta=parseCaptureMeta(match[1],preferredSpace());if(meta.time)data.startTime=meta.time;return;}
    if((match=line.match(/^end\s+time\s*:\s*(.+)$/i))){const meta=parseCaptureMeta(match[1],preferredSpace());if(meta.time)data.endTime=meta.time;return;}
    if((match=line.match(/^(?:location|venue|meeting\s+link)\s*:\s*(.+)$/i))){data.location=match[1].trim();return;}
    if((match=line.match(/^(?:facilitator|chair)\s*:\s*(.+)$/i))){data.facilitator=match[1].trim();return;}
    if((match=line.match(/^attendees?\s*:\s*(.+)$/i))){data.attendees=match[1].trim();return;}
    if((match=line.match(/^(?:absent|apologies)\s*:\s*(.+)$/i))){data.absent=match[1].trim();return;}
    if((match=line.match(/^(?:objective|purpose)\s*:\s*(.+)$/i))){data.objective=match[1].trim();return;}
    if((match=line.match(/^(?:prepared\s+by|minutes\s+prepared\s+by)\s*:\s*(.+)$/i))){data.preparedBy=match[1].trim();return;}
    if((match=line.match(/^next\s+meeting\s*:\s*(.+)$/i))){const meta=parseCaptureMeta(match[1],preferredSpace());data.nextMeetingDate=meta.date||"";data.nextMeetingTime=meta.time||"";return;}
    if(/^(?:agenda|agenda\s+items?|topics?)\s*:?[\s]*$/i.test(line)){flushDecision();section="agenda";return;}
    if(/^(?:discussion|discussion\s+summary|what\s+happened)\s*:?[\s]*$/i.test(line)){flushDecision();section="discussion";return;}
    if(/^(?:decisions?|decisions?\s+made|agreed\s+outcomes?)\s*:?[\s]*$/i.test(line)){flushDecision();section="decisions";return;}
    if(/^(?:action\s+items?|actions?|next\s+steps?)\s*:?[\s]*$/i.test(line)){flushDecision();section="actions";return;}
    if((match=line.match(/^topic\s*:\s*(.+)$/i))){flushDecision();currentDecision={topic:match[1].trim()};section="decision-detail";return;}
    if(section==="decision-detail"&&(match=line.match(/^discussion\s*:\s*(.+)$/i))){currentDecision=currentDecision||{};currentDecision.discussion=match[1].trim();return;}
    if(section==="decision-detail"&&(match=line.match(/^decision\s*:\s*(.+)$/i))){currentDecision=currentDecision||{};currentDecision.decision=match[1].trim();return;}
    if(section==="decision-detail"&&(match=line.match(/^(?:action|next\s+step)\s*:\s*(.+)$/i))){currentDecision=currentDecision||{};currentDecision.action=match[1].trim();return;}
    if(section==="decision-detail"&&(match=line.match(/^owner\s*:\s*(.+)$/i))){currentDecision=currentDecision||{};currentDecision.owner=match[1].trim();return;}
    if(section==="decision-detail"&&(match=line.match(/^due\s*:\s*(.+)$/i))){currentDecision=currentDecision||{};currentDecision.dueDate=extractDate(match[1])||match[1].match(/20\d{2}-\d{2}-\d{2}/)?.[0]||"";return;}
    if(section==="agenda"){data.agendaItems.push(normalizeMeetingAgendaItem({topic:line}));return;}
    if(section==="discussion"){discussion.push(line);return;}
    if(section==="decisions"){
      const pair=line.match(/^([^:]{1,80})\s*:\s*(.+)$/);data.decisionItems.push(normalizeMeetingDecisionItem({topic:pair?pair[1].trim():line.slice(0,80),decision:pair?pair[2].trim():line}));return;
    }
    if(section==="actions"){
      const pair=line.match(/^([^:]{1,80})\s*:\s*(.+)$/);data.decisionItems.push(normalizeMeetingDecisionItem({topic:pair?pair[1].trim():line.slice(0,80),action:pair?pair[2].trim():line}));return;
    }
  });
  flushDecision();data.discussion=discussion.join("\n");data.decisions=data.decisionItems.map(item=>item.decision).filter(Boolean).join("\n");
  return normalizeMeetingData(data);
}

function createSmartMeetingFromText(text,space,kind,options={}) {
  const meetingData=smartMeetingDataFromText(text,kind),title=smartMeetingTitle(text,kind);
  const note=normalizeNote({id:createId(),title,type:"meeting",space,tags:["meeting"],content:String(text||"").trim(),checklist:[],resettable:false,pinned:false,structuredType:kind,meetingData,createdAt:Date.now(),updatedAt:Date.now()});
  state.notes.push(note);saveState();
  if(!options.quiet)showToast(`${kind==="meeting-minutes"?"Meeting minutes":"Meeting agenda"} created 📝`);
  if(options.open){state.currentPage="notes";render();setTimeout(()=>openNoteModal(note.id),20);}
  return kind;
}

function smartExpenseRows(text) {
  const lines=String(text||"").replace(/\r/g,"").split("\n").map(line=>smartCleanBullet(line)).filter(Boolean);
  return lines.filter(line=>!/^#{0,6}\s*(?:expense\s+tracker|expenses?|travel\s+expenses?|budget)\s*:?[\s]*$/i.test(line)).map(line=>{
    const meta=parseCaptureMeta(line,preferredSpace());
    const currency=line.match(/(?:₱|\$|€|£|¥)\s*(-?\d[\d,]*(?:\.\d+)?)/);
    const separated=line.match(/(?:\||\s[-–—]\s)\s*(-?\d[\d,]*(?:\.\d{1,2})?)\s*(?:$|\|)/);
    const rawAmount=currency?.[1]||separated?.[1]||"";
    const amount=rawAmount?Number(rawAmount.replace(/,/g,"")):"";
    let item=line;
    if(currency)item=item.replace(currency[0],"");else if(separated)item=item.replace(separated[0]," ");
    item=item.replace(/\b(pending|paid|completed|reimbursed)\b/ig,"").replace(/[|–—-]+$/," ").replace(/\s+/g," ").trim();
    const status=(line.match(/\b(pending|paid|completed|reimbursed)\b/i)?.[1]||"").toLowerCase().replace("paid","completed");
    return {item:item||meta.title||line,amount:Number.isFinite(amount)?amount:"",date:meta.date||"",status,remarks:""};
  }).filter(row=>row.item);
}

function createSmartExpenseTracker(text,space,options={}) {
  const columns=[{id:createId(),name:"Item",type:"text"},{id:createId(),name:"Amount",type:"money"},{id:createId(),name:"Date",type:"date"},{id:createId(),name:"Status",type:"status"},{id:createId(),name:"Remarks",type:"text"}];
  const [itemCol,amountCol,dateCol,statusCol,remarksCol]=columns,parsed=smartExpenseRows(text);
  const rows=parsed.map(row=>({id:createId(),values:{[itemCol.id]:row.item,[amountCol.id]:row.amount,[dateCol.id]:row.date,[statusCol.id]:row.status,[remarksCol.id]:row.remarks},createdAt:Date.now(),updatedAt:Date.now()}));
  const table=normalizeTable({id:createId(),name:"Expense Tracker",space,columns,statusOptions:["pending","completed","reimbursed"],sortMode:"manual",rows,createdAt:Date.now(),updatedAt:Date.now()});
  state.tables.push(table);state.activeTableId=table.id;saveState();if(!options.quiet)showToast(`Expense Tracker created · ${rows.length} row${rows.length===1?"":"s"} 💳`);if(options.open)changePage("tables");return "expenses";
}

function smartTrackerGrid(text) {
  const lines=String(text||"").replace(/\r/g,"").split("\n").map(line=>smartCleanBullet(line)).filter(Boolean).filter(line=>!/^#{1,6}\s*/.test(line));
  const delimited=lines.filter(line=>line.includes("\t")||line.includes("|"));
  if(delimited.length>=2){const sep=delimited[0].includes("\t")?"\t":"|";return delimited.map(line=>line.split(sep).map(value=>value.trim()));}
  return lines.map(line=>[line]);
}

function smartInferColumnType(values=[]) {
  const sample=values.map(value=>String(value||"").trim()).filter(Boolean).slice(0,20);if(!sample.length)return "text";
  if(sample.every(value=>/^(true|false|yes|no|✓|x)$/i.test(value)))return "checkbox";
  if(sample.every(value=>/^20\d{2}-\d{2}-\d{2}$/.test(value)))return "date";
  if(sample.every(value=>/^(?:₱|\$|€|£|¥)?\s*-?\d[\d,]*(?:\.\d+)?$/.test(value)))return sample.some(value=>/[₱$€£¥]/.test(value))?"money":"number";
  return "text";
}

function createSmartTrackerFromText(text,space,options={}) {
  const grid=smartTrackerGrid(text);if(!grid.length)return "invalid-tracker";
  const multiColumn=(grid[0]||[]).length>1;
  const headers=multiColumn?grid[0].map((value,index)=>value||`Column ${index+1}`):["Item"];
  const data=multiColumn?grid.slice(1):grid;
  const columns=headers.map((name,index)=>({id:createId(),name:String(name||`Column ${index+1}`),type:smartInferColumnType(data.map(row=>row[index]))}));
  const rows=data.filter(row=>row.some(value=>String(value||"").trim())).map(row=>({id:createId(),values:Object.fromEntries(columns.map((col,index)=>[col.id,String(row[index]??"").trim()])),createdAt:Date.now(),updatedAt:Date.now()}));
  const table=normalizeTable({id:createId(),name:"Smart Tracker",space,columns,statusOptions:DEFAULT_TABLE_STATUSES.slice(),sortMode:"manual",rows,createdAt:Date.now(),updatedAt:Date.now()});
  state.tables.push(table);state.activeTableId=table.id;saveState();if(!options.quiet)showToast(`Tracker created · ${rows.length} row${rows.length===1?"":"s"} 📒`);if(options.open)changePage("tables");return "tracker";
}

function smartProjectParts(text) {
  const lines=String(text||"").replace(/\r/g,"").split("\n").map(line=>line.trim()).filter(Boolean);
  const first=smartCleanBullet(lines[0]||"").replace(/^#{1,6}\s*/,"").trim();
  const match=first.match(/^(?:project\s+plan|project)\s*[:\-–—]\s*(.+)$/i);const name=String(match?.[1]||first||"Project").trim();
  let section="",description=[];const tasks=[];
  lines.slice(1).forEach(source=>{
    const plain=smartCleanBullet(source).replace(/^#{1,6}\s*/,"").trim();if(!plain)return;
    if(/^(?:objective|description|goal|context)\s*:?[\s]*$/i.test(plain)){section="description";return;}
    if(/^(?:tasks?|to[- ]?do|actions?|next\s+steps?)\s*:?[\s]*$/i.test(plain)){section="tasks";return;}
    const bullet=/^[-*•▪◦‣]|^\[[ x✓]?\]/i.test(source.trim());
    if(section==="tasks"||bullet)tasks.push(plain);else description.push(plain.replace(/^(?:objective|description|goal|context)\s*:\s*/i,""));
  });
  return {name,description:description.join("\n"),tasks};
}

function createSmartProjectFromText(text,space,options={}) {
  const parts=smartProjectParts(text);if(!parts.name)return "invalid-project";
  let project=projectByName(parts.name);
  if(!project){project=normalizeProject({id:createId(),name:parts.name,emoji:"🌷",space,description:parts.description,status:"active",milestones:[],createdAt:Date.now(),updatedAt:Date.now()});state.projects.push(project);}else if(parts.description&&!project.description){project.description=parts.description;project.updatedAt=Date.now();}
  let created=0;parts.tasks.forEach(line=>{const meta=parseCaptureMeta(line,space);if(!meta.title)return;const task=normalizeTask({id:createId(),title:meta.title,space:meta.space||space,priority:"medium",status:"todo",project:project.name,tags:meta.tags,dueDate:meta.date,dueTime:meta.time,durationMinutes:meta.duration,energy:meta.energy,deadlineType:meta.deadlineType,createdAt:Date.now(),updatedAt:Date.now()});state.tasks.push(task);created++;});
  state.activeProjectId=project.id;saveState();if(!options.quiet)showToast(`${project.name} created · ${created} task${created===1?"":"s"} 🌷`);if(options.open)changePage("projects");return "project";
}

function createSmartStructuredCapture(text,space,kind,options={}) {
  if(kind==="packing"||kind==="grocery")return createSmartListFromText(text,space,kind,options);
  if(kind==="meeting-agenda"||kind==="meeting-minutes")return createSmartMeetingFromText(text,space,kind,options);
  if(kind==="expenses")return createSmartExpenseTracker(text,space,options);
  if(kind==="tracker")return createSmartTrackerFromText(text,space,options);
  if(kind==="project")return createSmartProjectFromText(text,space,options);
  return "";
}

'''
brain_marker = "/* ================= BRAIN DUMP / INBOX ================= */"
app = replace_once(app, brain_marker, smart_helpers + brain_marker, "smart sort helpers insertion")

# Teach predictor to detect whole structures before line-level heuristics (after skincare).
app = replace_once(
    app,
    '''  if(skincareTextLooksStructured(raw,{allowSingleDay:false}))return{type:"skincare",label:"🧴 Weekly Skincare Planner"};
  if(/^(event|appointment|calendar):\\s*/i.test(raw)''',
    '''  if(skincareTextLooksStructured(raw,{allowSingleDay:false}))return{type:"skincare",label:"🧴 Weekly Skincare Planner"};
  const structuredKind=smartStructuredCaptureKind(raw);if(structuredKind)return{type:structuredKind,label:smartStructuredCaptureLabel(structuredKind)};
  if(/^(event|appointment|calendar):\\s*/i.test(raw)''',
    "predict structured capture",
)

# Expand explicit destination menu.
old_destinations = '''const BRAIN_DUMP_DESTINATIONS = [
  {value:"auto",label:"✨ Smart sort"},
  {value:"task",label:"✅ Task"},
  {value:"note",label:"📝 Note"},
  {value:"event",label:"📅 Event"},
  {value:"list",label:"☑️ Checklist"},
  {value:"skincare",label:"🧴 Skincare planner"},
  {value:"someday",label:"🌱 Someday"}
];'''
new_destinations = '''const BRAIN_DUMP_DESTINATIONS = [
  {value:"auto",label:"✨ Smart sort"},
  {value:"task",label:"✅ Task"},
  {value:"note",label:"📝 Note"},
  {value:"event",label:"📅 Event"},
  {value:"list",label:"☑️ Checklist"},
  {value:"packing",label:"🧳 Packing list"},
  {value:"grocery",label:"🛒 Grocery list"},
  {value:"skincare",label:"🧴 Skincare planner"},
  {value:"meeting-agenda",label:"📋 Meeting agenda"},
  {value:"meeting-minutes",label:"📝 Meeting minutes"},
  {value:"expenses",label:"💳 Expense tracker"},
  {value:"tracker",label:"📒 Tracker"},
  {value:"project",label:"🌷 Project plan"},
  {value:"someday",label:"🌱 Someday"}
];'''
app = replace_once(app, old_destinations, new_destinations, "brain dump destinations")

# Prediction copy for whole blocks.
app = replace_once(
    app,
    '''function updateCapturePrediction(){const input=document.getElementById("quickCaptureInput");const p=document.getElementById("capturePrediction");if(!input||!p)return;const text=input.value;if(skincareTextLooksStructured(text,{allowSingleDay:false})){p.textContent="🧴 Weekly Skincare Planner · formatted routine detected";return;}const lines=parseLines(text);p.textContent=lines.length>1?`🧠 ${lines.length} items · Hana can organize these`:predictCapture(text).label;}''',
    '''function updateCapturePrediction(){const input=document.getElementById("quickCaptureInput");const p=document.getElementById("capturePrediction");if(!input||!p)return;const text=input.value;if(skincareTextLooksStructured(text,{allowSingleDay:false})){p.textContent="🧴 Weekly Skincare Planner · formatted routine detected";return;}const structuredKind=smartStructuredCaptureKind(text);if(structuredKind){p.textContent=smartStructuredCaptureLabel(structuredKind);return;}const lines=parseLines(text);p.textContent=lines.length>1?`🧠 ${lines.length} items · Hana can organize these`:predictCapture(text).label;}''',
    "quick capture prediction",
)

# Plant new explicit/smart structured destinations as one structure.
app = replace_once(
    app,
    '''  const pred=forced?{type:forced,label:brainDumpDestinationLabel(forced,text)}:suggested,meta=parseCaptureMeta(text,space);
  if(pred.type==="skincare")''',
    '''  const pred=forced?{type:forced,label:brainDumpDestinationLabel(forced,text)}:suggested,meta=parseCaptureMeta(text,space);
  if(SMART_STRUCTURED_CAPTURE_TYPES.has(pred.type)){const result=createSmartStructuredCapture(text,space,pred.type,{quiet:true,open:false});return result||`invalid-${pred.type}`;}
  if(pred.type==="skincare")''',
    "plant structured capture",
)

# Keep recognized blocks together in Quick Capture and Inbox.
app = regex_once(
    app,
    r'function saveQuickCapture\(\)\{.*?\}\nfunction sendQuickCaptureToInbox\(\)\{.*?\}\n\nfunction renderInbox\(\)\{.*?\}\nfunction inboxCard',
    '''function saveQuickCapture(){const input=document.getElementById("quickCaptureInput"),text=input.value.trim(),space=document.getElementById("captureSpace").value;if(!text)return showToast("Write something first 🌸");if(skincareTextLooksStructured(text,{allowSingleDay:false})){input.value="";closeModal("quickCaptureModal");createSkincareRoutineNoteFromText(text,space,{open:true});return;}const structuredKind=smartStructuredCaptureKind(text);if(structuredKind){input.value="";closeModal("quickCaptureModal");createSmartStructuredCapture(text,space,structuredKind,{open:true,quiet:false});return;}const lines=parseLines(text);lines.forEach(line=>plantText(line,space));input.value="";closeModal("quickCaptureModal");showToast(`${lines.length} item${lines.length===1?"":"s"} planted 🌱`);render();}
function sendQuickCaptureToInbox(){const input=document.getElementById("quickCaptureInput"),text=input.value.trim(),space=document.getElementById("captureSpace").value;if(!text)return showToast("Write something first 🌸");if(skincareTextLooksStructured(text,{allowSingleDay:false})){state.inbox.push({id:createId(),text,space,prediction:"skincare",destination:"skincare",createdAt:Date.now()});input.value="";closeModal("quickCaptureModal");showToast("Weekly skincare routine kept together in Inbox 🧴");render();return;}const structuredKind=smartStructuredCaptureKind(text);if(structuredKind){state.inbox.push({id:createId(),text,space,prediction:structuredKind,destination:structuredKind,createdAt:Date.now()});input.value="";closeModal("quickCaptureModal");showToast(`${smartStructuredCaptureLabel(structuredKind).split(" · ")[0]} kept together in Inbox`);render();return;}const lines=parseLines(text);lines.forEach(line=>state.inbox.push({id:createId(),text:line,space,prediction:predictCapture(line).type,createdAt:Date.now()}));input.value="";closeModal("quickCaptureModal");showToast(`${lines.length} item${lines.length===1?"":"s"} sent to Inbox 🧠`);render();}

function renderInbox(){const container=document.getElementById("pageContent");const defaultSpace=preferredSpace();container.innerHTML=`<div class="page-heading"><p class="eyebrow">MESSY BRAIN, CLEAN GARDEN</p><h1>Brain Dump</h1><p>Drop the thoughts first. Hana can suggest where each one belongs, and you stay in control.</p></div><div class="inbox-compose"><textarea id="brainDumpText" class="large-textarea" placeholder="Paste thoughts, a list, meeting notes, expenses, a project plan..."></textarea><div class="brain-dump-controls" style="margin-top:9px;"><label><span>Where should these go?</span><select id="brainDumpDestination">${brainDumpDestinationOptions("auto")}</select></label><label><span>Space</span><select id="brainDumpSpace">${spaceOptionsHTML(defaultSpace," default")}</select></label><button class="primary-button" id="brainDumpAddButton">Organize ✨</button></div><small class="brain-dump-help">Smart Sort reads ordinary thoughts line by line, but keeps recognized structures — skincare, packing, groceries, meetings, expenses, trackers and project plans — together.</small></div><section class="section"><div class="section-header"><h2>Inbox <span class="brain-dump-count">${state.inbox.length}</span></h2>${state.inbox.length?`<button data-plant-all-inbox>Plant all</button>`:""}</div>${state.inbox.length?state.inbox.map(inboxCard).join(""):emptyState("🧠","Inbox zero","Nothing is waiting to be organized.","","")}</section>`;}
function inboxCard''',
    "quick capture + inbox render",
    flags=re.S,
)

# Brain Dump: special-case all structured blocks before line splitting.
app = regex_once(
    app,
    r'function addBrainDump\(\)\{.*?\}\nfunction plantInboxItem',
    '''function addBrainDump(){const input=document.getElementById("brainDumpText"),text=input?.value.trim()||"",space=document.getElementById("brainDumpSpace")?.value||preferredSpace(),destination=document.getElementById("brainDumpDestination")?.value||"auto";if(!text)return showToast("Add a few thoughts first 🌸");const forcedSkincare=destination==="skincare",smartSkincare=destination==="auto"&&skincareTextLooksStructured(text,{allowSingleDay:false});if(forcedSkincare||smartSkincare){const parsed=parseSkincareRoutineText(text,{allowSingleDay:forcedSkincare});if(!parsed)return showToast("I couldn't find a skincare day + AM/PM + Product type: Product pattern yet.");input.value="";createSkincareRoutineNoteFromText(text,space,{allowSingleDay:forcedSkincare,open:true});return;}const structuredKind=smartStructuredCaptureKind(text,destination);if(structuredKind){input.value="";const result=createSmartStructuredCapture(text,space,structuredKind,{open:true,quiet:false});if(String(result||"").startsWith("invalid-"))showToast("Hana needs a little more structure before creating that format.");return;}parseLines(text).forEach(line=>state.inbox.push({id:createId(),text:line,space,prediction:predictCapture(line).type,destination:BRAIN_DUMP_DESTINATIONS.some(item=>item.value===destination)?destination:"auto",createdAt:Date.now()}));showToast("Brain dump sorted into the Inbox 🧠");render();}
function plantInboxItem''',
    "brain dump structured capture",
    flags=re.S,
)

app = replace_once(
    app,
    '''function plantInboxItem(id){const item=state.inbox.find(i=>i.id===id);if(!item)return;const result=plantText(item.text,item.space,item.destination||"auto");if(result==="invalid-skincare")return showToast("That item needs a day + AM/PM + Product type: Product format before it can become a skincare planner.");state.inbox=state.inbox.filter(i=>i.id!==id);showToast(result==="skincare"?"Skincare planner created 🧴":"Planted 🌱");render();}
function plantAllInbox(){const items=[...state.inbox],remaining=[];let planted=0;items.forEach(i=>{const result=plantText(i.text,i.space,i.destination||"auto");if(result==="invalid-skincare")remaining.push(i);else planted++;});state.inbox=remaining;showToast(`${planted} item${planted===1?"":"s"} planted${remaining.length?` · ${remaining.length} needs review`:""} 🌸`);render();}''',
    '''function plantInboxItem(id){const item=state.inbox.find(i=>i.id===id);if(!item)return;const result=plantText(item.text,item.space,item.destination||"auto");if(String(result||"").startsWith("invalid-"))return showToast(result==="invalid-skincare"?"That item needs a day + AM/PM + Product type: Product format before it can become a skincare planner.":"Hana needs a little more structure before creating that format.");state.inbox=state.inbox.filter(i=>i.id!==id);showToast(result==="skincare"?"Skincare planner created 🧴":"Planted 🌱");render();}
function plantAllInbox(){const items=[...state.inbox],remaining=[];let planted=0;items.forEach(i=>{const result=plantText(i.text,i.space,i.destination||"auto");if(String(result||"").startsWith("invalid-"))remaining.push(i);else planted++;});state.inbox=remaining;showToast(`${planted} item${planted===1?"":"s"} planted${remaining.length?` · ${remaining.length} needs review`:""} 🌸`);render();}''',
    "inbox invalid structured handling",
)

# -----------------------------------------------------------------------------
# Context buttons in render/click/visibility lifecycle
# -----------------------------------------------------------------------------
app = replace_once(app, "  refreshSkincareQuickButton();\n\n  switch", "  refreshSkincareQuickButton();\n  refreshPackingQuickButton();\n\n  switch", "render packing shortcut")
app = replace_once(
    app,
    '''  if(event.target.closest("[data-open-today-skincare]")){openTodaysSkincareRoutine();return;}''',
    '''  if(event.target.closest("[data-open-today-skincare]")){openTodaysSkincareRoutine();return;}
  if(event.target.closest("[data-open-trip-packing]")){openActivePackingList();return;}''',
    "packing click handler",
)
app = replace_once(
    app,
    '''document.addEventListener("change", event => {
  const typeSelect=event.target.closest?.("[data-structured-field-type-select]");''',
    '''document.addEventListener("change", event => {
  if(["listName","listIcon"].includes(event.target?.id)){updateListTripTimingVisibility();return;}
  const typeSelect=event.target.closest?.("[data-structured-field-type-select]");''',
    "list packing visibility change",
)
app = replace_once(
    app,
    '''window.addEventListener("online",()=>checkHanaUpdateAvailability({force:true}).catch(()=>{}));''',
    '''window.addEventListener("online",()=>checkHanaUpdateAvailability({force:true}).catch(()=>{}));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){refreshSkincareQuickButton();refreshPackingQuickButton();}});''',
    "context shortcut visibility refresh",
)

# -----------------------------------------------------------------------------
# index.html header + packing trip controls
# -----------------------------------------------------------------------------
index = replace_once(
    index,
    '''        <button id="skincareQuickButton" class="icon-button skincare-quick-header-button hidden" type="button" data-open-today-skincare aria-label="Open today's skincare routine" title="Today's skincare routine"><span aria-hidden="true">🧴</span><small id="skincareQuickPeriodIcon" aria-hidden="true">☀️</small></button>''',
    '''        <button id="skincareQuickButton" class="icon-button skincare-quick-header-button hidden" type="button" data-open-today-skincare aria-label="Open today's skincare routine" title="Today's skincare routine"><span aria-hidden="true">🧴</span><small id="skincareQuickPeriodIcon" aria-hidden="true">☀️</small></button>
        <button id="packingQuickButton" class="icon-button packing-quick-header-button hidden" type="button" data-open-trip-packing aria-label="Open upcoming trip packing list" title="Upcoming trip packing"><span aria-hidden="true">🧳</span><small id="packingQuickCountdown" aria-hidden="true">7d</small></button>''',
    "packing header button",
)
index = replace_once(
    index,
    '''      <input id="listEditId" type="hidden" />
      <div class="form-row">''',
    '''      <input id="listEditId" type="hidden" />
      <input id="listTemplateType" type="hidden" />
      <div class="form-row">''',
    "list template type hidden field",
)
index = replace_once(
    index,
    '''      <div class="form-group"><label for="listSpace">Space</label><select id="listSpace" data-space-select></select></div>''',
    '''      <div class="form-group"><label for="listSpace">Space</label><select id="listSpace" data-space-select></select></div>
      <div id="listTripTimingWrap" class="packing-trip-timing hidden">
        <div class="packing-trip-timing-copy"><span>🧳</span><div><strong>Trip timing</strong><small>Optional. When set, Hana shows this Packing List beside Search exactly 7 days before the trip and hides it at the exact start time.</small></div></div>
        <div class="form-group"><label for="listTripStartAt">Trip starts <span class="optional-label">optional</span></label><input id="listTripStartAt" type="datetime-local" /></div>
      </div>''',
    "packing trip timing field",
)
index = replace_once(index, '<meta name="hana-app-version" content="2.0.33" />', '<meta name="hana-app-version" content="2.0.34" />', "index app version")
index = index.replace("style.css?v=2.0.33", "style.css?v=2.0.34").replace("app.js?v=2.0.33", "app.js?v=2.0.34")

# -----------------------------------------------------------------------------
# CSS: compact context buttons + packing timing card
# -----------------------------------------------------------------------------
css += r'''

/* ================= HANA 2.0.34 · CONTEXT SHORTCUTS + PACKING ================= */
.packing-quick-header-button{position:relative;background:linear-gradient(145deg,var(--pink-50),var(--white));border-color:var(--pink-150)}
.packing-quick-header-button>span{font-size:18px;line-height:1}
.packing-quick-header-button>small{position:absolute;right:-4px;bottom:-4px;min-width:19px;height:18px;padding:0 4px;display:grid;place-items:center;border-radius:999px;background:var(--white);border:1px solid var(--pink-150);box-shadow:var(--shadow-sm);font-size:9px;font-weight:800;line-height:1;color:var(--pink-700)}
.packing-trip-timing{margin:10px 0 14px;padding:13px;border:1px solid var(--pink-150);border-radius:17px;background:rgba(255,248,251,.72)}
.packing-trip-timing-copy{display:flex;gap:10px;align-items:flex-start;margin-bottom:11px}.packing-trip-timing-copy>span{font-size:21px}.packing-trip-timing-copy strong,.packing-trip-timing-copy small{display:block}.packing-trip-timing-copy small{margin-top:3px;color:var(--muted);line-height:1.4}
.packing-trip-summary{display:flex;align-items:flex-start;gap:7px;margin-top:5px;color:var(--muted);font-size:11px;line-height:1.35}.packing-trip-summary strong{color:var(--text-soft);font-weight:700}
@media (max-width:430px){.header-actions{gap:5px}.skincare-quick-header-button,.packing-quick-header-button{width:39px;height:39px;min-width:39px}.packing-quick-header-button>small{right:-3px}.packing-trip-timing{padding:11px}}
'''

# -----------------------------------------------------------------------------
# Service worker/cache bump
# -----------------------------------------------------------------------------
sw = regex_once(sw, r'HANA 🌸 Service Worker v66[^\n]*', 'HANA 🌸 Service Worker v67 · packing + Smart Sort release', "service worker header")
sw = replace_once(sw, 'const CACHE_NAME = "hana-shell-v66";', 'const CACHE_NAME = "hana-shell-v67";', "service worker cache")
sw = sw.replace("style.css?v=2.0.33", "style.css?v=2.0.34").replace("app.js?v=2.0.33", "app.js?v=2.0.34")

app_path.write_text(app, encoding="utf-8")
index_path.write_text(index, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")
sw_path.write_text(sw, encoding="utf-8")
