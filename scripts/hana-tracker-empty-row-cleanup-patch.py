from pathlib import Path

app_path=Path('app.js')
index_path=Path('index.html')
sw_path=Path('service-worker.js')

app=app_path.read_text(encoding='utf-8')
index=index_path.read_text(encoding='utf-8')
sw=sw_path.read_text(encoding='utf-8')

def one(text, old, new, label):
    count=text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old,new,1)

app=one(app,'const HANA_APP_VERSION = "2.0.28";','const HANA_APP_VERSION = "2.0.29";','app version')

old_release='''  title: "Cleaner skincare tables & swipeable notes 🌸",
  intro: "Hana Version 2 makes weekly skincare editing feel like a real table and adds a faster mobile gesture for clearing notes.",
  items: [
    { icon:"🧴", title:"Skincare stays in rows", text:"Product Type, Product and Notes now stay on one compact table row instead of stacking Notes underneath every product on phones." },
    { icon:"↔️", title:"Table-friendly mobile editing", text:"Skincare routine tables can scroll sideways when needed, preserving readable columns without turning each entry into a tall card." },
    { icon:"👈", title:"Swipe notes to delete", text:"Swipe a note card left to use Hana’s normal Trash confirmation. Tapping the card still opens it." },
    { icon:"🛡️", title:"Safe delete path", text:"Swipe delete uses the existing Trash and Partner Link ownership safeguards rather than bypassing them." }
  ]'''
new_release='''  title: "Cleaner tracker cleanup 🌸",
  intro: "Hana Version 2 makes large trackers easier to clean without mistaking default values for real row content.",
  items: [
    { icon:"☑️", title:"Select and delete many rows", text:"Use More → Select / edit rows, tick any rows you want, then delete the whole selection together." },
    { icon:"🧹", title:"Delete empty rows", text:"One cleanup action removes rows that contain only blanks and default-looking values such as 0% progress, the default status, and unchecked boxes." },
    { icon:"🛡️", title:"Real zeroes stay safe", text:"A deliberate 0 in a normal Number or Money column still counts as data and will not be treated as an empty row." },
    { icon:"🗑️", title:"Cleanup still uses Trash", text:"Bulk and empty-row cleanup create a safety snapshot and move rows to Trash instead of permanently erasing them." }
  ]'''
app=one(app,old_release,new_release,'release notes')

anchor='''function deleteSelectedTableRows(tableId){
  const table=state.tables.find(item=>item.id===tableId);if(!table)return;
  const rows=selectedBulkRows(table);if(!rows.length)return showToast("Select at least one row to delete 🌸");
  if(!confirm(`Move ${rows.length} selected row${rows.length===1?"":"s"} to Trash?`))return;
  createSafetySnapshot("pre-bulk-row-delete",JSON.stringify(state),{force:true});
  const rowIds=new Set(rows.map(row=>row.id));
  rows.forEach(row=>{
    const linkedReminders=state.reminders.filter(reminder=>reminder.linkedTableId===tableId&&reminder.linkedRowId===row.id);
    moveToTrash("tableRow",row,{tableId,tableName:table.name,linkedReminders});
  });
  table.rows=table.rows.filter(row=>!rowIds.has(row.id));
  table.updatedAt=Date.now();
  state.reminders=state.reminders.filter(reminder=>!(reminder.linkedTableId===tableId&&rowIds.has(reminder.linkedRowId)));
  tableBulkState.selectedRows.clear();
  showToast(`${rows.length} row${rows.length===1?"":"s"} moved to Trash 🗑️`);
  render();
}
'''
insert=anchor+'''function tableCellIsEffectivelyEmpty(table,col,value){
  const text=String(value??"").trim();
  if(col.type==="checkbox"){
    if(value===false||value===0||value==null||text==="")return true;
    return ["false","0","no","unchecked","off"].includes(text.toLowerCase());
  }
  if(col.type==="progress")return text===""||Number(value||0)===0;
  if(col.type==="status"){
    const defaultStatus=String((table.statusOptions||DEFAULT_TABLE_STATUSES)[0]||"upcoming").trim().toLowerCase();
    const normalized=text.toLowerCase();
    return !normalized||normalized===defaultStatus;
  }
  // Keep numeric/money zeroes as real data. Only an actually blank cell is empty.
  return text==="";
}
function tableRowIsEffectivelyEmpty(table,row){
  if(!table?.columns?.length)return true;
  return table.columns.every(col=>tableCellIsEffectivelyEmpty(table,col,row?.values?.[col.id]));
}
function tableEmptyRows(table){
  return (table?.rows||[]).filter(row=>tableRowIsEffectivelyEmpty(table,row));
}
function deleteEmptyTableRows(tableId){
  const table=state.tables.find(item=>item.id===tableId);if(!table)return;
  const rows=tableEmptyRows(table);
  if(!rows.length)return showToast("No empty rows to clean up 🌿");
  const message=`Move ${rows.length} empty row${rows.length===1?"":"s"} to Trash? Hana treats blank cells, 0% progress, the default status, and unchecked boxes as empty.`;
  if(!confirm(message))return;
  createSafetySnapshot("pre-empty-row-delete",JSON.stringify(state),{force:true});
  const rowIds=new Set(rows.map(row=>row.id));
  rows.forEach(row=>{
    const linkedReminders=state.reminders.filter(reminder=>reminder.linkedTableId===tableId&&reminder.linkedRowId===row.id);
    moveToTrash("tableRow",row,{tableId,tableName:table.name,linkedReminders});
  });
  table.rows=table.rows.filter(row=>!rowIds.has(row.id));
  table.updatedAt=Date.now();
  state.reminders=state.reminders.filter(reminder=>!(reminder.linkedTableId===tableId&&rowIds.has(reminder.linkedRowId)));
  if(tableBulkState.tableId===tableId)tableBulkState.selectedRows=new Set([...tableBulkState.selectedRows].filter(id=>!rowIds.has(id)));
  showToast(`${rows.length} empty row${rows.length===1?"":"s"} moved to Trash 🧹`);
  render();
}
'''
app=one(app,anchor,insert,'empty row helpers')

