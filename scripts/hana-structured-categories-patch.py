from pathlib import Path
import re

app_path=Path('app.js'); index_path=Path('index.html'); style_path=Path('style.css'); sw_path=Path('service-worker.js')
app=app_path.read_text(encoding='utf-8'); index=index_path.read_text(encoding='utf-8'); style=style_path.read_text(encoding='utf-8'); sw=sw_path.read_text(encoding='utf-8')

def rep(text,old,new,label):
    count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old,new,1)

def block(text,start,end,new,label):
    a=text.find(start)
    if a<0: raise SystemExit(f'{label}: start not found')
    b=text.find(end,a)
    if b<0: raise SystemExit(f'{label}: end not found')
    return text[:a]+new.rstrip()+"\n\n"+text[b:]

# Internal build/cache only; visible version remains Version 2.
app=rep(app,'internal build 2.0.24','internal build 2.0.25','app banner')
app=rep(app,'const HANA_APP_VERSION = "2.0.24";','const HANA_APP_VERSION = "2.0.25";','app version')
index=rep(index,'hana-app-version" content="2.0.24"','hana-app-version" content="2.0.25"','index version')
index=index.replace('style.css?v=2.0.24','style.css?v=2.0.25').replace('app.js?v=2.0.24','app.js?v=2.0.25')
sw=re.sub(r'Service Worker v\d+','Service Worker v58',sw,count=1)
sw=re.sub(r'const CACHE_NAME = "hana-shell-v\d+";','const CACHE_NAME = "hana-shell-v58";',sw,count=1)
sw=re.sub(r'style\.css\?v=2\.0\.\d+','style.css?v=2.0.25',sw)
sw=re.sub(r'app\.js\?v=2\.0\.\d+','app.js?v=2.0.25',sw)

# Release note.
release='''const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 13, 2026",
  title: "Structured categories that actually work 🗂️",
  intro: "Hana Version 2 now lets structured notes manage categories and fields as real customizable parts instead of fixed section labels.",
  items: [
    { icon:"🗂️", title:"Editable categories", text:"Add, rename or delete categories in Bionote, Strategy Plan and Measurement Profile." },
    { icon:"＋", title:"Fields add where you want them", text:"Each category has its own Add field button, and new blank fields no longer disappear before you can name them." },
    { icon:"↔️", title:"Move and change fields", text:"Change a field between Short text, Long text, Date or Number, and move it to another category anytime." },
    { icon:"🛡️", title:"Safe compatibility", text:"Existing structured notes migrate their old section names into editable categories without losing entered values." }
  ]
};'''
app=block(app,'const HANA_RELEASE_NOTES = {','let hanaAccountState = {',release,'release notes')

