const { chromium } = require('playwright-core');
const fs = require('fs');
const executablePath = ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!executablePath) throw new Error('No browser executable found');

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:430,height:932},deviceScaleFactor:3,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(String(e.stack||e)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1000);
  await page.evaluate(()=>{try{closeModal('accountWelcomeModal')}catch(_){}});

  const r=await page.evaluate(()=>{
    const sp=state.spaces[0]?.id||'personal';
    state.tasks=[
      {id:'a',title:'Submit visa application',notes:'after passport photo',space:sp,dueDate:todayISO(),done:false,estimatedMinutes:60,createdAt:Date.now(),updatedAt:Date.now()},
      {id:'b',title:'Get passport photo',space:sp,done:false,estimatedMinutes:15,createdAt:Date.now(),updatedAt:Date.now()},
      {id:'c',title:'Write Japan itinerary',space:sp,done:false,estimatedMinutes:30,createdAt:Date.now(),updatedAt:Date.now()},
      {id:'d',title:'Review Japan food list',space:sp,done:false,estimatedMinutes:20,createdAt:Date.now(),updatedAt:Date.now()},
      {id:'e',title:'Book Japan hotel',space:sp,done:false,estimatedMinutes:20,createdAt:Date.now(),updatedAt:Date.now()}
    ];
    state.notes=[normalizeNote({id:'n1',title:'Japan itinerary ideas',content:'Asakusa and Kagurazaka',space:sp,createdAt:Date.now(),updatedAt:Date.now()})];
    state.projects=[]; state.events=[]; state.reminders=[];
    const pocket=HanaIntelligence.timePocket(45);
    const daily=HanaIntelligence.dailyPlan();
    const deps=HanaIntelligence.dependencies();
    const projects=HanaIntelligence.projectCandidates();
    const conv=HanaIntelligence.conversionProposal('Japan itinerary ideas');
    HanaIntelligence.learn('preferred planning style','compact');
    return {
      pocket:pocket.items.length,
      daily:daily.items.length,
      deps:deps.length,
      projects:projects.length,
      conv:conv.options.length,
      remember:HanaIntelligence.recall('preferred planning style'),
      planning:HanaIntelligence.status().planning,
      storage:STORAGE_KEY,
      app:HANA_APP_VERSION,
      display:HANA_DISPLAY_VERSION,
      recovery:HanaRecoveryAudit.status().nonDestructiveAuthCleanup,
      dayAnswer:HanaIntelligence.ask('plan my day').answer,
      pocketAnswer:HanaIntelligence.ask('what can i do in 45 minutes').answer,
      depAnswer:HanaIntelligence.ask('show dependencies').answer,
      projectAnswer:HanaIntelligence.ask('project candidates').answer,
      convertAnswer:HanaIntelligence.ask('convert Japan itinerary ideas into checklist').answer
    };
  });

  if(r.app!=='1.0.0'||r.display!=='1'||r.storage!=='hana_app_v1') throw new Error('Identity/storage changed '+JSON.stringify(r));
  if(!r.recovery||!r.planning||r.pocket<1||r.daily<1||r.deps<1||r.projects<1||r.conv<1||r.remember!=='compact') throw new Error('Planning intelligence failed '+JSON.stringify(r));
  if(!/Today’s local plan/.test(r.dayAnswer)||!/45 minutes/.test(r.pocketAnswer)||!/dependency/.test(r.depAnswer)||!/task cluster/.test(r.projectAnswer)||!/proposal only/.test(r.convertAnswer)) throw new Error('Ask Hana planning intents failed '+JSON.stringify(r));
  if(errors.length) throw new Error(errors.join(' | '));
  console.log('Hana planning intelligence QA passed',JSON.stringify(r));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
