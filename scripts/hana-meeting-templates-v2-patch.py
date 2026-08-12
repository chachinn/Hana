from pathlib import Path
import re

APP = Path('app.js')
INDEX = Path('index.html')
STYLE = Path('style.css')
SW = Path('service-worker.js')

app = APP.read_text(encoding='utf-8')
index = INDEX.read_text(encoding='utf-8')
style = STYLE.read_text(encoding='utf-8')
sw = SW.read_text(encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)

def replace_block(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f'{label}: start marker missing')
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f'{label}: end marker missing')
    return text[:start] + replacement.rstrip() + '\n\n' + text[end:]

# ---------------- version / release notes ----------------
app = replace_once(app, 'HANA 🌸 Version 2 · internal build 2.0.20', 'HANA 🌸 Version 2 · internal build 2.0.21', 'app header build')
release_start = 'const HANA_APP_VERSION = "2.0.20";'
release_end = 'let hanaAccountState = {'
release = '''const HANA_APP_VERSION = "2.0.21";
const HANA_DISPLAY_VERSION = "2";
const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 13, 2026",
  title: "Real meeting templates 👥",
  intro: "Hana Version 2 now gives meeting agendas and minutes their own structured fields instead of putting headings inside one note box.",
  items: [
    { icon: "📋", title: "Meeting Agenda", text: "Plan meeting details, objective, attendees, agenda topics with owners and time boxes, decisions needed, prep materials, and action items." },
    { icon: "📝", title: "Minutes of the Meeting", text: "Record attendance, agenda topics, discussion summary, decisions made, action items, next meeting details, and who prepared the minutes." },
    { icon: "✅", title: "Action items still become tasks", text: "Meeting action items remain structured checklist items so Hana can turn them into tasks after the meeting." },
    { icon: "🌸", title: "Old meeting notes stay safe", text: "Existing meeting-note text is preserved as Additional notes while new templates use the structured meeting form." }
  ]
};'''
app = replace_block(app, release_start, release_end, release, 'release notes')

# ---------------- template catalog ----------------
old_template = '''  {
    id: "meeting-note",
    icon: "👥",
    title: "Meeting Notes",
    description: "Agenda + decisions + action items that can become tasks.",
    kind: "note"
  },'''
new_templates = '''  {
    id: "meeting-agenda",
    icon: "📋",
    title: "Meeting Agenda",
    description: "Plan the purpose, attendees, topics, owners, time boxes, prep materials and actions before a meeting.",
    kind: "note"
  },
  {
    id: "meeting-minutes",
    icon: "📝",
    title: "Minutes of the Meeting",
    description: "Record attendance, discussion summaries, decisions, action items and next-meeting details.",
    kind: "note"
  },'''
app = replace_once(app, old_template, new_templates, 'meeting templates catalog')

# ---------------- meeting data model + note normalization ----------------
normalizer_block = '''function normalizeMeetingAgendaItem(item = {}) {
  return {
    id: item.id || createId(),
    topic: String(item.topic || ""),
    owner: String(item.owner || ""),
    minutes: String(item.minutes || "")
  };
}

function normalizeMeetingData(data = {}) {
  const kind = data.kind === "minutes" ? "minutes" : "agenda";
  return {
    kind,
    date: String(data.date || ""),
    startTime: String(data.startTime || ""),
    endTime: String(data.endTime || ""),
    location: String(data.location || ""),
    facilitator: String(data.facilitator || ""),
    attendees: String(data.attendees || ""),
    absent: String(data.absent || ""),
    objective: String(data.objective || ""),
    agendaItems: Array.isArray(data.agendaItems)
      ? data.agendaItems.map(normalizeMeetingAgendaItem).filter(item => item.topic || item.owner || item.minutes)
      : [],
    prepMaterials: String(data.prepMaterials || ""),
    decisionsNeeded: String(data.decisionsNeeded || ""),
    discussion: String(data.discussion || ""),
    decisions: String(data.decisions || ""),
    nextMeetingDate: String(data.nextMeetingDate || ""),
    nextMeetingTime: String(data.nextMeetingTime || ""),
    preparedBy: String(data.preparedBy || "")
  };
}

function normalizeNote(note = {}) {
  const allowedStructuredTypes = ["skincare-weekly", "meeting-agenda", "meeting-minutes"];
  const structuredType = allowedStructuredTypes.includes(note.structuredType) ? note.structuredType : "";
  const meetingKind = structuredType === "meeting-minutes" ? "minutes" : structuredType === "meeting-agenda" ? "agenda" : (note.meetingData?.kind === "minutes" ? "minutes" : "agenda");
  return {
    id: note.id || createId(),
    title: String(note.title || "Untitled note"),
    type: ["note", "checklist", "meeting"].includes(note.type) ? note.type : "note",
    content: String(note.content || ""),
    project: String(note.project || ""),
    space: String(note.space || "personal"),
    tags: Array.isArray(note.tags) ? note.tags.map(String) : [],
    checklist: Array.isArray(note.checklist)
      ? note.checklist.map(item => ({ id: item.id || createId(), title: String(item.title || ""), completed: Boolean(item.completed) })).filter(item => item.title)
      : [],
    resettable: Boolean(note.resettable),
    pinned: Boolean(note.pinned),
    structuredType,
    skincareRoutine: structuredType === "skincare-weekly" ? normalizeSkincareRoutine(note.skincareRoutine || {}) : null,
    meetingData: note.type === "meeting" ? normalizeMeetingData({...(note.meetingData || {}), kind: meetingKind}) : null,
    createdAt: Number(note.createdAt || Date.now()),
    updatedAt: Number(note.updatedAt || note.createdAt || Date.now()),
    ...normalizeShareMeta(note)
  };
}'''
app = replace_block(app, 'function normalizeNote(note = {}) {', 'function normalizeReminder(reminder = {}) {', normalizer_block, 'note normalizer')