# Replace structured note data helpers with real category persistence and keepBlank editor support.
normalizers='''function normalizeStructuredNoteGroup(group={},index=0){
  return {id:String(group.id||createId()),name:String(group.name||"Category"),order:Number.isFinite(Number(group.order))?Number(group.order):index};
}
function inferStructuredNoteGroups(fields=[]){
  const groups=[],seen=new Set();
  (Array.isArray(fields)?fields:[]).forEach(field=>{
    const name=String(field?.group||"Custom").trim()||"Custom",key=name.toLowerCase();
    if(seen.has(key))return;seen.add(key);
    const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"custom";
    groups.push(normalizeStructuredNoteGroup({id:`legacy-${slug}-${groups.length+1}`,name,order:groups.length},groups.length));
  });
  return groups;
}
function normalizeStructuredNoteGroups(groups,fields=[]){
  if(Array.isArray(groups))return groups.map(normalizeStructuredNoteGroup).filter(group=>group.name.trim()).sort((a,b)=>a.order-b.order);
  return inferStructuredNoteGroups(fields);
}
function normalizeStructuredNoteField(field={},index=0,groups=[]){
  const type=["text","textarea","date","number"].includes(field.type)?field.type:"text";
  const legacyGroup=String(field.group||"Custom").trim()||"Custom";
  let groupId=String(field.groupId||"");
  let group=groups.find(item=>item.id===groupId);
  if(!group)group=groups.find(item=>item.name===legacyGroup);
  if(group)groupId=group.id;
  return {id:field.id||createId(),label:String(field.label||""),type,value:String(field.value??""),groupId,group:group?.name||legacyGroup,order:Number.isFinite(Number(field.order))?Number(field.order):index};
}
function normalizeStructuredNoteFields(fields=[],groups=[],options={}){
  const keepBlank=options.keepBlank===true;
  return (Array.isArray(fields)?fields:[]).map((field,index)=>normalizeStructuredNoteField(field,index,groups)).filter(field=>keepBlank||field.label||field.value).sort((a,b)=>a.order-b.order);
}
function structuredSchemaState(structuredType){
  const schema=STRUCTURED_NOTE_SCHEMAS[structuredType];if(!schema)return {groups:[],fields:[]};
  const groups=[],byName=new Map();
  schema.fields.forEach(([, ,groupName])=>{const name=String(groupName||"Custom");if(!byName.has(name)){const group=normalizeStructuredNoteGroup({id:createId(),name,order:groups.length},groups.length);groups.push(group);byName.set(name,group);}});
  const fields=schema.fields.map(([label,type,groupName],index)=>{const group=byName.get(String(groupName||"Custom"));return normalizeStructuredNoteField({id:createId(),label,type,value:"",groupId:group?.id||"",group:group?.name||"Custom",order:index},index,groups);});
  return {groups,fields};
}
function structuredSchemaFields(structuredType){return structuredSchemaState(structuredType).fields;}
function isCustomStructuredNote(noteOrType){
  const type=typeof noteOrType==="string"?noteOrType:noteOrType?.structuredType;
  return CUSTOM_STRUCTURED_NOTE_TYPES.includes(type);
}
function structuredNoteSchema(type){return STRUCTURED_NOTE_SCHEMAS[type]||null;}
function structuredNotePreview(note){
  const groups=normalizeStructuredNoteGroups(note?.structuredGroups,note?.structuredFields||[]);
  const values=normalizeStructuredNoteFields(note?.structuredFields||[],groups).filter(field=>String(field.value||"").trim()).slice(0,3);
  return values.map(field=>`${field.label}: ${field.value}`).join(" · ")||structuredNoteSchema(note?.structuredType)?.title||"Structured note";
}'''
app=block(app,'function normalizeStructuredNoteField(field={},index=0){','function normalizeNote(note = {}) {',normalizers,'structured normalizers')

old='''  const meetingKind = structuredType === "meeting-minutes" ? "minutes" : structuredType === "meeting-agenda" ? "agenda" : (note.meetingData?.kind === "minutes" ? "minutes" : "agenda");
  return {'''
new='''  const meetingKind = structuredType === "meeting-minutes" ? "minutes" : structuredType === "meeting-agenda" ? "agenda" : (note.meetingData?.kind === "minutes" ? "minutes" : "agenda");
  const customStructured=isCustomStructuredNote(structuredType);
  const structuredGroups=customStructured?normalizeStructuredNoteGroups(note.structuredGroups,note.structuredFields||[]):[];
  const structuredFields=customStructured?normalizeStructuredNoteFields(note.structuredFields||[],structuredGroups):[];
  return {'''
app=rep(app,old,new,'normalize note structured state')
app=rep(app,'    structuredFields: isCustomStructuredNote(structuredType) ? normalizeStructuredNoteFields(note.structuredFields || []) : [],','    structuredGroups,\n    structuredFields,','normalize note structured props')

