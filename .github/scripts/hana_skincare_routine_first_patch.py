from pathlib import Path
import re


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, got {count}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label, flags=0):
    out, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, got {count}")
    return out


app_path = Path("app.js")
index_path = Path("index.html")
sw_path = Path("service-worker.js")
app = app_path.read_text(encoding="utf-8")
index = index_path.read_text(encoding="utf-8")
sw = sw_path.read_text(encoding="utf-8")

app = replace_once(
    app,
    "HANA 🌸 Version 2 · internal build 2.0.34\n   Trip-aware packing shortcut + expanded Smart Sort",
    "HANA 🌸 Version 2 · internal build 2.0.35\n   Routine-first skincare import + Smart Sort refinements",
    "app header",
)
app = replace_once(app, 'const HANA_APP_VERSION = "2.0.34";', 'const HANA_APP_VERSION = "2.0.35";', "app version")

release_pattern = re.compile(r"const HANA_RELEASE_NOTES = \{.*?\n\};", re.S)
release_new = '''const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 14, 2026",
  title: "Skincare routines, written naturally 🧴✨",
  intro: "Hana now understands routine-first skincare schedules too — including Daily morning routines, day-specific product exceptions, and different night routines for different weekday groups.",
  items: [
    { icon:"☀️", title:"Daily morning routines", text:"Paste a Morning Routine followed by (Daily), and Hana applies the shared products across the whole week." },
    { icon:"🧴", title:"Day-specific exceptions", text:"Lines such as Tuesday & Saturday → exfoliating toner and All other days → hydrating toner are assigned to the correct weekdays automatically." },
    { icon:"🌙", title:"Grouped night routines", text:"Hana understands weekday groups such as Tuesday / Thursday / Saturday / Sunday and Monday / Wednesday / Friday inside the same Night Routine." },
    { icon:"🧳", title:"Trip-aware packing stays exact", text:"Packing still appears exactly 7 days before a trip and disappears at the precise departure time you set." }
  ]
};'''
app, count = release_pattern.subn(release_new, app, count=1)
if count != 1:
    raise SystemExit(f"release notes: expected 1 match, got {count}")