# ---------------- note cards / search ----------------
note_card_block = '''function meetingNotePreview(note) {
  const data=normalizeMeetingData(note.meetingData||{}),topics=data.agendaItems.map(item=>item.topic).filter(Boolean);
  if(data.kind==="minutes")return data.decisions||data.discussion||data.objective||topics.slice(0,3).join(" · ")||note.content||"Meeting minutes";
  return data.objective||topics.slice(0,3).join(" · ")||data.decisionsNeeded||note.content||"Meeting agenda";
}

function noteCard(note) {
  if (isSkincarePlanner(note)) return skincareRoutineCard(note);
  const done = note.checklist.filter(i=>i.completed).length;
  const preview=note.type==="meeting"?meetingNotePreview(note):note.content;
  const meetingMeta=note.type==="meeting"?normalizeMeetingData(note.meetingData||{}):null;
  return `<article class="note-card ${note.pinned ? "pinned" : ""}">
    <h3>${note.pinned ? "📌 " : ""}${noteTypeIcon(note.type)} ${escapeHTML(note.title)} ${sharedBadgeHTML(note,true)}</h3>
    ${meetingMeta?`<div class="meeting-note-meta"><span>${meetingMeta.kind==="minutes"?"Minutes":"Agenda"}</span>${meetingMeta.date?`<span>${escapeHTML(formatFullDate(meetingMeta.date))}</span>`:""}${meetingMeta.startTime?`<span>${escapeHTML(formatTime(meetingMeta.startTime))}</span>`:""}</div>`:""}
    <div class="note-preview">${escapeHTML(preview).slice(0,320)}</div>
    ${note.checklist.length ? `<div class="note-checklist">${note.checklist.slice(0,5).map(item=>`<button class="note-check-row ${item.completed?"done":""}" data-toggle-note-check="${note.id}" data-note-check-id="${item.id}"><span class="note-check-box">${item.completed?"✓":""}</span><span>${escapeHTML(item.title)}</span></button>`).join("")}</div><div class="task-meta" style="margin-top:7px;">${done}/${note.checklist.length} complete</div>` : ""}
    <div class="note-footer"><span>${modeLabel(note.space)}</span><span>${note.tags.map(t=>`#${escapeHTML(t)}`).join(" ")}</span></div>
    <div class="note-actions">
      <button data-edit-note="${note.id}">Edit</button>
      <button data-note-to-task="${note.id}">→ Task</button>
      ${note.checklist.length ? `<button data-note-actions-to-tasks="${note.id}">${note.type==="meeting"?"Meeting → Actions":"Items → Tasks"}</button>` : ""}
      ${note.resettable && note.checklist.length ? `<button data-reset-note="${note.id}">Reset</button>` : ""}
    </div>
  </article>`;
}'''
app = replace_block(app, 'function noteCard(note) {', 'function renderNotes() {', note_card_block, 'note card')

