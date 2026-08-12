from pathlib import Path

APP=Path('app.js')
INDEX=Path('index.html')
STYLE=Path('style.css')
SW=Path('service-worker.js')
app=APP.read_text(encoding='utf-8')
index=INDEX.read_text(encoding='utf-8')
style=STYLE.read_text(encoding='utf-8')
sw=SW.read_text(encoding='utf-8')

def replace_once(text, old, new, label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old,new,1)

def replace_block(text,start_marker,end_marker,replacement,label):
    start=text.find(start_marker)
    if start<0: raise SystemExit(f'{label}: start marker missing')
    end=text.find(end_marker,start)
    if end<0: raise SystemExit(f'{label}: end marker missing')
    return text[:start]+replacement.rstrip()+"\n\n"+text[end:]

# Internal build bump; Hana still displays simply Version 2.
app=replace_once(app,'HANA 🌸 Version 2 · internal build 2.0.21','HANA 🌸 Version 2 · internal build 2.0.22','app header')
release='''const HANA_APP_VERSION = "2.0.22";
const HANA_DISPLAY_VERSION = "2";
const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 13, 2026",
  title: "Templates are previews first 🌸",
  intro: "Hana Version 2 no longer adds a template to your real data just because you opened it to look around.",
  items: [
    { icon: "👀", title: "Preview without creating", text: "Opening a task, note, list or tracker template now fills an unsaved draft instead of adding it immediately." },
    { icon: "✅", title: "Save when you actually want it", text: "A template becomes a real Hana item only after you tap its normal Create or Save button." },
    { icon: "☑️", title: "List starter items stay intact", text: "Groceries and Packing can still start with their suggested items, but those items are held only in the draft until you create the list." },
    { icon: "🛡️", title: "Cancel means cancel", text: "Closing or cancelling a template preview leaves Notes, Lists, Tasks and Trackers completely unchanged." }
  ]
};'''
app=replace_block(app,'const HANA_APP_VERSION = "2.0.21";','let hanaAccountState = {',release,'release notes')

# Template page language reflects preview-first behavior.
app=replace_once(app,'<p>Reusable structures for recurring tasks, lists, trackers and reference notes.</p>','<p>Preview reusable structures safely. Nothing is added until you choose to save it.</p>','template page copy')
app=replace_once(app,'<button class="secondary-button" data-use-template="${template.id}">Use</button>','<button class="secondary-button" data-use-template="${template.id}">Preview</button>','template button')

