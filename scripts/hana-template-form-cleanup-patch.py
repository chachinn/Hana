from pathlib import Path
import re

app_path=Path('app.js')
index_path=Path('index.html')
style_path=Path('style.css')
sw_path=Path('service-worker.js')
app=app_path.read_text(encoding='utf-8')
index=index_path.read_text(encoding='utf-8')
style=style_path.read_text(encoding='utf-8')
sw=sw_path.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old,new,1)


def replace_between(text,start_marker,end_marker,replacement,label):
    start=text.find(start_marker)
    if start<0:
        raise SystemExit(f'{label}: start marker not found')
    end=text.find(end_marker,start)
    if end<0:
        raise SystemExit(f'{label}: end marker not found')
    return text[:start]+replacement.rstrip()+"\n\n"+text[end:]

# ---- Build/version ----
app=replace_once(app,'HANA 🌸 Version 2 · internal build 2.0.22','HANA 🌸 Version 2 · internal build 2.0.23','app banner version')
app=replace_once(app,'const HANA_APP_VERSION = "2.0.22";','const HANA_APP_VERSION = "2.0.23";','app version constant')
index=replace_once(index,'<meta name="hana-app-version" content="2.0.22" />','<meta name="hana-app-version" content="2.0.23" />','index version')
index=index.replace('style.css?v=2.0.22','style.css?v=2.0.23').replace('app.js?v=2.0.22','app.js?v=2.0.23')
sw=replace_once(sw,'Service Worker v55','Service Worker v56','service worker version') if 'Service Worker v55' in sw else replace_once(sw,'Service Worker v54','Service Worker v56','service worker version')
sw=re.sub(r'const CACHE_NAME = "hana-shell-v\d+";','const CACHE_NAME = "hana-shell-v56";',sw,count=1)
sw=sw.replace('style.css?v=2.0.22','style.css?v=2.0.23').replace('app.js?v=2.0.22','app.js?v=2.0.23').replace('style.css?v=2.0.21','style.css?v=2.0.23').replace('app.js?v=2.0.21','app.js?v=2.0.23')

# ---- Blank list templates: structure only, no example entries ----
new_list_templates='''const LIST_TEMPLATES = {
  grocery: { name: "Grocery List", icon: "🛒", items: [] },
  buy: { name: "Things to Buy", icon: "🛍️", items: [] },
  packing: { name: "Packing List", icon: "🧳", items: [] },
  errands: { name: "Errands", icon: "🚶", items: [] },
  simple: { name: "Checklist", icon: "☑️", items: [] }
};'''
app=replace_between(app,'const LIST_TEMPLATES = {','const THEME_LABELS = {',new_list_templates,'list templates')

# ---- Curated template gallery ----
new_starter='''const STARTER_TEMPLATES = [
  { id:"meeting-agenda", icon:"📋", title:"Meeting Agenda", description:"Plan meeting details, purpose, attendees, topics, owners, time boxes and preparation.", kind:"note", category:"Meetings" },
  { id:"meeting-minutes", icon:"📝", title:"Minutes of the Meeting", description:"Record attendance, discussion, decisions, actions and next-meeting details.", kind:"note", category:"Meetings" },
  { id:"skincare-routine-note", icon:"🧴", title:"Weekly Skincare Planner", description:"Build main and optional alternate AM/PM routines for each day of the week.", kind:"note", category:"Personal & routines" },
  { id:"professional-bionote", icon:"👤", title:"Professional Bionote", description:"A blank structured profile for role, experience, education, training and achievements.", kind:"note", category:"Work & reference" },
  { id:"strategy-outline-note", icon:"🧭", title:"Strategy Plan", description:"A customizable structure for objectives, approaches, evidence, risks, decisions and ways forward.", kind:"note", category:"Work & reference" },
  { id:"measurement-profile-note", icon:"📏", title:"Measurement Profile", description:"A customizable measurement sheet with blank values and removable fields.", kind:"note", category:"Personal & routines" },
  { id:"grocery-list", icon:"🛒", title:"Grocery List", description:"A blank grocery checklist with optional customizable columns.", kind:"list", category:"Personal & routines" },
  { id:"packing-list", icon:"🧳", title:"Packing List", description:"A blank reusable packing checklist you fill only with what you actually need.", kind:"list", category:"Personal & routines" },
  { id:"work-deliverables", icon:"💼", title:"Work Deliverables", description:"A customizable tracker structure for deliverables, owners, progress, due dates and status.", kind:"tracker", category:"Trackers" },
  { id:"bills-tracker", icon:"💳", title:"Bills Tracker", description:"A customizable tracker structure for bills, amount, due date and payment status.", kind:"tracker", category:"Trackers" }
];'''
app=replace_between(app,'const STARTER_TEMPLATES = [','const QUICK_ACCESS_MENU = {',new_starter,'starter templates')

