const { chromium } = require('playwright-core');
const fs = require('fs');

const executablePath = ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if (!executablePath) throw new Error('No browser executable found');

(async()=>{
  const browser = await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
  const context = await browser.newContext({
    viewport:{width:430,height:932}, deviceScaleFactor:3, isMobile:true, hasTouch:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',e=>{errors.push(String(e.stack||e));console.error('PAGEERROR',e.stack||e)});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(900);
  const today=await page.locator('#pageContent').innerText();
  if(!/Focus Bouquet|Nothing urgent|active/i.test(today))throw new Error('Today failed startup render');

  const result=await page.evaluate(()=>{
    state=normalizeState(clone(defaultState));
    state.settings.tutorialCompleted=true;
    state.settings.accountPromptSeen=true;
    const sample=`Japan Trip Planning

Meeting Minutes
Attendees: Cha, Martin
Discussion:
Book hotel and confirm airport transfer.
Action Items:
Confirm hotel
Check airport transfer

Expenses
Hotel deposit - ₱5000
Airport transfer - ₱1200

Packing List
Passport
Chargers
Skincare pouch`;
    const plan=smartMixedDocumentPlan(sample);
    if(!plan)throw new Error('Mixed plan not detected');
    const kinds=plan.parts.map(part=>part.kind);
    if(JSON.stringify(kinds)!==JSON.stringify(['meeting-minutes','expenses','packing']))throw new Error('Unexpected mixed parts: '+kinds.join(','));
    if(plan.parts.some(part=>part.kind==='task-section'))throw new Error('Meeting Action Items incorrectly split from meeting');
    if(predictCapture(sample).type!==MIXED_DOCUMENT_TYPE)throw new Error('PredictCapture missed mixed document');
    const created=createSmartMixedDocument(sample,preferredSpace(),{quiet:true,open:false});
    if(created!==MIXED_DOCUMENT_TYPE)throw new Error('Mixed document creation failed: '+created);
    if(state.notes.filter(n=>n.type==='meeting').length!==1)throw new Error('Meeting note not created');
    if(state.tables.filter(t=>t.name==='Expense Tracker').length!==1)throw new Error('Expense tracker not created');
    if(state.lists.filter(l=>l.templateType==='packing').length!==1)throw new Error('Packing list not created');
    const thread=state.threads[state.threads.length-1];
    if(!thread||thread.emoji!=='🧩')throw new Error('Mixed Memory Thread missing');
    const rootTypes=new Set(thread.links.map(link=>link.type));
    for(const type of ['note','table','list'])if(!rootTypes.has(type))throw new Error('Thread missing '+type+' root');
    if(thread.links.some(link=>!resolveThreadItem(link)))throw new Error('Mixed thread contains unresolved root');

    const projectPlan=smartMixedDocumentPlan(`Project Plan
Launch Hana update
Tasks
Fix startup
Run QA

Decision Log
Ship only after browser QA`);
    if(!projectPlan||projectPlan.parts.length!==2||projectPlan.parts[0].kind!=='project'||projectPlan.parts[1].kind!=='decision-log')throw new Error('Project internal tasks were split incorrectly');

    const singleRecipe=`Recipe: Pancakes
Ingredients
Flour
Milk
Method
Mix
Cook`;
    if(smartMixedDocumentPlan(singleRecipe))throw new Error('Single recipe incorrectly detected as mixed');

    const skincare=`Morning Routine ☀️
(Daily)
Cleanser → Gentle Cleanser
Sunscreen → Daily SPF

Night Routine 🌙
Monday / Wednesday / Friday
Cleanser → Night Cleanser
Moisturizer → Night Cream`;
    if(smartMixedDocumentPlan(skincare))throw new Error('Skincare-only routine incorrectly detected as mixed');

    if(smartMixedDocumentPlan('Packing List\nPassport',{forced:true}))throw new Error('Forced mixed accepted only one section');
    const list=state.lists.find(l=>l.templateType==='packing'),table=state.tables.find(t=>t.name==='Expense Tracker');
    return {parts:plan.parts.length,links:thread.links.length,threadId:thread.id,listId:list.id,tableId:table.id};
  });

  console.log('MIXED_RESULT',JSON.stringify(result));
  await page.evaluate(()=>changePage('threads'));await page.waitForTimeout(100);
  if(!(await page.locator('#pageContent').innerText()).includes('Japan Trip Planning'))throw new Error('Mixed Memory Thread not rendered');
  await page.evaluate(id=>openThreadLinkedItem('list',id),result.listId);await page.waitForTimeout(100);
  if(!(await page.locator('#pageContent').innerText()).includes('Packing List'))throw new Error('Thread list root did not open');
  await page.evaluate(id=>openThreadLinkedItem('table',id),result.tableId);await page.waitForTimeout(100);
  if(!(await page.locator('#pageContent').innerText()).includes('Expense Tracker'))throw new Error('Thread table root did not open');

  for(const [name,marker] of [['tasks','Tasks'],['notes','Notes'],['inbox','Brain Dump'],['templates','Templates'],['settings','Settings']]){
    await page.evaluate(p=>changePage(p),name);await page.waitForTimeout(70);
    const text=await page.locator('#pageContent').innerText();
    if(!text.trim()||!text.includes(marker))throw new Error(`${name} regression render failed`);
  }
  await page.evaluate(()=>changePage('today'));await page.waitForTimeout(70);
  if(!(await page.locator('#pageContent').innerText()).trim())throw new Error('Today regression render failed');
  if(errors.length)throw new Error('Browser runtime errors: '+errors.join(' | '));
  await browser.close();
  console.log('Mixed Documents behavioral QA passed');
})().catch(error=>{console.error(error);process.exit(1)});