helpers='''function clearTemplateDraftBanner(modalId) {
  document.querySelector(`#${modalId} [data-template-draft-banner]`)?.remove();
}

function showTemplateDraftBanner(modalId, detail="", previewItems=[]) {
  clearTemplateDraftBanner(modalId);
  const modal=document.getElementById(modalId),header=modal?.querySelector(".modal-header");
  if(!modal||!header)return;
  const banner=document.createElement("div");
  banner.className="template-draft-banner";
  banner.dataset.templateDraftBanner="true";
  banner.innerHTML=`<div class="template-draft-banner-icon">👀</div><div><strong>Template preview · not saved yet</strong><p>${escapeHTML(detail||"Look around or edit anything you want. This will not appear in Hana until you tap Create or Save.")}</p>${previewItems.length?`<div class="template-draft-preview-items">${previewItems.slice(0,8).map(item=>`<span>${escapeHTML(String(item))}</span>`).join("")}</div>`:""}</div>`;
  header.insertAdjacentElement("afterend",banner);
}

function openTaskTemplateDraft(definition={}) {
  openTaskModal();
  refreshSpaceSelects();
  document.getElementById("taskTitle").value=definition.title||"";
  document.getElementById("taskSpace").value=definition.space||preferredSpace();
  document.getElementById("taskPriority").value=definition.priority||"medium";
  document.getElementById("taskStatus").value=definition.status||"todo";
  document.getElementById("taskSubtasks").value=(definition.subtasks||[]).join("\\n");
  document.getElementById("taskRecurrenceType").value=definition.recurrenceType||"none";
  document.getElementById("taskRecurrenceInterval").value=String(definition.recurrenceInterval||1);
  updateTaskConditionalFields();
  const advanced=document.getElementById("taskAdvancedDetails");if(advanced)advanced.open=true;
  document.getElementById("taskModalEyebrow").textContent="TEMPLATE PREVIEW";
  document.getElementById("taskModalTitle").textContent=definition.title||"Task template";
  document.getElementById("saveTaskButton").textContent="Create task";
  showTemplateDraftBanner("taskModal","Review or customize this task. Closing it creates nothing.",definition.subtasks||[]);
}

function openNoteTemplateDraft(definition={}) {
  openNoteModal();
  refreshSpaceSelects();
  const type=definition.type||"note";
  document.getElementById("noteTitle").value=definition.title||"";
  document.getElementById("noteType").value=type;
  document.getElementById("noteSpace").value=definition.space||preferredSpace();
  document.getElementById("noteTags").value=(definition.tags||[]).join(", ");
  document.getElementById("noteContent").value=definition.content||"";
  document.getElementById("noteChecklist").value=(definition.checklist||[]).join("\\n");
  document.getElementById("noteResettable").checked=Boolean(definition.resettable);
  document.getElementById("noteStructuredType").value=definition.structuredType||"";
  updateNoteConditionalFields();
  if(type==="meeting")populateMeetingData({structuredType:definition.structuredType||"meeting-agenda",meetingData:definition.meetingData||{kind:"agenda"}});
  document.getElementById("noteModalEyebrow").textContent="TEMPLATE PREVIEW";
  document.getElementById("noteModalTitle").textContent=definition.title||"Note template";
  document.getElementById("saveNoteButton").textContent="Save to Notes";
  showTemplateDraftBanner("noteModal","This is only a working preview. Close it if you do not want to keep it.");
}

function openListTemplateDraft(templateId) {
  const template=LIST_TEMPLATES[templateId];if(!template)return showToast("Template not found.");
  openListModal();
  pendingListTemplateItems=(template.items||[]).map(title=>({id:createId(),title,detail:"",quantity:"",lane:"both",completed:false,createdAt:Date.now(),updatedAt:Date.now()}));
  document.getElementById("listName").value=template.name||"";
  document.getElementById("listIcon").value=template.icon||"☑️";
  document.getElementById("listColumnMode").checked=templateId==="grocery";
  document.getElementById("listColumnCount").value="3";
  updateListColumnSettingsVisibility();
  document.getElementById("listModalEyebrow").textContent="TEMPLATE PREVIEW";
  document.getElementById("listModalTitle").textContent=template.name||"List template";
  document.getElementById("saveListButton").textContent="Create list";
  showTemplateDraftBanner("listModal","Starter items are being previewed only. They are added to the list only after you tap Create list.",template.items||[]);
}

function openTableTemplateDraft(definition={}) {
  openTableModal();
  document.getElementById("tableTemplate").value="blank";
  document.getElementById("tableName").value=definition.name||"";
  document.getElementById("tableSpace").value=definition.space||preferredSpace();
  setTableBuilderColumns(definition.columns||[{name:"Item",type:"text"}]);
  document.getElementById("tableStatusOptions").value=(definition.statusOptions||DEFAULT_TABLE_STATUSES).join(", ");
  refreshTableSortColumnOptions(tableBuilderColumns[0]?.id||"");
  updateTableSortFields();
  document.getElementById("tableModalEyebrow").textContent="TEMPLATE PREVIEW";
  document.getElementById("tableModalTitle").textContent=definition.name||"Tracker template";
  document.getElementById("saveTableButton").textContent="Create tracker";
  showTemplateDraftBanner("tableModal","These columns are only a preview until you tap Create tracker.",(definition.columns||[]).map(column=>column.name));
}
'''

