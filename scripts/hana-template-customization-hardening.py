from pathlib import Path
import re

app_path=Path('app.js'); index_path=Path('index.html'); sw_path=Path('service-worker.js')
app=app_path.read_text(encoding='utf-8'); index=index_path.read_text(encoding='utf-8'); sw=sw_path.read_text(encoding='utf-8')

def rep(text,old,new,label):
    count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old,new,1)

app=rep(app,'internal build 2.0.23','internal build 2.0.24','app build')
app=rep(app,'const HANA_APP_VERSION = "2.0.23";','const HANA_APP_VERSION = "2.0.24";','app version')
index=rep(index,'hana-app-version" content="2.0.23"','hana-app-version" content="2.0.24"','index version')
index=index.replace('style.css?v=2.0.23','style.css?v=2.0.24').replace('app.js?v=2.0.23','app.js?v=2.0.24')
sw=re.sub(r'Service Worker v\d+','Service Worker v57',sw,count=1)
sw=re.sub(r'const CACHE_NAME = "hana-shell-v\d+";','const CACHE_NAME = "hana-shell-v57";',sw,count=1)
sw=re.sub(r'style\.css\?v=2\.0\.\d+','style.css?v=2.0.24',sw)
sw=re.sub(r'app\.js\?v=2\.0\.\d+','app.js?v=2.0.24',sw)

old='''function populateStructuredNoteFields(noteOrType){
  const type=typeof noteOrType==="string"?noteOrType:noteOrType?.structuredType||"";
  const existing=typeof noteOrType==="object"?normalizeStructuredNoteFields(noteOrType?.structuredFields||[]):[];
  structuredNoteDraftFields=existing.length?existing:structuredSchemaFields(type);'''
new='''function populateStructuredNoteFields(noteOrType){
  const type=typeof noteOrType==="string"?noteOrType:noteOrType?.structuredType||"";
  const hasSavedFields=typeof noteOrType==="object"&&Array.isArray(noteOrType?.structuredFields);
  const existing=hasSavedFields?normalizeStructuredNoteFields(noteOrType.structuredFields):[];
  structuredNoteDraftFields=hasSavedFields?existing:structuredSchemaFields(type);'''
app=rep(app,old,new,'honor intentionally empty structured fields')
app=rep(app,'  if(structured&&!structuredNoteDraftFields.length)populateStructuredNoteFields(structuredType);\n','', 'remove structured auto-regeneration')

# New trackers keep template columns but never force a tracker name.
old_apply='function applyTableTemplate(templateId,force=false){const template=getTemplateDefinition(templateId);const name=document.getElementById("tableName");if(force||!name.value.trim())name.value=template.name;setTableBuilderColumns(template.columns);document.getElementById("tableStatusOptions").value=(template.statusOptions||DEFAULT_TABLE_STATUSES).join(", ");}'
new_apply='function applyTableTemplate(templateId,force=false){const template=getTemplateDefinition(templateId);const name=document.getElementById("tableName");if(name){if(!name.value.trim())name.placeholder=template.name||"Tracker name";}setTableBuilderColumns(template.columns);document.getElementById("tableStatusOptions").value=(template.statusOptions||DEFAULT_TABLE_STATUSES).join(", ");}'
app=rep(app,old_apply,new_apply,'tracker name prefill')

# Keep release note same visible release, but mention the hardening in one item.
app=app.replace('{ icon:"🛡️", title:"New-item delete bug fixed", text:"Delete buttons stay hidden on unsaved forms and template previews until a real saved item exists." }','{ icon:"🛡️", title:"Customization safeguards", text:"Delete stays hidden on unsaved forms, intentionally removed custom fields stay removed, and tracker templates no longer force a name." }',1)

app_path.write_text(app,encoding='utf-8'); index_path.write_text(index,encoding='utf-8'); sw_path.write_text(sw,encoding='utf-8')
print('Customization hardening applied.')
