from pathlib import Path

app=Path('app.js').read_text(encoding='utf-8')
index=Path('index.html').read_text(encoding='utf-8')
style=Path('style.css').read_text(encoding='utf-8')
sw=Path('service-worker.js').read_text(encoding='utf-8')

checks={
  'internal build 2.0.26':'const HANA_APP_VERSION = "2.0.26";' in app,
  'visible version remains 2':'const HANA_DISPLAY_VERSION = "2";' in app,
  'index version 2.0.26':'hana-app-version" content="2.0.26"' in index,
  'service worker v59':'hana-shell-v59' in sw and 'app.js?v=2.0.26' in sw and 'style.css?v=2.0.26' in sw,
  'smart template card':'id:"smart-template"' in app and 'category:"Build your own"' in app,
  'blank template card':'id:"blank-template"' in app and 'A genuinely empty custom form' in app,
  'build your own category first':'const categories=["Build your own","Meetings"' in app,
  'custom form structured type':'"custom-form"' in app and 'title:"Blank Template", icon:"⬜", fields:[]' in app,
  'blank template zero schema defaults':'"custom-form": { title:"Blank Template", icon:"⬜", fields:[] }' in app,
  'smart modal exists':'id="smartTemplateModal"' in index and 'What do you need?' in index,
  'smart meeting choices':'data-smart-template-target="meeting-agenda"' in index and 'data-smart-template-target="meeting-minutes"' in index,
  'smart routine choice':'data-smart-template-target="skincare-routine-note"' in index,
  'smart generic list':'data-smart-template-target="generic-list"' in index and 'openListTemplateDraft("simple")' in app,
  'smart generic tracker':'data-smart-template-target="generic-tracker"' in index and 'openTableTemplateDraft({name:"Tracker"' in app,
  'smart plain note':'data-smart-template-target="plain-note"' in index,
  'smart fallback blank':'data-smart-template-target="blank-template"' in index,
  'blank dispatch':'templateId==="blank-template"' in app and 'structuredType:"custom-form"' in app,
  'smart chooser does not save':'function chooseSmartTemplate(target)' in app and 'closeModal("smartTemplateModal")' in app,
  'category manager retained':'function addStructuredNoteCategory()' in app and 'data-add-structured-category' in index,
  'blank fields bug remains fixed':'const keepBlank=options.keepBlank===true;' in app and '{keepBlank:true}' in app,
  'smart blank css':'HANA SMART + BLANK TEMPLATES 2.0.26' in style,
}
failed=[name for name,ok in checks.items() if not ok]
if failed:
  raise SystemExit('Smart/Blank Template QA failed: '+', '.join(failed))
print(f'Smart/Blank Template QA passed: {len(checks)}/{len(checks)} checks')