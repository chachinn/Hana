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

# Internal build/cache only. Visible version remains Version 2.
app=rep(app,'internal build 2.0.25','internal build 2.0.26','app banner')
app=rep(app,'const HANA_APP_VERSION = "2.0.25";','const HANA_APP_VERSION = "2.0.26";','app version')
index=rep(index,'hana-app-version" content="2.0.25"','hana-app-version" content="2.0.26"','index version')
index=index.replace('style.css?v=2.0.25','style.css?v=2.0.26').replace('app.js?v=2.0.25','app.js?v=2.0.26')
sw=re.sub(r'Service Worker v\d+','Service Worker v59',sw,count=1)
sw=re.sub(r'const CACHE_NAME = "hana-shell-v\d+";','const CACHE_NAME = "hana-shell-v59";',sw,count=1)
sw=re.sub(r'style\.css\?v=2\.0\.\d+','style.css?v=2.0.26',sw)
sw=re.sub(r'app\.js\?v=2\.0\.\d+','app.js?v=2.0.26',sw)

# Add the two distinct build-your-own entries.
needle='''const STARTER_TEMPLATES = [
  { id:"meeting-agenda",'''
replacement='''const STARTER_TEMPLATES = [
  { id:"smart-template", icon:"✨", title:"Smart Template", description:"Tell Hana what you need and get guided to the closest useful template or structure.", kind:"guide", category:"Build your own" },
  { id:"blank-template", icon:"⬜", title:"Blank Template", description:"A genuinely empty custom form: no categories, fields, rows or suggested labels until you add them.", kind:"blank", category:"Build your own" },
  { id:"meeting-agenda",'''
app=rep(app,needle,replacement,'starter build-your-own entries')

# Make a blank structured form a first-class structured note type with zero defaults.
app=rep(app,'const CUSTOM_STRUCTURED_NOTE_TYPES = ["professional-bionote", "strategy-plan", "measurement-profile"];','const CUSTOM_STRUCTURED_NOTE_TYPES = ["professional-bionote", "strategy-plan", "measurement-profile", "custom-form"];','custom form type')
app=rep(app,'const STRUCTURED_NOTE_SCHEMAS = {\n  "professional-bionote": {','const STRUCTURED_NOTE_SCHEMAS = {\n  "custom-form": { title:"Blank Template", icon:"⬜", fields:[] },\n  "professional-bionote": {','custom form schema')

# Update release note to include category manager + smart/blank distinction.
release='''const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 13, 2026",
  title: "Build templates your way ✨",
  intro: "Hana Version 2 now separates a guided Smart Template from a truly empty Blank Template, while structured categories and fields stay fully customizable.",
  items: [
    { icon:"✨", title:"Smart Template", text:"Answer “What do you need?” and Hana points you to the closest meeting, routine, reference, checklist, tracker or plain-note structure." },
    { icon:"⬜", title:"Actually blank", text:"Blank Template starts with zero categories and zero fields. You decide the first category and every field yourself." },
    { icon:"🗂️", title:"Real category controls", text:"Add, rename and delete categories; add fields inside any category and move fields between categories." },
    { icon:"↔️", title:"Flexible field types", text:"Each custom field can switch between Short text, Long text, Date and Number without rebuilding the whole form." },
    { icon:"🛡️", title:"Safe migration", text:"Existing Bionote, Strategy and Measurement entries keep their values while old section names become editable categories." }
  ]
};'''
app=block(app,'const HANA_RELEASE_NOTES = {','let hanaAccountState = {',release,'release notes')

# Templates page: put Build your own first and explain the two modes.
old='''  const categories=["Meetings","Personal & routines","Work & reference","Trackers"];
  c.innerHTML=`<div class="page-heading"><p class="eyebrow">REUSABLE, BUT NEVER FORCED</p><h1>Templates</h1><p>Preview a blank structure, customize it, and save only when it actually fits what you need.</p></div><div class="template-customization-note"><span>✨</span><div><strong>Templates are starting structures, not pre-filled content.</strong><small>Structured-note field labels can be renamed or removed, and you can add your own. List and tracker structures remain editable too.</small></div></div>${categories.map(category=>{'''
new='''  const categories=["Build your own","Meetings","Personal & routines","Work & reference","Trackers"];
  c.innerHTML=`<div class="page-heading"><p class="eyebrow">REUSABLE, BUT NEVER FORCED</p><h1>Templates</h1><p>Choose a ready-made structure, let Smart Template guide you, or start from a completely empty canvas.</p></div><div class="template-customization-note"><span>✨</span><div><strong>Smart guides you. Blank assumes nothing.</strong><small>Smart Template helps match your need to a Hana structure. Blank Template has no categories, fields or rows until you create them yourself.</small></div></div>${categories.map(category=>{'''
app=rep(app,old,new,'templates page categories')

# Smart template helper functions inserted before useTemplate.
smart_helpers='''function openSmartTemplate(){
  openModal("smartTemplateModal");
}
function chooseSmartTemplate(target){
  closeModal("smartTemplateModal");
  if(target==="generic-list")return openListTemplateDraft("simple");
  if(target==="generic-tracker")return openTableTemplateDraft({name:"Tracker",space:preferredSpace(),columns:[{name:"Item",type:"text"},{name:"Status",type:"status"},{name:"Notes",type:"text"}],statusOptions:DEFAULT_TABLE_STATUSES.slice()});
  if(target==="plain-note")return openNoteTemplateDraft({title:"Note",type:"note",space:preferredSpace()});
  if(target==="blank-template")return openNoteTemplateDraft({title:"Blank Template",type:"note",structuredType:"custom-form",space:preferredSpace()});
  return useTemplate(target);
}
'''
app=rep(app,'function useTemplate(templateId) {',smart_helpers+'\nfunction useTemplate(templateId) {','smart template helpers')

