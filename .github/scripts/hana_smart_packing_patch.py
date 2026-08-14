from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"missing marker: {label}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label, flags=0):
    new, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"expected one {label}, got {count}")
    return new

app_path = Path('app.js')
index_path = Path('index.html')
style_path = Path('style.css')
sw_path = Path('service-worker.js')
app = app_path.read_text()
index = index_path.read_text()
style = style_path.read_text()
sw = sw_path.read_text()

# Version / release identity.
app = app.replace('HANA 🌸 Version 2 · internal build 2.0.39\n   Daily 8 AM cloud backup + provider-neutral account safety', 'HANA 🌸 Version 2 · internal build 2.0.40\n   Smart Packing categorization + reusable travel prep', 1)
app = replace_once(app, 'const HANA_APP_VERSION = "2.0.39";', 'const HANA_APP_VERSION = "2.0.40";', 'app version')
release_notes = '''const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 15, 2026",
  title: "Packing lists that organize themselves 🧳",
  intro: "Brain Dump and Smart Template now work together for reusable travel packing. Paste a messy packing list and Hana can recognize it, group the items into useful categories, remove obvious duplicates, and keep separate reference notes connected.",
  items: [
    { icon:"🧠", title:"Paste first, organize second", text:"A heading such as “Cha packing 2.0” is enough for Smart Sort to recognize a packing block when it is followed by a real list of items." },
    { icon:"🧳", title:"Automatic packing categories", text:"Clothes, underwear and sleep, footwear, accessories, toiletries, hair, beauty and skincare, feminine care, medicine and supplements, and tech/travel gear are grouped automatically." },
    { icon:"📝", title:"Separate notes stay separate", text:"Write “(separate note)” after an item such as Skincare. Hana links the packing list to the closest existing note, or creates a blank reference note only when no matching note exists." },
    { icon:"✨", title:"Smart Template meets Brain Dump", text:"Smart Template now includes a route for messy text and a direct packing-list option, while keeping the actual Smart Sort engine in Brain Dump so there is one reliable parser to maintain." }
  ]
};'''
app = regex_once(app, r'const HANA_RELEASE_NOTES = \{.*?\n\};\n\nlet hanaAccountState', release_notes + '\n\nlet hanaAccountState', 'release notes', re.S)

# Packing detection: recognize named reusable lists such as "Cha packing 2.0" without making any random mention of packing a list.
app = replace_once(
    app,
    'if(/\\bpacking\\s+list\\b|\\bwhat\\s+to\\s+pack\\b|^packing\\s*:/i.test(raw))return "packing";',
    'if(/\\bpacking\\s+list\\b|\\bwhat\\s+to\\s+pack\\b|^packing\\s*:/i.test(raw)||(lines.length>=4&&/\\bpacking\\b/i.test(first)))return "packing";',
    'packing detection'
)