use_template='''function useTemplate(templateId) {
  const space=preferredSpace();

  if(templateId==="weekly-review")return openTaskTemplateDraft({
    title:"Weekly Review",space,priority:"medium",status:"todo",recurrenceType:"weekly",
    subtasks:["Review open tasks","Check Waiting On / follow-ups","Choose next week's priorities"]
  });

  if(templateId==="monthly-life-admin")return openTaskTemplateDraft({
    title:"Monthly Life Admin",space,priority:"medium",status:"todo",recurrenceType:"monthly",
    subtasks:["Review bills and subscriptions","Check documents / renewals","Clear personal loose ends"]
  });

  if(["meeting-agenda","meeting-minutes"].includes(templateId)){
    const isMinutes=templateId==="meeting-minutes";
    return openNoteTemplateDraft({
      title:isMinutes?"Minutes of the Meeting":"Meeting Agenda",
      type:"meeting",
      structuredType:isMinutes?"meeting-minutes":"meeting-agenda",
      space,
      tags:isMinutes?["meeting","minutes"]:["meeting","agenda"],
      meetingData:{kind:isMinutes?"minutes":"agenda",date:todayISO(),agendaItems:[]}
    });
  }

  if(templateId==="skincare-routine-note"){
    closeNavDrawer();
    openSkincareRoutineModal("",{edit:true});
    showTemplateDraftBanner("skincareRoutineModal","Build or inspect the routine first. Nothing is added to Notes until you tap Save whole week.");
    return;
  }

  if(["professional-bionote","strategy-outline-note","measurement-profile-note"].includes(templateId)){
    const definitions={
      "professional-bionote":{
        title:"Professional Bionote",tags:["reference","bio","professional"],content:`## Name & current role
Full name:
Current title / position:
Organization:
Primary responsibilities:

## Professional experience
Years of experience:
Key areas of work:
Major programs / responsibilities:

## Education
Degree / institution:
Graduate studies / institution:
Honors / distinctions:

## Training & development
- Program / institution / year:
- Program / institution / year:

## Projects, achievements & presentations
-

## Short version
Write a 2–4 sentence version here for programs, introductions or speaker profiles.`
      },
      "strategy-outline-note":{
        title:"Strategy / Meeting Outline",tags:["work","strategy","meeting"],content:`## Objective

## Additional strategies / ideas
-

## Presentation / meeting structure
1.
2.
3.

## Key data / evidence needed
-

## Decisions / agreements
-

## Action items
- Owner — Action — Due date

## Assistance / dependencies
-

## Ways forward
-`
      },
      "measurement-profile-note":{
        title:"Measurement Profile",tags:["reference","measurements"],content:`## Profile
Person:
Date measured:
Units: inches / cm

## Upper body
1. Neck —
2. Overbust —
3. Bust —
4. Underbust —
5. Shoulder to shoulder —
6. Shoulder seam to wrist —
7. Shoulder seam to neck —
8. Arm hole —
9. Bicep —
10. Forearm —
11. Wrist around —

## Torso / lower body
12. Waist —
13. Hips —
14. Top of shoulder to waist —
15. Inseam —
16. Outseam —

## Length references
17. Neck to top of heel —
18. Neck to top of knee —
19. Top of knee to ankle —

## Height / weight
Height —
Weight —

## Notes
- Fit preference / ease:
- Clothing / tailoring notes:
- Updated measurements:`
      }
    };
    const definition=definitions[templateId];
    return openNoteTemplateDraft({...definition,type:"note",space});
  }

  if(templateId==="grocery-list"||templateId==="packing-list")return openListTemplateDraft(templateId==="grocery-list"?"grocery":"packing");

  if(templateId==="weekly-reset")return openNoteTemplateDraft({
    title:"Weekly Reset",type:"checklist",space,tags:["weekly","home"],resettable:true,
    checklist:["Review calendar","Reset important spaces","Plan meals / errands","Choose personal priorities"]
  });

  if(templateId==="work-deliverables"||templateId==="bills-tracker"){
    const isWork=templateId==="work-deliverables";
    return openTableTemplateDraft({
      name:isWork?"Work Deliverables":"Bills Tracker",
      space:isWork&&state.spaces.some(item=>item.id==="work")?"work":space,
      columns:isWork?[
        {name:"Deliverable",type:"text"},{name:"Owner",type:"text"},{name:"Progress",type:"progress"},{name:"Due",type:"date"},{name:"Status",type:"status"},{name:"Remarks",type:"text"},{name:"Done",type:"checkbox"}
      ]:[
        {name:"Bill",type:"text"},{name:"Amount",type:"money"},{name:"Due",type:"date"},{name:"Paid",type:"checkbox"}
      ],
      statusOptions:DEFAULT_TABLE_STATUSES.slice()
    });
  }

  showToast("Template not found.");
}'''
app=replace_block(app,'function useTemplate(templateId) {','function renderTrash() {',helpers+'\n\n'+use_template,'template architecture')