# Replace editor implementation.
editor='''let structuredNoteDraftFields=[];
let structuredNoteDraftGroups=[];
function structuredNoteFieldTypeOptions(selected="text"){
  return [["text","Short text"],["textarea","Long text"],["date","Date"],["number","Number"]].map(([value,label])=>`<option value="${value}" ${value===selected?"selected":""}>${label}</option>`).join("");
}
function structuredNoteFieldGroupOptions(groups=[],selected=""){
  return groups.map(group=>`<option value="${escapeHTML(group.id)}" ${group.id===selected?"selected":""}>${escapeHTML(group.name||"Category")}</option>`).join("");
}
function structuredNoteFieldValueControl(field){
  const value=escapeHTML(field.value||"");
  if(field.type==="textarea")return `<textarea data-structured-field-value placeholder="Enter ${escapeHTML((field.label||"details").toLowerCase())}">${value}</textarea>`;
  const inputType=field.type==="date"?"date":field.type==="number"?"number":"text";
  return `<input data-structured-field-value type="${inputType}" value="${value}" placeholder="${inputType==="text"?`Enter ${escapeHTML((field.label||"value").toLowerCase())}`:""}" />`;
}
function structuredNoteFieldRowHTML(field,groups=[]){
  return `<div class="structured-note-field-row" data-structured-field-row data-structured-field-id="${escapeHTML(field.id)}" data-structured-field-group-id="${escapeHTML(field.groupId||"")}">
    <div class="structured-note-field-label-row"><input data-structured-field-label class="structured-note-field-label-input" value="${escapeHTML(field.label)}" placeholder="Field name" aria-label="Field name" /><button type="button" class="structured-note-field-remove" data-remove-structured-field="${escapeHTML(field.id)}" aria-label="Remove ${escapeHTML(field.label||"field")}">×</button></div>
    <div class="structured-note-field-settings"><label><span>Field type</span><select data-structured-field-type-select>${structuredNoteFieldTypeOptions(field.type)}</select></label><label><span>Category</span><select data-structured-field-group-select>${structuredNoteFieldGroupOptions(groups,field.groupId)}</select></label></div>
    ${structuredNoteFieldValueControl(field)}
  </div>`;
}
function readStructuredNoteEditor(){
  const groupEls=[...document.querySelectorAll("#structuredNoteFieldsEditor [data-structured-category]")];
  const groups=groupEls.map((section,index)=>normalizeStructuredNoteGroup({id:section.dataset.structuredCategory||createId(),name:section.querySelector("[data-structured-category-name]")?.value.trim()||`Category ${index+1}`,order:index},index));
  const groupMap=new Map(groups.map(group=>[group.id,group]));
  const fields=[];
  groupEls.forEach(section=>{
    const sectionGroupId=section.dataset.structuredCategory||"";
    section.querySelectorAll("[data-structured-field-row]").forEach(row=>{
      const selectedGroupId=row.querySelector("[data-structured-field-group-select]")?.value||sectionGroupId;
      const group=groupMap.get(selectedGroupId)||groupMap.get(sectionGroupId)||groups[0];
      fields.push(normalizeStructuredNoteField({id:row.dataset.structuredFieldId||createId(),label:row.querySelector("[data-structured-field-label]")?.value.trim()||"",type:row.querySelector("[data-structured-field-type-select]")?.value||"text",value:row.querySelector("[data-structured-field-value]")?.value||"",groupId:group?.id||"",group:group?.name||"Custom",order:fields.length},fields.length,groups));
    });
  });
  return {groups,fields};
}
function readStructuredNoteFields(){return readStructuredNoteEditor().fields;}
function readStructuredNoteGroups(){return readStructuredNoteEditor().groups;}
function structuredNoteCategoryHTML(group,fields,groups){
  const items=fields.filter(field=>field.groupId===group.id);
  return `<section class="structured-note-category-card" data-structured-category="${escapeHTML(group.id)}">
    <div class="structured-note-category-head"><input data-structured-category-name value="${escapeHTML(group.name)}" placeholder="Category name" aria-label="Category name" /><div class="structured-note-category-actions"><button type="button" data-add-structured-field-to-category="${escapeHTML(group.id)}">+ Field</button><button type="button" class="danger-soft" data-remove-structured-category="${escapeHTML(group.id)}" aria-label="Delete ${escapeHTML(group.name)} category">×</button></div></div>
    <div class="structured-note-category-fields">${items.length?items.map(field=>structuredNoteFieldRowHTML(field,groups)).join(""):`<div class="structured-note-category-empty">No fields in this category yet.</div>`}</div>
  </section>`;
}
function renderStructuredNoteFields(fields=structuredNoteDraftFields,groups=structuredNoteDraftGroups){
  structuredNoteDraftGroups=normalizeStructuredNoteGroups(Array.isArray(groups)?groups:[],fields);
  structuredNoteDraftFields=normalizeStructuredNoteFields(fields,structuredNoteDraftGroups,{keepBlank:true});
  if(structuredNoteDraftGroups.length&&structuredNoteDraftFields.some(field=>!field.groupId))structuredNoteDraftFields=structuredNoteDraftFields.map(field=>field.groupId?field:{...field,groupId:structuredNoteDraftGroups[0].id,group:structuredNoteDraftGroups[0].name});
  const editor=document.getElementById("structuredNoteFieldsEditor");if(!editor)return;
  editor.innerHTML=structuredNoteDraftGroups.length?structuredNoteDraftGroups.map(group=>structuredNoteCategoryHTML(group,structuredNoteDraftFields,structuredNoteDraftGroups)).join(""):`<div class="structured-note-empty"><span>🗂️</span><strong>No categories yet</strong><small>Add a category, then add only the fields you actually need.</small></div>`;
}
function populateStructuredNoteFields(noteOrType){
  const type=typeof noteOrType==="string"?noteOrType:noteOrType?.structuredType||"";
  if(typeof noteOrType==="object"){
    const hasSavedGroups=Array.isArray(noteOrType?.structuredGroups);
    const hasSavedFields=Array.isArray(noteOrType?.structuredFields);
    structuredNoteDraftGroups=hasSavedGroups?normalizeStructuredNoteGroups(noteOrType.structuredGroups,noteOrType.structuredFields||[]):normalizeStructuredNoteGroups(undefined,noteOrType?.structuredFields||[]);
    structuredNoteDraftFields=hasSavedFields?normalizeStructuredNoteFields(noteOrType.structuredFields,structuredNoteDraftGroups,{keepBlank:true}):[];
  }else{
    const schemaState=structuredSchemaState(type);structuredNoteDraftGroups=schemaState.groups;structuredNoteDraftFields=schemaState.fields;
  }
  const schema=structuredNoteSchema(type);const title=document.getElementById("structuredNoteFieldsTitle");if(title)title.textContent=schema?.title||"Custom fields";
  renderStructuredNoteFields(structuredNoteDraftFields,structuredNoteDraftGroups);
}
function addStructuredNoteCategory(){
  const current=readStructuredNoteEditor();
  const group=normalizeStructuredNoteGroup({id:createId(),name:`Category ${current.groups.length+1}`,order:current.groups.length},current.groups.length);
  current.groups.push(group);renderStructuredNoteFields(current.fields,current.groups);
  requestAnimationFrame(()=>{const input=document.querySelector(`[data-structured-category="${group.id}"] [data-structured-category-name]`);input?.focus();input?.select();});
}
function addStructuredNoteField(groupId=""){
  const current=readStructuredNoteEditor();
  let group=current.groups.find(item=>item.id===groupId);
  if(!group){if(!current.groups.length){group=normalizeStructuredNoteGroup({id:createId(),name:"Category 1",order:0},0);current.groups.push(group);}else group=current.groups[current.groups.length-1];}
  const field=normalizeStructuredNoteField({id:createId(),label:"",type:"text",value:"",groupId:group.id,group:group.name,order:current.fields.length},current.fields.length,current.groups);
  current.fields.push(field);renderStructuredNoteFields(current.fields,current.groups);
  requestAnimationFrame(()=>document.querySelector(`[data-structured-field-id="${field.id}"] [data-structured-field-label]`)?.focus());
}
function removeStructuredNoteField(id){
  const current=readStructuredNoteEditor();current.fields=current.fields.filter(field=>field.id!==id);renderStructuredNoteFields(current.fields,current.groups);
}
function removeStructuredNoteCategory(id){
  const current=readStructuredNoteEditor(),group=current.groups.find(item=>item.id===id);if(!group)return;
  const fields=current.fields.filter(field=>field.groupId===id);
  if(fields.length&&!confirm(`Delete ${group.name} and its ${fields.length} field${fields.length===1?"":"s"}?`))return;
  current.groups=current.groups.filter(item=>item.id!==id);current.fields=current.fields.filter(field=>field.groupId!==id);renderStructuredNoteFields(current.fields,current.groups);
}
function changeStructuredNoteFieldType(id,type){
  const current=readStructuredNoteEditor(),field=current.fields.find(item=>item.id===id);if(!field)return;field.type=["text","textarea","date","number"].includes(type)?type:"text";renderStructuredNoteFields(current.fields,current.groups);
  requestAnimationFrame(()=>document.querySelector(`[data-structured-field-id="${id}"] [data-structured-field-value]`)?.focus());
}
function moveStructuredNoteField(id,groupId){
  const current=readStructuredNoteEditor(),field=current.fields.find(item=>item.id===id),group=current.groups.find(item=>item.id===groupId);if(!field||!group)return;field.groupId=group.id;field.group=group.name;renderStructuredNoteFields(current.fields,current.groups);
}'''
app=block(app,'let structuredNoteDraftFields=[];','function clearNoteForm() {',editor,'structured editor')