packing_helpers = r'''
const SMART_PACKING_CATEGORY_ORDER = [
  "👗 Clothes",
  "🩲 Underwear & sleep",
  "👟 Footwear",
  "👜 Accessories",
  "🧴 Toiletries",
  "💇 Hair",
  "💄 Beauty & skincare",
  "🌸 Feminine care",
  "💊 Medicine & supplements",
  "🔌 Tech & travel gear",
  "🧳 Other"
];

function smartPackingCanonicalTitle(title){
  const raw=String(title||"").trim();
  if(/^deo$/i.test(raw))return "Deodorant";
  if(/^airpods?$/i.test(raw))return "AirPods";
  if(/^power\s*bank$/i.test(raw))return "Power Bank";
  if(/^hankerchief$/i.test(raw))return "Handkerchief";
  return raw;
}
function smartPackingDedupeKey(title){
  const value=smartPackingCanonicalTitle(title).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  if(/^(deo|deodorant)$/.test(value))return "deodorant";
  return value;
}
function smartPackingCategory(title){
  const value=String(title||"").toLowerCase().replace(/[’']/g,"");
  if(/\b(top|tops|bottom|bottoms|dress|dresses|jacket|jackets|shirt|shirts|blouse|blouses|pants|jeans|shorts|skirt|skirts|coat|coats|cardigan|cardigans)\b/.test(value)&&!/(safety shorts)/.test(value))return "👗 Clothes";
  if(/\b(underwear|bra|bras|safety shorts|pajamas?|pyjamas?|sleepwear|socks?)\b/.test(value))return "🩲 Underwear & sleep";
  if(/\b(shoes?|slippers?|sandals?|sneakers?|boots?|heels?)\b/.test(value))return "👟 Footwear";
  if(/\b(accessor(?:y|ies)|glasses|sunglasses|handkerchief|hankerchief|belt|belts|hat|hats|cap|caps|jewelry|jewellery|watch|watches)\b/.test(value))return "👜 Accessories";
  if(/\b(panty liner|pantyliner|napkin|sanitary|pad|pads|tampon|tampons|fem wash|feminine wash)\b/.test(value))return "🌸 Feminine care";
  if(/\b(medicine|medicines|medication|vitamin|vitamins|supplement|supplements|dear face|rose vitamins)\b/.test(value))return "💊 Medicine & supplements";
  if(/\b(airpods?|adapter|charger|power ?bank|air pump|cable|cables|earphones?|headphones?|camera|battery|batteries|plug|converter)\b/.test(value))return "🔌 Tech & travel gear";
  if(/\b(shampoo|conditioner|hair straightener|hair oil|matomake|hair brush|hairbrush|hair clip|heat protectant|comb|hair dryer|hairdryer)\b/.test(value))return "💇 Hair";
  if(/\b(makeup|lip balm|perfume|sunscreen|sunblock|pimple patch|skincare|skin care|cosmetic|cosmetics)\b/.test(value))return "💄 Beauty & skincare";
  if(/\b(deo|deodorant|listerine|mouthwash|toothbrush|toothpaste|toothpick|soap|cotton|wet wipes|wipes|tissue|tissues|body wash|lotion)\b/.test(value))return "🧴 Toiletries";
  return "🧳 Other";
}
function smartPackingSeparateNoteRequests(text){
  const seen=new Set(),requests=[];
  String(text||"").replace(/\r/g,"").split("\n").forEach(source=>{
    const plain=smartCleanBullet(source).replace(/^#{1,6}\s*/,"").trim();
    const match=plain.match(/^(.*?)(?:\s*\(\s*separate\s+note\s*\))\s*$/i);if(!match)return;
    const title=smartPackingCanonicalTitle(match[1].trim());if(!title)return;
    const key=title.toLowerCase();if(seen.has(key))return;seen.add(key);requests.push(title);
  });
  return requests;
}
function smartPackingRelatedNote(title){
  const key=String(title||"").trim().toLowerCase();
  const candidates=state.notes.filter(note=>{
    const noteTitle=String(note.title||"").toLowerCase(),tags=(note.tags||[]).map(tag=>String(tag).toLowerCase());
    if(key.includes("skincare")||key.includes("skin care"))return note.structuredType==="skincare-weekly"||tags.includes("skincare")||/skincare|skin care/.test(noteTitle);
    return noteTitle.includes(key)||tags.includes(key);
  }).sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||Number(b.updatedAt||0)-Number(a.updatedAt||0));
  return candidates[0]||null;
}
function smartPackingConnectSeparateNotes(list,requests,space){
  if(!list||!requests.length)return [];
  const links=[{type:"list",id:list.id}],noteIds=[];
  requests.forEach(title=>{
    let note=smartPackingRelatedNote(title);
    if(!note){note=normalizeNote({id:createId(),title,type:"note",space,tags:["travel","packing","reference"],content:"",checklist:[],resettable:false,pinned:false,createdAt:Date.now(),updatedAt:Date.now()});state.notes.push(note);}
    if(!noteIds.includes(note.id)){noteIds.push(note.id);links.push({type:"note",id:note.id});}
  });
  if(links.length>1){
    const thread=normalizeThread({id:createId(),title:`${list.name} · travel prep`,emoji:"🧳",description:"Packing list and separate reference notes kept together by Smart Sort.",space,links,createdAt:Date.now(),updatedAt:Date.now()});
    state.threads.push(thread);state.activeThreadId=thread.id;
  }
  return noteIds;
}
'''
app = replace_once(app, 'function smartListItemsFromText(text, kind) {', packing_helpers + '\nfunction smartListItemsFromText(text, kind) {', 'packing helpers')