old_launcher = '''    <details class="note-template-launcher">
      <summary><span>🧩 Start from a note template</span><small>Weekly skincare · Bionote · Strategy · Measurements</small></summary>
      <div class="note-template-chip-grid">
        <button type="button" data-use-template="skincare-routine-note">🧴 Weekly Skincare</button>
        <button type="button" data-use-template="professional-bionote">👤 Professional Bionote</button>
        <button type="button" data-use-template="strategy-outline-note">🧭 Strategy / Meeting Outline</button>
        <button type="button" data-use-template="measurement-profile-note">📏 Measurement Profile</button>
      </div>
    </details>'''
new_launcher = '''    <details class="note-template-launcher">
      <summary><span>🧩 Start from a note template</span><small>Meetings · Weekly skincare · Bionote · Strategy · Measurements</small></summary>
      <div class="note-template-chip-grid">
        <button type="button" data-use-template="meeting-agenda">📋 Meeting Agenda</button>
        <button type="button" data-use-template="meeting-minutes">📝 Minutes of the Meeting</button>
        <button type="button" data-use-template="skincare-routine-note">🧴 Weekly Skincare</button>
        <button type="button" data-use-template="professional-bionote">👤 Professional Bionote</button>
        <button type="button" data-use-template="strategy-outline-note">🧭 Strategy / Meeting Outline</button>
        <button type="button" data-use-template="measurement-profile-note">📏 Measurement Profile</button>
      </div>
    </details>'''
app = replace_once(app, old_launcher, new_launcher, 'notes template launcher')

