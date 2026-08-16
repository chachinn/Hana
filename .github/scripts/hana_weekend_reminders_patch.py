from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing expected {label}")
    if text.count(old) != 1:
        raise SystemExit(f"Expected one {label}, found {text.count(old)}")
    return text.replace(old, new, 1)

app_path = Path("app.js")
app = app_path.read_text()

app = replace_once(
    app,
    'const HANA_WHATS_NEW_KEY = "hana-v1-2026-08-16-intelligence-stability";',
    'const HANA_WHATS_NEW_KEY = "hana-v1-2026-08-16-weekend-reminders";',
    "What’s New key",
)

app = replace_once(
    app,
    '  items: [\n    { icon:"🧠", title:"Ask Hana & Smart Review",',
    '  items: [\n    { icon:"🔔", title:"Weekend reminders", text:"Choose Weekends to repeat only on Saturday and Sunday. If the selected start date is Monday through Friday, Hana moves the first occurrence to the next Saturday so it never fires on a weekday." },\n    { icon:"🧠", title:"Ask Hana & Smart Review",',
    "What’s New weekend item",
)

helper_anchor = '''function nextWorkdayISO(from = new Date()) {
  const d = new Date(from);
  do { d.setDate(d.getDate() + 1); } while ([0, 6].includes(d.getDay()));
  return localDateISO(d);
}
'''
helper_new = helper_anchor + '''
function nextWeekendISO(dateString = todayISO(), includeCurrent = false) {
  const d = new Date(`${dateString || todayISO()}T12:00:00`);
  if (includeCurrent && [0, 6].includes(d.getDay())) return localDateISO(d);
  do { d.setDate(d.getDate() + 1); } while (![0, 6].includes(d.getDay()));
  return localDateISO(d);
}
'''
app = replace_once(app, helper_anchor, helper_new, "weekend date helper anchor")

app = replace_once(
    app,
    'repeatType: ["none", "daily", "weekdays", "weekly", "monthly", "yearly", "custom"].includes(repeatType) ? repeatType : "none",',
    'repeatType: ["none", "daily", "weekdays", "weekends", "weekly", "monthly", "yearly", "custom"].includes(repeatType) ? repeatType : "none",',
    "reminder repeat normalization",
)

old_save = '''function saveReminder() {
  const id=document.getElementById("reminderEditId").value; const old=id?state.reminders.find(r=>r.id===id):null; const title=document.getElementById("reminderTitle").value.trim(); const date=document.getElementById("reminderDate").value;
  if(!title)return showToast("What should Hana remind you about?"); if(!date)return showToast("Choose a reminder date 🌸");
  const r=normalizeReminder({...(old||{}),id:id||createId(),title,space:document.getElementById("reminderSpace").value,date,time:document.getElementById("reminderTime").value||"09:00",repeatType:document.getElementById("reminderRepeat").value,repeatInterval:Number(document.getElementById("reminderRepeatInterval").value||1),chainEnabled:document.getElementById("reminderChainEnabled").checked,notified:false,chainNotified:[],completed:false,...shareMetaFromControl("reminder",old),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()});
  if(old)state.reminders[state.reminders.findIndex(x=>x.id===id)]=r;else state.reminders.push(r);closeModal("reminderModal");showToast(old?"Reminder updated 🔔":"Reminder planted 🔔");render();
}
'''
new_save = '''function saveReminder() {
  const id=document.getElementById("reminderEditId").value; const old=id?state.reminders.find(r=>r.id===id):null; const title=document.getElementById("reminderTitle").value.trim(); const date=document.getElementById("reminderDate").value;
  if(!title)return showToast("What should Hana remind you about?"); if(!date)return showToast("Choose a reminder date 🌸");
  const repeatType=document.getElementById("reminderRepeat").value;
  const normalizedDate=repeatType==="weekends"?nextWeekendISO(date,true):date;
  const r=normalizeReminder({...(old||{}),id:id||createId(),title,space:document.getElementById("reminderSpace").value,date:normalizedDate,time:document.getElementById("reminderTime").value||"09:00",repeatType,repeatInterval:Number(document.getElementById("reminderRepeatInterval").value||1),chainEnabled:document.getElementById("reminderChainEnabled").checked,notified:false,chainNotified:[],completed:false,...shareMetaFromControl("reminder",old),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()});
  if(old)state.reminders[state.reminders.findIndex(x=>x.id===id)]=r;else state.reminders.push(r);closeModal("reminderModal");showToast(normalizedDate!==date?`Weekend repeat starts ${formatFullDate(normalizedDate)} 🔔`:(old?"Reminder updated 🔔":"Reminder planted 🔔"));render();
}
'''
app = replace_once(app, old_save, new_save, "saveReminder")

