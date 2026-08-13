from pathlib import Path

app=Path('app.js').read_text(encoding='utf-8')
index=Path('index.html').read_text(encoding='utf-8')
style=Path('style.css').read_text(encoding='utf-8')
sw=Path('service-worker.js').read_text(encoding='utf-8')

checks={
  'app version':'const HANA_APP_VERSION = "2.0.28";' in app,
  'visible version stays 2':'const HANA_DISPLAY_VERSION = "2";' in app,
  'note swipe state':'let noteSwipeGesture=' in app and 'noteGestureSuppressUntil' in app,
  'note swipe delete uses normal delete':'setTimeout(()=>deleteNote(noteId),0);' in app,
  'note swipe threshold':'dx<=-72' in app,
  'post-swipe click suppressed':'Date.now()<noteGestureSuppressUntil' in app,
  'tap-to-open retained':'openNoteCardElement(tappedNoteCard)' in app,
  'skincare compact table marker':'HANA COMPACT SKINCARE TABLE + NOTE SWIPE 2.0.28' in style,
  'skincare rows stay single row':'grid-template-columns: 118px 170px minmax(190px, 1fr) 34px;' in style,
  'mobile table stays grid':'grid-template-columns: 110px 155px 180px 32px !important;' in style,
  'mobile notes not stacked':'.skincare-notes-cell,' in style and 'grid-column:auto !important;' in style,
  'table can scroll sideways':'overflow-x: auto;' in style,
  'index meta':'hana-app-version" content="2.0.28"' in index,
  'index app':'app.js?v=2.0.28' in index,
  'index style':'style.css?v=2.0.28' in index,
  'sw cache':'hana-shell-v61' in sw,
  'sw app':'./app.js?v=2.0.28' in sw,
  'sw style':'./style.css?v=2.0.28' in sw,
}
failed=[name for name,ok in checks.items() if not ok]
if failed:
  raise SystemExit('QA failed: '+', '.join(failed))
print('Hana skincare table + note swipe QA passed:', len(checks), 'checks')