# Replace list parser so packing titles, categories, duplicates and separate-note markers are handled together.
new_list_parser = r'''function smartListItemsFromText(text, kind) {
  const raw=String(text||"").replace(/\r/g,"").trim();
  const lines=raw.split("\n").map(line=>line.trim()).filter(Boolean).filter(line=>!/^[-–—━─⸻\s]+$/.test(line));
  const items=[],packingKeys=new Set();
  lines.forEach((source,index)=>{
    const plain=smartCleanBullet(source).replace(/^#{1,6}\s*/,"").trim();
    if(!plain)return;
    if(kind==="packing"&&/\b(trip\s+starts?|departure|depart(?:ure|ing)?|travel\s+starts?|flight\s+(?:is|at|leaves?))\b/i.test(plain))return;
    if(kind==="packing"&&/\(\s*separate\s+note\s*\)\s*$/i.test(plain))return;
    if(kind==="packing"&&index===0&&lines.length>=4&&/\bpacking\b/i.test(plain)&&!/[|,;]/.test(plain))return;
    if(kind==="packing"&&/^(?:packing\s+list|packing|what\s+to\s+pack)\s*(?:[:\-–—]\s*)?/i.test(plain)){
      const tail=plain.replace(/^(?:packing\s+list|packing|what\s+to\s+pack)\s*(?:[:\-–—]\s*)?/i,"").trim();
      if(tail&&index===0&&tail.includes(","))tail.split(",").map(value=>value.trim()).filter(Boolean).forEach(value=>{
        const title=smartPackingCanonicalTitle(value),key=smartPackingDedupeKey(title);if(!title||packingKeys.has(key))return;packingKeys.add(key);items.push({title,quantity:"",detail:smartPackingCategory(title)});
      });
      return;
    }
    if(kind==="grocery"&&/^(?:grocery\s+list|groceries?|shopping\s+list)\s*(?:[:\-–—]\s*)?/i.test(plain)){
      const tail=plain.replace(/^(?:grocery\s+list|groceries?|shopping\s+list)\s*(?:[:\-–—]\s*)?/i,"").trim();
      if(tail)tail.split(",").map(value=>value.trim()).filter(Boolean).forEach(value=>items.push({title:value,quantity:"",detail:""}));
      return;
    }
    const parts=plain.split("|").map(part=>part.trim());
    let title=parts[0]||"";if(!title)return;
    if(kind==="packing"){
      title=smartPackingCanonicalTitle(title);const key=smartPackingDedupeKey(title);if(!key||packingKeys.has(key))return;packingKeys.add(key);
      items.push({title,quantity:parts[1]||"",detail:smartPackingCategory(title)});return;
    }
    items.push({title,quantity:parts[1]||"",detail:parts.slice(2).join(" | ")||""});
  });
  return items;
}'''
app = regex_once(app, r'function smartListItemsFromText\(text, kind\) \{.*?\n\}\n\nfunction createSmartListFromText', new_list_parser + '\n\nfunction createSmartListFromText', 'smart list parser', re.S)

