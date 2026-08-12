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

# Internal build numbering remains monotonic for PWA update detection,
# while the product-facing version is simply "Version 2".
app = replace_once(app, 'HANA 🌸 v2.0.19', 'HANA 🌸 Version 2 · internal build 2.0.20', 'app header version')
app = replace_once(app, 'const HANA_APP_VERSION = "2.0.19";', 'const HANA_APP_VERSION = "2.0.20";\nconst HANA_DISPLAY_VERSION = "2";', 'internal/display versions')
app = replace_once(app, '  version: HANA_APP_VERSION,', '  version: HANA_DISPLAY_VERSION,', 'release display version')
app = replace_once(app, '  title: "Alternate skincare routines 🌸",', '  title: "Optional alternate skincare routines 🌸",', 'release title')
app = replace_once(app, '  intro: "Hana 2.0.19 adds optional alternate morning and evening skincare routines without changing your existing plan.",', '  intro: "Hana Version 2 now keeps alternate morning and evening routines out of the way until you choose to add them.",', 'release intro')
app = replace_once(app,
'''  items: [
    { icon: "☀️", title: "Alternate AM", text: "Every day can now keep a separate optional Alternate AM routine beside the main morning routine." },
    { icon: "🌙", title: "Alternate PM", text: "Every day can also keep a separate optional Alternate PM routine beside the main evening routine." },
    { icon: "🧴", title: "Old routines stay intact", text: "Existing skincare products automatically remain in the main routine, while alternates are stored separately and copied correctly when you sync days." },
    { icon: "🌸", title: "Compatibility cleanup", text: "Saving, reopening, search, day copying, local backup, cloud backup and shared-note data remain compatible with the expanded skincare format." }
  ]''',
'''  items: [
    { icon: "☀️", title: "Alternates stay hidden", text: "AM and PM show only the main routine unless you tap Add alternate routine." },
    { icon: "🌙", title: "Add one only when needed", text: "Alternate AM and Alternate PM are independent for every day and disappear again when they have no products." },
    { icon: "🧴", title: "Blank alternates are ignored", text: "Opening an alternate and leaving it empty will not create or save an empty routine." },
    { icon: "🌸", title: "Officially Version 2", text: "Hana now shows Version 2 as the product version. Small maintenance releases use an internal build number only for updates and caching." }
  ]''',
'release items')

