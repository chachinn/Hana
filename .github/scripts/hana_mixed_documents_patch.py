from pathlib import Path
import re


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, got {count}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label, flags=0):
    out, count = re.subn(pattern, lambda _m: replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, got {count}")
    return out


app_path = Path("app.js")
index_path = Path("index.html")
sw_path = Path("service-worker.js")
app = app_path.read_text(encoding="utf-8")
index = index_path.read_text(encoding="utf-8")
sw = sw_path.read_text(encoding="utf-8")

# -----------------------------------------------------------------------------
# Release metadata
# -----------------------------------------------------------------------------
app = replace_once(
    app,
    "HANA 🌸 Version 2 · internal build 2.0.37\n   Startup stability + browser runtime QA",
    "HANA 🌸 Version 2 · internal build 2.0.38\n   Mixed Documents + connected Smart Sort",
    "app header",
)
app = replace_once(app, 'const HANA_APP_VERSION = "2.0.37";', 'const HANA_APP_VERSION = "2.0.38";', "runtime version")

release_notes = '''const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 14, 2026",
  title: "One document, many useful pieces 🧩",
  intro: "Smart Sort can now understand a document that contains several clearly labeled structures, turn each section into the right Hana object, and keep the results connected in one Memory Thread.",
  items: [
    { icon:"🧩", title:"Mixed Documents", text:"A single paste can contain meeting minutes, expenses, packing, project plans, trackers and other strong sections. Hana separates only when it sees at least two clear top-level structures." },
    { icon:"🧵", title:"The pieces stay connected", text:"Objects created from one mixed document are linked automatically in a Memory Thread so their original context is not lost." },
    { icon:"📄", title:"Works with local file import", text:"TXT, Markdown, CSV, TSV, JSON and HTML loaded into Brain Dump can use the same mixed-document understanding after you review the extracted text." },
    { icon:"🌿", title:"Conservative and bounded", text:"Meeting action items and project tasks stay inside their parent sections, skincare still gets first priority, and mixed imports are capped to protect iPhone smoothness." }
  ]
};'''
app = regex_once(app, r'const HANA_RELEASE_NOTES = \{.*?\n\};', release_notes, "release notes", flags=re.S)

# -----------------------------------------------------------------------------
# Mixed-document parser + creator. Insert before Brain Dump so all capture paths
# can reuse it. The parser is intentionally heading-driven and conservative.
# -----------------------------------------------------------------------------
mixed_code = r'''
/* ================= MIXED DOCUMENT SMART SORT ================= */
const MIXED_DOCUMENT_TYPE = "mixed-document";
const MIXED_DOCUMENT_MAX_SECTIONS = 12;
const MIXED_DOCUMENT_MAX_LINES = 400;
const MIXED_DOCUMENT_MAX_GENERIC_ROOTS = 60;

function smartMixedKindTitle(kind="") {
  return ({
    "meeting-agenda":"Meeting Agenda", "meeting-minutes":"Meeting Minutes", packing:"Packing List", grocery:"Grocery List",
    expenses:"Expense Tracker", project:"Project Plan", recipe:"Recipe Card", "travel-itinerary":"Travel Itinerary", workout:"Workout Plan",
    "study-plan":"Study Plan", medication:"Medication / Supplement Schedule", "meal-plan":"Meal Plan", "habit-tracker":"Habit Tracker",
    "reading-list":"Reading List", "watch-list":"Watch List", subscriptions:"Subscriptions", applications:"Applications",
    deliveries:"Orders / Deliveries", inventory:"Inventory", "content-calendar":"Content Calendar", "decision-log":"Decision Log",
    bookmarks:"Bookmarks", skincare:"Skincare Planner", routine:"Routine", "task-section":"Tasks", "note-section":"Notes", "event-section":"Events"
  })[kind] || "Section";
}

function smartMixedHeadingKind(line="") {
  const clean=smartCleanBullet(String(line||"")).replace(/^#{1,6}\s*/,"").trim();
  if(!clean||clean.length>110)return "";
  const headed=pattern=>pattern.test(clean);
  if(headed(/^(?:meeting\s+minutes|minutes\s+of\s+(?:the\s+)?meeting)(?:\s*[:\-–—]\s*.+)?$/i))return "meeting-minutes";
  if(headed(/^meeting\s+agenda(?:\s*[:\-–—]\s*.+)?$/i))return "meeting-agenda";
  if(headed(/^(?:packing\s+list|what\s+to\s+pack)(?:\s*[:\-–—]\s*.+)?$/i))return "packing";
  if(headed(/^(?:grocery\s+list|groceries|shopping\s+list)(?:\s*[:\-–—]\s*.+)?$/i))return "grocery";
  if(headed(/^(?:expense\s+tracker|expenses|travel\s+expenses)(?:\s*[:\-–—]\s*.+)?$/i))return "expenses";
  if(headed(/^project\s+plan(?:\s*[:\-–—]\s*.+)?$/i))return "project";
  if(headed(/^recipe(?:\s*[:\-–—]\s*.+)?$/i))return "recipe";
  if(headed(/^(?:travel\s+itinerary|itinerary)(?:\s*[:\-–—]\s*.+)?$/i))return "travel-itinerary";
  if(headed(/^(?:workout\s+plan|workout)(?:\s*[:\-–—]\s*.+)?$/i))return "workout";
  if(headed(/^(?:study\s+plan|study\s+schedule)(?:\s*[:\-–—]\s*.+)?$/i))return "study-plan";
  if(headed(/^(?:medication(?:\s*\/\s*supplement)?\s+schedule|supplement\s+schedule|medications|supplements)(?:\s*[:\-–—]\s*.+)?$/i))return "medication";
  if(headed(/^(?:meal\s+plan|meal\s+planner)(?:\s*[:\-–—]\s*.+)?$/i))return "meal-plan";
  if(headed(/^habit\s+tracker(?:\s*[:\-–—]\s*.+)?$/i))return "habit-tracker";
  if(headed(/^reading\s+list(?:\s*[:\-–—]\s*.+)?$/i))return "reading-list";
  if(headed(/^watch\s+list(?:\s*[:\-–—]\s*.+)?$/i))return "watch-list";
  if(headed(/^(?:subscription\s+tracker|subscriptions)(?:\s*[:\-–—]\s*.+)?$/i))return "subscriptions";
  if(headed(/^(?:application\s+tracker|applications)(?:\s*[:\-–—]\s*.+)?$/i))return "applications";
  if(headed(/^(?:(?:order\s*\/\s*)?delivery\s+tracker|orders|deliveries)(?:\s*[:\-–—]\s*.+)?$/i))return "deliveries";
  if(headed(/^(?:home\s+inventory|inventory)(?:\s*[:\-–—]\s*.+)?$/i))return "inventory";
  if(headed(/^(?:content\s+calendar|content\s+plan)(?:\s*[:\-–—]\s*.+)?$/i))return "content-calendar";
  if(headed(/^decision\s+log(?:\s*[:\-–—]\s*.+)?$/i))return "decision-log";
  if(headed(/^(?:bookmark\s+library|bookmarks|useful\s+links)(?:\s*[:\-–—]\s*.+)?$/i))return "bookmarks";
  if(headed(/^(?:skincare|skin\s+care)\s+(?:routine|planner)(?:\s*[:\-–—]\s*.+)?$/i))return "skincare";
  if(headed(/^(?:(?:daily|morning|evening|night|weekly)\s+)?routine(?:\s+checklist)?(?:\s*[:\-–—]\s*.+)?$/i))return "routine";
  if(headed(/^(?:tasks?|to[- ]?do|action\s+items?|next\s+actions?)\s*:?[\s]*$/i))return "task-section";
  if(headed(/^(?:notes?|reference|context)\s*:?[\s]*$/i))return "note-section";
  if(headed(/^(?:events?|appointments?|calendar\s+events)\s*:?[\s]*$/i))return "event-section";
  return "";
}

function smartMixedCanStartSection(kind,currentKind="") {
  if(!kind)return false;
  const parentKeepsActions=new Set(["meeting-agenda","meeting-minutes","project"]);
  if(parentKeepsActions.has(currentKind)&&["task-section","note-section","event-section"].includes(kind))return false;
  if(currentKind==="recipe"&&kind==="note-section")return false;
  if(currentKind==="skincare"&&kind==="routine")return false;
  return true;
}

function smartMixedDocumentPlan(text,{forced=false}={}) {
  const raw=String(text||"").replace(/\r/g,"").trim();if(!raw)return null;
  const rawLines=raw.split("\n"),tooLarge=rawLines.length>MIXED_DOCUMENT_MAX_LINES,lines=rawLines.slice(0,MIXED_DOCUMENT_MAX_LINES);
  const preamble=[],parts=[];let current=null;
  const finish=()=>{
    if(!current)return;
    const body=current.lines.slice(1).map(line=>String(line||"").trim()).filter(line=>line&&!/^[\s⸻━─—–-]+$/.test(line));
    if(body.length)parts.push({...current,text:current.lines.join("\n").trim(),bodyLines:body});
    current=null;
  };
  lines.forEach(source=>{
    const line=String(source||"");const candidate=smartMixedHeadingKind(line);
    if(candidate&&smartMixedCanStartSection(candidate,current?.kind||"")){
      finish();current={kind:candidate,heading:smartCleanBullet(line).replace(/^#{1,6}\s*/,"").trim(),lines:[line]};return;
    }
    if(current)current.lines.push(line);else if(line.trim())preamble.push(line.trim());
  });
  finish();
  const distinct=new Set(parts.map(part=>part.kind));
  if(parts.length<2||(!forced&&distinct.size<2))return null;
  const titleLine=preamble.map(line=>smartCleanBullet(line).replace(/^#{1,6}\s*/,"").trim()).find(Boolean)||"";
  return {raw,preamble,parts,title:titleLine.slice(0,80),tooLarge,tooManySections:parts.length>MIXED_DOCUMENT_MAX_SECTIONS};
}

function smartMixedPlanLabel(plan) {
  if(!plan)return "🧩 Mixed document";
  const names=plan.parts.slice(0,3).map(part=>smartMixedKindTitle(part.kind));
  return `🧩 Mixed document · ${plan.parts.length} sections${names.length?` · ${names.join(" + ")}`:""}`;
}

function smartMixedRootSnapshot(){
  return {tasks:new Set(state.tasks.map(item=>item.id)),notes:new Set(state.notes.map(item=>item.id)),lists:new Set(state.lists.map(item=>item.id)),tables:new Set(state.tables.map(item=>item.id)),projects:new Set(state.projects.map(item=>item.id)),events:new Set(state.events.map(item=>item.id))};
}
function smartMixedNewIds(collection,beforeSet){return state[collection].filter(item=>!beforeSet.has(item.id)).map(item=>item.id);}
function smartMixedLinksForKind(before,kind){
  let type="",collection="";
  if(kind==="project"){type="project";collection="projects";}
  else if(["packing","grocery","routine"].includes(kind)){type="list";collection="lists";}
  else if(["meeting-agenda","meeting-minutes","recipe","skincare","note-section"].includes(kind)){type="note";collection="notes";}
  else if(kind==="task-section"){type="task";collection="tasks";}
  else if(kind==="event-section"){type="event";collection="events";}
  else {type="table";collection="tables";}
  return smartMixedNewIds(collection,before[collection]).map(id=>({type,id,tableId:""}));
}
function smartMixedSectionBody(section){return (section?.bodyLines||[]).map(line=>smartCleanBullet(line).trim()).filter(Boolean);}
function smartMixedSectionTitle(section){
  const heading=String(section?.heading||"").replace(/^#{1,6}\s*/,"").trim();
  const tail=heading.match(/^[^:–—-]+\s*[:–—-]\s*(.+)$/)?.[1]?.trim();
  return (tail||smartMixedKindTitle(section?.kind)).slice(0,80);
}
function createSmartMixedFallbackNote(section,space){
  const note=normalizeNote({id:createId(),title:smartMixedSectionTitle(section),type:"note",space,tags:["smart-sort"],content:String(section?.text||"").trim(),checklist:[],resettable:false,pinned:false,createdAt:Date.now(),updatedAt:Date.now()});
  state.notes.push(note);return note;
}
function createSmartMixedGenericSection(section,space,remainingRoots){
  const lines=smartMixedSectionBody(section);if(!lines.length)return "";
  if(section.kind==="note-section"){createSmartMixedFallbackNote(section,space);return "note-section";}
  const limit=Math.max(0,Math.min(lines.length,remainingRoots));
  if(!limit){createSmartMixedFallbackNote(section,space);return "note-section";}
  for(const line of lines.slice(0,limit))plantText(line,space,section.kind==="task-section"?"task":"event");
  if(lines.length>limit){
    const overflow={...section,heading:`${smartMixedKindTitle(section.kind)} · remaining`,text:[`${smartMixedKindTitle(section.kind)} · remaining`,...lines.slice(limit)].join("\n"),bodyLines:lines.slice(limit)};
    createSmartMixedFallbackNote(overflow,space);
  }
  return section.kind;
}
function createSmartMixedSection(section,space,remainingRoots){
  if(["task-section","note-section","event-section"].includes(section.kind))return createSmartMixedGenericSection(section,space,remainingRoots);
  if(section.kind==="skincare"||(section.kind==="routine"&&skincareTextLooksStructured(section.text,{allowSingleDay:true}))){
    const note=createSkincareRoutineNoteFromText(section.text,space,{allowSingleDay:true,open:false,render:false,quiet:true});
    if(note)return "skincare";
  }
  const result=createSmartStructuredCapture(section.text,space,section.kind,{quiet:true,open:false});
  if(result&&!String(result).startsWith("invalid-"))return section.kind;
  createSmartMixedFallbackNote(section,space);return "note-section";
}

function createSmartMixedDocument(text,space=preferredSpace(),options={}) {
  const plan=smartMixedDocumentPlan(text,{forced:Boolean(options.forced)});if(!plan)return "invalid-mixed-document";
  if(plan.tooLarge)return "invalid-mixed-document-large";
  if(plan.tooManySections)return "invalid-mixed-document-sections";
  saveState();
  const links=[];let genericRoots=0;
  for(const section of plan.parts){
    const before=smartMixedRootSnapshot(),remaining=Math.max(0,MIXED_DOCUMENT_MAX_GENERIC_ROOTS-genericRoots),effectiveKind=createSmartMixedSection(section,space,remaining);
    const created=smartMixedLinksForKind(before,effectiveKind||section.kind);
    if(["task-section","event-section"].includes(effectiveKind))genericRoots+=created.length;
    links.push(...created);
  }
  const unique=[];const seen=new Set();
  links.forEach(link=>{const key=`${link.type}|${link.tableId||""}|${link.id}`;if(!seen.has(key)){seen.add(key);unique.push(link);}});
  if(!unique.length)return "invalid-mixed-document";
  const title=plan.title||`Mixed document · ${smartMixedKindTitle(plan.parts[0]?.kind)}`;
  const thread=normalizeThread({id:createId(),title,emoji:"🧩",space,description:`Smart Sort kept ${plan.parts.length} sections from one document connected here.`,links:unique,createdAt:Date.now(),updatedAt:Date.now()});
  state.threads.push(thread);state.activeThreadId=thread.id;saveState();
  if(!options.quiet)showToast(`${plan.parts.length} sections organized and connected 🧩`);
  if(options.open)changePage("threads");
  return MIXED_DOCUMENT_TYPE;
}
'''
app = replace_once(app, '\n/* ================= BRAIN DUMP / INBOX ================= */', '\n' + mixed_code + '\n/* ================= BRAIN DUMP / INBOX ================= */', "mixed code insertion")

# -----------------------------------------------------------------------------
# Capture prediction and routing
# -----------------------------------------------------------------------------
app = replace_once(
    app,
    '  if(skincareTextLooksStructured(raw,{allowSingleDay:false}))return{type:"skincare",label:"🧴 Weekly Skincare Planner"};\n  const structuredKind=smartStructuredCaptureKind(raw);if(structuredKind)return{type:structuredKind,label:smartStructuredCaptureLabel(structuredKind)};',
    '  if(skincareTextLooksStructured(raw,{allowSingleDay:false}))return{type:"skincare",label:"🧴 Weekly Skincare Planner"};\n  const mixedPlan=smartMixedDocumentPlan(raw);if(mixedPlan)return{type:MIXED_DOCUMENT_TYPE,label:smartMixedPlanLabel(mixedPlan)};\n  const structuredKind=smartStructuredCaptureKind(raw);if(structuredKind)return{type:structuredKind,label:smartStructuredCaptureLabel(structuredKind)};',
    "predict mixed",
)

app = replace_once(
    app,
    '  {value:"auto",label:"✨ Smart sort"},\n  {value:"task",label:"✅ Task"},',
    '  {value:"auto",label:"✨ Smart sort"},\n  {value:"mixed-document",label:"🧩 Mixed document"},\n  {value:"task",label:"✅ Task"},',
    "mixed destination",
)

old_prediction = 'function updateCapturePrediction(){const input=document.getElementById("quickCaptureInput");const p=document.getElementById("capturePrediction");if(!input||!p)return;const text=input.value;if(skincareTextLooksStructured(text,{allowSingleDay:false})){p.textContent="🧴 Weekly Skincare Planner · formatted routine detected";return;}const structuredKind=smartStructuredCaptureKind(text);if(structuredKind){p.textContent=smartStructuredCaptureLabel(structuredKind);return;}const lines=parseLines(text);p.textContent=lines.length>1?`🧠 ${lines.length} items · Hana can organize these`:predictCapture(text).label;}'
new_prediction = 'function updateCapturePrediction(){const input=document.getElementById("quickCaptureInput");const p=document.getElementById("capturePrediction");if(!input||!p)return;const text=input.value;if(skincareTextLooksStructured(text,{allowSingleDay:false})){p.textContent="🧴 Weekly Skincare Planner · formatted routine detected";return;}const mixedPlan=smartMixedDocumentPlan(text);if(mixedPlan){p.textContent=smartMixedPlanLabel(mixedPlan);return;}const structuredKind=smartStructuredCaptureKind(text);if(structuredKind){p.textContent=smartStructuredCaptureLabel(structuredKind);return;}const lines=parseLines(text);p.textContent=lines.length>1?`🧠 ${lines.length} items · Hana can organize these`:predictCapture(text).label;}'
app = replace_once(app, old_prediction, new_prediction, "quick capture mixed prediction")

app = replace_once(
    app,
    '  const pred=forced?{type:forced,label:brainDumpDestinationLabel(forced,text)}:suggested,meta=parseCaptureMeta(text,space);\n  if(SMART_STRUCTURED_CAPTURE_TYPES.has(pred.type)){const result=createSmartStructuredCapture(text,space,pred.type,{quiet:true,open:false});return result||`invalid-${pred.type}`;}',
    '  const pred=forced?{type:forced,label:brainDumpDestinationLabel(forced,text)}:suggested,meta=parseCaptureMeta(text,space);\n  if(pred.type===MIXED_DOCUMENT_TYPE)return createSmartMixedDocument(text,space,{forced:Boolean(forced),quiet:true,open:false});\n  if(SMART_STRUCTURED_CAPTURE_TYPES.has(pred.type)){const result=createSmartStructuredCapture(text,space,pred.type,{quiet:true,open:false});return result||`invalid-${pred.type}`;}',
    "plant mixed route",
)

quick_functions = r'''function saveQuickCapture(){
  const input=document.getElementById("quickCaptureInput"),text=input.value.trim(),space=document.getElementById("captureSpace").value;if(!text)return showToast("Write something first 🌸");
  if(skincareTextLooksStructured(text,{allowSingleDay:false})){input.value="";closeModal("quickCaptureModal");createSkincareRoutineNoteFromText(text,space,{open:true});return;}
  const mixedPlan=smartMixedDocumentPlan(text);if(mixedPlan){const result=createSmartMixedDocument(text,space,{open:true,quiet:false});if(String(result).startsWith("invalid-mixed-document"))return showToast(mixedDocumentErrorMessage(result));input.value="";closeModal("quickCaptureModal");return;}
  const structuredKind=smartStructuredCaptureKind(text);if(structuredKind){input.value="";closeModal("quickCaptureModal");createSmartStructuredCapture(text,space,structuredKind,{open:true,quiet:false});return;}
  const lines=parseLines(text);lines.forEach(line=>plantText(line,space));input.value="";closeModal("quickCaptureModal");showToast(`${lines.length} item${lines.length===1?"":"s"} planted 🌱`);render();
}
function sendQuickCaptureToInbox(){
  const input=document.getElementById("quickCaptureInput"),text=input.value.trim(),space=document.getElementById("captureSpace").value;if(!text)return showToast("Write something first 🌸");
  if(skincareTextLooksStructured(text,{allowSingleDay:false})){state.inbox.push({id:createId(),text,space,prediction:"skincare",destination:"skincare",createdAt:Date.now()});input.value="";closeModal("quickCaptureModal");showToast("Weekly skincare routine kept together in Inbox 🧴");render();return;}
  const mixedPlan=smartMixedDocumentPlan(text);if(mixedPlan){state.inbox.push({id:createId(),text,space,prediction:MIXED_DOCUMENT_TYPE,destination:MIXED_DOCUMENT_TYPE,createdAt:Date.now()});input.value="";closeModal("quickCaptureModal");showToast(`${mixedPlan.parts.length} connected sections kept together in Inbox 🧩`);render();return;}
  const structuredKind=smartStructuredCaptureKind(text);if(structuredKind){state.inbox.push({id:createId(),text,space,prediction:structuredKind,destination:structuredKind,createdAt:Date.now()});input.value="";closeModal("quickCaptureModal");showToast(`${smartStructuredCaptureLabel(structuredKind).split(" · ")[0]} kept together in Inbox`);render();return;}
  const lines=parseLines(text);lines.forEach(line=>state.inbox.push({id:createId(),text:line,space,prediction:predictCapture(line).type,createdAt:Date.now()}));input.value="";closeModal("quickCaptureModal");showToast(`${lines.length} item${lines.length===1?"":"s"} sent to Inbox 🧠`);render();
}

function mixedDocumentErrorMessage(result=""){
  if(result==="invalid-mixed-document-large")return `For smooth performance, keep a mixed document under ${MIXED_DOCUMENT_MAX_LINES} lines.`;
  if(result==="invalid-mixed-document-sections")return `For smooth performance, keep a mixed document to ${MIXED_DOCUMENT_MAX_SECTIONS} top-level sections or fewer.`;
  return "Hana needs at least two clear top-level sections before it can split a mixed document.";
}

function smartSortPreview(text){'''
app = regex_once(app, r'function saveQuickCapture\(\)\{.*?\n\n\nfunction smartSortPreview\(text\)\{', quick_functions, "quick capture functions", flags=re.S)

old_preview = '''  const raw=String(text||"").trim();if(!raw)return{icon:"✨",title:"Paste anything",detail:"Hana will keep recognized structures together or sort ordinary lines individually."};
  if(skincareTextLooksStructured(raw,{allowSingleDay:false}))return{icon:"🧴",title:"Weekly Skincare Planner",detail:"This block will stay together."};
  const kind=smartStructuredCaptureKind(raw);if(kind)return{icon:smartStructuredCaptureLabel(kind).split(" ")[0],title:smartStructuredCaptureLabel(kind).replace(/^\\S+\\s*/,"").split(" · ")[0],detail:"Recognized as one structured block."};'''
new_preview = '''  const raw=String(text||"").trim();if(!raw)return{icon:"✨",title:"Paste anything",detail:"Hana will keep recognized structures together or sort ordinary lines individually."};
  if(skincareTextLooksStructured(raw,{allowSingleDay:false}))return{icon:"🧴",title:"Weekly Skincare Planner",detail:"This block will stay together."};
  const mixedPlan=smartMixedDocumentPlan(raw);if(mixedPlan)return{icon:"🧩",title:`Mixed document · ${mixedPlan.parts.length} sections`,detail:mixedPlan.tooLarge?`Too large for one smooth mixed import · limit ${MIXED_DOCUMENT_MAX_LINES} lines`:mixedPlan.tooManySections?`Too many top-level sections · limit ${MIXED_DOCUMENT_MAX_SECTIONS}`:mixedPlan.parts.slice(0,4).map(part=>smartMixedKindTitle(part.kind)).join(" · ")};
  const kind=smartStructuredCaptureKind(raw);if(kind)return{icon:smartStructuredCaptureLabel(kind).split(" ")[0],title:smartStructuredCaptureLabel(kind).replace(/^\\S+\\s*/,"").split(" · ")[0],detail:"Recognized as one structured block."};'''
app = replace_once(app, old_preview, new_preview, "mixed smart preview")

# Brain Dump direct organize: skincare first, mixed second, then single structure.
new_add_brain = r'''function addBrainDump(){
  const input=document.getElementById("brainDumpText"),text=input?.value.trim()||"",space=document.getElementById("brainDumpSpace")?.value||preferredSpace(),destination=document.getElementById("brainDumpDestination")?.value||"auto";if(!text)return showToast("Add a few thoughts first 🌸");
  const forcedSkincare=destination==="skincare",smartSkincare=destination==="auto"&&skincareTextLooksStructured(text,{allowSingleDay:false});
  if(forcedSkincare||smartSkincare){const parsed=parseSkincareRoutineText(text,{allowSingleDay:forcedSkincare});if(!parsed)return showToast("I couldn't find a skincare day + AM/PM + Product type: Product pattern yet.");input.value="";createSkincareRoutineNoteFromText(text,space,{allowSingleDay:forcedSkincare,open:true});return;}
  const forcedMixed=destination===MIXED_DOCUMENT_TYPE,mixedPlan=forcedMixed?smartMixedDocumentPlan(text,{forced:true}):(destination==="auto"?smartMixedDocumentPlan(text):null);
  if(forcedMixed||mixedPlan){if(!mixedPlan)return showToast(mixedDocumentErrorMessage("invalid-mixed-document"));const result=createSmartMixedDocument(text,space,{forced:forcedMixed,open:true,quiet:false});if(String(result).startsWith("invalid-mixed-document"))return showToast(mixedDocumentErrorMessage(result));input.value="";return;}
  const structuredKind=smartStructuredCaptureKind(text,destination);if(structuredKind){input.value="";const result=createSmartStructuredCapture(text,space,structuredKind,{open:true,quiet:false});if(String(result||"").startsWith("invalid-"))showToast("Hana needs a little more structure before creating that format.");return;}
  parseLines(text).forEach(line=>state.inbox.push({id:createId(),text:line,space,prediction:predictCapture(line).type,destination:BRAIN_DUMP_DESTINATIONS.some(item=>item.value===destination)?destination:"auto",createdAt:Date.now()}));showToast("Brain dump sorted into the Inbox 🧠");render();
}'''
app = regex_once(app, r'function addBrainDump\(\)\{.*?\nfunction plantInboxItem', new_add_brain + '\nfunction plantInboxItem', "Brain Dump mixed route", flags=re.S)

app = replace_once(
    app,
    'Smart Sort recognizes skincare, packing, groceries, meetings, recipes, itineraries, workouts, study plans, medication schedules, meal plans, habits, media lists, expenses, trackers, projects and more. If nothing matches, Hana safely falls back to line-by-line sorting.',
    'Smart Sort can also understand mixed documents with several clearly labeled sections, then keep the results connected in a Memory Thread. Skincare, packing, groceries, meetings, recipes, itineraries, workouts, study plans, medication schedules, meal plans, habits, media lists, expenses, trackers, projects and more are recognized; otherwise Hana safely falls back to line-by-line sorting.',
    "Brain Dump help",
)

# -----------------------------------------------------------------------------
# Memory Threads: support root lists, trackers, projects and events as links.
# Existing link types remain fully compatible.
# -----------------------------------------------------------------------------
old_threadable = '''function getThreadableItems() {
  const items=[];
  state.tasks.forEach(item=>items.push({type:"task",id:item.id,title:`✅ ${item.title}`,meta:modeLabel(item.space)}));
  state.notes.forEach(item=>items.push({type:"note",id:item.id,title:`📝 ${item.title}`,meta:modeLabel(item.space)}));
  state.reminders.forEach(item=>items.push({type:"reminder",id:item.id,title:`🔔 ${item.title}`,meta:modeLabel(item.space)}));
  state.futureNotes.forEach(item=>items.push({type:"future",id:item.id,title:`💌 ${item.title}`,meta:formatDate(item.date)}));
  state.tables.forEach(table=>table.rows.forEach(row=>items.push({type:"row",id:row.id,tableId:table.id,title:`📒 ${rowTitle(table,row)}`,meta:table.name})));
  return items;
}'''
new_threadable = '''function getThreadableItems() {
  const items=[];
  state.tasks.forEach(item=>items.push({type:"task",id:item.id,title:`✅ ${item.title}`,meta:modeLabel(item.space)}));
  state.notes.forEach(item=>items.push({type:"note",id:item.id,title:`📝 ${item.title}`,meta:modeLabel(item.space)}));
  state.lists.forEach(item=>items.push({type:"list",id:item.id,title:`${item.icon||"☑️"} ${item.name}`,meta:modeLabel(item.space)}));
  state.tables.forEach(item=>items.push({type:"table",id:item.id,title:`📒 ${item.name}`,meta:modeLabel(item.space)}));
  state.projects.forEach(item=>items.push({type:"project",id:item.id,title:`${item.emoji||"🌷"} ${item.name}`,meta:modeLabel(item.space)}));
  state.events.forEach(item=>items.push({type:"event",id:item.id,title:`📅 ${item.title}`,meta:item.date?formatDate(item.date):modeLabel(item.space)}));
  state.reminders.forEach(item=>items.push({type:"reminder",id:item.id,title:`🔔 ${item.title}`,meta:modeLabel(item.space)}));
  state.futureNotes.forEach(item=>items.push({type:"future",id:item.id,title:`💌 ${item.title}`,meta:formatDate(item.date)}));
  state.tables.forEach(table=>table.rows.forEach(row=>items.push({type:"row",id:row.id,tableId:table.id,title:`📒 ${rowTitle(table,row)}`,meta:table.name})));
  return items;
}'''
app = replace_once(app, old_threadable, new_threadable, "threadable roots")

old_resolve = '''function resolveThreadItem(link) {
  if(link.type==="task"){const x=state.tasks.find(i=>i.id===link.id);return x?{title:x.title,meta:modeLabel(x.space),icon:"✅"}:null;}
  if(link.type==="note"){const x=state.notes.find(i=>i.id===link.id);return x?{title:x.title,meta:modeLabel(x.space),icon:"📝"}:null;}
  if(link.type==="reminder"){const x=state.reminders.find(i=>i.id===link.id);return x?{title:x.title,meta:x.date?formatDate(x.date):"Reminder",icon:"🔔"}:null;}
  if(link.type==="future"){const x=state.futureNotes.find(i=>i.id===link.id);return x?{title:x.title,meta:`Returns ${formatDate(x.date)}`,icon:"💌"}:null;}
  if(link.type==="row"){const t=state.tables.find(i=>i.id===link.tableId),r=t?.rows.find(i=>i.id===link.id);return t&&r?{title:rowTitle(t,r),meta:t.name,icon:"📒"}:null;}
  return null;
}'''
new_resolve = '''function resolveThreadItem(link) {
  if(link.type==="task"){const x=state.tasks.find(i=>i.id===link.id);return x?{title:x.title,meta:modeLabel(x.space),icon:"✅"}:null;}
  if(link.type==="note"){const x=state.notes.find(i=>i.id===link.id);return x?{title:x.title,meta:modeLabel(x.space),icon:"📝"}:null;}
  if(link.type==="list"){const x=state.lists.find(i=>i.id===link.id);return x?{title:x.name,meta:`${x.items.length} item${x.items.length===1?"":"s"} · ${modeLabel(x.space)}`,icon:x.icon||"☑️"}:null;}
  if(link.type==="table"){const x=state.tables.find(i=>i.id===link.id);return x?{title:x.name,meta:`${x.rows.length} row${x.rows.length===1?"":"s"} · ${modeLabel(x.space)}`,icon:"📒"}:null;}
  if(link.type==="project"){const x=state.projects.find(i=>i.id===link.id);return x?{title:x.name,meta:modeLabel(x.space),icon:x.emoji||"🌷"}:null;}
  if(link.type==="event"){const x=state.events.find(i=>i.id===link.id);return x?{title:x.title,meta:x.date?`${formatDate(x.date)}${x.startTime?` · ${formatTime(x.startTime)}`:""}`:modeLabel(x.space),icon:"📅"}:null;}
  if(link.type==="reminder"){const x=state.reminders.find(i=>i.id===link.id);return x?{title:x.title,meta:x.date?formatDate(x.date):"Reminder",icon:"🔔"}:null;}
  if(link.type==="future"){const x=state.futureNotes.find(i=>i.id===link.id);return x?{title:x.title,meta:`Returns ${formatDate(x.date)}`,icon:"💌"}:null;}
  if(link.type==="row"){const t=state.tables.find(i=>i.id===link.tableId),r=t?.rows.find(i=>i.id===link.id);return t&&r?{title:rowTitle(t,r),meta:t.name,icon:"📒"}:null;}
  return null;
}'''
app = replace_once(app, old_resolve, new_resolve, "thread resolve roots")

old_open_thread = 'function openThreadLinkedItem(type,id,tableId=""){if(type==="task")return openTaskModal(id);if(type==="note")return openNoteModal(id);if(type==="reminder")return openReminderModal(id);if(type==="future")return openFutureNoteModal(id);if(type==="row"){state.activeTableId=tableId;changePage("tables");return setTimeout(()=>openTableRowModal(tableId,id),50);}}'
new_open_thread = 'function openThreadLinkedItem(type,id,tableId=""){if(type==="task")return openTaskModal(id);if(type==="note")return openNoteModal(id);if(type==="list"){state.activeListId=id;return changePage("lists");}if(type==="table"){state.activeTableId=id;return changePage("tables");}if(type==="project"){state.activeProjectId=id;return changePage("projects");}if(type==="event"){const item=state.events.find(event=>event.id===id);if(item){state.calendarCursor=item.date||todayISO();state.calendarView="day";}changePage("calendar");return setTimeout(()=>openEventModal(id),50);}if(type==="reminder")return openReminderModal(id);if(type==="future")return openFutureNoteModal(id);if(type==="row"){state.activeTableId=tableId;changePage("tables");return setTimeout(()=>openTableRowModal(tableId,id),50);}}'
app = replace_once(app, old_open_thread, new_open_thread, "thread open roots")
app = replace_once(app, 'Connect tasks, notes, reminders, tracker rows and Future Me notes so context does not disappear between screens.', 'Connect tasks, notes, lists, trackers, projects, events, reminders and Future Me notes so context does not disappear between screens.', "thread page description")

# -----------------------------------------------------------------------------
# Cache/version bump
# -----------------------------------------------------------------------------
index = index.replace('content="2.0.37"', 'content="2.0.38"').replace('style.css?v=2.0.37', 'style.css?v=2.0.38').replace('app.js?v=2.0.37', 'app.js?v=2.0.38')
sw = replace_once(sw, 'HANA 🌸 Service Worker v70 · startup stability hotfix', 'HANA 🌸 Service Worker v71 · Mixed Documents', "sw header")
sw = replace_once(sw, 'const CACHE_NAME = "hana-shell-v70";', 'const CACHE_NAME = "hana-shell-v71";', "sw cache")
sw = sw.replace('style.css?v=2.0.37', 'style.css?v=2.0.38').replace('app.js?v=2.0.37', 'app.js?v=2.0.38')

app_path.write_text(app, encoding="utf-8")
index_path.write_text(index, encoding="utf-8")
sw_path.write_text(sw, encoding="utf-8")