new_create_list = r'''function createSmartListFromText(text,space,kind,options={}) {
  const items=smartListItemsFromText(text,kind);
  const first=String(text||"").split(/\r?\n/).map(line=>line.trim()).find(Boolean)||"";
  if(!items.length)return `invalid-${kind}`;
  let name=kind==="packing"?"Packing List":"Grocery List";
  if(kind==="packing"){
    const tail=smartHeadingTail(first,/^(?:packing\s+list|packing|what\s+to\s+pack)\s*(?:[:\-–—]\s*(.+))?$/i);
    if(tail&&!tail.includes(","))name=`${tail} Packing List`;
    else if(/\bpacking\b/i.test(first)&&first.length<=72&&!/[|,;]/.test(first))name=smartCleanBullet(first).replace(/^#{1,6}\s*/,"").trim();
  }else{
    const tail=smartHeadingTail(first,/^(?:grocery\s+list|groceries?|shopping\s+list)\s*(?:[:\-–—]\s*(.+))?$/i);
    if(tail&&!tail.includes(","))name=`${tail} Grocery List`;
  }
  const hasQty=items.some(item=>item.quantity),hasDetail=items.some(item=>item.detail);
  const list=normalizeList({id:createId(),name,icon:kind==="packing"?"🧳":"🛒",space,templateType:kind,tripStartAt:kind==="packing"?smartTripStartFromText(text):"",quantityLabel:hasQty?"Quantity":"",detailLabel:kind==="packing"&&hasDetail?"Category":(hasDetail?"Detail":""),columnMode:false,columnCount:3,columnLabels:{partner:"Column 1",me:"Column 2",both:"Column 3",column4:"Column 4",column5:"Column 5"},items:items.map(item=>({id:createId(),...item,lane:"both",completed:false,createdAt:Date.now(),updatedAt:Date.now()})),createdAt:Date.now(),updatedAt:Date.now()});
  state.lists.push(list);state.activeListId=list.id;
  if(kind==="packing")smartPackingConnectSeparateNotes(list,smartPackingSeparateNoteRequests(text),space);
  saveState();
  if(!options.quiet)showToast(`${list.name} created · ${items.length} item${items.length===1?"":"s"} ${list.icon}`);
  if(options.open)changePage("lists");
  return kind;
}'''
app = regex_once(app, r'function createSmartListFromText\(text,space,kind,options=\{\}\) \{.*?\n\}\n\nfunction smartMeetingTitle', new_create_list + '\n\nfunction smartMeetingTitle', 'smart list creator', re.S)

# Categorized packing display. The existing Detail field remains the editable category field, preserving compatibility.
app = replace_once(app, 'function listItemHTML(list, item, { compact = false, showLane = false } = {}) {', 'function listItemHTML(list, item, { compact = false, showLane = false, hideDetail = false } = {}) {', 'list item options')
app = replace_once(app, 'item.detail ? `${escapeHTML(list.detailLabel)}: ${escapeHTML(item.detail)}` : ""', 'item.detail && !hideDetail ? `${escapeHTML(list.detailLabel)}: ${escapeHTML(item.detail)}` : ""', 'hide category meta')

