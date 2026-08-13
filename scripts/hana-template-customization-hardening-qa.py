from pathlib import Path
app=Path('app.js').read_text(encoding='utf-8')
index=Path('index.html').read_text(encoding='utf-8')
sw=Path('service-worker.js').read_text(encoding='utf-8')
checks={
 'build 2.0.24':'const HANA_APP_VERSION = "2.0.24";' in app,
 'visible v2':'const HANA_DISPLAY_VERSION = "2";' in app,
 'index 2.0.24':'hana-app-version" content="2.0.24"' in index,
 'sw57':'hana-shell-v57' in sw and 'app.js?v=2.0.24' in sw,
 'saved empty fields honored':'hasSavedFields?existing:structuredSchemaFields(type)' in app,
 'no structured auto regeneration':'if(structured&&!structuredNoteDraftFields.length)' not in app,
 'tracker name uses placeholder':'name.placeholder=template.name||"Tracker name"' in app,
 'tracker template no forced name':'if(force||!name.value.trim())name.value=template.name' not in app,
 'unsaved delete still hidden':'classList.toggle("hidden",!item||received)' in app,
 'curated templates remain':'id:"weekly-review"' not in app and 'id:"monthly-life-admin"' not in app and 'id:"weekly-reset"' not in app,
}
failed=[k for k,v in checks.items() if not v]
if failed: raise SystemExit('QA failed: '+', '.join(failed))
print('Hana template hardening QA passed:', len(checks), 'checks')