# Clear preview banners whenever a normal editor is opened again.
app=replace_once(app,'function clearTaskForm() {\n  ["taskEditId"','function clearTaskForm() {\n  clearTemplateDraftBanner("taskModal");\n  ["taskEditId"','task banner cleanup')
app=replace_once(app,'function clearNoteForm() {\n  ["noteEditId"','function clearNoteForm() {\n  clearTemplateDraftBanner("noteModal");\n  ["noteEditId"','note banner cleanup')
app=replace_once(app,'function clearListForm() {\n  refreshSpaceSelects();','let pendingListTemplateItems=[];\n\nfunction clearListForm() {\n  pendingListTemplateItems=[];\n  clearTemplateDraftBanner("listModal");\n  refreshSpaceSelects();','list draft state')
app=replace_once(app,'    items: old?.items || [],','    items: old?.items || pendingListTemplateItems.map(item=>({...item})),','list starter items on save')
app=replace_once(app,'  if (old) state.lists[state.lists.findIndex(item => item.id === id)] = list;\n  else state.lists.push(list);\n  state.activeListId = list.id;','  if (old) state.lists[state.lists.findIndex(item => item.id === id)] = list;\n  else state.lists.push(list);\n  pendingListTemplateItems=[];\n  state.activeListId = list.id;','clear list draft after save')
app=replace_once(app,'function clearTableForm(){refreshSpaceSelects();','function clearTableForm(){clearTemplateDraftBanner("tableModal");refreshSpaceSelects();','table banner cleanup')
app=replace_once(app,'function openSkincareRoutineModal(noteId="", options={}) {const note=','function openSkincareRoutineModal(noteId="", options={}) {clearTemplateDraftBanner("skincareRoutineModal");const note=','skincare banner cleanup')

# Keep createListFromTemplate for explicit one-click creation paths elsewhere; template library now uses the draft opener.

# Styling for a clear preview state.
marker='/* HANA TEMPLATE DRAFT PREVIEW */'
if marker not in style:
    style += '''\n\n/* HANA TEMPLATE DRAFT PREVIEW */
.template-draft-banner {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: -2px 0 14px;
  padding: 12px 13px;
  border: 1px dashed var(--border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--blush) 65%, var(--surface));
}
.template-draft-banner-icon { font-size: 18px; line-height: 1.2; }
.template-draft-banner strong { display:block; font-size:12px; }
.template-draft-banner p { margin:3px 0 0; color:var(--text-soft); font-size:10px; line-height:1.45; }
.template-draft-preview-items { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
.template-draft-preview-items span { padding:4px 7px; border:1px solid var(--border); border-radius:999px; background:var(--surface); color:var(--text-soft); font-size:9px; }
'''

# PWA build/cache bump while visible product version remains Version 2.
index=replace_once(index,'hana-app-version" content="2.0.21"','hana-app-version" content="2.0.22"','index meta')
index=replace_once(index,'style.css?v=2.0.21','style.css?v=2.0.22','index css')
index=replace_once(index,'app.js?v=2.0.21','app.js?v=2.0.22','index app')
sw=replace_once(sw,'Service Worker v54','Service Worker v55','sw header')
sw=replace_once(sw,'hana-shell-v54','hana-shell-v55','sw cache')
sw=replace_once(sw,'style.css?v=2.0.21','style.css?v=2.0.22','sw css')
sw=replace_once(sw,'app.js?v=2.0.21','app.js?v=2.0.22','sw app')

APP.write_text(app,encoding='utf-8')
INDEX.write_text(index,encoding='utf-8')
STYLE.write_text(style,encoding='utf-8')
SW.write_text(sw,encoding='utf-8')
print('Applied preview-first template draft update.')
