const { chromium } = require('playwright-core');
const fs = require('fs');
const executablePath = ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if (!executablePath) throw new Error('No browser executable found');

(async()=>{
  const browser = await chromium.launch({headless:true, executablePath, args:['--no-sandbox']});
  const context = await browser.newContext({
    viewport:{width:430,height:932},deviceScaleFactor:3,isMobile:true,hasTouch:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error.stack||error)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(900);
  let text=await page.locator('#pageContent').innerText();
  if(!/Focus Bouquet|Nothing urgent|active/i.test(text))throw new Error('Today failed to render');

  const taxonomy=await page.evaluate(()=>{
    const samples={
      'Blazer':'👗 Clothing',
      'Bralette':'🩲 Underwear & Sleepwear',
      'Loafers':'👟 Footwear',
      'Sunglasses':'👜 Accessories',
      'Passport':'🪪 Documents & Money',
      'Dental floss':'🧴 Toiletries & Hygiene',
      'Hair mousse':'💇 Hair Care & Styling',
      'Micellar Water':'✨ Skincare & Sun Care',
      'Mascara':'💄 Makeup & Beauty',
      'Tampon':'🌸 Feminine Care',
      'Bandages':'💊 Medicine & First Aid',
      'Probiotic':'🌿 Vitamins & Supplements',
      'MacBook':'📱 Tech & Electronics',
      'USB-C Charger':'🔌 Chargers & Power',
      'Packing Cubes':'🧳 Travel Gear',
      'Swimsuit':'🏖️ Beach & Swim',
      'Detergent Sheets':'🧺 Laundry & Cleaning',
      'Water Bottle':'🍪 Food & Drinks',
      'Sticky Notes':'💼 Work & Study',
      'Earplugs':'🧸 Personal & Comfort'
    };
    return {
      total:SMART_PACKING_CATEGORY_ORDER.length,
      results:Object.fromEntries(Object.keys(samples).map(title=>[title,smartPackingBuiltInCategory(title)])),
      expected:samples
    };
  });
  if(taxonomy.total!==21)throw new Error('Expected 21 standard packing categories, got '+taxonomy.total);
  for(const [title,expected] of Object.entries(taxonomy.expected))if(taxonomy.results[title]!==expected)throw new Error(`${title} categorized as ${taxonomy.results[title]} instead of ${expected}`);

  const learning=await page.evaluate(()=>{
    state.settings.packingCategoryMemory={};
    const before=smartPackingCategory('Cloud Nine Wand');
    rememberPackingCategory('Cloud Nine Wand','💇 Hair Care & Styling');
    const exact=smartPackingCategory('Cloud Nine Wand');
    const variant=smartPackingCategory('Cloud Nine Wand (travel size)');
    rememberPackingCategory('Moon Drop Beauty Tool','💄 Makeup & Beauty');
    const similar=smartPackingCategory('Moon Drop Beauty Tool mini');
    return {before,exact,variant,similar,memorySize:Object.keys(state.settings.packingCategoryMemory).length};
  });
  if(learning.before!=='🧳 Other')throw new Error('Unknown item should start in Other before learning');
  if(learning.exact!=='💇 Hair Care & Styling'||learning.variant!=='💇 Hair Care & Styling')throw new Error('Exact/normalized packing memory failed');
  if(learning.similar!=='💄 Makeup & Beauty')throw new Error('Normalized learned-item matching failed');
  if(learning.memorySize!==2)throw new Error('Packing memory size unexpected');

  const migration=await page.evaluate(()=>{
    const list=normalizeList({id:'migration-pack',name:'Old Packing',icon:'🧳',space:'personal',templateType:'packing',items:[
      {id:'a',title:'Sunscreen',detail:'💄 Beauty & skincare'},
      {id:'b',title:'Rose Vitamins',detail:'💊 Medicine & supplements'},
      {id:'c',title:'Charger',detail:'🔌 Tech & travel gear'},
      {id:'d',title:'Passport',detail:'🧳 Other'}
    ]});
    return Object.fromEntries(list.items.map(item=>[item.title,item.detail]));
  });
  if(migration.Sunscreen!=='✨ Skincare & Sun Care'||migration['Rose Vitamins']!=='🌿 Vitamins & Supplements'||migration.Charger!=='🔌 Chargers & Power'||migration.Passport!=='🪪 Documents & Money')throw new Error('Legacy packing category migration failed: '+JSON.stringify(migration));

  const uiSetup=await page.evaluate(()=>{
    state.settings.packingCategoryMemory={};
    const packing=normalizeList({id:'qa-pack',name:'QA Packing',icon:'🧳',space:'personal',templateType:'packing',quantityLabel:'',detailLabel:'Category',packingCustomCategories:[],items:[],createdAt:Date.now(),updatedAt:Date.now()});
    const normal=normalizeList({id:'qa-normal',name:'QA Checklist',icon:'☑️',space:'personal',templateType:'simple',quantityLabel:'',detailLabel:'Detail',items:[],createdAt:Date.now(),updatedAt:Date.now()});
    state.lists=[packing,normal];state.activeListId=packing.id;changePage('lists');openListItemModal(packing.id);
    return true;
  });
  await page.waitForTimeout(80);
  if(!await page.locator('#listItemPackingCategory').isVisible())throw new Error('Packing category dropdown is not visible');
  if(await page.locator('#listItemDetail').isVisible())throw new Error('Free-text detail should be hidden for packing item editor');
  const optionValues=await page.locator('#listItemPackingCategory option').evaluateAll(options=>options.map(option=>option.value));
  for(const category of ['👗 Clothing','🪪 Documents & Money','✨ Skincare & Sun Care','💊 Medicine & First Aid','🔌 Chargers & Power','🧸 Personal & Comfort','🧳 Other'])if(!optionValues.includes(category))throw new Error('Dropdown missing '+category);

  await page.locator('#listItemTitle').fill('Cloud Nine Wand');
  await page.locator('#listItemPackingCategory').selectOption('💇 Hair Care & Styling');
  await page.locator('#saveListItemButton').click();
  await page.waitForTimeout(80);
  const saved=await page.evaluate(()=>({
    item:state.lists.find(list=>list.id==='qa-pack').items[0],
    remembered:smartPackingCategory('Cloud Nine Wand (travel size)'),
    memory:Object.keys(state.settings.packingCategoryMemory).length
  }));
  if(saved.item?.detail!=='💇 Hair Care & Styling'||saved.remembered!=='💇 Hair Care & Styling'||saved.memory!==1)throw new Error('Manual category correction was not saved/learned');

  const custom=await page.evaluate(()=>{
    const list=state.lists.find(entry=>entry.id==='qa-pack');
    ensurePackingCustomCategory(list,'🎮 Gaming');
    populatePackingCategorySelect(list,'🎮 Gaming','Handheld console case');
    const before=[...document.getElementById('listItemPackingCategory').options].map(option=>option.value);
    rememberPackingCategory('Handheld console case','🎮 Gaming');
    const renamed=renamePackingCustomCategory(list,'🎮 Gaming','🎮 Gaming Gear');
    populatePackingCategorySelect(list,'🎮 Gaming Gear','Handheld console case');
    const after=[...document.getElementById('listItemPackingCategory').options].map(option=>option.value);
    return {before,after,renamed,remembered:smartPackingRememberedCategory('Handheld console case'),custom:list.packingCustomCategories};
  });
  if(!custom.before.includes('🎮 Gaming')||!custom.renamed||!custom.after.includes('🎮 Gaming Gear')||custom.remembered!=='🎮 Gaming Gear'||!custom.custom.includes('🎮 Gaming Gear'))throw new Error('Custom category create/rename failed');

  await page.evaluate(()=>openListItemModal('qa-normal'));
  await page.waitForTimeout(50);
  if(!await page.locator('#listItemDetail').isVisible())throw new Error('Normal list Detail field regression');
  if(await page.locator('#listItemPackingCategory').isVisible())throw new Error('Packing dropdown leaked into normal lists');
  await page.locator('[data-close-modal="listItemModal"]').click();

  const quickAdd=await page.evaluate(()=>{
    const list=state.lists.find(entry=>entry.id==='qa-pack');state.activeListId=list.id;changePage('lists');
    const input=document.getElementById(`quickListInput_${list.id}`);input.value='Passport\nUSB-C Cable\nShampoo\nUnknown Gizmo';quickAddListItems(list.id);
    return Object.fromEntries(list.items.slice(-4).map(item=>[item.title,item.detail]));
  });
  if(quickAdd.Passport!=='🪪 Documents & Money'||quickAdd['USB-C Cable']!=='🔌 Chargers & Power'||quickAdd.Shampoo!=='💇 Hair Care & Styling'||quickAdd['Unknown Gizmo']!=='🧳 Other')throw new Error('Quick Add packing inference failed: '+JSON.stringify(quickAdd));

  const smartSort=await page.evaluate(()=>{
    state.lists=[];state.activeListId='';
    const sample=['Weekend packing','Passport','Blazer','Sunscreen','Powerbank','Swimsuit'].join('\n');
    const kind=smartStructuredCaptureKind(sample),created=createSmartStructuredCapture(sample,'personal',kind,{quiet:true,open:false}),list=state.lists[0];
    return {kind,created,name:list?.name,categories:Object.fromEntries((list?.items||[]).map(item=>[item.title,item.detail]))};
  });
  if(smartSort.kind!=='packing'||smartSort.created!=='packing')throw new Error('Smart Sort packing recognition regressed');
  if(smartSort.categories.Passport!=='🪪 Documents & Money'||smartSort.categories.Blazer!=='👗 Clothing'||smartSort.categories.Sunscreen!=='✨ Skincare & Sun Care'||smartSort.categories['Power Bank']!=='🔌 Chargers & Power'||smartSort.categories.Swimsuit!=='🏖️ Beach & Swim')throw new Error('Smart Sort richer categorization failed: '+JSON.stringify(smartSort));

  if(errors.length)throw new Error('Browser runtime errors: '+errors.join(' | '));
  console.log('Hana packing learning behavioral QA passed',JSON.stringify({taxonomy:taxonomy.total,learning,saved,custom:custom.custom,quickAdd,smartSort}));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
