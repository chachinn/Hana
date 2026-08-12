from pathlib import Path
import re

app_path = Path('app.js')
index_path = Path('index.html')
style_path = Path('style.css')
sw_path = Path('service-worker.js')
app = app_path.read_text(encoding='utf-8')
index = index_path.read_text(encoding='utf-8')
style = style_path.read_text(encoding='utf-8')
sw = sw_path.read_text(encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)

def replace_block(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f'{label}: start marker not found')
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f'{label}: end marker not found')
    return text[:start] + replacement.rstrip() + '\n' + text[end:]

old_normalizer = '''      const category = String(step.category || "").trim() || "Other";
      return {
        id: step.id || createId(),
        category,
        product: String(step.product || ""),
        days: rawDays.length ? rawDays : [1,2,3,4,5,6,0],
        times: rawTimes.length ? rawTimes : ["am","pm"],
        notes: String(step.notes || ""),
        order: Number.isFinite(Number(step.order)) ? Number(step.order) : index
      };'''
new_normalizer = '''      const category = String(step.category || "").trim() || "Other";
      const variant = step.variant === "alternate" ? "alternate" : "primary";
      return {
        id: step.id || createId(),
        category,
        product: String(step.product || ""),
        days: rawDays.length ? rawDays : [1,2,3,4,5,6,0],
        times: rawTimes.length ? rawTimes : ["am","pm"],
        variant,
        notes: String(step.notes || ""),
        order: Number.isFinite(Number(step.order)) ? Number(step.order) : index
      };'''
app = replace_once(app, old_normalizer, new_normalizer, 'skincare variant normalization')

old_steps_for_day = '''function skincareStepsForDay(note, day, time) {
  const routine = normalizeSkincareRoutine(note?.skincareRoutine || {});
  return routine.steps.filter(step => step.days.includes(Number(day)) && step.times.includes(time));
}'''
new_steps_for_day = '''function skincareStepsForDay(note, day, time, variant = "primary") {
  const routine = normalizeSkincareRoutine(note?.skincareRoutine || {});
  const normalizedVariant = variant === "alternate" ? "alternate" : "primary";
  return routine.steps.filter(step => step.days.includes(Number(day)) && step.times.includes(time) && step.variant === normalizedVariant);
}'''
app = replace_once(app, old_steps_for_day, new_steps_for_day, 'skincare day filtering')

