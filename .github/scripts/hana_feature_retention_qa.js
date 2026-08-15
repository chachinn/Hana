const { chromium } = require('playwright-core');
const fs = require('fs');
const executablePath = ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!executablePath) throw new Error('No browser executable found');

(async()=>{
  const browser = await chromium.launch({headless:true, executablePath, args:['--no-sandbox']});
  const context = await browser.newContext({
    viewport:{width:430,height:932}, deviceScaleFactor:3, isMobile:true, hasTouch:true,
    serviceWorkers:'block', userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
  });
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e.stack||e)));

  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1200);
  await page.evaluate(()=>{ try{closeModal('accountWelcomeModal')}catch(_){} });

  // Simulate a real pre-fix existing user: tutorial already completed and v1.0.0 already seen,
  // but the independent What's New key does not exist yet.
  await page.evaluate(()=>{
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(state));
    raw.settings = raw.settings || {};
    raw.settings.tutorialCompleted = true;
    raw.settings.accountPromptSeen = true;
    raw.settings.lastSeenUpdateVersion = '1.0.0';
    delete raw.settings.lastSeenWhatsNewKey;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1800);

  const popupFirst = await page.evaluate(()=>({
    open: !document.getElementById('whatsNewModal')?.classList.contains('hidden'),
    title: document.getElementById('whatsNewTitle')?.textContent || '',
    meta: document.getElementById('whatsNewMeta')?.textContent || '',
    seenKey: state.settings.lastSeenWhatsNewKey || '',
    updateVersion: state.settings.lastSeenUpdateVersion || '',
    releaseKey: HANA_WHATS_NEW_KEY,
    app: HANA_APP_VERSION,
    display: HANA_DISPLAY_VERSION,
    storage: STORAGE_KEY
  }));
  if(!popupFirst.open || popupFirst.title!=='Hana got smarter 🌸' || popupFirst.meta!=='August 16, 2026') throw new Error('Existing-user What’s New did not appear '+JSON.stringify(popupFirst));
  if(popupFirst.seenKey!==popupFirst.releaseKey || popupFirst.updateVersion!=='1.0.0' || popupFirst.app!=='1.0.0' || popupFirst.display!=='1' || popupFirst.storage!=='hana_app_v1') throw new Error('What’s New identity/storage regression '+JSON.stringify(popupFirst));

  await page.evaluate(()=>closeModal('whatsNewModal'));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1400);
  const noRepeat = await page.evaluate(()=>document.getElementById('whatsNewModal')?.classList.contains('hidden'));
  if(!noRepeat) throw new Error('What’s New repeated after release key was marked seen');

  const manual = await page.evaluate(()=>{openWhatsNew({markSeen:false});return !document.getElementById('whatsNewModal')?.classList.contains('hidden');});
  if(!manual) throw new Error('Manual What’s New no longer opens');
  await page.evaluate(()=>closeModal('whatsNewModal'));

  // A genuinely new user gets the tutorial first, not two overlays competing at startup.
  await page.evaluate(()=>{
    state.settings.tutorialCompleted=false;
    state.settings.lastSeenWhatsNewKey='';
    closeModal('tutorialModal'); closeModal('whatsNewModal');
    maybeOpenFirstRunTutorial();
  });
  await page.waitForTimeout(450);
  const tutorialOrder = await page.evaluate(()=>({
    tutorial:!document.getElementById('tutorialModal')?.classList.contains('hidden'),
    whatsNew:!document.getElementById('whatsNewModal')?.classList.contains('hidden')
  }));
  if(!tutorialOrder.tutorial || tutorialOrder.whatsNew) throw new Error('First-run tutorial precedence regressed '+JSON.stringify(tutorialOrder));
  await page.evaluate(()=>closeModal('tutorialModal'));

  // Retention audit of completed Version 1 systems that predate and postdate the version reset.
  const retained = await page.evaluate(()=>{
    const routineText=`Morning Routine\nDaily\nCleanser → Gentle Cleanser\nToner → Hydrating Toner\nMoisturizer → Barrier Cream\nSunscreen → SPF 50\n\nNight Routine\nDaily\nCleanser → Gentle Cleanser\nSerum → Barrier Serum\nMoisturizer → Barrier Cream`;
    const skincare=parseSkincareRoutineText(routineText,{allowSingleDay:true});

    const listBackup=state.lists;
    state.lists=[normalizeList({id:'audit-pack',name:'Audit Packing',icon:'🧳',space:preferredSpace(),templateType:'packing',tripStartAt:'2026-08-16T12:00',items:[],createdAt:Date.now(),updatedAt:Date.now()})];
    const packingActive=activePackingShortcut(new Date('2026-08-10T12:00:00'))?.list?.id==='audit-pack';
    state.lists=listBackup;

    state.settings.packingCategoryMemory={};
    rememberPackingCategory('Cloud Nine Wand','💇 Hair Care & Styling');
    const recipeKind=smartStructuredCaptureKind('Recipe\nIngredients:\n1 cup rice\n1 cup water\nSteps:\nCook rice until done');
    const meetingHTML=meetingDecisionItemRowHTML({topic:'Budget',discussion:'Discussed',decision:'Approved',action:'Send memo',owner:'Cha',dueDate:'2026-08-20'});

    const rootsBackup={tasks:state.tasks,notes:state.notes,lists:state.lists,tables:state.tables,projects:state.projects,events:state.events,reminders:state.reminders};
    const space=preferredSpace();
    state.tasks=[{id:'thread-task',title:'Thread task',space}];
    state.notes=[{id:'thread-note',title:'Thread note',space}];
    state.lists=[{id:'thread-list',name:'Thread list',icon:'☑️',space,items:[]}];
    state.tables=[{id:'thread-table',name:'Thread table',space,rows:[]}];
    state.projects=[{id:'thread-project',name:'Thread project',emoji:'🌷',space}];
    state.events=[{id:'thread-event',title:'Thread event',space,date:'2026-08-20',startTime:'10:00'}];
    state.reminders=[{id:'thread-reminder',title:'Thread reminder',space,date:'2026-08-20'}];
    const threadTypes=new Set(getThreadableItems().map(item=>item.type));
    const threadSupport=['task','note','list','table','project','event','reminder'].every(type=>threadTypes.has(type));
    Object.assign(state,rootsBackup);

    return {
      pomodoro: typeof pomodoroCardHTML==='function' && POMODORO_STORAGE_KEY==='hana-pomodoro-v1' && pomodoroCardHTML().includes('Pomodoro'),
      tableMobile: typeof openTableRowModal==='function' && typeof tableGesture==='object' && typeof lastTableTap==='object',
      meetingStructured: typeof meetingDecisionItemRowHTML==='function' && meetingHTML.includes('Discussion summary') && meetingHTML.includes('Decision / agreed outcome') && meetingHTML.includes('Action / next step'),
      skincareImport: Boolean(skincare && skincare.dayCount===7 && skincare.stepCount>=7),
      skincareCutoff: skincarePeriodForTime(new Date('2026-08-16T01:30:00'))==='pm' && skincarePeriodForTime(new Date('2026-08-16T02:00:00'))==='am' && skincarePeriodForTime(new Date('2026-08-16T17:59:00'))==='am' && skincarePeriodForTime(new Date('2026-08-16T18:00:00'))==='pm',
      tripPacking: packingActive,
      smartStructured: recipeKind==='recipe' && typeof createSmartStructuredCapture==='function',
      fileImport: typeof importBrainDumpFile==='function',
      templates: STARTER_TEMPLATES.length>=25,
      mixed: typeof smartMixedDocumentPlan==='function' && typeof createSmartMixedDocument==='function',
      threads: threadSupport,
      cloud8am: CLOUD_AUTO_BACKUP_HOUR===8 && typeof maybeRunAutomaticCloudBackup==='function',
      packing21: SMART_PACKING_CATEGORY_ORDER.length===21,
      packingLearning: smartPackingCategory('Cloud Nine Wand (travel size)')==='💇 Hair Care & Styling',
      smartGarden: (window.HANA_SMART_TEMPLATE_CATALOG?.length||0)>=51 && Object.keys(window.HANA_EXPANDED_SMART_PROFILES||{}).length>=27,
      recovery: Boolean(window.HanaRecoveryAudit?.status?.().nonDestructiveAuthCleanup),
      intelligence: Boolean(window.HanaIntelligence?.status?.().localOnly && window.HanaIntelligence?.status?.().planning),
      whatsNewKey: HANA_WHATS_NEW_KEY,
      version:HANA_APP_VERSION,
      display:HANA_DISPLAY_VERSION,
      storage:STORAGE_KEY
    };
  });

  const failed = Object.entries(retained).filter(([key,value])=>!['whatsNewKey','version','display','storage'].includes(key) && value!==true);
  if(failed.length) throw new Error('Feature retention audit failed '+JSON.stringify({failed,retained}));
  if(retained.version!=='1.0.0'||retained.display!=='1'||retained.storage!=='hana_app_v1') throw new Error('Version/storage changed '+JSON.stringify(retained));
  if(errors.length) throw new Error('Browser runtime errors: '+errors.join(' | '));

  console.log('Hana What’s New + feature-retention QA passed', JSON.stringify({popupFirst,tutorialOrder,retained}));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
