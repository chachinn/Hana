from pathlib import Path

p=Path('intelligence.js')
t=p.read_text()

def replace_region(start,end,replacement):
    global t
    a=t.find(start)
    b=t.find(end,a)
    if a<0 or b<0:
        raise SystemExit(f'missing patch anchor: {start!r} / {end!r}')
    t=t[:a]+replacement+t[b:]

replace_region('  function corpus(){\n','  function summarizeEntries(entries){\n',r'''  function corpus(){
    const out=[];
    const add=(kind,obj,text,meta={})=>{
      if(!obj||out.length>=MAX_INDEX)return;
      const title=String(obj.title||obj.name||meta.title||kind);
      const titleNorm=norm(title);
      const titleTokens=tokens(titleNorm);
      const body=rootText(obj,text);
      const fullText=norm(`${title} ${body}`);
      out.push({kind,id:obj.id||'',title,titleNorm,titleTokens,titleTokenSet:new Set(titleTokens),body,text:fullText,tokens:tokens(fullText),updatedAt:Number(obj.updatedAt||obj.completedAt||obj.createdAt||0),createdAt:Number(obj.createdAt||0),done:Boolean(obj.done||obj.completed),due:obj.dueDate||obj.date||obj.remindAt||'',space:obj.space||'',project:obj.project||'',projectNorm:norm(obj.project||''),shared:Boolean(obj.sharedWithPartner),raw:obj,...meta});
    };
    (state?.tasks||[]).forEach(o=>add('task',o,o.notes||''));
    (state?.notes||[]).forEach(o=>add('note',o,o.content||'',{structuredType:o.structuredType||''}));
    (state?.lists||[]).forEach(o=>add('list',o,(o.items||[]).map(i=>`${i.title||i.name||''} ${i.detail||''}`).join(' '),{openItems:(o.items||[]).filter(i=>!i.checked).length}));
    (state?.tables||[]).forEach(o=>add('tracker',o,(o.rows||[]).map(r=>Object.values(r.values||{}).join(' ')).join(' '),{rowCount:(o.rows||[]).length}));
    (state?.projects||[]).forEach(o=>add('project',o,o.description||''));
    (state?.events||[]).forEach(o=>add('event',o,`${o.location||''} ${o.notes||''}`));
    (state?.reminders||[]).forEach(o=>add('reminder',o,o.notes||''));
    (state?.pins||state?.pinboard||[]).forEach(o=>add('pin',o,o.content||o.url||''));
    return out;
  }

  function scorePreparedQuery(entry,qn,qt,now=Date.now()){
    if(!qn)return 0;
    let s=0;
    if(entry.text.includes(qn))s+=12;
    qt.forEach(token=>{if(entry.titleNorm.includes(token))s+=5;if(entry.tokens.includes(token))s+=2;});
    if(entry.updatedAt)s+=Math.max(0,2-(now-entry.updatedAt)/(30*DAY_MS));
    return s;
  }

  function semanticSearch(query,limit=MAX_RESULTS,all=corpus()){
    const qn=norm(query),qt=tokens(qn);
    if(!qn)return [];
    const now=Date.now();
    return all.map(entry=>({...entry,score:scorePreparedQuery(entry,qn,qt,now)})).filter(entry=>entry.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);
  }

  function duplicateGroups(all=corpus()){
    const candidates=all.filter(e=>['task','note','list','project','reminder'].includes(e.kind));
    const groups=[];const seen=new Set();
    candidates.forEach((a,i)=>{
      if(seen.has(`${a.kind}:${a.id}`)||!a.titleTokens.length)return;
      const matches=[a];
      for(let j=i+1;j<candidates.length;j++){
        const b=candidates[j];
        if(a.kind!==b.kind)continue;
        const inter=a.titleTokens.reduce((n,token)=>n+(b.titleTokenSet.has(token)?1:0),0);
        const ratio=inter/Math.max(a.titleTokens.length,b.titleTokens.length,1);
        if(a.titleNorm===b.titleNorm||ratio>=.8){matches.push(b);seen.add(`${b.kind}:${b.id}`);}
      }
      if(matches.length>1)groups.push(matches);
    });
    return groups.slice(0,8);
  }

  function relationshipGroups(all=corpus()){
    const groups=[];
    const projects=(state?.projects||[]).map(project=>{const key=norm(project.name||project.title);return{project,key,keyTokens:tokens(key)}}).filter(x=>x.key);
    projects.forEach(({project,key,keyTokens})=>{
      const needed=Math.min(2,keyTokens.length);
      const related=all.filter(entry=>entry.id!==project.id&&(entry.projectNorm===key||entry.text.includes(key)||(needed>0&&keyTokens.filter(token=>entry.tokens.includes(token)).length>=needed))).slice(0,10);
      if(related.length)groups.push({title:project.name||project.title,project,items:related});
    });
    return groups.slice(0,8);
  }

  function conflicts(){
    const events=(state?.events||[]).filter(e=>e.date||e.startAt||e.start);
    const parsed=events.map(e=>{const raw=e.startAt||e.start||`${e.date||''}T${e.time||'00:00'}`;const d=new Date(raw);return{e,d,end:new Date(e.endAt||e.end||d.getTime()+60*60000)}}).filter(x=>!Number.isNaN(x.d.getTime()));
    const out=[];
    for(let i=0;i<parsed.length;i++)for(let j=i+1;j<parsed.length;j++){const a=parsed[i],b=parsed[j];if(a.d<b.end&&b.d<a.end)out.push([a.e,b.e]);}
    return out.slice(0,6);
  }

  function weeklyReset(all=corpus()){
    const now=today(),soon=addDays(now,7);
    const overdue=all.filter(e=>!e.done&&e.due&&String(e.due).slice(0,10)<now).slice(0,8);
    const upcoming=all.filter(e=>e.due&&String(e.due).slice(0,10)>=now&&String(e.due).slice(0,10)<=soon).slice(0,8);
    const stale=all.filter(e=>['project','task','note'].includes(e.kind)&&e.updatedAt&&Date.now()-e.updatedAt>30*DAY_MS&&!e.done).sort((a,b)=>a.updatedAt-b.updatedAt).slice(0,8);
    const waiting=(state?.tasks||[]).filter(t=>/wait|waiting|reply|approval|result|response|delivery/i.test(`${t.title||''} ${t.notes||''}`)&&!t.done).slice(0,8);
    return{overdue,upcoming,stale,waiting,duplicates:duplicateGroups(all),conflicts:conflicts()};
  }

  function suggestions(all=corpus()){
    const list=[],mem=ensureMemory();
    const push=(id,icon,title,detail,type='review',payload={})=>{if(!mem.dismissed[id])list.push({id,icon,title,detail,type,payload});};
    const duplicateSets=duplicateGroups(all);
    const conflictSets=conflicts();
    const relationships=relationshipGroups(all);
    duplicateSets.forEach(g=>push(`dup:${g.map(x=>x.id).join('|')}`,'🪞','Possible duplicate',`${g.map(x=>x.title).join(' · ')} — review before keeping both.`,'duplicates',{items:g}));
    conflictSets.forEach(g=>push(`conflict:${g.map(x=>x.id).join('|')}`,'⚠️','Schedule conflict',`${g[0].title||g[0].name} overlaps ${g[1].title||g[1].name}.`,'conflict',{items:g}));
    (state?.tasks||[]).filter(t=>!t.done&&!t.dueDate).slice(0,80).forEach(t=>{const d=naturalDate(`${t.title||''} ${t.notes||''}`);if(d)push(`date:${t.id}:${d.date}`,'📅','Date found in a task',`“${t.title}” mentions ${d.label}. Suggested date: ${d.date}.`,'date',{taskId:t.id,date:d.date});});
    (state?.tasks||[]).filter(t=>!t.done&&/wait|waiting|reply|approval|result|response/i.test(`${t.title||''} ${t.notes||''}`)&&!t.dueDate).slice(0,5).forEach(t=>push(`follow:${t.id}`,'⏳','Add a follow-up',`“${t.title}” looks like something you’re waiting on. Consider a follow-up reminder.`,'followup',{taskId:t.id}));
    const oldLists=(state?.lists||[]).filter(l=>(l.items||[]).length&&Date.now()-Number(l.updatedAt||l.createdAt||0)>45*DAY_MS);
    oldLists.filter(l=>/pack|travel|trip/i.test(l.name||l.title||'')).slice(0,4).forEach(l=>push(`reuse:${l.id}`,'♻️','Reuse a previous packing list',`${l.name||l.title} can be reused or reset for a future trip.`,'reuse',{listId:l.id}));
    relationships.slice(0,4).forEach(g=>push(`rel:${g.project.id}`,'🧵','Related things detected',`${g.items.length} Hana items appear related to “${g.title}”. Consider keeping them together in a Memory Thread.`,'relationship',{projectId:g.project.id}));
    all.filter(e=>['project','task','note'].includes(e.kind)&&e.updatedAt&&Date.now()-e.updatedAt>30*DAY_MS&&!e.done).sort((a,b)=>a.updatedAt-b.updatedAt).slice(0,4).forEach(e=>push(`stale:${e.kind}:${e.id}`,'🍂','Possibly stale',`${e.title} hasn’t changed in over a month. Keep, archive, or refresh it.`,'archive',{kind:e.kind,id:e.id}));
    const travel=all.filter(e=>/trip|travel|japan|flight|vacation/i.test(e.text));
    if(travel.length){const blob=travel.map(e=>e.text).join(' ');[['insurance','travel insurance'],['transfer','airport transfer'],['passport','passport'],['charger','charger / adapter']].forEach(([key,label])=>{if(!blob.includes(key))push(`travel-missing:${key}`,'✈️','Travel prep check',`Your travel items don’t appear to mention ${label}. Check whether you need it.`,'missing');});}
    const counts={};
    (state?.tasks||[]).forEach(t=>{const k=norm(t.title);if(k)counts[k]=(counts[k]||0)+1;});
    Object.entries(counts).filter(([,n])=>n>=3).slice(0,4).forEach(([k,n])=>push(`routine:${k}`,'🔁','Possible reusable routine',`“${k}” appears ${n} times. Consider making it a reusable or repeating routine.`,'routine'));
    return list.slice(0,24);
  }

''')