# Ensure clear form clears groups too.
app=rep(app,'  structuredNoteDraftFields=[];\n  document.getElementById("structuredNoteFieldsWrap")?.classList.add("hidden");','  structuredNoteDraftFields=[];\n  structuredNoteDraftGroups=[];\n  document.getElementById("structuredNoteFieldsWrap")?.classList.add("hidden");','clear structured groups')

# Save both groups and fields.
old='''  const structured=isCustomStructuredNote(requestedStructured)&&type!=="meeting";
  const structuredFields=structured?readStructuredNoteFields():[];
  const structuredHasValue=structuredFields.some(field=>String(field.value||"").trim());'''
new='''  const structured=isCustomStructuredNote(requestedStructured)&&type!=="meeting";
  const structuredState=structured?readStructuredNoteEditor():{groups:[],fields:[]};
  const structuredGroups=structuredState.groups,structuredFields=structuredState.fields;
  const structuredHasValue=structuredFields.some(field=>String(field.value||"").trim());'''
app=rep(app,old,new,'save structured state')
app=rep(app,'structuredType,meetingData,structuredFields,...shareMetaFromControl("note",old)','structuredType,meetingData,structuredGroups,structuredFields,...shareMetaFromControl("note",old)','persist structured groups')

# Include category names in structured note search.
old='''    const structuredText=isCustomStructuredNote(n)?normalizeStructuredNoteFields(n.structuredFields||[]).flatMap(field=>[field.label,field.value]):[];'''
new='''    const structuredGroups=isCustomStructuredNote(n)?normalizeStructuredNoteGroups(n.structuredGroups,n.structuredFields||[]):[];
    const structuredText=isCustomStructuredNote(n)?[...structuredGroups.map(group=>group.name),...normalizeStructuredNoteFields(n.structuredFields||[],structuredGroups).flatMap(field=>[field.label,field.value])]:[];'''