# ---------------- structured meeting editor ----------------
note_functions = '''function meetingAgendaItemRowHTML(item = {}) {
  const normalized=normalizeMeetingAgendaItem(item);
  return `<div class="meeting-agenda-row" data-meeting-agenda-row data-meeting-agenda-id="${escapeHTML(normalized.id)}">
    <label><span>Topic</span><input type="text" data-meeting-agenda-topic value="${escapeHTML(normalized.topic)}" placeholder="Topic / discussion item" /></label>
    <label><span>Owner</span><input type="text" data-meeting-agenda-owner value="${escapeHTML(normalized.owner)}" placeholder="Who leads?" /></label>
    <label><span>Time</span><input type="text" data-meeting-agenda-minutes value="${escapeHTML(normalized.minutes)}" placeholder="10 min" /></label>
    <button type="button" class="meeting-agenda-remove" data-remove-meeting-agenda-item aria-label="Remove agenda item">×</button>
  </div>`;
}

function renderMeetingAgendaItems(items = []) {
  const container=document.getElementById("meetingAgendaItems");if(!container)return;
  const rows=Array.isArray(items)&&items.length?items:[{id:createId(),topic:"",owner:"",minutes:""}];
  container.innerHTML=rows.map(meetingAgendaItemRowHTML).join("");
}

function readMeetingAgendaItems() {
  return [...document.querySelectorAll("#meetingAgendaItems [data-meeting-agenda-row]")].map(row=>normalizeMeetingAgendaItem({
    id:row.dataset.meetingAgendaId||createId(),
    topic:row.querySelector("[data-meeting-agenda-topic]")?.value.trim()||"",
    owner:row.querySelector("[data-meeting-agenda-owner]")?.value.trim()||"",
    minutes:row.querySelector("[data-meeting-agenda-minutes]")?.value.trim()||""
  })).filter(item=>item.topic||item.owner||item.minutes);
}

function addMeetingAgendaItem() {
  const container=document.getElementById("meetingAgendaItems");if(!container)return;
  container.insertAdjacentHTML("beforeend",meetingAgendaItemRowHTML({id:createId()}));
  const rows=container.querySelectorAll("[data-meeting-agenda-row]");rows[rows.length-1]?.querySelector("[data-meeting-agenda-topic]")?.focus();
}

function removeMeetingAgendaItem(button) {
  const row=button?.closest?.("[data-meeting-agenda-row]");if(!row)return;
  row.remove();
  if(!document.querySelector("#meetingAgendaItems [data-meeting-agenda-row]"))renderMeetingAgendaItems([]);
}

function readMeetingData() {
  return normalizeMeetingData({
    kind:document.getElementById("meetingKind")?.value||"agenda",
    date:document.getElementById("meetingDate")?.value||"",
    startTime:document.getElementById("meetingStartTime")?.value||"",
    endTime:document.getElementById("meetingEndTime")?.value||"",
    location:document.getElementById("meetingLocation")?.value.trim()||"",
    facilitator:document.getElementById("meetingFacilitator")?.value.trim()||"",
    attendees:document.getElementById("meetingAttendees")?.value.trim()||"",
    absent:document.getElementById("meetingAbsent")?.value.trim()||"",
    objective:document.getElementById("meetingObjective")?.value.trim()||"",
    agendaItems:readMeetingAgendaItems(),
    prepMaterials:document.getElementById("meetingPrepMaterials")?.value.trim()||"",
    decisionsNeeded:document.getElementById("meetingDecisionsNeeded")?.value.trim()||"",
    discussion:document.getElementById("meetingDiscussion")?.value.trim()||"",
    decisions:document.getElementById("meetingDecisions")?.value.trim()||"",
    nextMeetingDate:document.getElementById("meetingNextDate")?.value||"",
    nextMeetingTime:document.getElementById("meetingNextTime")?.value||"",
    preparedBy:document.getElementById("meetingPreparedBy")?.value.trim()||""
  });
}

function populateMeetingData(note = null) {
  const data=normalizeMeetingData(note?.meetingData||{kind:note?.structuredType==="meeting-minutes"?"minutes":"agenda"});
  const values={meetingKind:data.kind,meetingDate:data.date,meetingStartTime:data.startTime,meetingEndTime:data.endTime,meetingLocation:data.location,meetingFacilitator:data.facilitator,meetingAttendees:data.attendees,meetingAbsent:data.absent,meetingObjective:data.objective,meetingPrepMaterials:data.prepMaterials,meetingDecisionsNeeded:data.decisionsNeeded,meetingDiscussion:data.discussion,meetingDecisions:data.decisions,meetingNextDate:data.nextMeetingDate,meetingNextTime:data.nextMeetingTime,meetingPreparedBy:data.preparedBy};
  Object.entries(values).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.value=value||"";});
  renderMeetingAgendaItems(data.agendaItems);
  updateMeetingKindFields();
}

function clearNoteForm() {
  ["noteEditId","noteStructuredType","noteTitle","noteTags","noteContent","noteChecklist","noteProject","meetingDate","meetingStartTime","meetingEndTime","meetingLocation","meetingFacilitator","meetingAttendees","meetingAbsent","meetingObjective","meetingPrepMaterials","meetingDecisionsNeeded","meetingDiscussion","meetingDecisions","meetingNextDate","meetingNextTime","meetingPreparedBy"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
  refreshProjectDatalist();
  document.getElementById("noteType").value="note";
  document.getElementById("meetingKind").value="agenda";
  document.getElementById("noteSpace").value=preferredSpace();
  document.getElementById("notePinned").checked=false; document.getElementById("noteResettable").checked=false;
  document.getElementById("noteModalEyebrow").textContent="NEW NOTE"; document.getElementById("noteModalTitle").textContent="Capture a thought"; document.getElementById("saveNoteButton").textContent="Save note";
  document.getElementById("deleteNoteFromModal").classList.add("hidden");
  renderMeetingAgendaItems([]);updateNoteConditionalFields();
}

function openNoteModal(noteId="") {
  clearNoteForm();
  const note = state.notes.find(n=>n.id===noteId);
  if (note) {
    document.getElementById("noteEditId").value=note.id; document.getElementById("noteStructuredType").value=note.structuredType||""; document.getElementById("noteTitle").value=note.title; document.getElementById("noteType").value=note.type; document.getElementById("noteSpace").value=note.space; document.getElementById("noteTags").value=note.tags.join(", "); document.getElementById("noteProject").value=note.project||""; document.getElementById("noteContent").value=note.content; document.getElementById("noteChecklist").value=note.checklist.map(i=>i.title).join("\\n"); document.getElementById("noteResettable").checked=note.resettable; document.getElementById("notePinned").checked=note.pinned;
    if(note.type==="meeting")populateMeetingData(note);
    document.getElementById("noteModalEyebrow").textContent="NOTE DETAILS"; document.getElementById("noteModalTitle").textContent="Edit note"; document.getElementById("saveNoteButton").textContent="Save changes"; document.getElementById("deleteNoteFromModal").classList.remove("hidden"); updateNoteConditionalFields();
  }
  openModal("noteModal");
}

function updateMeetingKindFields() {
  const kind=document.getElementById("meetingKind")?.value==="minutes"?"minutes":"agenda";
  document.getElementById("meetingAgendaOnlyWrap")?.classList.toggle("hidden",kind!=="agenda");
  document.getElementById("meetingMinutesOnlyWrap")?.classList.toggle("hidden",kind!=="minutes");
  document.getElementById("meetingAbsentWrap")?.classList.toggle("hidden",kind!=="minutes");
  const structured=document.getElementById("noteStructuredType");if(structured&&document.getElementById("noteType")?.value==="meeting")structured.value=kind==="minutes"?"meeting-minutes":"meeting-agenda";
}

function updateNoteConditionalFields() {
  const type = document.getElementById("noteType")?.value;
  const meeting=type==="meeting";
  const showChecklist=["checklist","meeting"].includes(type);
  document.getElementById("meetingFieldsWrap")?.classList.toggle("hidden",!meeting);
  document.getElementById("noteToolbar")?.classList.toggle("hidden",meeting);
  document.getElementById("noteResettableWrap")?.classList.toggle("hidden", type !== "checklist");
  document.getElementById("noteChecklistWrap")?.classList.toggle("hidden", !showChecklist);
  const contentLabel=document.getElementById("noteContentLabel");if(contentLabel)contentLabel.textContent=meeting?"Additional notes":"Note";
  const content=document.getElementById("noteContent");if(content)content.placeholder=meeting?"Anything else worth keeping from this meeting...":"Write anything...";
  const checklistLabel=document.getElementById("noteChecklistLabel");if(checklistLabel)checklistLabel.textContent=meeting?"Action items / next steps":"Checklist / action items";
  const checklistHelp=document.getElementById("noteChecklistHelp");if(checklistHelp)checklistHelp.textContent=meeting?"One action per line. Hana can turn these into tasks.":"Checklist items can be managed here.";
  if(meeting){if(!document.querySelector("#meetingAgendaItems [data-meeting-agenda-row]"))renderMeetingAgendaItems([]);updateMeetingKindFields();}
}

function meetingHasMeaningfulData(data) {
  if(!data)return false;
  return Boolean(data.date||data.startTime||data.endTime||data.location||data.facilitator||data.attendees||data.absent||data.objective||data.agendaItems.length||data.prepMaterials||data.decisionsNeeded||data.discussion||data.decisions||data.nextMeetingDate||data.nextMeetingTime||data.preparedBy);
}

function saveNote() {
  const id=document.getElementById("noteEditId").value; const old=id?state.notes.find(n=>n.id===id):null;
  const type=document.getElementById("noteType").value,title=document.getElementById("noteTitle").value.trim(),content=document.getElementById("noteContent").value.trim();
  const oldChecks=old?.checklist||[];
  const checks=parseLines(document.getElementById("noteChecklist").value).map(title=>{ const e=oldChecks.find(i=>i.title===title); return e?{...e}:{id:createId(),title,completed:false}; });
  const meetingData=type==="meeting"?readMeetingData():null;
  if (!title && !content && !checks.length && !meetingHasMeaningfulData(meetingData)) return showToast("Write something first 🌸");
  const structuredType=type==="meeting"?(meetingData.kind==="minutes"?"meeting-minutes":"meeting-agenda"):(old?.structuredType==="skincare-weekly"?"skincare-weekly":"");
  const fallbackTitle=type==="meeting"?(meetingData.kind==="minutes"?"Minutes of the Meeting":"Meeting Agenda"):"Untitled note";
  const note=normalizeNote({...(old||{}),id:id||createId(),title:title||fallbackTitle,type,space:document.getElementById("noteSpace").value,project:document.getElementById("noteProject").value.trim(),tags:parseTags(document.getElementById("noteTags").value),content,checklist:checks,resettable:document.getElementById("noteResettable").checked,pinned:document.getElementById("notePinned").checked,structuredType,meetingData,...shareMetaFromControl("note",old),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()});
  if(old) state.notes[state.notes.findIndex(n=>n.id===id)]=note; else state.notes.push(note);
  ensureProjectRecord(note.project, note.space);
  closeModal("noteModal"); showToast(old?"Note updated 🌸":"Note saved 🌸"); render();
}'''
app = replace_block(app, 'function clearNoteForm() {', 'function deleteNote(id) {', note_functions, 'note editor functions')