# ---- Structured note schema/data model ----
structured_model=r'''const CUSTOM_STRUCTURED_NOTE_TYPES = ["professional-bionote", "strategy-plan", "measurement-profile"];
const STRUCTURED_NOTE_SCHEMAS = {
  "professional-bionote": {
    title:"Professional Bionote", icon:"👤",
    fields:[
      ["Full name","text","Identity"], ["Current title / position","text","Identity"], ["Organization","text","Identity"], ["Primary responsibilities","textarea","Identity"],
      ["Years of experience","text","Experience"], ["Key areas of work","textarea","Experience"], ["Major programs / responsibilities","textarea","Experience"],
      ["Education","textarea","Background"], ["Training & development","textarea","Background"], ["Projects / achievements / presentations","textarea","Background"],
      ["Short bionote","textarea","Ready-to-use copy"]
    ]
  },
  "strategy-plan": {
    title:"Strategy Plan", icon:"🧭",
    fields:[
      ["Objective","textarea","Direction"], ["Desired outcome","textarea","Direction"], ["Strategies / approaches","textarea","Plan"], ["Key data / evidence","textarea","Plan"],
      ["Stakeholders / owners","textarea","People"], ["Risks / constraints","textarea","People"], ["Decisions / agreements","textarea","Execution"],
      ["Action items","textarea","Execution"], ["Dependencies / assistance needed","textarea","Execution"], ["Ways forward","textarea","Execution"]
    ]
  },
  "measurement-profile": {
    title:"Measurement Profile", icon:"📏",
    fields:[
      ["Person","text","Profile"], ["Date measured","date","Profile"], ["Units","text","Profile"], ["Height","text","Profile"], ["Weight","text","Profile"],
      ["Neck","text","Upper body"], ["Overbust","text","Upper body"], ["Bust","text","Upper body"], ["Underbust","text","Upper body"], ["Shoulder to shoulder","text","Upper body"],
      ["Arm hole","text","Upper body"], ["Bicep","text","Upper body"], ["Forearm","text","Upper body"], ["Wrist around","text","Upper body"],
      ["Waist","text","Lower body"], ["Hips","text","Lower body"], ["Inseam","text","Lower body"], ["Outseam","text","Lower body"],
      ["Fit / tailoring notes","textarea","Notes"]
    ]
  }
};

function normalizeStructuredNoteField(field={},index=0){
  const type=["text","textarea","date","number"].includes(field.type)?field.type:"text";
  return {id:field.id||createId(),label:String(field.label||""),type,value:String(field.value??""),group:String(field.group||"Custom"),order:Number.isFinite(Number(field.order))?Number(field.order):index};
}
function normalizeStructuredNoteFields(fields=[]){
  return (Array.isArray(fields)?fields:[]).map(normalizeStructuredNoteField).filter(field=>field.label||field.value).sort((a,b)=>a.order-b.order);
}
function structuredSchemaFields(structuredType){
  const schema=STRUCTURED_NOTE_SCHEMAS[structuredType];if(!schema)return [];
  return schema.fields.map(([label,type,group],index)=>normalizeStructuredNoteField({id:createId(),label,type,group,value:"",order:index},index));
}
function isCustomStructuredNote(noteOrType){
  const type=typeof noteOrType==="string"?noteOrType:noteOrType?.structuredType;
  return CUSTOM_STRUCTURED_NOTE_TYPES.includes(type);
}
function structuredNoteSchema(type){return STRUCTURED_NOTE_SCHEMAS[type]||null;}
function structuredNotePreview(note){
  const values=normalizeStructuredNoteFields(note?.structuredFields||[]).filter(field=>String(field.value||"").trim()).slice(0,3);
  return values.map(field=>`${field.label}: ${field.value}`).join(" · ")||structuredNoteSchema(note?.structuredType)?.title||"Structured note";
}
'''
app=app.replace('function normalizeNote(note = {}) {',structured_model+'\nfunction normalizeNote(note = {}) {',1)
app=replace_once(app,'const allowedStructuredTypes = ["skincare-weekly", "meeting-agenda", "meeting-minutes"];','const allowedStructuredTypes = ["skincare-weekly", "meeting-agenda", "meeting-minutes", ...CUSTOM_STRUCTURED_NOTE_TYPES];','allowed structured types')
app=replace_once(app,'meetingData: note.type === "meeting" ? normalizeMeetingData({...(note.meetingData || {}), kind: meetingKind}) : null,','meetingData: note.type === "meeting" ? normalizeMeetingData({...(note.meetingData || {}), kind: meetingKind}) : null,\n    structuredFields: isCustomStructuredNote(structuredType) ? normalizeStructuredNoteFields(note.structuredFields || []) : [],','structured fields normalize')

# ---- New-item delete button bug ----
app=replace_once(app,'if(deleteButton)deleteButton.classList.toggle("hidden",received);','if(deleteButton)deleteButton.classList.toggle("hidden",!item||received);','new item delete visibility')