editor_block = r'''function skincareRoutineBatchMeta(routine="am", variant="primary") {
  const isPm=routine==="pm",isAlternate=variant==="alternate",time=isPm?"PM":"AM",icon=isPm?"🌙":"☀️";
  return {
    routine:isPm?"pm":"am",
    variant:isAlternate?"alternate":"primary",
    key:`${isPm?"pm":"am"}-${isAlternate?"alternate":"primary"}`,
    icon,
    label:isAlternate?`Alternate ${time}`:`${time} Routine`,
    short:isAlternate?`ALT ${time}`:time,
    empty:isAlternate?`No alternate ${time} products yet.`:`No ${time} products yet.`
  };
}
function skincareEditorRow(step = {}, routine = "am", variant = "primary") {
  const meta=skincareRoutineBatchMeta(routine,variant),category=String(step.category||""),product=String(step.product||""),notes=String(step.notes||"");
  return `<div class="skincare-table-row" data-skincare-step-row data-step-id="${escapeHTML(String(step.id||createId()))}" data-skincare-routine="${meta.routine}" data-skincare-variant="${meta.variant}">
    <label class="skincare-table-cell skincare-type-cell"><span class="skincare-table-cell-label">Product type</span><select data-skincare-category aria-label="${meta.short} product type">${skincareCategoryOptions(category)}</select></label>
    <label class="skincare-table-cell skincare-product-cell"><span class="skincare-table-cell-label">Product</span><input data-skincare-product type="text" value="${escapeHTML(product)}" placeholder="Product name" aria-label="${meta.short} product" /></label>
    <label class="skincare-table-cell skincare-notes-cell"><span class="skincare-table-cell-label">Notes</span><input data-skincare-notes type="text" value="${escapeHTML(notes)}" placeholder="Optional notes" aria-label="${meta.short} notes" /></label>
    <button type="button" class="skincare-table-remove" data-skincare-remove-step aria-label="Remove this ${meta.short} product" title="Remove">×</button>
  </div>`;
}
function skincareRoutineBatchEditor(routine="am", variant="primary", rows=[]) {
  const meta=skincareRoutineBatchMeta(routine,variant),items=rows.filter(step=>(step.times||[]).includes(meta.routine)&&(step.variant==="alternate"?"alternate":"primary")===meta.variant);
  return `<section class="skincare-routine-batch skincare-routine-batch-${meta.routine} ${meta.variant==="alternate"?"skincare-routine-batch-alternate":""}" data-skincare-batch="${meta.key}">
    <div class="skincare-routine-batch-head"><div class="skincare-routine-batch-title"><span>${meta.icon}</span><div><strong>${meta.label}</strong><small>${items.length} product${items.length===1?"":"s"}${meta.variant==="alternate"?" · optional":""}</small></div></div><span class="skincare-routine-badge ${meta.variant==="alternate"?"alternate":""}">${meta.short}</span></div>
    <div class="skincare-routine-table">
      <div class="skincare-routine-table-head" aria-hidden="true"><span>Product type</span><span>Product</span><span>Notes</span><span></span></div>
      <div class="skincare-routine-table-body">${items.length?items.map(step=>skincareEditorRow(step,meta.routine,meta.variant)).join(""):`<div class="skincare-routine-empty"><span>${meta.icon}</span><p>${meta.empty}</p></div>`}</div>
    </div>
    <button type="button" class="secondary-button skincare-batch-add" data-skincare-add-batch-step="${meta.routine}" data-skincare-add-variant="${meta.variant}">+ Add product to ${meta.label}</button>
  </section>`;
}
'''
app = replace_block(app, 'function skincareRoutineBatchMeta(routine="am") {', 'function skincareDraftFromNote(note = null) {', editor_block, 'skincare editor helpers')

old_draft = 'SKINCARE_WEEKDAYS.forEach(meta=>{days[meta.day]=routine.steps.filter(step=>step.days.includes(meta.day)).map((step,index)=>({id:createId(),category:step.category,product:step.product,times:[...step.times],notes:step.notes,order:index}));});'
new_draft = 'SKINCARE_WEEKDAYS.forEach(meta=>{days[meta.day]=routine.steps.filter(step=>step.days.includes(meta.day)).map((step,index)=>({id:createId(),category:step.category,product:step.product,times:[...step.times],variant:step.variant==="alternate"?"alternate":"primary",notes:step.notes,order:index}));});'
app = replace_once(app, old_draft, new_draft, 'skincare draft variant')

old_read = '''    const routine=row.dataset.skincareRoutine==="pm"?"pm":"am";
    steps.push({
      id:row.dataset.stepId||createId(),
      category:row.querySelector("[data-skincare-category]")?.value||"Other",
      product:row.querySelector("[data-skincare-product]")?.value.trim()||"",
      times:[routine],
      notes:row.querySelector("[data-skincare-notes]")?.value.trim()||"",
      order:index
    });'''
new_read = '''    const routine=row.dataset.skincareRoutine==="pm"?"pm":"am";
    const variant=row.dataset.skincareVariant==="alternate"?"alternate":"primary";
    steps.push({
      id:row.dataset.stepId||createId(),
      category:row.querySelector("[data-skincare-category]")?.value||"Other",
      product:row.querySelector("[data-skincare-product]")?.value.trim()||"",
      times:[routine],
      variant,
      notes:row.querySelector("[data-skincare-notes]")?.value.trim()||"",
      order:index
    });'''