# Search includes structured meeting fields.
old_search = 'const skincare=isSkincarePlanner(n)?(n.skincareRoutine?.steps||[]).flatMap(step=>[step.category,step.product,step.notes]):[];\n    return [n.title,n.content,...n.tags,...n.checklist.map(i=>i.title),n.skincareRoutine?.focus||"",...skincare].join(" ").toLowerCase().includes(q);'
new_search = 'const skincare=isSkincarePlanner(n)?(n.skincareRoutine?.steps||[]).flatMap(step=>[step.category,step.product,step.notes]):[];\n    const meeting=n.type==="meeting"?normalizeMeetingData(n.meetingData||{}):null;\n    const meetingText=meeting?[meeting.kind,meeting.date,meeting.location,meeting.facilitator,meeting.attendees,meeting.absent,meeting.objective,meeting.prepMaterials,meeting.decisionsNeeded,meeting.discussion,meeting.decisions,meeting.nextMeetingDate,meeting.preparedBy,...meeting.agendaItems.flatMap(item=>[item.topic,item.owner,item.minutes])]:[];\n    return [n.title,n.content,...n.tags,...n.checklist.map(i=>i.title),n.skincareRoutine?.focus||"",...skincare,...meetingText].join(" ").toLowerCase().includes(q);'
app = replace_once(app, old_search, new_search, 'meeting search')