# Add a compact hidden-until-needed alternate control.
anchor = '''function skincareRoutineBatchEditor(routine="am", variant="primary", rows=[]) {
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
helper = '''function skincareOptionalAlternateEditor(routine="am", rows=[]) {
  const meta=skincareRoutineBatchMeta(routine,"alternate");
  const hasAlternate=rows.some(step=>(step.times||[]).includes(meta.routine)&&(step.variant==="alternate"));
  if(hasAlternate)return skincareRoutineBatchEditor(meta.routine,"alternate",rows);
  return `<button type="button" class="secondary-button skincare-add-alternate-routine" data-skincare-add-batch-step="${meta.routine}" data-skincare-add-variant="alternate">+ Add alternate ${meta.routine==="am"?"AM":"PM"} routine</button>`;
}
'''
if helper.strip() not in app:
    app = replace_once(app, anchor, anchor + helper, 'optional alternate helper insertion')

# Ignore fully blank rows so merely revealing an alternate does not persist it.
old_read = '''  rows.forEach((row,index)=>{
    const routine=row.dataset.skincareRoutine==="pm"?"pm":"am";
    const variant=row.dataset.skincareVariant==="alternate"?"alternate":"primary";
    steps.push({
      id:row.dataset.stepId||createId(),
      category:row.querySelector("[data-skincare-category]")?.value||"Other",
      product:row.querySelector("[data-skincare-product]")?.value.trim()||"",
      times:[routine],
      variant,
      notes:row.querySelector("[data-skincare-notes]")?.value.trim()||"",
      order:index
    });
  });'''
new_read = '''  rows.forEach((row,index)=>{
    const routine=row.dataset.skincareRoutine==="pm"?"pm":"am";
    const variant=row.dataset.skincareVariant==="alternate"?"alternate":"primary";
    const category=row.querySelector("[data-skincare-category]")?.value||"";
    const product=row.querySelector("[data-skincare-product]")?.value.trim()||"";
    const notes=row.querySelector("[data-skincare-notes]")?.value.trim()||"";
    if(!category&&!product&&!notes)return;
    steps.push({
      id:row.dataset.stepId||createId(),
      category:category||"Other",
      product,
      times:[routine],
      variant,
      notes,
      order:index
    });
  });'''
app = replace_once(app, old_read, new_read, 'blank skincare row guard')

old_render = '''  if(container)container.innerHTML=`<div class="skincare-batch-stack"><div class="skincare-time-pair"><div class="skincare-time-pair-head"><span>☀️ Morning</span><small>Main + optional alternate</small></div>${skincareRoutineBatchEditor("am","primary",rows)}${skincareRoutineBatchEditor("am","alternate",rows)}</div><div class="skincare-time-pair"><div class="skincare-time-pair-head"><span>🌙 Evening</span><small>Main + optional alternate</small></div>${skincareRoutineBatchEditor("pm","primary",rows)}${skincareRoutineBatchEditor("pm","alternate",rows)}</div></div>`;'''
new_render = '''  if(container)container.innerHTML=`<div class="skincare-batch-stack"><div class="skincare-time-pair"><div class="skincare-time-pair-head"><span>☀️ Morning</span><small>AM routine</small></div>${skincareRoutineBatchEditor("am","primary",rows)}${skincareOptionalAlternateEditor("am",rows)}</div><div class="skincare-time-pair"><div class="skincare-time-pair-head"><span>🌙 Evening</span><small>PM routine</small></div>${skincareRoutineBatchEditor("pm","primary",rows)}${skincareOptionalAlternateEditor("pm",rows)}</div></div>`;'''
app = replace_once(app, old_render, new_render, 'optional alternate editor rendering')

# Version 2 is what the user sees; technical build stays in metadata/cache only.
index = replace_once(index, '<meta name="hana-app-version" content="2.0.19" />', '<meta name="hana-app-version" content="2.0.20" />', 'index internal version')
index = replace_once(index, '<link rel="stylesheet" href="style.css?v=2.0.19" />', '<link rel="stylesheet" href="style.css?v=2.0.20" />', 'style query build')
index = replace_once(index, '<span>Version <span data-hana-version>2.0.17</span></span>', '<span>Version <span data-hana-version>2</span></span>', 'visible product version')
index = replace_once(index, '<script src="app.js?v=2.0.19"></script>', '<script src="app.js?v=2.0.20"></script>', 'app query build')

sw = replace_once(sw, 'Service Worker v52', 'Service Worker v53', 'service worker version')
sw = replace_once(sw, 'const CACHE_NAME = "hana-shell-v52";', 'const CACHE_NAME = "hana-shell-v53";', 'service worker cache')
sw = replace_once(sw, '"./style.css?v=2.0.19"', '"./style.css?v=2.0.20"', 'service worker style build')
sw = replace_once(sw, '"./app.js?v=2.0.19"', '"./app.js?v=2.0.20"', 'service worker app build')

css_marker = '/* HANA VERSION 2 OPTIONAL SKINCARE ALTERNATE */'
if css_marker not in style:
    style += '''\n\n/* HANA VERSION 2 OPTIONAL SKINCARE ALTERNATE */\n.skincare-add-alternate-routine {\n  width: 100%;\n  margin-top: 10px;\n  border-style: dashed;\n  background: transparent;\n  color: var(--text-soft);\n}\n\n.skincare-add-alternate-routine:active {\n  transform: scale(.99);\n}\n'''

app_path.write_text(app, encoding='utf-8')
index_path.write_text(index, encoding='utf-8')
style_path.write_text(style, encoding='utf-8')
sw_path.write_text(sw, encoding='utf-8')

checks = {
    'internal build': 'const HANA_APP_VERSION = "2.0.20";' in app,
    'display version': 'const HANA_DISPLAY_VERSION = "2";' in app,
    'release uses display': 'version: HANA_DISPLAY_VERSION' in app,
    'optional helper': 'function skincareOptionalAlternateEditor' in app,
    'no forced alternate render': 'skincareRoutineBatchEditor("am","alternate",rows)' not in new_render,
    'blank row guard': 'if(!category&&!product&&!notes)return;' in app,
    'visible Version 2': 'data-hana-version>2</span>' in index,
    'build meta': 'hana-app-version" content="2.0.20"' in index,
    'cache v53': 'hana-shell-v53' in sw,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Patch static QA failed: ' + ', '.join(failed))
print('Patch static QA passed:', ', '.join(checks))