# ---- Structured form UI in note modal ----
structured_html='''      <section id="structuredNoteFieldsWrap" class="structured-note-fields hidden">
        <div class="structured-note-fields-head">
          <div><small>STRUCTURED FIELDS</small><strong id="structuredNoteFieldsTitle">Custom fields</strong><span>Rename labels, remove anything you do not need, or add your own fields.</span></div>
        </div>
        <div id="structuredNoteFieldsEditor" class="structured-note-fields-editor"></div>
        <div class="structured-note-add-row">
          <button type="button" class="secondary-button compact-button" data-add-structured-field="text">+ Short field</button>
          <button type="button" class="secondary-button compact-button" data-add-structured-field="textarea">+ Long field</button>
          <button type="button" class="secondary-button compact-button" data-add-structured-field="date">+ Date</button>
          <button type="button" class="secondary-button compact-button" data-add-structured-field="number">+ Number</button>
        </div>
      </section>

'''
index=replace_once(index,'      <div id="noteToolbar" class="note-toolbar" aria-label="Note formatting shortcuts">',structured_html+'      <div id="noteToolbar" class="note-toolbar" aria-label="Note formatting shortcuts">','structured note HTML')

# ---- Structured field editor logic ----
structured_logic=r'''let structuredNoteDraftFields=[];
function structuredNoteFieldValueControl(field){
  const value=escapeHTML(field.value||"");
  if(field.type==="textarea")return `<textarea data-structured-field-value placeholder="Enter ${escapeHTML((field.label||"details").toLowerCase())}">${value}</textarea>`;
  const inputType=field.type==="date"?"date":field.type==="number"?"number":"text";
  return `<input data-structured-field-value type="${inputType}" value="${value}" placeholder="${inputType==="text"?`Enter ${escapeHTML((field.label||"value").toLowerCase())}`:""}" />`;
}
function structuredNoteFieldRowHTML(field,showGroup=false){
  return `${showGroup?`<div class="structured-note-group-title">${escapeHTML(field.group||"Custom")}</div>`:""}<div class="structured-note-field-row" data-structured-field-row data-structured-field-id="${escapeHTML(field.id)}" data-structured-field-type="${escapeHTML(field.type)}" data-structured-field-group="${escapeHTML(field.group||"Custom")}"><div class="structured-note-field-label-row"><input data-structured-field-label class="structured-note-field-label-input" value="${escapeHTML(field.label)}" placeholder="Field label" aria-label="Field label" /><button type="button" class="structured-note-field-remove" data-remove-structured-field="${escapeHTML(field.id)}" aria-label="Remove ${escapeHTML(field.label||"field")}">×</button></div>${structuredNoteFieldValueControl(field)}</div>`;
}
function readStructuredNoteFields(){
  return [...document.querySelectorAll("#structuredNoteFieldsEditor [data-structured-field-row]")].map((row,index)=>normalizeStructuredNoteField({id:row.dataset.structuredFieldId||createId(),label:row.querySelector("[data-structured-field-label]")?.value.trim()||"",type:row.dataset.structuredFieldType||"text",value:row.querySelector("[data-structured-field-value]")?.value||"",group:row.dataset.structuredFieldGroup||"Custom",order:index},index)).filter(field=>field.label||field.value);
}
function renderStructuredNoteFields(fields=structuredNoteDraftFields){
  structuredNoteDraftFields=normalizeStructuredNoteFields(fields);
  const editor=document.getElementById("structuredNoteFieldsEditor");if(!editor)return;
  let lastGroup="";
  editor.innerHTML=structuredNoteDraftFields.length?structuredNoteDraftFields.map(field=>{const showGroup=field.group!==lastGroup;lastGroup=field.group;return structuredNoteFieldRowHTML(field,showGroup);}).join(""):`<div class="structured-note-empty"><span>＋</span><strong>No fields yet</strong><small>Add any fields you want below.</small></div>`;
}
function populateStructuredNoteFields(noteOrType){
  const type=typeof noteOrType==="string"?noteOrType:noteOrType?.structuredType||"";
  const existing=typeof noteOrType==="object"?normalizeStructuredNoteFields(noteOrType?.structuredFields||[]):[];
  structuredNoteDraftFields=existing.length?existing:structuredSchemaFields(type);
  const schema=structuredNoteSchema(type);const title=document.getElementById("structuredNoteFieldsTitle");if(title)title.textContent=schema?.title||"Custom fields";
  renderStructuredNoteFields(structuredNoteDraftFields);
}
function addStructuredNoteField(type="text"){
  structuredNoteDraftFields=readStructuredNoteFields();
  structuredNoteDraftFields.push(normalizeStructuredNoteField({id:createId(),label:"",type,value:"",group:"Custom",order:structuredNoteDraftFields.length}));
  renderStructuredNoteFields(structuredNoteDraftFields);
  requestAnimationFrame(()=>{const rows=document.querySelectorAll("#structuredNoteFieldsEditor [data-structured-field-row]");rows[rows.length-1]?.querySelector("[data-structured-field-label]")?.focus();});
}
function removeStructuredNoteField(id){
  structuredNoteDraftFields=readStructuredNoteFields().filter(field=>field.id!==id);renderStructuredNoteFields(structuredNoteDraftFields);
}
'''
app=app.replace('function clearNoteForm() {',structured_logic+'\nfunction clearNoteForm() {',1)
app=replace_once(app,'function clearNoteForm() {\n  clearTemplateDraftBanner("noteModal");','function clearNoteForm() {\n  clearTemplateDraftBanner("noteModal");\n  structuredNoteDraftFields=[];\n  document.getElementById("structuredNoteFieldsWrap")?.classList.add("hidden");\n  const structuredEditor=document.getElementById("structuredNoteFieldsEditor");if(structuredEditor)structuredEditor.innerHTML="";','clear structured note form')