packing_render_helper = r'''
function categorizedPackingList(list){
  return isPackingList(list)&&/^category$/i.test(String(list.detailLabel||""))&&new Set(list.items.map(item=>String(item.detail||"").trim()).filter(Boolean)).size>=2;
}
function renderPackingCategoryGroups(list,items){
  const groups=new Map();
  items.forEach(item=>{const category=String(item.detail||"🧳 Other").trim()||"🧳 Other";if(!groups.has(category))groups.set(category,[]);groups.get(category).push(item);});
  const ordered=[...groups.keys()].sort((a,b)=>{
    const ai=SMART_PACKING_CATEGORY_ORDER.indexOf(a),bi=SMART_PACKING_CATEGORY_ORDER.indexOf(b);
    if(ai<0&&bi<0)return a.localeCompare(b);if(ai<0)return 1;if(bi<0)return-1;return ai-bi;
  });
  return `<div class="packing-category-stack">${ordered.map(category=>{const categoryItems=groups.get(category)||[],done=categoryItems.filter(item=>item.completed).length;return `<section class="packing-category-group"><div class="packing-category-heading"><strong>${escapeHTML(category)}</strong><small>${done}/${categoryItems.length}</small></div><div class="packing-category-items">${categoryItems.map(item=>listItemHTML(list,item,{hideDetail:true})).join("")}</div></section>`;}).join("")}</div>`;
}
'''
app = replace_once(app, 'function renderSingleList(list) {', packing_render_helper + '\nfunction renderSingleList(list) {', 'packing grouped render helper')
new_render_single = r'''function renderSingleList(list) {
  const completed = list.items.filter(item => item.completed).length;
  const total = list.items.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const pendingItems = list.items.filter(item => !item.completed);
  const completedItems = list.items.filter(item => item.completed);
  const packingGrouped=categorizedPackingList(list);
  return `
    <section class="checklist-shell">
      <div class="checklist-heading">
        <div>
          <span class="badge ${modeBadge(list.space)}">${modeLabel(list.space)}</span>
          <h2>${escapeHTML(list.icon)} ${escapeHTML(list.name)} ${sharedBadgeHTML(list,true)}</h2>
          <p>${completed}/${total} checked${list.columnMode ? ` · ${listVisibleLanes(list).map(lane => escapeHTML(lane.label)).join(" / ")}` : packingGrouped?" · grouped by category":""}</p>
          ${packingListTimingSummaryHTML(list)}
        </div>
        <button class="mini-icon-button list-edit-button" data-edit-list="${list.id}" title="Edit list">✎</button>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
      <div class="checklist-toolbar">
        <button class="primary-button" data-add-list-item="${list.id}">+ Add item</button>
        ${completed ? `<button class="secondary-button" data-clear-checked="${list.id}">Remove checked</button>` : ""}
        ${completed ? `<button class="text-button" data-reset-list="${list.id}">Uncheck all</button>` : ""}
      </div>
      <details class="quick-list-add-card quick-list-add-collapsible">
        <summary class="quick-list-add-summary">
          <span><strong>⚡ Quick add</strong><small>Add several items at once</small></span>
          <b class="quick-list-chevron">⌄</b>
        </summary>
        <div class="quick-list-add-body">
          <div class="quick-list-add-head"><small>One line per item. Optional: item | quantity | detail</small></div>
          ${list.columnMode ? `<div class="quick-list-lane-picker"><label for="quickListLane_${list.id}">Add these to</label><select id="quickListLane_${list.id}">${listVisibleLanes(list).map((lane,index,lanes)=>`<option value="${lane.id}" ${index===lanes.length-1?"selected":""}>${lane.icon} ${escapeHTML(lane.label)}</option>`).join("")}</select></div>` : ""}
          <textarea id="quickListInput_${list.id}" class="quick-list-textarea" placeholder="Milk\nEggs | 1 tray\nShampoo | 2 | refill pouches"></textarea>
          <div class="quick-list-add-actions"><button class="secondary-button" data-quick-add-list="${list.id}">Add lines</button></div>
        </div>
      </details>
      <div class="standalone-checklist ${list.columnMode ? "standalone-checklist-columns" : ""} ${packingGrouped?"packing-grouped-checklist":""}">
        ${total ? `${packingGrouped?renderPackingCategoryGroups(list,list.items):`${list.columnMode ? renderListColumnBoard(list,pendingItems) : pendingItems.map(item=>listItemHTML(list,item)).join("")}${completedItems.length ? `<div class="completed-list-divider"><span>Completed</span><small>${completedItems.length}</small></div><div class="completed-list-items">${completedItems.map(item=>listItemHTML(list,item,{showLane:list.columnMode})).join("")}</div>` : ""}`}` : `<div class="empty-state checklist-empty"><div class="empty-icon">☑️</div><h3>Nothing on this list yet</h3><p>Add items one by one or use Quick add so each entry still stays independently checkable.</p><button class="secondary-button" data-add-list-item="${list.id}">Add first item</button></div>`}
      </div>
    </section>`;
}'''
app = regex_once(app, r'function renderSingleList\(list\) \{.*?\n\}\n\nfunction updateListColumnSettingsVisibility', new_render_single + '\n\nfunction updateListColumnSettingsVisibility', 'single list renderer', re.S)