old='''  function dependencyCandidates(){\n    const tasks=(state?.tasks||[]).filter(t=>!t.done);\n    const out=[];\n    tasks.forEach(t=>{\n      const text=norm(`${t.title||''} ${t.notes||''}`);\n      if(!/\\b(after|before|once|when|depends|blocked by|waiting for)\\b/.test(text))return;\n      const tt=tokens(text);\n      const matches=tasks.filter(o=>o.id!==t.id&&tokens(o.title).some(x=>tt.includes(x))).slice(0,3);\n      if(matches.length)out.push({task:t,matches});\n    });\n    return out.slice(0,8);\n  }'''
new='''  function dependencyCandidates(){\n    const prepared=(state?.tasks||[]).filter(t=>!t.done).map(task=>({task,text: norm(`${task.title||''} ${task.notes||''}`),titleTokens:tokens(task.title)}));\n    const out=[];\n    prepared.forEach(entry=>{\n      if(!/\\b(after|before|once|when|depends|blocked by|waiting for)\\b/.test(entry.text))return;\n      const textTokens=new Set(tokens(entry.text));\n      const matches=prepared.filter(other=>other.task.id!==entry.task.id&&other.titleTokens.some(token=>textTokens.has(token))).slice(0,3).map(other=>other.task);\n      if(matches.length)out.push({task:entry.task,matches});\n    });\n    return out.slice(0,8);\n  }'''
if old not in t: raise SystemExit('dependency anchor missing')
t=t.replace(old,new,1)