app = replace_once(app, old_read, new_read, 'skincare editor read variant')

old_render_line = 'if(container)container.innerHTML=`<div class="skincare-batch-stack">${skincareRoutineBatchEditor("am",rows)}${skincareRoutineBatchEditor("pm",rows)}</div>`;'
new_render_line = 'if(container)container.innerHTML=`<div class="skincare-batch-stack"><div class="skincare-time-pair"><div class="skincare-time-pair-head"><span>☀️ Morning</span><small>Main + optional alternate</small></div>${skincareRoutineBatchEditor("am","primary",rows)}${skincareRoutineBatchEditor("am","alternate",rows)}</div><div class="skincare-time-pair"><div class="skincare-time-pair-head"><span>🌙 Evening</span><small>Main + optional alternate</small></div>${skincareRoutineBatchEditor("pm","primary",rows)}${skincareRoutineBatchEditor("pm","alternate",rows)}</div></div>`;'
app = replace_once(app, old_render_line, new_render_line, 'skincare four-batch editor')

new_view = r'''function renderSkincareRoutineView(note, day = activeSkincareViewDay) {
  const body=document.getElementById("skincareViewBody");if(!body||!note)return;
  const meta=skincareDayMeta(day),today=new Date().getDay();
  const am=skincareStepsForDay(note,day,"am","primary"),amAlt=skincareStepsForDay(note,day,"am","alternate");
  const pm=skincareStepsForDay(note,day,"pm","primary"),pmAlt=skincareStepsForDay(note,day,"pm","alternate");
  const routineSection=(icon,label,steps,{alternate=false,hideIfEmpty=false}={})=>{
    if(hideIfEmpty&&!steps.length)return "";
    return `<section class="skincare-routine-period ${alternate?"skincare-routine-period-alternate":""}"><div class="skincare-period-title"><span>${icon}</span><div><strong>${label}</strong><small>${steps.length} step${steps.length===1?"":"s"}${alternate?" · optional alternate":""}</small></div></div>${steps.length?`<div class="skincare-view-step-list">${steps.map(skincareViewStepHTML).join("")}</div>`:`<div class="skincare-empty-period">Nothing planned for ${label.toLowerCase()}.</div>`}</section>`;
  };
  body.innerHTML=`${note.skincareRoutine?.focus?`<div class="skincare-focus-card"><small>FOCUS / SKIN GOALS</small><p>${escapeHTML(note.skincareRoutine.focus)}</p></div>`:""}<div class="skincare-day-tabs" role="tablist" aria-label="Skincare day">${SKINCARE_WEEKDAYS.map(item=>`<button type="button" role="tab" data-skincare-view-day="${item.day}" class="${Number(day)===item.day?"active":""} ${today===item.day?"today":""}" aria-selected="${Number(day)===item.day}"><span>${item.short}</span>${today===item.day?`<small>Today</small>`:""}</button>`).join("")}</div><div class="skincare-selected-day"><span>${meta.label}</span>${today===Number(day)?`<strong>Today</strong>`:""}</div><div class="skincare-period-grid">${routineSection("☀️","AM Routine",am)}${routineSection("☀️","Alternate AM",amAlt,{alternate:true,hideIfEmpty:true})}${routineSection("🌙","PM Routine",pm)}${routineSection("🌙","Alternate PM",pmAlt,{alternate:true,hideIfEmpty:true})}</div>`;
}
'''
app = replace_block(app, 'function renderSkincareRoutineView(note, day = activeSkincareViewDay) {', 'function openSkincareRoutineModal(noteId="", options={}) {', new_view, 'skincare alternate viewer')

app = replace_once(app, 'times:[...(step.times||[])],notes:step.notes||"",order:steps.length}', 'times:[...(step.times||[])],variant:step.variant==="alternate"?"alternate":"primary",notes:step.notes||"",order:steps.length}', 'skincare save variant')