# Populate structured fields when opening a saved note.
old_open='''    if(note.type==="meeting")populateMeetingData(note);
    document.getElementById("noteModalEyebrow").textContent="NOTE DETAILS";'''
new_open='''    if(note.type==="meeting")populateMeetingData(note);
    if(isCustomStructuredNote(note))populateStructuredNoteFields(note);
    document.getElementById("noteModalEyebrow").textContent="NOTE DETAILS";'''
app=replace_once(app,old_open,new_open,'open structured note')

# Replace conditional field logic.
new_conditional=r'''function updateNoteConditionalFields() {
  const type=document.getElementById("noteType")?.value;
  const structuredType=document.getElementById("noteStructuredType")?.value||"";
  const meeting=type==="meeting";
  const structured=isCustomStructuredNote(structuredType)&&!meeting;
  const showChecklist=["checklist","meeting"].includes(type)&&!structured;
  document.getElementById("meetingFieldsWrap")?.classList.toggle("hidden",!meeting);
  document.getElementById("structuredNoteFieldsWrap")?.classList.toggle("hidden",!structured);
  document.getElementById("noteToolbar")?.classList.toggle("hidden",meeting||structured);
  document.getElementById("noteContentWrap")?.classList.toggle("hidden",structured);
  document.getElementById("noteResettableWrap")?.classList.toggle("hidden",type!=="checklist"||structured);
  document.getElementById("noteChecklistWrap")?.classList.toggle("hidden",!showChecklist);
  const contentLabel=document.getElementById("noteContentLabel");if(contentLabel)contentLabel.textContent=meeting?"Additional notes":"Note";
  const content=document.getElementById("noteContent");if(content)content.placeholder=meeting?"Anything else worth keeping from this meeting...":"Write anything...";
  const checklistLabel=document.getElementById("noteChecklistLabel");if(checklistLabel)checklistLabel.textContent=meeting?"Action items / next steps":"Checklist / action items";
  const checklistHelp=document.getElementById("noteChecklistHelp");if(checklistHelp)checklistHelp.textContent=meeting?"One action per line. Hana can turn these into tasks.":"Checklist items can be managed here.";
  if(meeting){if(!document.querySelector("#meetingAgendaItems [data-meeting-agenda-row]"))renderMeetingAgendaItems([]);updateMeetingKindFields();}
  if(structured&&!structuredNoteDraftFields.length)populateStructuredNoteFields(structuredType);
}
'''
app=replace_between(app,'function updateNoteConditionalFields() {','function meetingHasMeaningfulData(data) {',new_conditional,'note conditional logic')

# Replace saveNote with structured-aware behavior.
new_save_note=r'''function saveNote() {
  const id=document.getElementById("noteEditId").value;const old=id?state.notes.find(n=>n.id===id):null;
  const type=document.getElementById("noteType").value,title=document.getElementById("noteTitle").value.trim(),content=document.getElementById("noteContent").value.trim();
  const oldChecks=old?.checklist||[];
  const checks=parseLines(document.getElementById("noteChecklist").value).map(title=>{const e=oldChecks.find(i=>i.title===title);return e?{...e}:{id:createId(),title,completed:false};});
  const meetingData=type==="meeting"?readMeetingData():null;
  const requestedStructured=document.getElementById("noteStructuredType")?.value||"";
  const structured=isCustomStructuredNote(requestedStructured)&&type!=="meeting";
  const structuredFields=structured?readStructuredNoteFields():[];
  const structuredHasValue=structuredFields.some(field=>String(field.value||"").trim());
  if(!title&&!content&&!checks.length&&!meetingHasMeaningfulData(meetingData)&&!structuredHasValue)return showToast("Enter something first 🌸");
  let structuredType="";
  if(type==="meeting")structuredType=meetingData.kind==="minutes"?"meeting-minutes":"meeting-agenda";
  else if(structured)structuredType=requestedStructured;
  else if(old?.structuredType==="skincare-weekly")structuredType="skincare-weekly";
  const fallbackTitle=type==="meeting"?(meetingData.kind==="minutes"?"Minutes of the Meeting":"Meeting Agenda"):(structuredNoteSchema(structuredType)?.title||"Untitled note");
  const note=normalizeNote({...(old||{}),id:id||createId(),title:title||fallbackTitle,type,space:document.getElementById("noteSpace").value,project:document.getElementById("noteProject").value.trim(),tags:parseTags(document.getElementById("noteTags").value),content:structured?"":content,checklist:structured?[]:checks,resettable:structured?false:document.getElementById("noteResettable").checked,pinned:document.getElementById("notePinned").checked,structuredType,meetingData,structuredFields,...shareMetaFromControl("note",old),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()});
  if(old)state.notes[state.notes.findIndex(n=>n.id===id)]=note;else state.notes.push(note);
  ensureProjectRecord(note.project,note.space);closeModal("noteModal");showToast(old?"Note updated 🌸":"Note saved 🌸");render();
}
'''
app=replace_between(app,'function saveNote() {','function deleteNote(id)',new_save_note,'save note')