app=rep(app,old,new,'structured search categories')

# Make the category manager the only add surface.
old='''        <div class="structured-note-fields-head">
          <div><small>STRUCTURED FIELDS</small><strong id="structuredNoteFieldsTitle">Custom fields</strong><span>Rename labels, remove anything you do not need, or add your own fields.</span></div>
        </div>
        <div id="structuredNoteFieldsEditor" class="structured-note-fields-editor"></div>
        <div class="structured-note-add-row">
          <button type="button" class="secondary-button compact-button" data-add-structured-field="text">+ Short field</button>
          <button type="button" class="secondary-button compact-button" data-add-structured-field="textarea">+ Long field</button>
          <button type="button" class="secondary-button compact-button" data-add-structured-field="date">+ Date</button>
          <button type="button" class="secondary-button compact-button" data-add-structured-field="number">+ Number</button>
        </div>'''
new='''        <div class="structured-note-fields-head">
          <div><small>CUSTOMIZABLE SECTIONS</small><strong id="structuredNoteFieldsTitle">Custom fields</strong><span>Categories and fields are yours: rename, add, move or remove anything you do not need.</span></div>
        </div>
        <div id="structuredNoteFieldsEditor" class="structured-note-fields-editor"></div>
        <div class="structured-note-category-tools"><button type="button" class="secondary-button" data-add-structured-category>+ Add category</button><small>Add fields inside a category, then choose Short text, Long text, Date or Number for each field.</small></div>'''
index=rep(index,old,new,'structured note buttons')

# Click/change event wiring.
old='''  const addStructuredField=event.target.closest("[data-add-structured-field]");if(addStructuredField){addStructuredNoteField(addStructuredField.dataset.addStructuredField||"text");return;}
  const removeStructuredField=event.target.closest("[data-remove-structured-field]");if(removeStructuredField){removeStructuredNoteField(removeStructuredField.dataset.removeStructuredField);return;}'''