new_add_fn = r'''function addSkincareEditorStep(routine="pm", variant="primary") {
  if(!skincareEditorDraft)return;
  const normalizedRoutine=routine==="am"?"am":"pm",normalizedVariant=variant==="alternate"?"alternate":"primary",current=readSkincareEditorPage();
  skincareEditorDraft.days[activeSkincareEditDay]=current;
  skincareEditorDraft.days[activeSkincareEditDay].push({id:createId(),category:"",product:"",times:[normalizedRoutine],variant:normalizedVariant,notes:"",order:current.length});
  renderSkincareEditorDay();
  requestAnimationFrame(()=>{
    const rows=[...document.querySelectorAll(`#skincareStepsEditor [data-skincare-routine="${normalizedRoutine}"][data-skincare-variant="${normalizedVariant}"]`)],row=rows[rows.length-1];
    row?.querySelector("[data-skincare-category]")?.focus();
    row?.scrollIntoView({behavior:"smooth",block:"nearest"});
  });
}
'''
app = replace_block(app, 'function addSkincareEditorStep(routine="pm") {', 'function removeSkincareEditorStep(button) {', new_add_fn, 'skincare add alternate')

old_event = 'const skincareBatchAdd=event.target.closest("[data-skincare-add-batch-step]");if(skincareBatchAdd){addSkincareEditorStep(skincareBatchAdd.dataset.skincareAddBatchStep);return;}'
new_event = 'const skincareBatchAdd=event.target.closest("[data-skincare-add-batch-step]");if(skincareBatchAdd){addSkincareEditorStep(skincareBatchAdd.dataset.skincareAddBatchStep,skincareBatchAdd.dataset.skincareAddVariant||"primary");return;}'
app = replace_once(app, old_event, new_event, 'skincare alternate click handler')

app = replace_once(app, 'description: "Plan one full week with separate AM and PM product tables, reuse routines across days, and open straight to today’s routine.",', 'description: "Plan one full week with main and optional alternate AM/PM product tables, reuse routines across days, and open straight to today’s routine.",', 'skincare template description')
index = replace_once(index, 'Each day has one AM table and one PM table. Add products directly inside the routine they belong to—no repeated AM/PM tagging.', 'Each day has a main AM and PM table, plus an optional Alternate AM and Alternate PM. Add products directly inside the routine you want to use.', 'skincare modal intro')
index = replace_once(index, 'Use <strong>+ Add product</strong> inside the AM or PM routine.', 'Use <strong>+ Add product</strong> inside the main or alternate AM/PM routine you want.', 'skincare modal help')

css_marker = '/* HANA SKINCARE ALTERNATE ROUTINES v2.0.19 */'
if css_marker in style:
    raise SystemExit('alternate skincare CSS already exists')
style += r'''

/* HANA SKINCARE ALTERNATE ROUTINES v2.0.19 */
.skincare-time-pair { display:grid; gap:10px; padding:10px; border:1px solid var(--border); border-radius:22px; background:color-mix(in srgb, var(--surface) 97%, var(--blush)); }
.skincare-time-pair + .skincare-time-pair { margin-top:2px; }
.skincare-time-pair-head { display:flex; align-items:baseline; justify-content:space-between; gap:10px; padding:1px 3px 0; }
.skincare-time-pair-head span { font-size:12px; font-weight:850; }
.skincare-time-pair-head small { color:var(--text-soft); font-size:9px; }
.skincare-routine-batch-alternate { border-style:dashed; background:color-mix(in srgb, var(--surface) 98%, var(--blush)); }
.skincare-routine-badge.alternate { border-style:dashed; background:transparent; color:var(--text-soft); }
.skincare-routine-period-alternate { border-style:dashed; background:color-mix(in srgb, var(--surface) 98%, var(--blush)); }
@media (max-width:390px) { .skincare-time-pair { padding:8px; border-radius:18px; } .skincare-time-pair-head { align-items:flex-start; flex-direction:column; gap:2px; } }
'''