helper = r'''
function skincareRoutineFirstDaySet(value="") {
  const dayMap={sun:0,sunday:0,mon:1,monday:1,tue:2,tues:2,tuesday:2,wed:3,weds:3,wednesday:3,thu:4,thur:4,thurs:4,thursday:4,fri:5,friday:5,sat:6,saturday:6};
  let clean=String(value||"").toLowerCase().replace(/[()]/g," ").replace(/\broutine\b/g," ").replace(/\bonly\b/g," ").replace(/\s+/g," ").trim();
  if(!clean)return null;
  if(/^(daily|every\s*day|all\s*days|everyday)$/.test(clean))return [0,1,2,3,4,5,6];
  if(/^weekdays?$/.test(clean))return [1,2,3,4,5];
  if(/^weekends?$/.test(clean))return [0,6];
  const matches=[...clean.matchAll(/\b(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|weds|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat)\b/g)];
  if(!matches.length)return null;
  const remainder=clean.replace(/\b(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|weds|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat)\b/g,"").replace(/\band\b|[,&/+|]/g,"").replace(/\s+/g,"").trim();
  if(remainder)return null;
  return [...new Set(matches.map(match=>dayMap[match[1]]).filter(day=>Number.isInteger(day)))];
}

function parseSkincareRoutineFirstText(text,{allowSingleDay=true}={}) {
  const raw=String(text||"").replace(/\r/g,"").trim();
  if(!raw||!/(?:morning|am|night|evening|pm)\s+routine\b/i.test(raw))return null;
  const allDays=[0,1,2,3,4,5,6],days={0:[],1:[],2:[],3:[],4:[],5:[],6:[]},dayLabels={0:"",1:"",2:"",3:"",4:"",5:"",6:""};
  let currentTime="",activeDays=[],conditionalCategory="",order=0,firstDay=null,sawRoutine=false,productLines=0;
  const assignedByCategory=new Map();
  const assignmentKey=category=>`${currentTime}:${String(category||"").toLowerCase()}`;
  const rememberAssigned=(category,targetDays)=>{const key=assignmentKey(category),set=assignedByCategory.get(key)||new Set();targetDays.forEach(day=>set.add(day));assignedByCategory.set(key,set);};
  const categoryWithNote=value=>{
    const clean=String(value||"").trim();
    const match=clean.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    return match?{category:match[1].trim(),note:match[2].trim()}:{category:clean,note:""};
  };
  const addProduct=(targetDays,rawCategory,rawProduct,extraNote="")=>{
    const targets=[...new Set((targetDays||[]).filter(day=>allDays.includes(day)))];if(!targets.length)return;
    const categoryMeta=categoryWithNote(rawCategory),category=canonicalSkincareImportCategory(categoryMeta.category),split=splitSkincareImportProduct(rawProduct);
    const product=String(split.product||"").trim();if(!product)return;
    const notes=[categoryMeta.note,extraNote,split.notes].map(value=>String(value||"").trim()).filter(Boolean).join(" · ");
    targets.forEach(day=>{
      const duplicate=days[day].some(step=>step.category===category&&step.product===product&&(step.times||[]).includes(currentTime));
      if(duplicate)return;
      days[day].push({category,product,times:[currentTime],variant:"primary",routineLabel:"",notes,order:order++});
      if(firstDay===null)firstDay=day;
    });
    rememberAssigned(categoryMeta.category,targets);productLines++;
  };

  for(const sourceLine of raw.split("\n")){
    let line=String(sourceLine||"").trim();
    if(!line||/^[\s⸻━─—–-]+$/.test(line))continue;
    const plain=line.replace(/^#{1,6}\s*/,"").replace(/^[-*•▪◦‣]+\s*/,"").trim();
    const routineMatch=plain.match(/^(Morning|AM|Night|Evening|PM)\s+Routine\b(?:\s*[☀️🌙]*)?(?:\s*\(([^)]+)\))?\s*:?[\s]*$/i);
    if(routineMatch){
      currentTime=/^(night|evening|pm)$/i.test(routineMatch[1])?"pm":"am";
      activeDays=allDays.slice();conditionalCategory="";sawRoutine=true;
      const inlineDays=skincareRoutineFirstDaySet(routineMatch[2]||"");if(inlineDays)activeDays=inlineDays;
      continue;
    }
    if(!currentTime)continue;
    const standaloneDays=skincareRoutineFirstDaySet(plain);
    if(standaloneDays){activeDays=standaloneDays;conditionalCategory="";continue;}
    const categoryOnly=plain.match(/^([^:→]{2,45})\s*:\s*$/);
    if(categoryOnly){conditionalCategory=categoryOnly[1].trim();continue;}
    const arrowIndex=plain.search(/\s*(?:→|->|=>)\s*/);
    if(arrowIndex>=0){
      const parts=plain.split(/\s*(?:→|->|=>)\s*/);const left=String(parts.shift()||"").trim(),right=parts.join(" → ").trim();if(!left||!right)continue;
      if(conditionalCategory){
        let targetDays=null;
        if(/^all\s+other\s+days$/i.test(left)){
          const used=assignedByCategory.get(assignmentKey(conditionalCategory))||new Set();targetDays=allDays.filter(day=>!used.has(day));
        }else targetDays=skincareRoutineFirstDaySet(left);
        if(targetDays){addProduct(targetDays,conditionalCategory,right);continue;}
      }
      addProduct(activeDays.length?activeDays:allDays,left,right);conditionalCategory="";continue;
    }
    const colonProduct=plain.match(/^([^:]{2,45})\s*:\s*(.+)$/);
    if(colonProduct){addProduct(activeDays.length?activeDays:allDays,colonProduct[1],colonProduct[2]);conditionalCategory="";continue;}
  }

  const dayCount=allDays.filter(day=>days[day].length).length,stepCount=allDays.reduce((sum,day)=>sum+days[day].length,0);
  const minimumDays=allowSingleDay?1:2,minimumSteps=allowSingleDay?1:4;
  if(!sawRoutine||!productLines||dayCount<minimumDays||stepCount<minimumSteps)return null;
  Object.values(days).forEach(items=>items.sort((a,b)=>Number(a.order||0)-Number(b.order||0)));
  return {title:"Weekly Skincare Routine",focus:"",days,dayLabels,firstDay:firstDay??1,dayCount,stepCount};
}

'''
marker = "function parseSkincareRoutineText(text,{allowSingleDay=true}={}) {"
app = replace_once(app, marker, helper + marker, "routine-first parser insertion")
app = replace_once(
    app,
    '''function parseSkincareRoutineText(text,{allowSingleDay=true}={}) {
  const raw=String(text||"").replace(/\\r/g,"").trim();
  if(!raw)return null;''',
    '''function parseSkincareRoutineText(text,{allowSingleDay=true}={}) {
  const raw=String(text||"").replace(/\\r/g,"").trim();
  if(!raw)return null;
  const routineFirst=parseSkincareRoutineFirstText(raw,{allowSingleDay});
  if(routineFirst)return routineFirst;''',
    "routine-first parser hook",
)

index = index.replace('hana-app-version" content="2.0.34"', 'hana-app-version" content="2.0.35"')
index = index.replace("style.css?v=2.0.34", "style.css?v=2.0.35").replace("app.js?v=2.0.34", "app.js?v=2.0.35")

sw = regex_once(sw, r'HANA 🌸 Service Worker v67[^\n]*', 'HANA 🌸 Service Worker v68 · routine-first skincare import', "service worker header")
sw = replace_once(sw, 'const CACHE_NAME = "hana-shell-v67";', 'const CACHE_NAME = "hana-shell-v68";', "service worker cache")
sw = sw.replace("style.css?v=2.0.34", "style.css?v=2.0.35").replace("app.js?v=2.0.34", "app.js?v=2.0.35")

app_path.write_text(app, encoding="utf-8")
index_path.write_text(index, encoding="utf-8")
sw_path.write_text(sw, encoding="utf-8")