new='''  if(event.target.closest("[data-add-structured-category]")){addStructuredNoteCategory();return;}
  const addStructuredFieldToCategory=event.target.closest("[data-add-structured-field-to-category]");if(addStructuredFieldToCategory){addStructuredNoteField(addStructuredFieldToCategory.dataset.addStructuredFieldToCategory||"");return;}
  const addStructuredField=event.target.closest("[data-add-structured-field]");if(addStructuredField){addStructuredNoteField("");return;}
  const removeStructuredCategory=event.target.closest("[data-remove-structured-category]");if(removeStructuredCategory){removeStructuredNoteCategory(removeStructuredCategory.dataset.removeStructuredCategory);return;}
  const removeStructuredField=event.target.closest("[data-remove-structured-field]");if(removeStructuredField){removeStructuredNoteField(removeStructuredField.dataset.removeStructuredField);return;}'''
app=rep(app,old,new,'structured click events')

change_listener='''document.addEventListener("change", event => {
  const typeSelect=event.target.closest?.("[data-structured-field-type-select]");
  if(typeSelect){const row=typeSelect.closest("[data-structured-field-row]");if(row)changeStructuredNoteFieldType(row.dataset.structuredFieldId,typeSelect.value);return;}
  const groupSelect=event.target.closest?.("[data-structured-field-group-select]");
  if(groupSelect){const row=groupSelect.closest("[data-structured-field-row]");if(row)moveStructuredNoteField(row.dataset.structuredFieldId,groupSelect.value);}
});

'''
app=rep(app,'/* ================= EVENTS ================= */\n\ndocument.addEventListener("click", event => {','/* ================= EVENTS ================= */\n\n'+change_listener+'document.addEventListener("click", event => {','structured change events')

# New category manager styling; old four-button rules remain harmless for historical CSS.
marker='/* HANA STRUCTURED CATEGORY MANAGER 2.0.25 */'
if marker in style: raise SystemExit('category manager CSS already present')
style += '''\n\n/* HANA STRUCTURED CATEGORY MANAGER 2.0.25 */
.structured-note-fields-editor{gap:12px}
.structured-note-category-card{padding:10px;border:1px solid var(--border);border-radius:17px;background:color-mix(in srgb,var(--surface) 97%,var(--blush))}
.structured-note-category-head{display:flex;align-items:center;gap:8px;margin-bottom:9px}
.structured-note-category-head>input{min-width:0;flex:1;height:38px;padding:7px 9px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--rose);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.045em}
.structured-note-category-head>input:focus{background:var(--surface);border-color:var(--border);text-transform:none;letter-spacing:0}
.structured-note-category-actions{display:flex;gap:5px;flex:0 0 auto}
.structured-note-category-actions button{min-height:34px;padding:0 9px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--rose);font-size:9px;font-weight:850}
.structured-note-category-actions button.danger-soft{width:34px;padding:0;color:var(--danger);font-size:17px}
.structured-note-category-fields{display:grid;gap:8px}
.structured-note-category-empty{padding:12px;border:1px dashed var(--border);border-radius:12px;color:var(--text-soft);font-size:9px;text-align:center}
.structured-note-field-settings{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:7px;margin:0 0 7px}
.structured-note-field-settings label{min-width:0;margin:0}.structured-note-field-settings label>span{display:block;margin:0 0 4px 2px;color:var(--text-soft);font-size:8px;font-weight:800}
.structured-note-field-settings select{width:100%;min-width:0;height:36px;margin:0;padding:6px 8px;border-radius:9px;font-size:9px}
.structured-note-category-tools{display:grid;gap:6px;margin-top:12px}.structured-note-category-tools button{width:100%;border-style:dashed}.structured-note-category-tools small{color:var(--text-soft);font-size:9px;line-height:1.4;text-align:center}
@media(max-width:420px){.structured-note-category-head{align-items:stretch;flex-direction:column}.structured-note-category-actions{width:100%}.structured-note-category-actions button:first-child{flex:1}.structured-note-field-settings{grid-template-columns:1fr}.structured-note-field-label-row{align-items:flex-start}.structured-note-category-card{padding:9px}}
'''

app_path.write_text(app,encoding='utf-8'); index_path.write_text(index,encoding='utf-8'); style_path.write_text(style,encoding='utf-8'); sw_path.write_text(sw,encoding='utf-8')
print('Structured category manager patch applied')