old_advance = 'function advanceReminder(r){if(r.repeatType==="monthly"){r.date=addMonthsClamped(r.date,1);}else if(r.repeatType==="yearly"){r.date=addYearsClamped(r.date,1);}else{const base=new Date(`${r.date}T12:00:00`);if(r.repeatType==="daily")base.setDate(base.getDate()+1);if(r.repeatType==="custom")base.setDate(base.getDate()+r.repeatInterval);if(r.repeatType==="weekly")base.setDate(base.getDate()+7);if(r.repeatType==="weekdays"){do{base.setDate(base.getDate()+1)}while([0,6].includes(base.getDay()));}r.date=localDateISO(base);}r.notified=false;r.chainNotified=[];r.completed=false;}'
new_advance = 'function advanceReminder(r){if(r.repeatType==="monthly"){r.date=addMonthsClamped(r.date,1);}else if(r.repeatType==="yearly"){r.date=addYearsClamped(r.date,1);}else if(r.repeatType==="weekends"){r.date=nextWeekendISO(r.date,false);}else{const base=new Date(`${r.date}T12:00:00`);if(r.repeatType==="daily")base.setDate(base.getDate()+1);if(r.repeatType==="custom")base.setDate(base.getDate()+r.repeatInterval);if(r.repeatType==="weekly")base.setDate(base.getDate()+7);if(r.repeatType==="weekdays"){do{base.setDate(base.getDate()+1)}while([0,6].includes(base.getDay()));}r.date=localDateISO(base);}r.notified=false;r.chainNotified=[];r.completed=false;}'
app = replace_once(app, old_advance, new_advance, "advanceReminder")
app_path.write_text(app)

index_path = Path("index.html")
index = index_path.read_text()
index = replace_once(
    index,
    '<option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option>',
    '<option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekends">Weekends</option><option value="weekly">Weekly</option>',
    "reminder repeat dropdown",
)
index_path.write_text(index)

sw_path = Path("service-worker.js")
sw = sw_path.read_text()
sw = replace_once(
    sw,
    'const CACHE_NAME = "hana-shell-v1-whats-new-1";',
    'const CACHE_NAME = "hana-shell-v1-weekend-reminders-1";',
    "service worker cache",
)
sw_path.write_text(sw)

qa_path = Path(".github/workflows/hana-runtime-smoke.yml")
qa = qa_path.read_text()
qa = qa.replace('hana-v1-2026-08-16-intelligence-stability', 'hana-v1-2026-08-16-weekend-reminders')
qa = qa.replace('hana-shell-v1-whats-new-1', 'hana-shell-v1-weekend-reminders-1')

grep_anchor = "          grep -q 'meetingDecisionItemRowHTML' app.js\n"
grep_new = grep_anchor + "          grep -q 'function nextWeekendISO' app.js\n          grep -q 'option value=\"weekends\">Weekends</option>' index.html\n          grep -q '\"weekends\"' app.js\n"
qa = replace_once(qa, grep_anchor, grep_new, "permanent QA static anchor")

browser_anchor = "            if(Object.values(retained).some(v=>v!==true))throw new Error('Retained Version 1 system regressed '+JSON.stringify(retained));\n\n            const intelligence=await page.evaluate(()=>"
weekend_test = '''            if(Object.values(retained).some(v=>v!==true))throw new Error('Retained Version 1 system regressed '+JSON.stringify(retained));

            const weekendReminder=await page.evaluate(()=>{
              const option=[...document.getElementById('reminderRepeat').options].find(item=>item.value==='weekends');
              const mondayStart=nextWeekendISO('2026-08-17',true);
              const saturdayStay=nextWeekendISO('2026-08-22',true);
              const saturdayNext=nextWeekendISO('2026-08-22',false);
              const sundayNext=nextWeekendISO('2026-08-23',false);
              const normalized=normalizeReminder({id:'weekend-normalized',title:'Weekend normalized',date:'2026-08-22',repeatType:'weekends'});
              const repeat=normalizeReminder({id:'weekend-repeat',title:'Weekend repeat',date:'2026-08-22',repeatType:'weekends'});
              advanceReminder(repeat);const afterSaturday=repeat.date;advanceReminder(repeat);const afterSunday=repeat.date;
              return{label:option?.textContent||'',mondayStart,saturdayStay,saturdayNext,sundayNext,normalized:normalized.repeatType,afterSaturday,afterSunday};
            });
            if(weekendReminder.label!=='Weekends'||weekendReminder.mondayStart!=='2026-08-22'||weekendReminder.saturdayStay!=='2026-08-22'||weekendReminder.saturdayNext!=='2026-08-23'||weekendReminder.sundayNext!=='2026-08-29'||weekendReminder.normalized!=='weekends'||weekendReminder.afterSaturday!=='2026-08-23'||weekendReminder.afterSunday!=='2026-08-29')throw new Error('Weekend reminder recurrence regressed '+JSON.stringify(weekendReminder));

            const intelligence=await page.evaluate(()=>'''
qa = replace_once(qa, browser_anchor, weekend_test, "permanent QA browser anchor")
qa_path.write_text(qa)

print("Weekend reminder patch prepared")