# Structured note card/search previews.
app=replace_once(app,'const preview=note.type==="meeting"?meetingNotePreview(note):note.content;','const preview=note.type==="meeting"?meetingNotePreview(note):isCustomStructuredNote(note)?structuredNotePreview(note):note.content;','note preview')
app=replace_once(app,'<h3>${note.pinned ? "📌 " : ""}${noteTypeIcon(note.type)} ${escapeHTML(note.title)} ${sharedBadgeHTML(note,true)}</h3>','<h3>${note.pinned ? "📌 " : ""}${structuredNoteSchema(note.structuredType)?.icon||noteTypeIcon(note.type)} ${escapeHTML(note.title)} ${sharedBadgeHTML(note,true)}</h3>','structured note icon')
app=replace_once(app,'const meetingText=meeting?[meeting.kind,meeting.date,meeting.location,meeting.facilitator,meeting.attendees,meeting.absent,meeting.objective,meeting.prepMaterials,meeting.decisionsNeeded,meeting.discussion,meeting.decisions,meeting.nextMeetingDate,meeting.preparedBy,...meeting.agendaItems.flatMap(item=>[item.topic,item.owner,item.minutes])]:[];\n    return [n.title,n.content,...n.tags,...n.checklist.map(i=>i.title),n.skincareRoutine?.focus||"",...skincare,...meetingText].join(" ").toLowerCase().includes(q);','const meetingText=meeting?[meeting.kind,meeting.date,meeting.location,meeting.facilitator,meeting.attendees,meeting.absent,meeting.objective,meeting.prepMaterials,meeting.decisionsNeeded,meeting.discussion,meeting.decisions,meeting.nextMeetingDate,meeting.preparedBy,...meeting.agendaItems.flatMap(item=>[item.topic,item.owner,item.minutes])]:[];\n    const structuredText=isCustomStructuredNote(n)?normalizeStructuredNoteFields(n.structuredFields||[]).flatMap(field=>[field.label,field.value]):[];\n    return [n.title,n.content,...n.tags,...n.checklist.map(i=>i.title),n.skincareRoutine?.focus||"",...skincare,...meetingText,...structuredText].join(" ").toLowerCase().includes(q);','structured note search')

# Skincare preview should not pre-fill its title.
app=replace_once(app,'return {days,focus:routine.focus,title:note?.title||"Skincare Routine",space:note?.space||preferredSpace()};','return {days,focus:routine.focus,title:note?.title||"",space:note?.space||preferredSpace()};','blank skincare title')

# ---- Cleaner Focus Bouquet ----
focus_old_start='    <details class="section focus-section-simple focus-bouquet-card" open>'
focus_end='    <details class="today-planning-details">'
focus_new=r'''    <details class="section focus-section-simple focus-bouquet-card"><summary class="focus-bouquet-summary"><div><p class="eyebrow">TODAY · TOP 3</p><h2>Focus Bouquet</h2><small>${bouquetSelected}/3 selected · ${completedFocus.length} bloomed</small></div><div class="focus-summary-blooms" aria-hidden="true">${Array.from({length:FOCUS_BOUQUET_LIMIT},(_,index)=>`<span>${index<completedFocus.length?"🌸":index<bouquetSelected?"🌷":"○"}</span>`).join("")}</div><span class="focus-bouquet-chevron">⌄</span></summary><div class="focus-bouquet-body focus-bouquet-body-clean">${focusTasks.length?`<div class="focus-clean-list">${focusTasks.map(task=>`<div class="focus-clean-row"><button class="task-checkbox" data-toggle-task="${task.id}" aria-label="Complete ${escapeHTML(task.title)}"></button><button class="focus-clean-title" data-edit-task="${task.id}"><strong>${escapeHTML(task.title)}</strong><small>${formatDuration(task.durationMinutes)} · ${energyLabel(task.energy)} · ${modeLabel(task.space)}</small></button><button class="focus-clean-remove" data-focus-task="${task.id}" aria-label="Remove ${escapeHTML(task.title)} from focus">×</button></div>`).join("")}</div>`:completedFocus.length?`<div class="bouquet-complete-message"><strong>Today’s focus bloomed 🌸</strong><span>${bouquetSelected<FOCUS_BOUQUET_LIMIT?"You still have an open focus slot if something else truly matters.":"Your Top 3 is complete."}</span></div>`:`<div class="bouquet-empty-copy"><strong>No focus tasks yet</strong><span>Choose up to three things that matter most today.</span></div>`}${bouquetSelected<FOCUS_BOUQUET_LIMIT?`<button class="focus-clean-add" type="button" data-open-bouquet-picker>+ Add focus task</button>`:""}<div class="bouquet-actions bouquet-actions-clean"><button class="secondary-button" type="button" data-open-bouquet-picker>${bouquetSelected?"Edit focus":"Choose tasks"}</button><button class="text-button" type="button" data-goto="bloom">Bloom view</button></div></div></details>'''
app=replace_between(app,focus_old_start,focus_end,focus_new,'focus bouquet UI')