# Template launch behavior. Replace the old meeting-note branch by regex so nearby unrelated templates remain untouched.
pattern = re.compile(r'\n  if \(templateId === "meeting-note"\) \{.*?\n  \}\n', re.S)
match = pattern.search(app)
if not match:
    raise SystemExit('meeting-note useTemplate branch not found')
replacement = '''
  if (["meeting-agenda","meeting-minutes"].includes(templateId)) {
    const isMinutes=templateId==="meeting-minutes";
    const note=normalizeNote({
      title:isMinutes?"Minutes of the Meeting":"Meeting Agenda",
      type:"meeting",
      structuredType:isMinutes?"meeting-minutes":"meeting-agenda",
      space,
      tags:isMinutes?["meeting","minutes"]:["meeting","agenda"],
      content:"",
      checklist:[],
      meetingData:{kind:isMinutes?"minutes":"agenda",date:todayISO(),agendaItems:[]},
      createdAt:Date.now(),
      updatedAt:Date.now()
    });
    state.notes.push(note);
    showToast(isMinutes?"Meeting minutes created 📝":"Meeting agenda created 📋");
    return openNoteModal(note.id);
  }
'''
app = app[:match.start()] + replacement + app[match.end():]

# Click handlers for agenda rows.
anchor = '  if(event.target.closest("[data-open-quick-note]")){openQuickNoteModal();return;}'
insert = '''  if(event.target.closest("[data-add-meeting-agenda-item]")){addMeetingAgendaItem();return;}
  const removeMeetingAgenda=event.target.closest("[data-remove-meeting-agenda-item]");if(removeMeetingAgenda){removeMeetingAgendaItem(removeMeetingAgenda);return;}

'''
app = replace_once(app, anchor, insert + anchor, 'meeting agenda click handlers')

# Change handler for format selection.
change_anchor = 'if(event.target.id==="noteType")updateNoteConditionalFields();'
app = replace_once(app, change_anchor, change_anchor + 'if(event.target.id==="meetingKind")updateMeetingKindFields();', 'meeting format change handler')

# ---------------- note modal HTML ----------------
index = replace_once(index, '<meta name="hana-app-version" content="2.0.20" />', '<meta name="hana-app-version" content="2.0.21" />', 'index build meta')
index = replace_once(index, 'style.css?v=2.0.20', 'style.css?v=2.0.21', 'style query')
index = replace_once(index, 'app.js?v=2.0.20', 'app.js?v=2.0.21', 'app query')
index = replace_once(index, '<input id="noteEditId" type="hidden" />', '<input id="noteEditId" type="hidden" />\n      <input id="noteStructuredType" type="hidden" />', 'structured type hidden input')

old_note_body = '''      <div class="note-toolbar" aria-label="Note formatting shortcuts">
        <button type="button" data-note-insert="# ">H1</button>
        <button type="button" data-note-insert="## ">H2</button>
        <button type="button" data-note-insert="• ">• List</button>
        <button type="button" data-note-insert="**text**">B</button>
      </div>

      <div class="form-group"><label for="noteContent">Note</label><textarea id="noteContent" class="large-textarea" placeholder="Write anything..."></textarea></div>

      <div id="noteChecklistWrap" class="form-group hidden">
        <label for="noteChecklist">Checklist / action items</label>
        <textarea id="noteChecklist" placeholder="One item per line\\nSend revised tracker\\nAsk Finance about approval"></textarea>
        <small class="field-help">Meeting notes can turn these lines into tasks.</small>
      </div>'''