# Add smart + blank dispatch at top of useTemplate.
app=rep(app,'function useTemplate(templateId) {\n  const space=preferredSpace();','function useTemplate(templateId) {\n  const space=preferredSpace();\n  if(templateId==="smart-template")return openSmartTemplate();\n  if(templateId==="blank-template")return openNoteTemplateDraft({title:"Blank Template",type:"note",structuredType:"custom-form",space});','smart blank dispatch')

# Smart chooser click handler.
old='''  const template=event.target.closest("[data-use-template]");if(template){useTemplate(template.dataset.useTemplate);saveState();return;}'''
new='''  const smartTemplateChoice=event.target.closest("[data-smart-template-target]");if(smartTemplateChoice){chooseSmartTemplate(smartTemplateChoice.dataset.smartTemplateTarget);return;}
  const template=event.target.closest("[data-use-template]");if(template){useTemplate(template.dataset.useTemplate);saveState();return;}'''
app=rep(app,old,new,'smart template click handler')

# Smart modal before What's New.
modal='''  <!-- SMART TEMPLATE GUIDE -->
  <div id="smartTemplateModal" class="modal-overlay hidden">
    <div class="modal-card modal-large smart-template-card">
      <div class="modal-header"><div><p class="eyebrow">✨ SMART TEMPLATE</p><h2>What do you need?</h2><p class="smart-template-subtitle">Pick the closest goal. Hana will open the matching structure as an unsaved preview.</p></div><button class="modal-close" type="button" data-close-modal="smartTemplateModal" aria-label="Close Smart Template">×</button></div>
      <div class="smart-template-choice-grid">
        <button type="button" data-smart-template-target="meeting-agenda"><span>📋</span><strong>Prepare for a meeting</strong><small>Agenda, objective, people, topics and prep</small></button>
        <button type="button" data-smart-template-target="meeting-minutes"><span>📝</span><strong>Record a meeting</strong><small>Discussion, decisions, actions and next meeting</small></button>
        <button type="button" data-smart-template-target="skincare-routine-note"><span>🧴</span><strong>Plan a weekly routine</strong><small>Use the existing skincare AM/PM routine planner</small></button>
        <button type="button" data-smart-template-target="measurement-profile-note"><span>📏</span><strong>Keep measurements</strong><small>Editable measurement categories and fields</small></button>
        <button type="button" data-smart-template-target="professional-bionote"><span>👤</span><strong>Build a professional profile</strong><small>Role, experience, background and bionote</small></button>
        <button type="button" data-smart-template-target="strategy-outline-note"><span>🧭</span><strong>Structure a plan or strategy</strong><small>Objectives, evidence, risks, actions and ways forward</small></button>
        <button type="button" data-smart-template-target="generic-list"><span>☑️</span><strong>I need repeatable rows</strong><small>Start a blank checklist/list and add your own items or columns</small></button>
        <button type="button" data-smart-template-target="generic-tracker"><span>📒</span><strong>I need to track changing data</strong><small>Start a customizable rows-and-columns tracker</small></button>
        <button type="button" data-smart-template-target="plain-note"><span>📝</span><strong>I just need to write</strong><small>Open a completely normal blank note</small></button>
        <button type="button" class="smart-template-blank-choice" data-smart-template-target="blank-template"><span>⬜</span><strong>None of these fit</strong><small>Open the truly blank custom template</small></button>
      </div>
      <button class="secondary-button full-width" type="button" data-close-modal="smartTemplateModal">Cancel</button>
    </div>
  </div>

'''
index=rep(index,'  <!-- WHAT\'S NEW / UPDATE NOTE -->',modal+'  <!-- WHAT\'S NEW / UPDATE NOTE -->','smart template modal')

# Styling.
marker='/* HANA SMART + BLANK TEMPLATES 2.0.26 */'
if marker in style: raise SystemExit('smart template CSS already present')
style += '''\n\n/* HANA SMART + BLANK TEMPLATES 2.0.26 */
.smart-template-card{max-height:min(92dvh,820px);overflow-y:auto;overscroll-behavior:contain}.smart-template-subtitle{margin:5px 0 0;color:var(--text-soft);font-size:10px;line-height:1.45}.smart-template-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:4px 0 14px}.smart-template-choice-grid>button{min-width:0;display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:10px;row-gap:3px;align-items:center;padding:12px;text-align:left;border:1px solid var(--border);border-radius:16px;background:color-mix(in srgb,var(--surface) 97%,var(--blush));color:var(--text)}.smart-template-choice-grid>button>span{grid-row:1/3;font-size:22px}.smart-template-choice-grid strong{font-size:11px}.smart-template-choice-grid small{color:var(--text-soft);font-size:9px;line-height:1.35}.smart-template-choice-grid>button:active{transform:scale(.99)}.smart-template-choice-grid .smart-template-blank-choice{border-style:dashed;background:transparent}.template-category:first-of-type .template-card{background:linear-gradient(145deg,color-mix(in srgb,var(--surface) 92%,var(--blush)),var(--surface))}@media(max-width:520px){.smart-template-choice-grid{grid-template-columns:1fr}.smart-template-card{max-height:94dvh}}
'''

app_path.write_text(app,encoding='utf-8'); index_path.write_text(index,encoding='utf-8'); style_path.write_text(style,encoding='utf-8'); sw_path.write_text(sw,encoding='utf-8')
print('Smart + Blank Template patch applied')