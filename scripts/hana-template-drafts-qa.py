from pathlib import Path

app=Path('app.js').read_text(encoding='utf-8')
index=Path('index.html').read_text(encoding='utf-8')
sw=Path('service-worker.js').read_text(encoding='utf-8')
style=Path('style.css').read_text(encoding='utf-8')

def block(start,end):
    a=app.find(start)
    if a<0: raise AssertionError(f'missing start: {start}')
    b=app.find(end,a)
    if b<0: raise AssertionError(f'missing end: {end}')
    return app[a:b]

use=block('function useTemplate(templateId) {','function renderTrash() {')

# Previewing a library template must not directly add any real collection item.
for forbidden in [
    'state.tasks.push(',
    'state.notes.push(',
    'state.lists.push(',
    'state.tables.push(',
    'createListFromTemplate(',
    'changePage("lists")',
    'changePage("tables")'
]:
    assert forbidden not in use, f'immediate template persistence remains: {forbidden}'

# Every template family must route to an unsaved editor draft.
for required in [
    'openTaskTemplateDraft',
    'openNoteTemplateDraft',
    'openListTemplateDraft',
    'openTableTemplateDraft',
    'openSkincareRoutineModal("",{edit:true})'
]:
    assert required in use, f'missing draft route: {required}'

assert 'Template preview · not saved yet' in app
assert '>Preview</button>' in app
assert 'pendingListTemplateItems' in app
assert 'items: old?.items || pendingListTemplateItems.map' in app

# Actual save handlers still own creation.
save_task=block('function saveTask() {','function syncTaskReminder(')
save_note=block('function saveNote() {','function deleteNote(')
save_list=block('function saveList() {','function deleteList(')
save_table=block('function saveTable(){','function deleteTable(')
assert 'state.tasks.push(task)' in save_task
assert 'state.notes.push(note)' in save_note
assert 'state.lists.push(list)' in save_list
assert 'state.tables.push(table)' in save_table

# Normal editor openings clear any stale preview-only UI/state.
assert 'clearTemplateDraftBanner("taskModal")' in app
assert 'clearTemplateDraftBanner("noteModal")' in app
assert 'clearTemplateDraftBanner("listModal")' in app
assert 'clearTemplateDraftBanner("tableModal")' in app
assert 'clearTemplateDraftBanner("skincareRoutineModal")' in app

# Visible version remains Version 2 while internal cache build moves forward.
assert 'const HANA_APP_VERSION = "2.0.22";' in app
assert 'const HANA_DISPLAY_VERSION = "2";' in app
assert 'hana-app-version" content="2.0.22"' in index
assert 'data-hana-version>2</span>' in index
assert 'hana-shell-v55' in sw
assert 'app.js?v=2.0.22' in index and 'app.js?v=2.0.22' in sw
assert 'style.css?v=2.0.22' in index and 'style.css?v=2.0.22' in sw
assert 'HANA TEMPLATE DRAFT PREVIEW' in style

print('Template draft QA passed: previews do not persist; Save/Create remains the commit point.')