old_render='''function renderSingleTable(table){
  const rows=getSortedTableRows(table),bulk=ensureTableBulkState(table),bulkActive=bulk.active;
  const selectedRows=selectedBulkRows(table),selectedCols=selectedBulkCols(table);
  const rowView=table.rowView||"compact";
  const normalActions=`<div class="tracker-toolbar"><div class="tracker-primary-actions"><button class="primary-button" data-add-row="${table.id}">+ Add row</button><button class="secondary-button" data-toggle-quick-row="${table.id}">⚡ Quick add</button></div><details class="tracker-more-actions"><summary>More</summary><div class="tracker-more-menu"><button class="secondary-button" data-toggle-bulk-table="${table.id}">☑ Bulk edit</button><button class="secondary-button" data-import-table="${table.id}">⇩ Import sheet</button><button class="secondary-button" data-cycle-row-view="${table.id}">Rows: ${rowView[0].toUpperCase()+rowView.slice(1)}</button><button class="secondary-button" data-edit-table="${table.id}">Edit tracker</button><button class="danger-button tracker-delete-button" data-delete-table="${table.id}">Delete tracker</button></div></details></div>`;'''
new_render='''function renderSingleTable(table){
  const rows=getSortedTableRows(table),emptyRows=tableEmptyRows(table),bulk=ensureTableBulkState(table),bulkActive=bulk.active;
  const selectedRows=selectedBulkRows(table),selectedCols=selectedBulkCols(table);
  const rowView=table.rowView||"compact";
  const normalActions=`<div class="tracker-toolbar"><div class="tracker-primary-actions"><button class="primary-button" data-add-row="${table.id}">+ Add row</button><button class="secondary-button" data-toggle-quick-row="${table.id}">⚡ Quick add</button></div><details class="tracker-more-actions"><summary>More</summary><div class="tracker-more-menu"><button class="secondary-button" data-toggle-bulk-table="${table.id}">☑ Select / edit rows</button><button class="secondary-button" data-import-table="${table.id}">⇩ Import sheet</button><button class="secondary-button" data-cycle-row-view="${table.id}">Rows: ${rowView[0].toUpperCase()+rowView.slice(1)}</button><button class="secondary-button" data-edit-table="${table.id}">Edit tracker</button><button class="danger-button" data-delete-empty-table-rows="${table.id}" ${emptyRows.length?"":"disabled"}>🧹 Delete empty rows${emptyRows.length?` (${emptyRows.length})`:""}</button><button class="danger-button tracker-delete-button" data-delete-table="${table.id}">Delete tracker</button></div></details></div>`;'''
app=one(app,old_render,new_render,'tracker more actions')

old_event='''  const bulkDeleteRows=event.target.closest("[data-bulk-delete-rows]");if(bulkDeleteRows){deleteSelectedTableRows(bulkDeleteRows.dataset.bulkDeleteRows);return;}
  const bulkRowTap=event.target.closest("[data-bulk-row]");'''
new_event='''  const bulkDeleteRows=event.target.closest("[data-bulk-delete-rows]");if(bulkDeleteRows){deleteSelectedTableRows(bulkDeleteRows.dataset.bulkDeleteRows);return;}
  const deleteEmptyRows=event.target.closest("[data-delete-empty-table-rows]");if(deleteEmptyRows){deleteEmptyTableRows(deleteEmptyRows.dataset.deleteEmptyTableRows);return;}
  const bulkRowTap=event.target.closest("[data-bulk-row]");'''
app=one(app,old_event,new_event,'empty row event handler')

index=one(index,'<meta name="hana-app-version" content="2.0.28" />','<meta name="hana-app-version" content="2.0.29" />','index meta')
index=one(index,'style.css?v=2.0.28','style.css?v=2.0.29','style version')
index=one(index,'app.js?v=2.0.28','app.js?v=2.0.29','app script version')

sw=one(sw,'Service Worker v61','Service Worker v62','sw banner')
sw=one(sw,'hana-shell-v61','hana-shell-v62','cache name')
sw=one(sw,'style.css?v=2.0.28','style.css?v=2.0.29','sw style')
sw=one(sw,'app.js?v=2.0.28','app.js?v=2.0.29','sw app')

app_path.write_text(app,encoding='utf-8')
index_path.write_text(index,encoding='utf-8')
sw_path.write_text(sw,encoding='utf-8')
print('tracker cleanup patch applied')
