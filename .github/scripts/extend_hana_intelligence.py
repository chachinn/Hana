from pathlib import Path

p = Path('intelligence.js')
t = p.read_text()

anchor = '  function ask(query){\n'
if 'function taskPriorityScore(' not in t:
    block = r'''  function taskPriorityScore(task){
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

'''
    if anchor not in t:
        raise SystemExit('ask anchor missing')
    t = t.replace(anchor, block + anchor, 1)

weekly = "    if(/weekly reset|review my week|what needs attention|what should i review/.test(q)){const r=weeklyReset();return {answer:`Weekly reset: ${r.overdue.length} overdue, ${r.upcoming.length} coming up this week, ${r.waiting.length} waiting items, ${r.duplicates.length} duplicate groups, and ${r.conflicts.length} calendar conflicts.`,review:r,results:[]};}\n"
if 'what can i do in' not in t:
    extra = weekly + r'''    if(/time pocket|what can i do in|fit into/.test(q)){
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
'''
    if weekly not in t:
        raise SystemExit('weekly ask anchor missing')
    t = t.replace(weekly, extra, 1)

old_export = "  window.HanaIntelligence={ask,search:semanticSearch,suggestions,weeklyReset,naturalDate,relationships:relationshipGroups,duplicates:duplicateGroups,conflicts,open:openIntelligence,status:()=>({localOnly:true,version:'v1',corpus:corpus().length,suggestionCount:suggestions().length})};"
new_export = "  window.HanaIntelligence={ask,search:semanticSearch,suggestions,weeklyReset,naturalDate,relationships:relationshipGroups,duplicates:duplicateGroups,conflicts,priority:prioritySuggestions,timePocket:timePocketPlan,dailyPlan,dependencies:dependencyCandidates,projectCandidates,conversionProposal,learn:learnPreference,recall:recallPreference,open:openIntelligence,status:()=>({localOnly:true,version:'v1',corpus:corpus().length,suggestionCount:suggestions().length,planning:true})};"
if old_export in t:
    t = t.replace(old_export, new_export, 1)
elif new_export not in t:
    raise SystemExit('HanaIntelligence export anchor missing')

p.write_text(t)

sw = Path('service-worker.js')
s = sw.read_text()
if 'hana-shell-v1-intelligence-1' in s:
    s = s.replace('hana-shell-v1-intelligence-1','hana-shell-v1-intelligence-2',1)
elif 'hana-shell-v1-intelligence-2' not in s:
    raise SystemExit('unexpected service worker cache marker')
sw.write_text(s)