new_note_body = '''      <div id="meetingFieldsWrap" class="meeting-fields hidden">
        <section class="meeting-form-section">
          <div class="meeting-form-section-head"><div><small>MEETING SETUP</small><strong>Details</strong></div></div>
          <div class="form-row">
            <div class="form-group"><label for="meetingKind">Meeting format</label><select id="meetingKind"><option value="agenda">📋 Meeting Agenda</option><option value="minutes">📝 Minutes of the Meeting</option></select></div>
            <div class="form-group"><label for="meetingDate">Date</label><input id="meetingDate" type="date" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label for="meetingStartTime">Start time</label><input id="meetingStartTime" type="time" /></div>
            <div class="form-group"><label for="meetingEndTime">End time <span class="optional-label">optional</span></label><input id="meetingEndTime" type="time" /></div>
          </div>
          <div class="form-group"><label for="meetingLocation">Location / meeting link <span class="optional-label">optional</span></label><input id="meetingLocation" type="text" placeholder="Conference room, Teams/Meet link..." /></div>
          <div class="form-group"><label for="meetingFacilitator">Facilitator / Chair</label><input id="meetingFacilitator" type="text" placeholder="Who is leading the meeting?" /></div>
        </section>

        <section class="meeting-form-section">
          <div class="meeting-form-section-head"><div><small>PURPOSE & PEOPLE</small><strong>Why are we meeting?</strong></div></div>
          <div class="form-group"><label for="meetingObjective">Objective / desired outcome</label><textarea id="meetingObjective" placeholder="What should this meeting accomplish or decide?"></textarea></div>
          <div class="form-group"><label for="meetingAttendees">Attendees</label><textarea id="meetingAttendees" placeholder="Names or teams attending"></textarea></div>
          <div id="meetingAbsentWrap" class="form-group hidden"><label for="meetingAbsent">Absent / apologies</label><textarea id="meetingAbsent" placeholder="People invited but not present"></textarea></div>
        </section>

        <section class="meeting-form-section">
          <div class="meeting-form-section-head meeting-agenda-head"><div><small>AGENDA</small><strong>Topics</strong><span>Give each topic an owner and time box.</span></div><button type="button" class="secondary-button compact-button" data-add-meeting-agenda-item>+ Add topic</button></div>
          <div class="meeting-agenda-column-head" aria-hidden="true"><span>Topic</span><span>Owner</span><span>Time</span><span></span></div>
          <div id="meetingAgendaItems" class="meeting-agenda-items"></div>
        </section>

        <section id="meetingAgendaOnlyWrap" class="meeting-form-section">
          <div class="meeting-form-section-head"><div><small>BEFORE THE MEETING</small><strong>Preparation</strong></div></div>
          <div class="form-group"><label for="meetingDecisionsNeeded">Decisions needed <span class="optional-label">optional</span></label><textarea id="meetingDecisionsNeeded" placeholder="What decisions should be reached during this meeting?"></textarea></div>
          <div class="form-group"><label for="meetingPrepMaterials">Prep / reference materials <span class="optional-label">optional</span></label><textarea id="meetingPrepMaterials" placeholder="Links, files, reports, data, pre-reading..."></textarea></div>
        </section>

        <section id="meetingMinutesOnlyWrap" class="meeting-form-section hidden">
          <div class="meeting-form-section-head"><div><small>MEETING RECORD</small><strong>What happened?</strong></div></div>
          <div class="form-group"><label for="meetingDiscussion">Discussion summary</label><textarea id="meetingDiscussion" class="large-textarea" placeholder="Key points discussed under the agenda..."></textarea></div>
          <div class="form-group"><label for="meetingDecisions">Decisions made</label><textarea id="meetingDecisions" placeholder="Record agreed decisions and outcomes clearly"></textarea></div>
          <div class="form-row">
            <div class="form-group"><label for="meetingNextDate">Next meeting <span class="optional-label">optional</span></label><input id="meetingNextDate" type="date" /></div>
            <div class="form-group"><label for="meetingNextTime">Time <span class="optional-label">optional</span></label><input id="meetingNextTime" type="time" /></div>
          </div>
          <div class="form-group"><label for="meetingPreparedBy">Minutes prepared by <span class="optional-label">optional</span></label><input id="meetingPreparedBy" type="text" placeholder="Name / role" /></div>
        </section>
      </div>

      <div id="noteToolbar" class="note-toolbar" aria-label="Note formatting shortcuts">
        <button type="button" data-note-insert="# ">H1</button>
        <button type="button" data-note-insert="## ">H2</button>
        <button type="button" data-note-insert="• ">• List</button>
        <button type="button" data-note-insert="**text**">B</button>
      </div>

      <div id="noteContentWrap" class="form-group"><label id="noteContentLabel" for="noteContent">Note</label><textarea id="noteContent" class="large-textarea" placeholder="Write anything..."></textarea></div>

      <div id="noteChecklistWrap" class="form-group hidden">
        <label id="noteChecklistLabel" for="noteChecklist">Checklist / action items</label>
        <textarea id="noteChecklist" placeholder="One item per line\\nSend revised tracker\\nAsk Finance about approval"></textarea>
        <small id="noteChecklistHelp" class="field-help">Checklist items can be managed here.</small>
      </div>'''
