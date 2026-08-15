/* =====================================================
   HANA 🌸 LOCAL INTELLIGENCE · Version 1
   Local-first understanding, suggestions, relationships and Ask Hana.
   No network calls. No silent destructive writes.
   ===================================================== */
(() => {
  'use strict';

  const STOP = new Set('a an and are as at be been but by for from has have i in is it its me my of on or our so that the their them there these they this to was we were what when where which who why will with you your'.split(' '));
  const DAY_MS = 86400000;
  const MAX_INDEX = 1200;
  const MAX_RESULTS = 12;
  const norm = value => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s-]/g,' ').replace(/\s+/g,' ').trim();
  const tokens = value => [...new Set(norm(value).split(' ').filter(t => t.length > 1 && !STOP.has(t)))];
  const esc = value => typeof escapeHTML === 'function' ? escapeHTML(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iso = d => { const x = new Date(d); return Number.isNaN(x.getTime()) ? '' : `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
  const today = () => iso(new Date());
  const addDays = (base, days) => { const d = new Date(`${base || today()}T12:00:00`); d.setDate(d.getDate()+days); return iso(d); };
  const daysBetween = (a,b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`))/DAY_MS);

  function ensureMemory(){
    if(!state?.settings) return {learned:{},dismissed:{},accepted:{}};
    if(!state.settings.hanaIntelligenceMemory || typeof state.settings.hanaIntelligenceMemory !== 'object') state.settings.hanaIntelligenceMemory={learned:{},dismissed:{},accepted:{}};
    const m=state.settings.hanaIntelligenceMemory;
    m.learned ||= {}; m.dismissed ||= {}; m.accepted ||= {};
    return m;
  }

  function naturalDate(text, base = new Date()){
    const raw=norm(text); if(!raw) return null;
    const baseISO=iso(base);
    if(/\btoday\b/.test(raw)) return {date:baseISO,label:'today',confidence:1};
    if(/\btomorrow\b/.test(raw)) return {date:addDays(baseISO,1),label:'tomorrow',confidence:1};
    if(/\byesterday\b/.test(raw)) return {date:addDays(baseISO,-1),label:'yesterday',confidence:1};
    const inDays=raw.match(/\bin\s+(\d{1,3})\s+days?\b/); if(inDays) return {date:addDays(baseISO,Number(inDays[1])),label:inDays[0],confidence:.95};
    const weeks=raw.match(/\bin\s+(\d{1,2})\s+weeks?\b/); if(weeks) return {date:addDays(baseISO,Number(weeks[1])*7),label:weeks[0],confidence:.95};
    const explicit=String(text).match(/\b(20\d{2})[-\/]([01]?\d)[-\/]([0-3]?\d)\b/); if(explicit) return {date:`${explicit[1]}-${String(explicit[2]).padStart(2,'0')}-${String(explicit[3]).padStart(2,'0')}`,label:explicit[0],confidence:1};
    const weekdays=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    for(let i=0;i<7;i++){
      const name=weekdays[i];
      const m=raw.match(new RegExp(`\\b(next\\s+)?${name}\\b`));
      if(m){ const cur=base.getDay(); let delta=(i-cur+7)%7; if(delta===0||m[1]) delta+=7; return {date:addDays(baseISO,delta),label:m[0],confidence:.9}; }
    }
    return null;
  }

  function rootText(obj, extra=''){
    const parts=[obj?.title,obj?.name,obj?.content,obj?.description,obj?.notes,obj?.project,obj?.space,extra];
    if(Array.isArray(obj?.tags)) parts.push(obj.tags.join(' '));
    return parts.filter(Boolean).join(' ');
  }

  function corpus(){
    const out=[]; const add=(kind,obj,text,meta={})=>{ if(!obj||out.length>=MAX_INDEX)return; const title=String(obj.title||obj.name||meta.title||kind); const body=rootText(obj,text); out.push({kind,id:obj.id||'',title,body,text:norm(`${title} ${body}`),tokens:tokens(`${title} ${body}`),updatedAt:Number(obj.updatedAt||obj.completedAt||obj.createdAt||0),createdAt:Number(obj.createdAt||0),done:Boolean(obj.done||obj.completed),due:obj.dueDate||obj.date||obj.remindAt||'',space:obj.space||'',project:obj.project||'',shared:Boolean(obj.sharedWithPartner),raw:obj,...meta}); };
    (state?.tasks||[]).forEach(o=>add('task',o,o.notes||''));
    (state?.notes||[]).forEach(o=>add('note',o,o.content||'',{structuredType:o.structuredType||''}));
    (state?.lists||[]).forEach(o=>{ add('list',o,(o.items||[]).map(i=>`${i.title||i.name||''} ${i.detail||''}`).join(' '),{openItems:(o.items||[]).filter(i=>!i.checked).length}); });
    (state?.tables||[]).forEach(o=>add('tracker',o,(o.rows||[]).map(r=>Object.values(r.values||{}).join(' ')).join(' '),{rowCount:(o.rows||[]).length}));
    (state?.projects||[]).forEach(o=>add('project',o,o.description||''));
    (state?.events||[]).forEach(o=>add('event',o,`${o.location||''} ${o.notes||''}`));
    (state?.reminders||[]).forEach(o=>add('reminder',o,o.notes||''));
    (state?.pins||state?.pinboard||[]).forEach(o=>add('pin',o,o.content||o.url||''));
    return out;
  }

  function scoreQuery(entry, query){
    const qn=norm(query), qt=tokens(query); if(!qn)return 0;
    let s=0; if(entry.text.includes(qn)) s+=12;
    qt.forEach(t=>{ if(entry.title.toLowerCase().includes(t))s+=5; if(entry.tokens.includes(t))s+=2; });
    if(entry.updatedAt) s+=Math.max(0,2-(Date.now()-entry.updatedAt)/(30*DAY_MS));
    return s;
  }
  function semanticSearch(query, limit=MAX_RESULTS){ return corpus().map(e=>({...e,score:scoreQuery(e,query)})).filter(e=>e.score>0).sort((a,b)=>b.score-a.score).slice(0,limit); }

  function duplicateGroups(){
    const all=corpus().filter(e=>['task','note','list','project','reminder'].includes(e.kind)); const groups=[]; const seen=new Set();
    all.forEach((a,i)=>{ if(seen.has(`${a.kind}:${a.id}`))return; const at=tokens(a.title); if(at.length<1)return; const matches=[a]; for(let j=i+1;j<all.length;j++){ const b=all[j]; if(a.kind!==b.kind)continue; const bt=tokens(b.title); const inter=at.filter(t=>bt.includes(t)).length; const ratio=inter/Math.max(at.length,bt.length,1); if(norm(a.title)===norm(b.title)||ratio>=.8){matches.push(b);seen.add(`${b.kind}:${b.id}`);} } if(matches.length>1)groups.push(matches); }); return groups.slice(0,8);
  }

  function relationshipGroups(){
    const all=corpus(); const groups=[];
    const projects=(state?.projects||[]).map(p=>({p,key:norm(p.name||p.title)})).filter(x=>x.key);
    projects.forEach(({p,key})=>{ const related=all.filter(e=>e.id!==p.id && (norm(e.project)===key || e.text.includes(key) || tokens(key).filter(t=>e.tokens.includes(t)).length>=Math.min(2,tokens(key).length))).slice(0,10); if(related.length) groups.push({title:p.name||p.title,project:p,items:related}); });
    return groups.slice(0,8);
  }

  function conflicts(){
    const events=(state?.events||[]).filter(e=>e.date||e.startAt||e.start); const parsed=events.map(e=>{const raw=e.startAt||e.start||`${e.date||''}T${e.time||'00:00'}`; const d=new Date(raw); return {e,d,end:new Date(e.endAt||e.end||d.getTime()+60*60000)};}).filter(x=>!Number.isNaN(x.d.getTime()));
    const out=[]; for(let i=0;i<parsed.length;i++)for(let j=i+1;j<parsed.length;j++){const a=parsed[i],b=parsed[j];if(a.d<b.end&&b.d<a.end)out.push([a.e,b.e]);} return out.slice(0,6);
  }

  function weeklyReset(){
    const now=today(); const soon=addDays(now,7); const all=corpus();
    const overdue=all.filter(e=>!e.done&&e.due&&String(e.due).slice(0,10)<now).slice(0,8);
    const upcoming=all.filter(e=>e.due&&String(e.due).slice(0,10)>=now&&String(e.due).slice(0,10)<=soon).slice(0,8);
    const stale=all.filter(e=>['project','task','note'].includes(e.kind)&&e.updatedAt&&Date.now()-e.updatedAt>30*DAY_MS&&!e.done).sort((a,b)=>a.updatedAt-b.updatedAt).slice(0,8);
    const waiting=(state?.tasks||[]).filter(t=>/wait|waiting|reply|approval|result|response|delivery/i.test(`${t.title||''} ${t.notes||''}`)&&!t.done).slice(0,8);
    return {overdue,upcoming,stale,waiting,duplicates:duplicateGroups(),conflicts:conflicts()};
  }

  function suggestions(){
    const list=[]; const all=corpus(); const mem=ensureMemory();
    const push=(id,icon,title,detail,type='review',payload={})=>{if(mem.dismissed[id])return;list.push({id,icon,title,detail,type,payload});};
    duplicateGroups().forEach((g,i)=>push(`dup:${g.map(x=>x.id).join('|')}`,'🪞','Possible duplicate',`${g.map(x=>x.title).join(' · ')} — review before keeping both.`,'duplicates',{items:g}));
    conflicts().forEach((g,i)=>push(`conflict:${g.map(x=>x.id).join('|')}`,'⚠️','Schedule conflict',`${g[0].title||g[0].name} overlaps ${g[1].title||g[1].name}.`,'conflict',{items:g}));
    const undated=(state?.tasks||[]).filter(t=>!t.done&&!t.dueDate).slice(0,80); undated.forEach(t=>{const d=naturalDate(`${t.title||''} ${t.notes||''}`);if(d)push(`date:${t.id}:${d.date}`,'📅','Date found in a task',`“${t.title}” mentions ${d.label}. Suggested date: ${d.date}.`,'date',{taskId:t.id,date:d.date});});
    (state?.tasks||[]).filter(t=>!t.done&&/wait|waiting|reply|approval|result|response/i.test(`${t.title||''} ${t.notes||''}`)&&!t.dueDate).slice(0,5).forEach(t=>push(`follow:${t.id}`,'⏳','Add a follow-up',`“${t.title}” looks like something you’re waiting on. Consider a follow-up reminder.`,'followup',{taskId:t.id}));
    const oldLists=(state?.lists||[]).filter(l=>(l.items||[]).length&&Date.now()-Number(l.updatedAt||l.createdAt||0)>45*DAY_MS); oldLists.filter(l=>/pack|travel|trip/i.test(l.name||l.title||'')).slice(0,4).forEach(l=>push(`reuse:${l.id}`,'♻️','Reuse a previous packing list',`${l.name||l.title} can be reused or reset for a future trip.`,'reuse',{listId:l.id}));
    relationshipGroups().slice(0,4).forEach(g=>push(`rel:${g.project.id}`,'🧵','Related things detected',`${g.items.length} Hana items appear related to “${g.title}”. Consider keeping them together in a Memory Thread.`,'relationship',{projectId:g.project.id}));
    const stale=weeklyReset().stale; stale.slice(0,4).forEach(e=>push(`stale:${e.kind}:${e.id}`,'🍂','Possibly stale',`${e.title} hasn’t changed in over a month. Keep, archive, or refresh it.`,'archive',{kind:e.kind,id:e.id}));
    // Missing-piece travel checks.
    const travel=all.filter(e=>/trip|travel|japan|flight|vacation/i.test(e.text)); if(travel.length){const blob=travel.map(e=>e.text).join(' '); [['insurance','travel insurance'],['transfer','airport transfer'],['passport','passport'],['charger','charger / adapter']].forEach(([key,label])=>{if(!blob.includes(key))push(`travel-missing:${key}`,'✈️','Travel prep check',`Your travel items don’t appear to mention ${label}. Check whether you need it.`,'missing');});}
    // Repeated task titles -> routine suggestion.
    const counts={}; (state?.tasks||[]).forEach(t=>{const k=norm(t.title);if(k)counts[k]=(counts[k]||0)+1;}); Object.entries(counts).filter(([,n])=>n>=3).slice(0,4).forEach(([k,n])=>push(`routine:${k}`,'🔁','Possible reusable routine',`“${k}” appears ${n} times. Consider making it a reusable or repeating routine.`,'routine'));
    return list.slice(0,24);
  }

  function summarizeEntries(entries){
    if(!entries.length)return 'I couldn’t find anything matching that in Hana.';
    const kinds={}; entries.forEach(e=>kinds[e.kind]=(kinds[e.kind]||0)+1); const kindText=Object.entries(kinds).map(([k,n])=>`${n} ${k}${n===1?'':'s'}`).join(', ');
    return `I found ${entries.length} related item${entries.length===1?'':'s'} (${kindText}).\n\n${entries.slice(0,8).map(e=>`• ${e.title}${e.due?` — ${String(e.due).slice(0,10)}`:''}`).join('\n')}`;
  }

  function skincareTonight(){
    const notes=(state?.notes||[]).filter(n=>n.structuredType==='skincare-weekly'); if(!notes.length)return 'I couldn’t find a Weekly Skincare Routine yet.';
    const note=notes.sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0))[0]; const day=new Date().getDay();
    try{const steps=typeof skincareStepsForDay==='function'?skincareStepsForDay(note,day,'pm','primary'):[]; if(!steps.length)return `I found “${note.title}”, but I couldn’t find PM steps for tonight.`; return `Tonight’s skincare from “${note.title}”:\n\n${steps.map((s,i)=>`${i+1}. ${s.category}: ${s.product||s.category}`).join('\n')}`;}catch(_){return `Your latest skincare routine is “${note.title}”. Open it from the skincare shortcut to see tonight’s steps.`;}
  }

  function taskPriorityScore(task){
    if(!task||task.done)return -999;
    let score=0;
    const now=today();
    const due=String(task.dueDate||task.date||'').slice(0,10);
    if(due){
      const delta=daysBetween(now,due);
      if(delta<0)score+=14+Math.min(10,Math.abs(delta));
      else if(delta===0)score+=12;
      else if(delta<=2)score+=8;
      else if(delta<=7)score+=4;
    }
    const priority=norm(task.priority||task.energy||'');
    if(/high|urgent|critical/.test(priority))score+=7;
    if(/low/.test(priority))score-=2;
    if(task.project)score+=1;
    if(/wait|waiting|blocked/.test(norm(`${task.title||''} ${task.notes||''}`)))score-=3;
    return score;
  }

  function prioritySuggestions(limit=8){
    return (state?.tasks||[]).filter(t=>!t.done).map(t=>({task:t,score:taskPriorityScore(t)})).sort((a,b)=>b.score-a.score).slice(0,limit);
  }

  function estimateMinutes(task){
    const n=Number(task?.estimatedMinutes||task?.durationMinutes||task?.minutes||0);
    if(n>0)return Math.min(480,Math.max(5,n));
    const text=norm(`${task?.title||''} ${task?.notes||''}`);
    if(/quick|email|reply|call|confirm|book/.test(text))return 15;
    if(/clean|shop|grocery|pack|review/.test(text))return 30;
    if(/report|write|study|workout|meeting|prepare/.test(text))return 60;
    return 30;
  }

  function timePocketPlan(minutes=30){
    const target=Math.max(5,Math.min(240,Number(minutes)||30));
    let left=target;
    const chosen=[];
    for(const x of prioritySuggestions(40)){
      const m=estimateMinutes(x.task);
      if(m<=left){chosen.push({...x,minutes:m});left-=m;}
      if(left<5)break;
    }
    return{minutes:target,used:target-left,left,items:chosen};
  }

  function dailyPlan(){
    const capacity=Math.max(60,Number(state?.settings?.dailyCapacityMinutes||240));
    const plan=timePocketPlan(capacity);
    const overdue=(state?.tasks||[]).filter(t=>!t.done&&t.dueDate&&String(t.dueDate).slice(0,10)<today()).length;
    const total=(state?.tasks||[]).filter(t=>!t.done).reduce((s,t)=>s+estimateMinutes(t),0);
    return{capacity,total,overloaded:total>capacity*1.35,overdue,...plan};
  }

  function dependencyCandidates(){
    const tasks=(state?.tasks||[]).filter(t=>!t.done);
    const out=[];
    tasks.forEach(t=>{
      const text=norm(`${t.title||''} ${t.notes||''}`);
      if(!/\b(after|before|once|when|depends|blocked by|waiting for)\b/.test(text))return;
      const tt=tokens(text);
      const matches=tasks.filter(o=>o.id!==t.id&&tokens(o.title).some(x=>tt.includes(x))).slice(0,3);
      if(matches.length)out.push({task:t,matches});
    });
    return out.slice(0,8);
  }

  function projectCandidates(){
    const tasks=(state?.tasks||[]).filter(t=>!t.done&&!t.project);
    const buckets={};
    tasks.forEach(t=>tokens(t.title).forEach(k=>{(buckets[k]||=[]).push(t)}));
    return Object.entries(buckets).filter(([k,v])=>k.length>3&&v.length>=3).sort((a,b)=>b[1].length-a[1].length).slice(0,6).map(([keyword,items])=>({keyword,items}));
  }

  function conversionProposal(query){
    const r=semanticSearch(query,5);
    if(!r.length)return{answer:'I could not find an item to convert.',source:null,options:[]};
    const source=r[0];
    const options=source.kind==='note'?['Checklist','Project','Tracker']:source.kind==='list'?['Project','Tracker','Note']:source.kind==='tracker'?['Tasks','Project','Note']:['Note','Checklist','Project'];
    return{answer:`I found “${source.title}” (${source.kind}). I can help turn it into ${options.join(', ')}. This is a proposal only; Hana will not replace the original automatically.`,source,options};
  }

  function learnPreference(key,value){
    const m=ensureMemory();
    const k=norm(key);
    if(!k)return false;
    m.learned[k]={value:String(value),updatedAt:Date.now()};
    const keys=Object.keys(m.learned);
    if(keys.length>300)keys.sort((a,b)=>(m.learned[a].updatedAt||0)-(m.learned[b].updatedAt||0)).slice(0,keys.length-300).forEach(x=>delete m.learned[x]);
    if(typeof saveState==='function')saveState();
    return true;
  }

  function recallPreference(key){
    return ensureMemory().learned[norm(key)]?.value||'';
  }

  function ask(query){
    const q=norm(query); if(!q)return {answer:'Ask me about anything you’ve saved in Hana — tasks, trips, notes, routines, projects, lists, reminders, or what needs attention.',results:[]};
    if(/skincare.*(tonight|night|today)|what.*skincare/.test(q)) return {answer:skincareTonight(),results:semanticSearch('skincare',4)};
    if(/weekly reset|review my week|what needs attention|what should i review/.test(q)){const r=weeklyReset();return {answer:`Weekly reset: ${r.overdue.length} overdue, ${r.upcoming.length} coming up this week, ${r.waiting.length} waiting items, ${r.duplicates.length} duplicate groups, and ${r.conflicts.length} calendar conflicts.`,review:r,results:[]};}
    if(/time pocket|what can i do in|fit into/.test(q)){
      const m=Number(q.match(/(\d{1,3})\s*(min|minute)/)?.[1]||30),p=timePocketPlan(m);
      return {answer:p.items.length?`For about ${m} minutes, I’d suggest:\n\n${p.items.map(x=>`• ${x.task.title} — ~${x.minutes} min`).join('\n')}`:`I couldn’t find an open task that fits about ${m} minutes.`,results:p.items.map(x=>corpus().find(e=>e.kind==='task'&&e.id===x.task.id)).filter(Boolean)};
    }
    if(/plan my day|daily plan|what should i do today|prioriti/.test(q)){
      const p=dailyPlan();
      return {answer:`Today’s local plan uses about ${p.used} of ${p.capacity} available minutes.${p.overloaded?' Your open workload looks heavier than today’s capacity, so Rescue My Day may help.':''}\n\n${p.items.slice(0,8).map((x,i)=>`${i+1}. ${x.task.title} — ~${x.minutes} min`).join('\n')}`,results:p.items.map(x=>corpus().find(e=>e.kind==='task'&&e.id===x.task.id)).filter(Boolean)};
    }
    if(/rescue my day|overloaded|too much today/.test(q)){
      const p=dailyPlan();
      return {answer:p.overloaded?`Your open task load is roughly ${p.total} minutes against a ${p.capacity}-minute daily capacity. Hana suggests protecting the highest-priority ${p.items.length} items first and postponing, shrinking, or delegating lower-scored work.`:'Your current open workload does not look heavily above your configured daily capacity.',results:p.items.map(x=>corpus().find(e=>e.kind==='task'&&e.id===x.task.id)).filter(Boolean)};
    }
    if(/dependenc|blocked by|what depends/.test(q)){
      const d=dependencyCandidates();
      return {answer:d.length?`I found ${d.length} possible dependency pattern${d.length===1?'':'s'}. Review them before linking anything.`:'I didn’t find obvious dependency wording in open tasks.',results:d.flatMap(x=>[x.task,...x.matches]).map(t=>corpus().find(e=>e.kind==='task'&&e.id===t.id)).filter(Boolean).slice(0,10)};
    }
    if(/make.*project|project candidate|group.*project/.test(q)){
      const p=projectCandidates();
      return {answer:p.length?`I found ${p.length} possible task cluster${p.length===1?'':'s'} that may deserve a project. Strongest theme: “${p[0].keyword}” with ${p[0].items.length} tasks.`:'I didn’t find a strong unprojected task cluster yet.',results:p.flatMap(x=>x.items).map(t=>corpus().find(e=>e.kind==='task'&&e.id===t.id)).filter(Boolean).slice(0,10)};
    }
    if(/convert|turn .* into|change .* to (checklist|project|tracker|note)/.test(q)){
      const c=conversionProposal(q.replace(/convert|turn|into|checklist|project|tracker|note|change|to/g,' '));
      return {answer:c.answer,results:c.source?[c.source]:[]};
    }
    if(/duplicate/.test(q)){const d=duplicateGroups();return {answer:d.length?`I found ${d.length} possible duplicate group${d.length===1?'':'s'}. Nothing will be deleted automatically.`:'I didn’t find obvious duplicates.',duplicates:d,results:[]};}
    if(/what changed|changed this week|this week.*changed/.test(q)){const since=Date.now()-7*DAY_MS;const r=corpus().filter(e=>e.updatedAt>=since).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,12);return {answer:r.length?`${r.length} items were created or updated in the last 7 days.\n\n${r.map(e=>`• ${e.title}`).join('\n')}`:'I don’t see anything updated in the last 7 days.',results:r};}
    const cleaned=q.replace(/^(where is|where's|find|show me|summarize|summary of|what do i still need to do for|what do i need for|what is left for|what's left for)\s+/,'');
    const r=semanticSearch(cleaned||q,12);
    if(/what do i still need|what do i need|what is left|what's left|unfinished/.test(q)){const open=r.filter(e=>!e.done && (e.kind!=='list'||e.openItems>0));return {answer:open.length?`Here’s what still looks open for “${cleaned}”:\n\n${open.slice(0,10).map(e=>`• ${e.title}${e.kind==='list'&&e.openItems!=null?` — ${e.openItems} unchecked`:''}`).join('\n')}`:`I couldn’t find unfinished items for “${cleaned}”.`,results:open};}
    if(/summarize|summary/.test(q))return {answer:summarizeEntries(r),results:r};
    if(/where is|where's|find|show me/.test(q))return {answer:r.length?`Best matches for “${cleaned}”:\n\n${r.slice(0,8).map(e=>`• ${e.title} (${e.kind})`).join('\n')}`:`I couldn’t find “${cleaned}” in Hana.`,results:r};
    return {answer:summarizeEntries(r),results:r};
  }

  function navigateResult(entry){
    if(!entry)return; const pages={task:'tasks',note:'notes',list:'lists',tracker:'tables',project:'projects',event:'calendar',reminder:'reminders',pin:'pinboard'}; const page=pages[entry.kind]||'today'; if(typeof closeModal==='function')closeModal('hanaIntelligenceModal'); if(typeof changePage==='function')changePage(page);
    if(entry.kind==='list'&&entry.id){state.activeListId=entry.id; if(typeof render==='function')render();}
    if(entry.kind==='tracker'&&entry.id){state.activeTableId=entry.id; if(typeof render==='function')render();}
  }

  function renderResults(result){
    const answer=document.getElementById('hanaIntelligenceAnswer'); const results=document.getElementById('hanaIntelligenceResults'); if(!answer||!results)return;
    answer.textContent=result.answer||'';
    const cards=[];
    (result.results||[]).slice(0,8).forEach((e,i)=>cards.push(`<button class="hana-ai-result" type="button" data-hana-ai-result="${i}"><span>${esc(({task:'✓',note:'📝',list:'☑️',tracker:'📒',project:'🌷',event:'🗓️',reminder:'🔔',pin:'📌'})[e.kind]||'🌸')}</span><div><strong>${esc(e.title)}</strong><small>${esc(e.kind)}${e.due?` · ${esc(String(e.due).slice(0,10))}`:''}</small></div><b>›</b></button>`));
    if(result.review){const r=result.review;cards.push(`<div class="hana-ai-review-grid"><div><strong>${r.overdue.length}</strong><small>Overdue</small></div><div><strong>${r.upcoming.length}</strong><small>This week</small></div><div><strong>${r.waiting.length}</strong><small>Waiting</small></div><div><strong>${r.conflicts.length}</strong><small>Conflicts</small></div></div>`);}
    if(result.duplicates?.length) result.duplicates.slice(0,4).forEach(g=>cards.push(`<div class="hana-ai-static"><strong>🪞 Possible duplicate</strong><small>${esc(g.map(x=>x.title).join(' · '))}</small></div>`));
    results.innerHTML=cards.join(''); window.__hanaAIResultEntries=result.results||[];
  }

  function renderSuggestions(){
    const wrap=document.getElementById('hanaIntelligenceSuggestions'); if(!wrap)return; const s=suggestions();
    wrap.innerHTML=s.length?s.map(x=>`<article class="hana-ai-suggestion" data-suggestion-id="${esc(x.id)}"><div class="hana-ai-suggestion-icon">${x.icon}</div><div><strong>${esc(x.title)}</strong><p>${esc(x.detail)}</p><div class="hana-ai-suggestion-actions"><button type="button" data-hana-ai-review="${esc(x.id)}">Review</button><button type="button" data-hana-ai-dismiss="${esc(x.id)}">Not now</button></div></div></article>`).join(''):`<div class="hana-ai-empty">Nothing urgent stands out right now 🌿</div>`;
    window.__hanaAISuggestions=s;
  }

  function openIntelligence(initial=''){
    injectUI(); renderSuggestions(); const input=document.getElementById('hanaIntelligenceInput'); if(input)input.value=initial; if(typeof openModal==='function')openModal('hanaIntelligenceModal'); else document.getElementById('hanaIntelligenceModal')?.classList.remove('hidden'); if(initial)renderResults(ask(initial)); setTimeout(()=>input?.focus(),60);
  }

  function injectUI(){ if(document.getElementById('hanaIntelligenceModal'))return;
    const header=document.querySelector('.header-actions'); if(header&&!document.getElementById('askHanaButton')){const b=document.createElement('button');b.id='askHanaButton';b.className='icon-button hana-ask-button';b.type='button';b.title='Ask Hana';b.setAttribute('aria-label','Ask Hana');b.textContent='🌸';header.insertBefore(b,header.firstChild);}
    const organize=[...document.querySelectorAll('.nav-drawer-group')].find(s=>s.textContent.includes('Organize')); if(organize&&!organize.querySelector('[data-open-hana-intelligence]')){const b=document.createElement('button');b.className='nav-drawer-item';b.type='button';b.setAttribute('data-open-hana-intelligence','');b.innerHTML='<span class="nav-drawer-icon">🧠</span><span><strong>Ask Hana</strong><small>Local answers, smart review & suggestions</small></span><b>›</b>';organize.insertBefore(b,organize.children[1]||null);}
    document.body.insertAdjacentHTML('beforeend',`<div id="hanaIntelligenceModal" class="modal-overlay hidden"><div class="modal-card modal-large hana-ai-modal"><div class="modal-header"><div><p class="eyebrow">HANA INTELLIGENCE · LOCAL</p><h2>Ask Hana 🌸</h2></div><button class="modal-close" data-close-modal="hanaIntelligenceModal">×</button></div><p class="hana-ai-help">Ask about what you saved, or let Hana review patterns. Analysis stays on this device; Hana suggests before changing anything.</p><div class="hana-ai-ask-row"><input id="hanaIntelligenceInput" type="search" autocomplete="off" placeholder="What do I still need to do for Japan?"/><button id="hanaIntelligenceAskButton" class="primary-button" type="button">Ask</button></div><div class="hana-ai-prompts"><button type="button" data-hana-ai-prompt="What needs attention this week?">Weekly reset</button><button type="button" data-hana-ai-prompt="Find possible duplicates">Duplicates</button><button type="button" data-hana-ai-prompt="What changed this week?">What changed</button><button type="button" data-hana-ai-prompt="What skincare am I using tonight?">Tonight’s skincare</button></div><section class="hana-ai-answer-card"><strong>Hana says</strong><p id="hanaIntelligenceAnswer">Ask me about anything you’ve saved in Hana.</p><div id="hanaIntelligenceResults"></div></section><div class="hana-ai-section-head"><div><small>SMART REVIEW</small><strong>Suggestions for your Hana</strong></div><button id="hanaRefreshSuggestions" type="button">Refresh</button></div><div id="hanaIntelligenceSuggestions" class="hana-ai-suggestions"></div><details class="hana-ai-privacy"><summary>How Hana is being smart</summary><p>Local rules combine semantic-style search, natural dates, duplicate matching, project relationships, schedule conflicts, repeated routines, stale-item review, travel-prep checks and your own correction memory. No online AI is required.</p></details></div></div>`);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#askHanaButton,[data-open-hana-intelligence]')){openIntelligence();return;}
    const p=e.target.closest('[data-hana-ai-prompt]');if(p){const q=p.dataset.hanaAiPrompt;document.getElementById('hanaIntelligenceInput').value=q;renderResults(ask(q));return;}
    if(e.target.closest('#hanaIntelligenceAskButton')){renderResults(ask(document.getElementById('hanaIntelligenceInput')?.value||''));return;}
    if(e.target.closest('#hanaRefreshSuggestions')){renderSuggestions();return;}
    const r=e.target.closest('[data-hana-ai-result]');if(r){navigateResult((window.__hanaAIResultEntries||[])[Number(r.dataset.hanaAiResult)]);return;}
    const d=e.target.closest('[data-hana-ai-dismiss]');if(d){ensureMemory().dismissed[d.dataset.hanaAiDismiss]=Date.now();if(typeof saveState==='function')saveState();renderSuggestions();return;}
    const rev=e.target.closest('[data-hana-ai-review]');if(rev){const s=(window.__hanaAISuggestions||[]).find(x=>x.id===rev.dataset.hanaAiReview);if(!s)return; if(s.type==='duplicates')renderResults({answer:s.detail,results:s.payload.items||[]}); else if(s.type==='relationship'&&s.payload.projectId){const p=(state.projects||[]).find(x=>x.id===s.payload.projectId);renderResults({answer:s.detail,results:semanticSearch(p?.name||p?.title||'',10)});} else renderResults({answer:`${s.title}\n\n${s.detail}\n\nHana won’t make this change automatically. Open the related area when you’re ready to act on it.`,results:semanticSearch(s.detail,6)});}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target?.id==='hanaIntelligenceInput'){e.preventDefault();renderResults(ask(e.target.value));}});
  window.addEventListener('DOMContentLoaded',()=>setTimeout(injectUI,0));
  window.HanaIntelligence={ask,search:semanticSearch,suggestions,weeklyReset,naturalDate,relationships:relationshipGroups,duplicates:duplicateGroups,conflicts,priority:prioritySuggestions,timePocket:timePocketPlan,dailyPlan,dependencies:dependencyCandidates,projectCandidates,conversionProposal,learn:learnPreference,recall:recallPreference,open:openIntelligence,status:()=>({localOnly:true,version:'v1',corpus:corpus().length,suggestionCount:suggestions().length,planning:true})};
})();
