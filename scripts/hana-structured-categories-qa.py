from pathlib import Path

app=Path('app.js').read_text(encoding='utf-8')
index=Path('index.html').read_text(encoding='utf-8')
style=Path('style.css').read_text(encoding='utf-8')
sw=Path('service-worker.js').read_text(encoding='utf-8')

checks={
  'internal build 2.0.25':'const HANA_APP_VERSION = "2.0.25";' in app,
  'visible version remains 2':'const HANA_DISPLAY_VERSION = "2";' in app,
  'index version 2.0.25':'hana-app-version" content="2.0.25"' in index,
  'service worker v58':'hana-shell-v58' in sw and 'app.js?v=2.0.25' in sw and 'style.css?v=2.0.25' in sw,
  'structured groups persisted':'structuredGroups,' in app and 'structuredType,meetingData,structuredGroups,structuredFields' in app,
  'legacy groups migrate':'inferStructuredNoteGroups' in app and 'legacy-${slug}-${groups.length+1}' in app,
  'blank editor fields preserved':'const keepBlank=options.keepBlank===true;' in app and '{keepBlank:true}' in app,
  'category add function':'function addStructuredNoteCategory()' in app,
  'category remove function':'function removeStructuredNoteCategory(id)' in app,
  'field add in category':'data-add-structured-field-to-category' in app,
  'field type selector':'data-structured-field-type-select' in app and 'changeStructuredNoteFieldType' in app,
  'field category selector':'data-structured-field-group-select' in app and 'moveStructuredNoteField' in app,
  'category rename input':'data-structured-category-name' in app,
  'category toolbar in html':'data-add-structured-category' in index,
  'old dead four buttons removed':'data-add-structured-field="text"' not in index and '+ Short field' not in index and '+ Long field' not in index,
  'category manager css':'HANA STRUCTURED CATEGORY MANAGER 2.0.25' in style,
  'search includes category names':'structuredGroups.map(group=>group.name)' in app,
}
failed=[name for name,ok in checks.items() if not ok]
if failed:
  raise SystemExit('Structured category QA failed: '+', '.join(failed))
print(f'Structured category QA passed: {len(checks)}/{len(checks)} checks')