index = replace_once(index, old_note_body, new_note_body, 'note modal structured meeting fields')

# ---------------- styles ----------------
css_marker = '/* HANA STRUCTURED MEETING TEMPLATES */'
if css_marker in style:
    raise SystemExit('meeting template CSS already exists')
style += '''\n\n/* HANA STRUCTURED MEETING TEMPLATES */
.meeting-fields{display:grid;gap:14px;margin:4px 0 14px}.meeting-form-section{border:1px solid var(--border);border-radius:20px;padding:14px;background:color-mix(in srgb,var(--surface) 96%,var(--blush))}.meeting-form-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px}.meeting-form-section-head>div{display:grid;gap:2px}.meeting-form-section-head small{font-size:9px;font-weight:800;letter-spacing:.08em;color:var(--rose)}.meeting-form-section-head strong{font-size:14px}.meeting-form-section-head span{font-size:10px;color:var(--text-soft);font-weight:500}.meeting-agenda-head{align-items:center}.meeting-agenda-column-head,.meeting-agenda-row{display:grid;grid-template-columns:minmax(130px,1.45fr) minmax(92px,.9fr) 72px 32px;gap:7px;align-items:center}.meeting-agenda-column-head{padding:0 5px 6px;color:var(--text-soft);font-size:9px;font-weight:800}.meeting-agenda-items{display:grid;gap:7px}.meeting-agenda-row{padding:8px;border:1px solid var(--border);border-radius:13px;background:var(--surface)}.meeting-agenda-row label{min-width:0;margin:0}.meeting-agenda-row label>span{display:none}.meeting-agenda-row input{width:100%;min-width:0;height:38px;margin:0;padding:8px;border-radius:9px;font-size:11px}.meeting-agenda-remove{width:30px;height:30px;border:0;border-radius:9px;background:transparent;color:var(--danger);font-size:20px;line-height:1}.meeting-note-meta{display:flex;gap:6px;flex-wrap:wrap;margin:-2px 0 8px}.meeting-note-meta span{padding:4px 7px;border-radius:999px;background:var(--blush);color:var(--text-soft);font-size:9px;font-weight:700}.meeting-fields textarea{min-height:86px}.meeting-fields .large-textarea{min-height:150px}
@media(max-width:460px){.meeting-agenda-column-head{display:none}.meeting-agenda-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 32px;align-items:start;padding:10px}.meeting-agenda-row label>span{display:block;margin:0 0 4px 2px;color:var(--text-soft);font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.meeting-agenda-row label:nth-child(1){grid-column:1/3}.meeting-agenda-row label:nth-child(2){grid-column:1}.meeting-agenda-row label:nth-child(3){grid-column:2}.meeting-agenda-remove{grid-column:3;grid-row:1;margin-top:17px}.meeting-form-section{padding:12px}.meeting-agenda-head{align-items:flex-start;flex-direction:column}.meeting-agenda-head button{width:100%}}
'''

# ---------------- service worker ----------------
sw = replace_once(sw, 'Service Worker v53', 'Service Worker v54', 'service worker version')
sw = replace_once(sw, 'hana-shell-v53', 'hana-shell-v54', 'cache name')
sw = replace_once(sw, 'style.css?v=2.0.20', 'style.css?v=2.0.21', 'cached style version')
sw = replace_once(sw, 'app.js?v=2.0.20', 'app.js?v=2.0.21', 'cached app version')

APP.write_text(app, encoding='utf-8')
INDEX.write_text(index, encoding='utf-8')
STYLE.write_text(style, encoding='utf-8')
SW.write_text(sw, encoding='utf-8')
print('Structured meeting template patch applied.')