app = replace_once(app, 'HANA 🌸 v2.0.18', 'HANA 🌸 v2.0.19', 'app header version')
release_pattern = re.compile(r'const HANA_APP_VERSION = "2\.0\.18";\nconst HANA_RELEASE_NOTES = \{.*?\n\};', re.S)
release_replacement = '''const HANA_APP_VERSION = "2.0.19";
const HANA_RELEASE_NOTES = {
  version: HANA_APP_VERSION,
  date: "August 13, 2026",
  title: "Alternate skincare routines 🌸",
  intro: "Hana 2.0.19 adds optional alternate morning and evening skincare routines without changing your existing plan.",
  items: [
    { icon: "☀️", title: "Alternate AM", text: "Every day can now keep a separate optional Alternate AM routine beside the main morning routine." },
    { icon: "🌙", title: "Alternate PM", text: "Every day can also keep a separate optional Alternate PM routine beside the main evening routine." },
    { icon: "🧴", title: "Old routines stay intact", text: "Existing skincare products automatically remain in the main routine, while alternates are stored separately and copied correctly when you sync days." },
    { icon: "🌸", title: "Compatibility cleanup", text: "Saving, reopening, search, day copying, local backup, cloud backup and shared-note data remain compatible with the expanded skincare format." }
  ]
};'''
app, count = release_pattern.subn(release_replacement, app, count=1)
if count != 1:
    raise SystemExit(f'release notes/version: expected 1 replacement, found {count}')

index = replace_once(index, '<meta name="hana-app-version" content="2.0.18" />', '<meta name="hana-app-version" content="2.0.19" />', 'index version meta')
index = replace_once(index, '<link rel="stylesheet" href="style.css" />', '<link rel="stylesheet" href="style.css?v=2.0.19" />', 'style version query')
index = replace_once(index, '<script src="app.js?v=2.0.18"></script>', '<script src="app.js?v=2.0.19"></script>', 'app version query')
sw = replace_once(sw, 'Service Worker v51', 'Service Worker v52', 'service worker header')
sw = replace_once(sw, 'const CACHE_NAME = "hana-shell-v51";', 'const CACHE_NAME = "hana-shell-v52";', 'service worker cache')
sw = replace_once(sw, '"./style.css",', '"./style.css?v=2.0.19",', 'service worker style query')
sw = replace_once(sw, '"./app.js?v=2.0.18"', '"./app.js?v=2.0.19"', 'service worker app query')

app_path.write_text(app, encoding='utf-8')
index_path.write_text(index, encoding='utf-8')
style_path.write_text(style, encoding='utf-8')
sw_path.write_text(sw, encoding='utf-8')

checks = {
    'variant normalized': 'const variant = step.variant === "alternate" ? "alternate" : "primary";' in app,
    'alternate AM editor': 'skincareRoutineBatchEditor("am","alternate",rows)' in app,
    'alternate PM editor': 'skincareRoutineBatchEditor("pm","alternate",rows)' in app,
    'variant DOM field': 'data-skincare-variant=' in app,
    'variant saved': 'variant:step.variant==="alternate"?"alternate":"primary"' in app,
    'alternate AM view': 'skincareStepsForDay(note,day,"am","alternate")' in app,
    'alternate PM view': 'skincareStepsForDay(note,day,"pm","alternate")' in app,
    'alternate click handler': 'dataset.skincareAddVariant||"primary"' in app,
    'release version': 'const HANA_APP_VERSION = "2.0.19";' in app,
    'index version': 'hana-app-version" content="2.0.19"' in index,
    'style cache bust': 'style.css?v=2.0.19' in index and 'style.css?v=2.0.19' in sw,
    'app cache bust': 'app.js?v=2.0.19' in index and 'app.js?v=2.0.19' in sw,
    'cache v52': 'hana-shell-v52' in sw,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Static QA failed: ' + ', '.join(failed))
print('Static QA passed:', ', '.join(checks))