# Smart Template now routes messy existing content into the one Smart Sort engine, and can open a packing preview directly.
app = replace_once(app, 'function chooseSmartTemplate(target){\n  closeModal("smartTemplateModal");', 'function chooseSmartTemplate(target){\n  closeModal("smartTemplateModal");\n  if(target==="smart-sort-brain-dump"){changePage("inbox");setTimeout(()=>document.getElementById("brainDumpText")?.focus(),60);showToast("Paste it into Brain Dump — Smart Sort will organize it ✨");return;}\n  if(target==="packing-list")return openListTemplateDraft("packing");', 'smart template routing')

# Index version + Smart Template choices.
index = index.replace('content="2.0.39"', 'content="2.0.40"', 1)
index = index.replace('style.css?v=2.0.39', 'style.css?v=2.0.40')
index = index.replace('app.js?v=2.0.39', 'app.js?v=2.0.40')
index = replace_once(index, 'Pick the closest goal. Hana will open the matching structure as an unsaved preview.', 'Pick a goal, or bring Hana something messy you already have. Templates stay unsaved until you choose to save them.', 'smart template subtitle')
smart_buttons = '''        <button type="button" data-smart-template-target="smart-sort-brain-dump"><span>🧠</span><strong>Organize something I already have</strong><small>Paste messy text in Brain Dump and let Smart Sort detect the structure</small></button>
        <button type="button" data-smart-template-target="packing-list"><span>🧳</span><strong>Build a packing list</strong><small>Start a reusable blank packing checklist with optional exact trip timing</small></button>
'''
index = replace_once(index, '        <button type="button" data-smart-template-target="measurement-profile-note"><span>📏</span><strong>Keep measurements</strong><small>Editable measurement categories and fields</small></button>\n', '        <button type="button" data-smart-template-target="measurement-profile-note"><span>📏</span><strong>Keep measurements</strong><small>Editable measurement categories and fields</small></button>\n' + smart_buttons, 'smart template buttons')

# Style category groups; no change to global list behavior.
if 'SMART PACKING GROUPS v2.0.40' not in style:
    style += '''\n\n/* ================= SMART PACKING GROUPS v2.0.40 ================= */\n.packing-category-stack{display:grid;gap:12px;}\n.packing-category-group{border:1px solid var(--border);border-radius:18px;background:var(--surface);overflow:hidden;}\n.packing-category-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px 9px;border-bottom:1px solid var(--border);}\n.packing-category-heading strong{font-size:13px;}\n.packing-category-heading small{font-size:11px;color:var(--text-soft);font-weight:700;}\n.packing-category-items{padding:4px 8px 7px;}\n.packing-category-items .list-swipe-shell:last-child .standalone-check-item{border-bottom:0;}\n.packing-grouped-checklist{display:block;}\n@media(max-width:560px){.packing-category-stack{gap:10px}.packing-category-heading{padding:11px 12px 8px}.packing-category-items{padding:3px 6px 6px}}\n'''

# Service worker/cache parity.
sw = sw.replace('HANA 🌸 Service Worker v72', 'HANA 🌸 Service Worker v73', 1)
sw = sw.replace('hana-shell-v72', 'hana-shell-v73', 1)
sw = sw.replace('style.css?v=2.0.39', 'style.css?v=2.0.40')
sw = sw.replace('app.js?v=2.0.39', 'app.js?v=2.0.40')

app_path.write_text(app)
index_path.write_text(index)
style_path.write_text(style)
sw_path.write_text(sw)
print('Hana 2.0.40 smart packing patch applied')