t=t.replace('  function conversionProposal(query){\n    const r=semanticSearch(query,5);','  function conversionProposal(query,all=corpus()){\n    const r=semanticSearch(query,5,all);',1)

replace_region('  function ask(query){\n','  function navigateResult(entry){\n',r'''  function ask(query){
    const q=norm(query);
    if(!q)return {answer:'Ask me about anything you’ve saved in Hana — tasks, trips, notes, routines, projects, lists, reminders, or what needs attention.',results:[]};
    const all=corpus();
    const taskEntries=new Map(all.filter(e=>e.kind==='task').map(e=>[e.id,e]));
    const mapTasks=tasks=>tasks.map(task=>taskEntries.get(task.id)).filter(Boolean);
    if(/skincare.*(tonight|night|today)|what.*skincare/.test(q))return{answer:skincareTonight(),results:semanticSearch('skincare',4,all)};
    if(/weekly reset|review my week|what needs attention|what should i review/.test(q)){const r=weeklyReset(all);return{answer:`Weekly reset: ${r.overdue.length} overdue, ${r.upcoming.length} coming up this week, ${r.waiting.length} waiting items, ${r.duplicates.length} duplicate groups, and ${r.conflicts.length} calendar conflicts.`,review:r,results:[]};}
    if(/time pocket|what can i do in|fit into/.test(q)){const m=Number(q.match(/(\d{1,3})\s*(min|minute)/)?.[1]||30),p=timePocketPlan(m);return{answer:p.items.length?`For about ${m} minutes, I’d suggest:\n\n${p.items.map(x=>`• ${x.task.title} — ~${x.minutes} min`).join('\n')}`:`I couldn’t find an open task that fits about ${m} minutes.`,results:mapTasks(p.items.map(x=>x.task))};}
    if(/plan my day|daily plan|what should i do today|prioriti/.test(q)){const p=dailyPlan();return{answer:`Today’s local plan uses about ${p.used} of ${p.capacity} available minutes.${p.overloaded?' Your open workload looks heavier than today’s capacity, so Rescue My Day may help.':''}\n\n${p.items.slice(0,8).map((x,i)=>`${i+1}. ${x.task.title} — ~${x.minutes} min`).join('\n')}`,results:mapTasks(p.items.map(x=>x.task))};}
    if(/rescue my day|overloaded|too much today/.test(q)){const p=dailyPlan();return{answer:p.overloaded?`Your open task load is roughly ${p.total} minutes against a ${p.capacity}-minute daily capacity. Hana suggests protecting the highest-priority ${p.items.length} items first and postponing, shrinking, or delegating lower-scored work.`:'Your current open workload does not look heavily above your configured daily capacity.',results:mapTasks(p.items.map(x=>x.task))};}
    if(/dependenc|blocked by|what depends/.test(q)){const d=dependencyCandidates();return{answer:d.length?`I found ${d.length} possible dependency pattern${d.length===1?'':'s'}. Review them before linking anything.`:'I didn’t find obvious dependency wording in open tasks.',results:mapTasks(d.flatMap(x=>[x.task,...x.matches])).slice(0,10)};}
    if(/make.*project|project candidate|group.*project/.test(q)){const p=projectCandidates();return{answer:p.length?`I found ${p.length} possible task cluster${p.length===1?'':'s'} that may deserve a project. Strongest theme: “${p[0].keyword}” with ${p[0].items.length} tasks.`:'I didn’t find a strong unprojected task cluster yet.',results:mapTasks(p.flatMap(x=>x.items)).slice(0,10)};}
    if(/convert|turn .* into|change .* to (checklist|project|tracker|note)/.test(q)){const cleanedConversion=q.replace(/\b(convert|turn|into|checklist|project|tracker|note|change|to)\b/g,' ');const c=conversionProposal(cleanedConversion,all);return{answer:c.answer,results:c.source?[c.source]:[]};}
    if(/duplicate/.test(q)){const d=duplicateGroups(all);return{answer:d.length?`I found ${d.length} possible duplicate group${d.length===1?'':'s'}. Nothing will be deleted automatically.`:'I didn’t find obvious duplicates.',duplicates:d,results:[]};}
    if(/what changed|changed this week|this week.*changed/.test(q)){const since=Date.now()-7*DAY_MS;const r=all.filter(e=>e.updatedAt>=since).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,12);return{answer:r.length?`${r.length} items were created or updated in the last 7 days.\n\n${r.map(e=>`• ${e.title}`).join('\n')}`:'I don’t see anything updated in the last 7 days.',results:r};}
    const cleaned=q.replace(/^(where is|where's|find|show me|summarize|summary of|what do i still need to do for|what do i need for|what is left for|what's left for)\s+/,''),r=semanticSearch(cleaned||q,12,all);
    if(/what do i still need|what do i need|what is left|what's left|unfinished/.test(q)){const open=r.filter(e=>!e.done&&(e.kind!=='list'||e.openItems>0));return{answer:open.length?`Here’s what still looks open for “${cleaned}”:\n\n${open.slice(0,10).map(e=>`• ${e.title}${e.kind==='list'&&e.openItems!=null?` — ${e.openItems} unchecked`:''}`).join('\n')}`:`I couldn’t find unfinished items for “${cleaned}”.`,results:open};}
    if(/summarize|summary/.test(q))return{answer:summarizeEntries(r),results:r};
    if(/where is|where's|find|show me/.test(q))return{answer:r.length?`Best matches for “${cleaned}”:\n\n${r.slice(0,8).map(e=>`• ${e.title} (${e.kind})`).join('\n')}`:`I couldn’t find “${cleaned}” in Hana.`,results:r};
    return{answer:summarizeEntries(r),results:r};
  }

''')