# ---- Grouped template gallery ----
new_render_templates=r'''function renderTemplates() {
  const c=document.getElementById("pageContent");
  const categories=["Meetings","Personal & routines","Work & reference","Trackers"];
  c.innerHTML=`<div class="page-heading"><p class="eyebrow">REUSABLE, BUT NEVER FORCED</p><h1>Templates</h1><p>Preview a blank structure, customize it, and save only when it actually fits what you need.</p></div><div class="template-customization-note"><span>✨</span><div><strong>Templates are starting structures, not pre-filled content.</strong><small>Structured-note field labels can be renamed or removed, and you can add your own. List and tracker structures remain editable too.</small></div></div>${categories.map(category=>{const items=STARTER_TEMPLATES.filter(template=>template.category===category);return items.length?`<section class="template-category"><div class="template-category-head"><h2>${escapeHTML(category)}</h2><span>${items.length}</span></div><div class="template-grid">${items.map(template=>`<article class="template-card"><div class="template-icon">${template.icon}</div><div><h3>${escapeHTML(template.title)}</h3><p>${escapeHTML(template.description)}</p><span class="badge badge-personal">${escapeHTML(template.kind)}</span></div><button class="secondary-button" data-use-template="${template.id}">Preview</button></article>`).join("")}</div></section>`:"";}).join("")}`;
}
'''
app=replace_between(app,'function renderTemplates() {','function clearTemplateDraftBanner(modalId) {',new_render_templates,'render templates')

# ---- Blank preview helpers ----
new_note_draft=r'''function openNoteTemplateDraft(definition={}) {
  openNoteModal();refreshSpaceSelects();
  const type=definition.type||"note",structuredType=definition.structuredType||"";
  document.getElementById("noteTitle").value="";
  document.getElementById("noteTitle").placeholder=definition.title?`Name this ${definition.title.toLowerCase()} (optional)`:"Note title";
  document.getElementById("noteType").value=type;
  document.getElementById("noteSpace").value=definition.space||preferredSpace();
  document.getElementById("noteTags").value="";document.getElementById("noteContent").value="";document.getElementById("noteChecklist").value="";
  document.getElementById("noteResettable").checked=false;document.getElementById("noteStructuredType").value=structuredType;
  if(type==="meeting")populateMeetingData({structuredType,meetingData:{kind:structuredType==="meeting-minutes"?"minutes":"agenda",agendaItems:[]}});
  if(isCustomStructuredNote(structuredType))populateStructuredNoteFields(structuredType);
  updateNoteConditionalFields();
  document.getElementById("noteModalEyebrow").textContent="TEMPLATE PREVIEW";document.getElementById("noteModalTitle").textContent=definition.title||"Note template";document.getElementById("saveNoteButton").textContent="Save to Notes";
  showTemplateDraftBanner("noteModal","Blank structure only. Fill what you want, customize the fields, or close without saving.");
}
'''
app=replace_between(app,'function openNoteTemplateDraft(definition={}) {','function openListTemplateDraft(templateId) {',new_note_draft,'note template draft')

new_list_draft=r'''function openListTemplateDraft(templateId) {
  const template=LIST_TEMPLATES[templateId];if(!template)return showToast("Template not found.");
  openListModal();pendingListTemplateItems=[];
  document.getElementById("listName").value="";document.getElementById("listName").placeholder=template.name||"List name";document.getElementById("listIcon").value=template.icon||"☑️";
  document.getElementById("listColumnMode").checked=templateId==="grocery";document.getElementById("listColumnCount").value="3";updateListColumnSettingsVisibility();
  document.getElementById("listModalEyebrow").textContent="TEMPLATE PREVIEW";document.getElementById("listModalTitle").textContent=template.name||"List template";document.getElementById("saveListButton").textContent="Create list";
  showTemplateDraftBanner("listModal","Blank list only. Add your own entries after creating it; nothing is pre-filled or saved yet.");
}
'''
app=replace_between(app,'function openListTemplateDraft(templateId) {','function openTableTemplateDraft(definition={}) {',new_list_draft,'list template draft')

