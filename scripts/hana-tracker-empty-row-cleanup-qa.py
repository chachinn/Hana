from pathlib import Path

app=Path('app.js').read_text(encoding='utf-8')
index=Path('index.html').read_text(encoding='utf-8')
sw=Path('service-worker.js').read_text(encoding='utf-8')

checks={
  'version bumped': 'const HANA_APP_VERSION = "2.0.29";' in app and 'hana-app-version" content="2.0.29"' in index,
  'empty row detector exists': 'function tableRowIsEffectivelyEmpty(table,row)' in app,
  'progress zero ignored': 'if(col.type==="progress")return text===""||Number(value||0)===0;' in app,
  'default status ignored': 'const defaultStatus=String((table.statusOptions||DEFAULT_TABLE_STATUSES)[0]||"upcoming")' in app,
  'normal number zero preserved': 'Keep numeric/money zeroes as real data' in app,
  'delete empty action exists': 'data-delete-empty-table-rows' in app and 'deleteEmptyTableRows' in app,
  'multi-select retained': 'data-bulk-delete-rows' in app and 'Delete selected' in app,
  'clearer multi-select label': '☑ Select / edit rows' in app,
  'trash safety retained': 'pre-empty-row-delete' in app and 'moveToTrash("tableRow",row' in app,
  'linked reminder cleanup retained': 'linkedReminders=state.reminders.filter(reminder=>reminder.linkedTableId===tableId&&reminder.linkedRowId===row.id)' in app,
  'cache bumped': 'hana-shell-v62' in sw and 'app.js?v=2.0.29' in sw,
}
failed=[name for name,ok in checks.items() if not ok]
if failed:
    raise SystemExit('QA failed: '+', '.join(failed))
print('Tracker cleanup QA passed:', ', '.join(checks))
