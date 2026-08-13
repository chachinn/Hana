from pathlib import Path
import re

app=Path('app.js').read_text(encoding='utf-8')
index=Path('index.html').read_text(encoding='utf-8')
style=Path('style.css').read_text(encoding='utf-8')
sw=Path('service-worker.js').read_text(encoding='utf-8')

checks={
    'internal build 2.0.23': 'const HANA_APP_VERSION = "2.0.23";' in app,
    'visible version remains 2': 'const HANA_DISPLAY_VERSION = "2";' in app,
    'index version 2.0.23': 'hana-app-version" content="2.0.23"' in index,
    'service worker v56': 'hana-shell-v56' in sw and 'app.js?v=2.0.23' in sw,
    'redundant weekly review removed': 'id:"weekly-review"' not in app,
    'redundant monthly admin removed': 'id:"monthly-life-admin"' not in app,
    'redundant weekly reset removed': 'id:"weekly-reset"' not in app,
    'strategy renamed': 'title:"Strategy Plan"' in app,
    'blank grocery entries': 'grocery: { name: "Grocery List", icon: "🛒", items: [] }' in app,
    'blank packing entries': 'packing: { name: "Packing List", icon: "🧳", items: [] }' in app,
    'meeting preview has no today date prefill': 'meetingData:{kind:isMinutes?"minutes":"agenda",date:todayISO()' not in app,
    'note preview title blank': 'document.getElementById("noteTitle").value="";' in app,
    'note preview tags blank': 'document.getElementById("noteTags").value=""' in app,
    'list preview name blank': 'document.getElementById("listName").value="";' in app,
    'list preview items blank': 'openListModal();pendingListTemplateItems=[];' in app,
    'tracker preview name blank': 'document.getElementById("tableName").value="";' in app,
    'skincare preview title blank': 'title:note?.title||""' in app,
    'structured schemas exist': 'CUSTOM_STRUCTURED_NOTE_TYPES' in app and 'STRUCTURED_NOTE_SCHEMAS' in app,
    'professional bionote structured': 'structuredType:"professional-bionote"' in app,
    'strategy structured': 'structuredType:"strategy-plan"' in app,
    'measurement structured': 'structuredType:"measurement-profile"' in app,
    'structured fields persisted': 'structuredFields: isCustomStructuredNote(structuredType)' in app,
    'structured fields form exists': 'id="structuredNoteFieldsWrap"' in index,
    'structured add controls exist': 'data-add-structured-field="textarea"' in index,
    'delete hidden for unsaved forms': 'classList.toggle("hidden",!item||received)' in app,
    'focus bouquet no longer forced open': 'focus-bouquet-card" open' not in app,
    'clean focus list exists': 'focus-clean-list' in app and 'bouquet-actions-clean' in app,
    'old duplicated flower visual removed from today': '<div class="bouquet-visual" aria-label="Today\'s focus bouquet">' not in app,
    'new CSS exists': 'HANA TEMPLATE FORMS + CLEAN FOCUS 2.0.23' in style,
}

failed=[name for name,ok in checks.items() if not ok]
if failed:
    raise SystemExit('QA failed: '+', '.join(failed))

# Curated gallery should contain exactly the intended 10 IDs.
block=re.search(r'const STARTER_TEMPLATES = \[(.*?)\n\];',app,re.S)
if not block:
    raise SystemExit('QA failed: STARTER_TEMPLATES block missing')
ids=re.findall(r'id:"([^"]+)"',block.group(1))
expected=['meeting-agenda','meeting-minutes','skincare-routine-note','professional-bionote','strategy-outline-note','measurement-profile-note','grocery-list','packing-list','work-deliverables','bills-tracker']
if ids!=expected:
    raise SystemExit(f'QA failed: template roster mismatch: {ids}')

# The rebuilt useTemplate function must not mutate real state before a save.
use=re.search(r'function useTemplate\(templateId\) \{(.*?)\n\}\n\nfunction renderTrash',app,re.S)
if not use:
    raise SystemExit('QA failed: useTemplate function missing')
body=use.group(1)
for forbidden in ['state.notes.push','state.tasks.push','state.lists.push','state.tables.push']:
    if forbidden in body:
        raise SystemExit(f'QA failed: template preview still mutates state via {forbidden}')

# Structured templates should have blank VALUES. Labels are the reusable structure.
for literal in ['Full name:', 'Current title / position:', '## Professional experience', 'Owner — Action — Due date']:
    if literal in body:
        raise SystemExit(f'QA failed: legacy prefilled note text remains in template behavior: {literal}')

print('Hana template/form/focus QA passed:', len(checks), 'static checks + roster/state-mutation checks')