new_table_draft=r'''function openTableTemplateDraft(definition={}) {
  openTableModal();document.getElementById("tableTemplate").value="blank";document.getElementById("tableName").value="";document.getElementById("tableName").placeholder=definition.name||"Tracker name";document.getElementById("tableSpace").value=definition.space||preferredSpace();
  setTableBuilderColumns(definition.columns||[{name:"Item",type:"text"}]);document.getElementById("tableStatusOptions").value=(definition.statusOptions||DEFAULT_TABLE_STATUSES).join(", ");refreshTableSortColumnOptions(tableBuilderColumns[0]?.id||"");updateTableSortFields();
  document.getElementById("tableModalEyebrow").textContent="TEMPLATE PREVIEW";document.getElementById("tableModalTitle").textContent=definition.name||"Tracker template";document.getElementById("saveTableButton").textContent="Create tracker";
  showTemplateDraftBanner("tableModal","Only the editable column structure is provided. No rows or values are pre-filled.",(definition.columns||[]).map(column=>column.name));
}
'''
app=replace_between(app,'function openTableTemplateDraft(definition={}) {','function useTemplate(templateId) {',new_table_draft,'table template draft')

# ---- Rebuilt template behavior ----
new_use_template=r'''function useTemplate(templateId) {
  const space=preferredSpace();
  if(["meeting-agenda","meeting-minutes"].includes(templateId)){
    const isMinutes=templateId==="meeting-minutes";
    return openNoteTemplateDraft({title:isMinutes?"Minutes of the Meeting":"Meeting Agenda",type:"meeting",structuredType:isMinutes?"meeting-minutes":"meeting-agenda",space});
  }
  if(templateId==="skincare-routine-note"){
    closeNavDrawer();openSkincareRoutineModal("",{edit:true});document.getElementById("skincareTitle").value="";showTemplateDraftBanner("skincareRoutineModal","Blank weekly planner. Add only the products and routines you actually use, then save when ready.");return;
  }
  if(templateId==="professional-bionote")return openNoteTemplateDraft({title:"Professional Bionote",type:"note",structuredType:"professional-bionote",space});
  if(templateId==="strategy-outline-note")return openNoteTemplateDraft({title:"Strategy Plan",type:"note",structuredType:"strategy-plan",space});
  if(templateId==="measurement-profile-note")return openNoteTemplateDraft({title:"Measurement Profile",type:"note",structuredType:"measurement-profile",space});
  if(templateId==="grocery-list"||templateId==="packing-list")return openListTemplateDraft(templateId==="grocery-list"?"grocery":"packing");
  if(templateId==="work-deliverables"||templateId==="bills-tracker"){
    const isWork=templateId==="work-deliverables";
    return openTableTemplateDraft({name:isWork?"Work Deliverables":"Bills Tracker",space:isWork&&state.spaces.some(item=>item.id==="work")?"work":space,columns:isWork?[{name:"Deliverable",type:"text"},{name:"Owner",type:"text"},{name:"Progress",type:"progress"},{name:"Due",type:"date"},{name:"Status",type:"status"},{name:"Remarks",type:"text"},{name:"Done",type:"checkbox"}]:[{name:"Bill",type:"text"},{name:"Amount",type:"money"},{name:"Due",type:"date"},{name:"Paid",type:"checkbox"}],statusOptions:DEFAULT_TABLE_STATUSES.slice()});
  }
  showToast("Template not found.");
}
'''
app=replace_between(app,'function useTemplate(templateId) {','function renderTrash() {',new_use_template,'use template')

# Note quick-launch copy.
app=app.replace('🧭 Strategy / Meeting Outline','🧭 Strategy Plan')

# Structured field click handlers.
event_marker='''  if(event.target.closest("[data-add-meeting-agenda-item]")){addMeetingAgendaItem();return;}'''
event_insert='''  const addStructuredField=event.target.closest("[data-add-structured-field]");if(addStructuredField){addStructuredNoteField(addStructuredField.dataset.addStructuredField||"text");return;}\n  const removeStructuredField=event.target.closest("[data-remove-structured-field]");if(removeStructuredField){removeStructuredNoteField(removeStructuredField.dataset.removeStructuredField);return;}\n\n'''+event_marker
app=replace_once(app,event_marker,event_insert,'structured field events')

# ---- Release notes ----
release_pattern=re.compile(r'const HANA_RELEASE_NOTES = \{.*?\n\};',re.S)
release='''const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 13, 2026",
  title: "Cleaner templates & focus ✨",
  intro: "Hana Version 2 now keeps templates blank, gives structured references real customizable fields, and makes Focus Bouquet much calmer on Today.",
  items: [
    { icon:"🧩", title:"Curated templates", text:"Removed redundant pre-filled review/reset templates and grouped the useful templates by purpose." },
    { icon:"✏️", title:"Real customizable fields", text:"Bionote, Strategy Plan and Measurement Profile now use separate fields you can rename, remove or extend." },
    { icon:"🫧", title:"No example entries to delete", text:"Meeting, skincare, grocery and packing previews open blank; tracker templates provide editable columns only." },
    { icon:"🌷", title:"Cleaner Focus Bouquet", text:"Today now opens with a compact focus summary and a single clean task list instead of duplicated flower cards and rows." },
    { icon:"🛡️", title:"New-item delete bug fixed", text:"Delete buttons stay hidden on unsaved forms and template previews until a real saved item exists." }
  ]
};'''
app,new_count=release_pattern.subn(release,app,count=1)
if new_count!=1: raise SystemExit(f'release notes: expected 1 match, found {new_count}')