old_status="status:()=>({localOnly:true,version:'v1',corpus:corpus().length,suggestionCount:suggestions().length,planning:true})"
new_status="status:()=>{const all=corpus();return{localOnly:true,version:'v1',corpus:all.length,suggestionCount:suggestions(all).length,planning:true}}"
if old_status not in t: raise SystemExit('status anchor missing')
t=t.replace(old_status,new_status,1)
p.write_text(t)

css=Path('intelligence.css')
c=css.read_text()
for bad in ('--surface','--surface-soft','--pink-dark','--pink-soft'):
    if bad in c: raise SystemExit(f'undefined intelligence css token remains: {bad}')

sw=Path('service-worker.js')
s=sw.read_text()
if 'hana-shell-v1-intelligence-2' not in s: raise SystemExit('unexpected cache marker')
sw.write_text(s.replace('hana-shell-v1-intelligence-2','hana-shell-v1-intelligence-3',1))

wf=Path('.github/workflows/hana-runtime-smoke.yml')
w=wf.read_text()
w=w.replace('hana-shell-v1-intelligence-2','hana-shell-v1-intelligence-3')
if 'Intelligence stress regressed' not in w:
    anchor='            const smart=await page.evaluate'
    block='''            const stress=await page.evaluate(()=>{\n              const space=state.spaces[0]?.id||'personal',now=Date.now();\n              state.tasks=Array.from({length:800},(_,i)=>({id:`stress-${i}`,title:`Japan prep item ${i%80}`,notes:i%9===0?'waiting for travel reply tomorrow':'travel planning task',space,done:false,estimatedMinutes:15+(i%4)*15,createdAt:now-i*1000,updatedAt:now-i*1000}));\n              state.notes=Array.from({length:120},(_,i)=>normalizeNote({id:`stress-note-${i}`,title:`Japan reference ${i}`,content:`hotel food itinerary reference ${i}`,space,createdAt:now-i*2000,updatedAt:now-i*2000}));\n              const t0=performance.now(),answer=HanaIntelligence.ask('what do i still need to do for Japan?'),askMs=performance.now()-t0;\n              const t1=performance.now(),review=HanaIntelligence.suggestions(),reviewMs=performance.now()-t1;\n              const t2=performance.now(),status=HanaIntelligence.status(),statusMs=performance.now()-t2;\n              HanaIntelligence.open();\n              document.getElementById('skincareQuickButton')?.classList.remove('hidden');\n              document.getElementById('packingQuickButton')?.classList.remove('hidden');\n              const header=document.querySelector('.app-header'),modal=document.querySelector('.hana-ai-modal');\n              const noX=document.documentElement.scrollWidth<=innerWidth+2,headerFits=header.scrollWidth<=innerWidth+2,modalFits=modal.getBoundingClientRect().width<=innerWidth-8;\n              return{askMs,reviewMs,statusMs,answerCount:answer.results?.length||0,reviewCount:review.length,statusCorpus:status.corpus,noX,headerFits,modalFits};\n            });\n            if(stress.answerCount<1||stress.reviewCount<1||stress.statusCorpus<800||stress.askMs>1200||stress.reviewMs>1800||stress.statusMs>1800||!stress.noX||!stress.headerFits||!stress.modalFits)throw new Error('Intelligence stress regressed '+JSON.stringify(stress));\n\n'''
    if anchor not in w: raise SystemExit('permanent QA stress anchor missing')
    w=w.replace(anchor,block+anchor,1)
wf.write_text(w)