# ---- CSS ----
css_marker='/* HANA TEMPLATE FORMS + CLEAN FOCUS 2.0.23 */'
if css_marker not in style:
    style+=r'''

/* HANA TEMPLATE FORMS + CLEAN FOCUS 2.0.23 */
.template-customization-note{display:flex;gap:10px;align-items:flex-start;margin:0 0 18px;padding:13px 14px;border:1px solid var(--border);border-radius:18px;background:color-mix(in srgb,var(--surface) 92%,var(--blush));}
.template-customization-note>span{font-size:19px}.template-customization-note strong,.template-customization-note small{display:block}.template-customization-note small{margin-top:3px;color:var(--text-soft);line-height:1.45}
.template-category{margin:0 0 22px}.template-category-head{display:flex;align-items:center;justify-content:space-between;margin:0 2px 9px}.template-category-head h2{margin:0;font-size:15px}.template-category-head span{min-width:28px;padding:4px 8px;border-radius:999px;background:var(--blush);color:var(--rose);font-size:10px;font-weight:800;text-align:center}
.structured-note-fields{margin:8px 0 14px;padding:13px;border:1px solid var(--border);border-radius:20px;background:color-mix(in srgb,var(--surface) 95%,var(--blush));}
.structured-note-fields-head{margin-bottom:12px}.structured-note-fields-head small,.structured-note-fields-head strong,.structured-note-fields-head span{display:block}.structured-note-fields-head small{color:var(--rose);font-weight:850;letter-spacing:.08em;font-size:9px}.structured-note-fields-head strong{margin-top:3px;font-size:15px}.structured-note-fields-head span{margin-top:3px;color:var(--text-soft);font-size:10px;line-height:1.45}
.structured-note-fields-editor{display:grid;gap:10px}.structured-note-group-title{margin:5px 2px -2px;color:var(--rose);font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.06em}
.structured-note-field-row{padding:10px;border:1px solid var(--border);border-radius:15px;background:var(--surface)}.structured-note-field-label-row{display:flex;align-items:center;gap:7px;margin-bottom:6px}.structured-note-field-label-input{min-width:0!important;height:auto!important;padding:2px 4px!important;border:0!important;background:transparent!important;font-size:11px!important;font-weight:800!important;color:var(--text)!important;box-shadow:none!important}.structured-note-field-row>input[data-structured-field-value],.structured-note-field-row>textarea[data-structured-field-value]{width:100%;margin:0}.structured-note-field-row>textarea[data-structured-field-value]{min-height:82px}
.structured-note-field-remove{width:28px;height:28px;flex:0 0 auto;border:0;border-radius:9px;background:transparent;color:var(--danger);font-size:18px}.structured-note-add-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}.structured-note-add-row button{flex:1 1 110px}.structured-note-empty{display:grid;place-items:center;gap:3px;padding:18px;color:var(--text-soft);text-align:center}.structured-note-empty span{font-size:22px}.structured-note-empty strong{color:var(--text);font-size:12px}.structured-note-empty small{font-size:10px}
.focus-bouquet-card{overflow:hidden}.focus-bouquet-summary{align-items:center}.focus-summary-blooms{display:flex;gap:3px;margin-left:auto;font-size:13px}.focus-bouquet-body-clean{padding-top:8px}.focus-clean-list{display:grid;gap:7px}.focus-clean-row{display:grid;grid-template-columns:34px minmax(0,1fr) 32px;gap:8px;align-items:center;padding:9px 10px;border:1px solid var(--border);border-radius:15px;background:var(--surface)}.focus-clean-title{min-width:0;padding:0;border:0;background:transparent;text-align:left;color:var(--text)}.focus-clean-title strong,.focus-clean-title small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.focus-clean-title strong{font-size:12px}.focus-clean-title small{margin-top:3px;color:var(--text-soft);font-size:9px}.focus-clean-remove{width:30px;height:30px;border:0;border-radius:10px;background:var(--blush);color:var(--rose);font-size:18px}.focus-clean-add{width:100%;margin-top:8px;padding:11px;border:1px dashed var(--border);border-radius:14px;background:transparent;color:var(--rose);font-weight:800}.bouquet-actions-clean{display:flex;align-items:center;gap:8px;margin-top:10px}.bouquet-actions-clean .secondary-button{flex:1}.bouquet-actions-clean .text-button{flex:0 0 auto}.focus-bouquet-card:not([open]) .focus-bouquet-summary{padding-bottom:0}
@media(max-width:390px){.structured-note-add-row button{flex:1 1 calc(50% - 7px)}.focus-summary-blooms{display:none}.bouquet-actions-clean{flex-wrap:wrap}.bouquet-actions-clean .secondary-button{flex:1 1 65%}}
'''

app_path.write_text(app,encoding='utf-8')
index_path.write_text(index,encoding='utf-8')
style_path.write_text(style,encoding='utf-8')
sw_path.write_text(sw,encoding='utf-8')
print('Hana template/form/focus cleanup patch applied.')
