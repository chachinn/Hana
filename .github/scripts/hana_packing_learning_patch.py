from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"missing marker: {label}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label, flags=0):
    new, count = re.subn(pattern, lambda _match: replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"expected one {label}, got {count}")
    return new


app_path = Path('app.js')
index_path = Path('index.html')
style_path = Path('style.css')
sw_path = Path('service-worker.js')
app = app_path.read_text()
index = index_path.read_text()
style = style_path.read_text()
sw = sw_path.read_text()

# Release identity.
app = replace_once(
    app,
    'HANA 🌸 Version 2 · internal build 2.0.40\n   Smart Packing categorization + reusable travel prep',
    'HANA 🌸 Version 2 · internal build 2.0.41\n   Smarter editable packing categories + local learning',
    'app header version'
)
app = replace_once(app, 'const HANA_APP_VERSION = "2.0.40";', 'const HANA_APP_VERSION = "2.0.41";', 'app version')

release_notes = '''const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 15, 2026",
  title: "Packing that learns with you 🧳",
  intro: "Packing categories are broader, editable, and personal now. Hana makes a stronger first guess, lets you move any item from a category dropdown, and remembers your corrections locally for future packing lists.",
  items: [
    { icon:"🧠", title:"A much richer packing vocabulary", text:"Hana now recognizes many more clothing, hygiene, beauty, skincare, medicine, supplement, tech, travel, beach, food, work and comfort terms before falling back to Other." },
    { icon:"▾", title:"Category dropdown", text:"Edit any packing item and choose from the standard travel categories. You can move a mistaken item in a couple of taps instead of retyping its category." },
    { icon:"✨", title:"Hana remembers corrections", text:"A category you manually choose becomes part of your local packing dictionary. Normalized variants such as travel-size wording can reuse that correction later, and the dictionary travels with normal Hana cloud backup." },
    { icon:"＋", title:"Your own categories", text:"Create custom packing categories from the same dropdown. Custom categories remain reusable on that packing list, and custom category names can be renamed without breaking the items already inside them." }
  ]
};'''
app = regex_once(app, r'const HANA_RELEASE_NOTES = \{.*?\n\};\n\nlet hanaAccountState', release_notes + '\n\nlet hanaAccountState', 'release notes', re.S)

# Persist the personal category-learning map as ordinary Hana settings so it participates in local/cloud backup.
app = replace_once(
    app,
    '    bottomNav: DEFAULT_BOTTOM_NAV.slice(),\n    birthdayLabels:',
    '    bottomNav: DEFAULT_BOTTOM_NAV.slice(),\n    packingCategoryMemory: {},\n    birthdayLabels:',
    'packing category memory setting'
)

# Packing lists keep their custom category names and migrate old 2.0.40 category labels safely.
app = replace_once(
    app,
    '    tripStartAt: String(list.tripStartAt || ""),\n    quantityLabel:',
    '    tripStartAt: String(list.tripStartAt || ""),\n    packingCustomCategories: templateType === "packing" && Array.isArray(list.packingCustomCategories) ? [...new Set(list.packingCustomCategories.map(value => String(value || "").trim()).filter(Boolean))].slice(0, 40) : [],\n    quantityLabel:',
    'packing custom categories normalization'
)
app = replace_once(
    app,
    '          detail: String(item.detail || item.notes || ""),',
    '          detail: templateType === "packing" ? normalizePackingStoredCategory(String(item.detail || item.notes || ""), String(item.title || "")) : String(item.detail || item.notes || ""),',
    'packing stored category migration'
)

# Replace the compact 2.0.40 taxonomy with a broad standard travel taxonomy.
new_order = '''const SMART_PACKING_CATEGORY_ORDER = [
  "👗 Clothing",
  "🩲 Underwear & Sleepwear",
  "👟 Footwear",
  "👜 Accessories",
  "🪪 Documents & Money",
  "🧴 Toiletries & Hygiene",
  "💇 Hair Care & Styling",
  "✨ Skincare & Sun Care",
  "💄 Makeup & Beauty",
  "🌸 Feminine Care",
  "💊 Medicine & First Aid",
  "🌿 Vitamins & Supplements",
  "📱 Tech & Electronics",
  "🔌 Chargers & Power",
  "🧳 Travel Gear",
  "🏖️ Beach & Swim",
  "🧺 Laundry & Cleaning",
  "🍪 Food & Drinks",
  "💼 Work & Study",
  "🧸 Personal & Comfort",
  "🧳 Other"
];'''
app = regex_once(app, r'const SMART_PACKING_CATEGORY_ORDER = \[.*?\n\];', new_order, 'packing category order', re.S)

new_packing_logic = r'''function packingMemoryKey(title){
  return smartPackingCanonicalTitle(title)
    .toLowerCase()
    .replace(/\([^)]*\)/g," ")
    .replace(/[’']/g,"")
    .replace(/\b(?:travel\s*size|travel\s*sized|mini|sample|tester|refill|full\s*size|full\s*sized|small|medium|large|xl|xxl)\b/g," ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:ml|l|g|kg|mg|oz|fl\s*oz|pcs?|pieces?|packs?|pairs?|count|ct)\b/g," ")
    .replace(/[^a-z0-9]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}
function packingCategoryMemory(){
  if(!state.settings)state.settings={};
  if(!state.settings.packingCategoryMemory||typeof state.settings.packingCategoryMemory!=="object"||Array.isArray(state.settings.packingCategoryMemory))state.settings.packingCategoryMemory={};
  return state.settings.packingCategoryMemory;
}
function packingMemoryTokens(key){
  const ignored=new Set(["the","and","for","with","from","pack","set","size","travel","mini","small","medium","large","new","my"]);
  return String(key||"").split(/\s+/).filter(token=>token.length>2&&!ignored.has(token));
}
function smartPackingRememberedCategory(title){
  const key=packingMemoryKey(title);if(!key)return "";
  const memory=packingCategoryMemory(),direct=memory[key];
  if(direct)return typeof direct==="string"?direct:String(direct.category||"");
  const tokens=packingMemoryTokens(key);if(tokens.length<2)return "";
  let best="",bestScore=0,bestUpdated=0;
  Object.entries(memory).forEach(([learnedKey,entry])=>{
    const category=typeof entry==="string"?entry:String(entry?.category||"");if(!category)return;
    const learnedTokens=packingMemoryTokens(learnedKey);if(learnedTokens.length<2)return;
    const shared=tokens.filter(token=>learnedTokens.includes(token)).length;if(shared<2)return;
    const score=shared/Math.max(tokens.length,learnedTokens.length),updated=Number(entry?.updatedAt||0);
    if(score>=0.6&&(score>bestScore||(score===bestScore&&updated>bestUpdated))){best=category;bestScore=score;bestUpdated=updated;}
  });
  return best;
}
function rememberPackingCategory(title,category){
  const key=packingMemoryKey(title),clean=String(category||"").trim();if(!key||!clean)return;
  const memory=packingCategoryMemory();memory[key]={category:clean,updatedAt:Date.now()};
  const entries=Object.entries(memory);if(entries.length>250){entries.sort((a,b)=>Number(a[1]?.updatedAt||0)-Number(b[1]?.updatedAt||0));entries.slice(0,entries.length-250).forEach(([oldKey])=>delete memory[oldKey]);}
}
function packingIsStandardCategory(category){return SMART_PACKING_CATEGORY_ORDER.includes(String(category||"").trim());}
function packingCustomCategories(list){
  const explicit=Array.isArray(list?.packingCustomCategories)?list.packingCustomCategories:[];
  const fromItems=(list?.items||[]).map(item=>String(item.detail||"").trim()).filter(category=>category&&!packingIsStandardCategory(category));
  return [...new Set([...explicit,...fromItems].map(value=>String(value||"").trim()).filter(Boolean))].slice(0,40);
}
function ensurePackingCustomCategory(list,category){
  const clean=String(category||"").trim();if(!list||!clean||packingIsStandardCategory(clean))return clean;
  const current=packingCustomCategories(list);if(!current.includes(clean))current.push(clean);list.packingCustomCategories=current.slice(0,40);return clean;
}
function renamePackingCustomCategory(list,oldCategory,newCategory){
  const oldName=String(oldCategory||"").trim(),newName=String(newCategory||"").trim();
  if(!list||!oldName||!newName||packingIsStandardCategory(oldName)||oldName===newName)return false;
  list.packingCustomCategories=packingCustomCategories(list).map(category=>category===oldName?newName:category).filter((value,index,array)=>array.indexOf(value)===index).slice(0,40);
  list.items.forEach(item=>{if(String(item.detail||"").trim()===oldName){item.detail=newName;item.updatedAt=Date.now();}});
  const memory=packingCategoryMemory();Object.entries(memory).forEach(([key,entry])=>{const category=typeof entry==="string"?entry:String(entry?.category||"");if(category===oldName)memory[key]={category:newName,updatedAt:Date.now()};});
  list.updatedAt=Date.now();saveState();return true;
}
function packingCategoryOptions(list,current=""){
  const custom=packingCustomCategories(list),clean=String(current||"").trim();
  return [...new Set([...SMART_PACKING_CATEGORY_ORDER,...custom,clean].filter(Boolean))];
}
function populatePackingCategorySelect(list,current="",title=""){
  const select=document.getElementById("listItemPackingCategory");if(!select)return;
  let selected=String(current||"").trim()||smartPackingCategory(title,list);
  const options=packingCategoryOptions(list,selected);select.innerHTML="";
  options.forEach(category=>{const option=document.createElement("option");option.value=category;option.textContent=category;select.appendChild(option);});
  const createOption=document.createElement("option");createOption.value="__new__";createOption.textContent="＋ Create new category…";select.appendChild(createOption);
  if(selected&&!packingIsStandardCategory(selected)){
    const renameOption=document.createElement("option");renameOption.value="__rename__";renameOption.textContent="✎ Rename current custom category…";select.appendChild(renameOption);
  }
  select.value=options.includes(selected)?selected:"🧳 Other";select.dataset.previousCategory=select.value;select.dataset.manual="false";
}
function smartPackingBuiltInCategory(title){
  const value=String(title||"").toLowerCase().replace(/[’']/g,"").replace(/[_-]+/g," ");
  if(/\b(passport|visa|identification|national id|government id|drivers? license|boarding pass|flight ticket|train ticket|bus ticket|ticket|itinerary|booking|reservation|travel insurance|insurance policy|wallet|cash|money|currency|forex|credit card|debit card|atm card|bank card|photocopy|documents?|vaccine card|certificate)\b/.test(value))return "🪪 Documents & Money";
  if(/\b(panty\s*liner|pantyliner|sanitary\s*(?:pad|napkin)|napkin|period\s*(?:pad|care)|menstrual\s*(?:cup|disc|products?)|tampons?|fem(?:inine)?\s*wash|intimate\s*wash)\b/.test(value))return "🌸 Feminine Care";
  if(/\b(vitamin|multivitamin|supplement|collagen|zinc|magnesium|probiotic|prebiotic|omega\s*3|fish\s*oil|biotin|iron\s*supplement|calcium|electrolyte\s*supplement|dear\s*face|rose\s*vitamins?)\b/.test(value))return "🌿 Vitamins & Supplements";
  if(/\b(medicine|medicines|medication|medications|prescription|pain\s*reliever|paracetamol|acetaminophen|ibuprofen|aspirin|antihistamine|cetirizine|loratadine|antibiotic|motion\s*sickness|dramamine|bonamine|bandages?|band\s*aid|plasters?|antiseptic|first\s*aid|alcohol\s*wipes?|oral\s*rehydration|ors|thermometer|inhaler|epipen|ointment|medical\s*tape)\b/.test(value))return "💊 Medicine & First Aid";
  if(/\b(chargers?|charging\s*(?:cable|cord)|usb\s*c|usb\s*a|lightning\s*cable|cables?|cords?|adapters?|travel\s*plug|plugs?|power\s*bank|powerbank|batter(?:y|ies)|battery\s*pack|converter|extension\s*(?:cord|lead)|power\s*strip|magsafe)\b/.test(value))return "🔌 Chargers & Power";
  if(/\b(iphone|smartphone|cell\s*phone|mobile\s*phone|phone|airpods?|earbuds?|earphones?|headphones?|ipad|tablet|macbook|laptop|computer|camera|gopro|instax|smartwatch|apple\s*watch|kindle|e\s*reader|mouse|keyboard|stylus|apple\s*pencil|memory\s*card|sd\s*card|flash\s*drive|speaker|tripod|selfie\s*stick)\b/.test(value))return "📱 Tech & Electronics";
  if(/\b(sunscreen|sunblock|spf|cleanser|face\s*wash|facial\s*wash|micellar\s*water|toner|essence|serum|ampoule|moisturi[sz]er|face\s*cream|eye\s*cream|eye\s*care|skin\s*care|skincare|pimple\s*patch|acne\s*patch|sheet\s*mask|face\s*mask|exfoliant|exfoliator|aha|bha|pha|retinol|retinal|niacinamide|hyaluronic|azelaic|benzoyl\s*peroxide|lip\s*balm|lip\s*care|spot\s*care|spot\s*treatment|cleansing\s*oil|cleansing\s*balm|facial\s*mist)\b/.test(value))return "✨ Skincare & Sun Care";
  if(/\b(makeup|cosmetics?|foundation|concealer|face\s*powder|setting\s*powder|blush|bronzer|contour|highlighter|lipstick|lip\s*tint|lip\s*gloss|mascara|eyeliner|brow\s*(?:pencil|gel)|eyebrow|eyeshadow|eye\s*shadow|makeup\s*primer|setting\s*spray|makeup\s*brush|beauty\s*blender|powder\s*puff|lash\s*curler|false\s*lashes|perfume|fragrance|cologne)\b/.test(value))return "💄 Makeup & Beauty";
  if(/\b(shampoo|conditioner|hair\s*oil|hair\s*serum|hair\s*treatment|hair\s*mask|hair\s*brush|hairbrush|comb|hair\s*clip|hairclip|scrunchie|hair\s*tie|ponytail|hair\s*straightener|straightening\s*iron|flat\s*iron|curling\s*iron|curler|hair\s*dryer|hairdryer|matomake|heat\s*protectant|heat\s*protection|hairspray|hair\s*spray|hair\s*mousse|hair\s*wax|hair\s*gel|bobby\s*pins?|hair\s*pins?)\b/.test(value))return "💇 Hair Care & Styling";
  if(/\b(toothbrush|toothpaste|tooth\s*powder|dental\s*floss|floss|toothpick|mouthwash|listerine|soap|body\s*wash|shower\s*gel|deodorant|deo|antiperspirant|wet\s*wipes?|baby\s*wipes?|tissues?|toilet\s*paper|cotton|cotton\s*buds?|cotton\s*pads?|q\s*tips?|razor|shaver|shaving\s*cream|nail\s*clipper|nail\s*file|body\s*lotion|hand\s*saniti[sz]er|hand\s*wash|washcloth|loofah)\b/.test(value))return "🧴 Toiletries & Hygiene";
  if(/\b(swimsuit|swimwear|bikini|one\s*piece\s*swimsuit|rash\s*guard|rashguard|board\s*shorts|swim\s*shorts|beach\s*towel|goggles|swim\s*goggles|beach\s*bag|waterproof\s*pouch|waterproof\s*case|dry\s*bag|aqua\s*shoes|water\s*shoes|snorkel|snorkeling|fins|cover\s*up|beach\s*cover|sarong)\b/.test(value))return "🏖️ Beach & Swim";
  if(/\b(laundry\s*bag|dirty\s*clothes\s*bag|detergent|detergent\s*sheets?|laundry\s*pods?|stain\s*remover|fabric\s*spray|fabric\s*softener|shoe\s*bag|garment\s*bag|hamper|lint\s*roller|cleaning\s*wipes|disinfectant)\b/.test(value))return "🧺 Laundry & Cleaning";
  if(/\b(suitcase|luggage|carry\s*on|packing\s*cubes?|packing\s*organizer|travel\s*pillow|neck\s*pillow|eye\s*mask|sleep\s*mask|luggage\s*scale|luggage\s*lock|padlock|backpack|daypack|tote\s*bag|foldable\s*bag|reusable\s*bag|air\s*pump|umbrella|rain\s*cover|zip\s*bags?|ziplock|ziploc|compression\s*bag|vacuum\s*bag|passport\s*holder|travel\s*organizer|luggage\s*tag)\b/.test(value))return "🧳 Travel Gear";
  if(/\b(snacks?|water\s*bottle|tumbler|flask|thermos|drink|coffee|tea|gum|candy|candies|chocolate|biscuits?|cookies?|protein\s*bar|utensils?|cutlery|chopsticks|spoon|fork|food|instant\s*noodles|cup\s*noodles)\b/.test(value))return "🍪 Food & Drinks";
  if(/\b(notebook|notepad|pens?|pencils?|markers?|highlighters?|document\s*folder|folders?|work\s*badge|office\s*id|sticky\s*notes?|study\s*materials?|textbooks?|workbook|planner|business\s*cards?|presentation\s*clicker)\b/.test(value))return "💼 Work & Study";
  if(/\b(underwear|panties|briefs|boxers?|bra|bras|bralette|safety\s*shorts|undershirt|shapewear|socks?|stockings?|tights|pajamas?|pyjamas?|sleepwear|nightgown|nightdress|robe)\b/.test(value))return "🩲 Underwear & Sleepwear";
  if(/\b(shoes?|sneakers?|slippers?|flip\s*flops?|sandals?|heels?|boots?|loafers?|flats?|crocs?|trainers?|running\s*shoes|walking\s*shoes)\b/.test(value))return "👟 Footwear";
  if(/\b(tops?|t\s*shirt|tshirt|tees?|shirts?|polo|blouses?|tank\s*tops?|camisole|dresses?|jumpsuits?|rompers?|bottoms?|pants?|trousers?|jeans|leggings?|skirts?|shorts|sweaters?|cardigans?|hoodies?|jackets?|coats?|blazers?|shawls?|raincoats?|windbreakers?|vests?)\b/.test(value)&&!/safety\s*shorts/.test(value))return "👗 Clothing";
  if(/\b(glasses|eyeglasses|sunglasses|jewelry|jewellery|earrings?|necklaces?|bracelets?|rings?|watches?|belts?|hats?|caps?|scarves?|scarf|handkerchief|hankerchief|purse|crossbody|wallet\s*chain|brooch|anklet)\b/.test(value))return "👜 Accessories";
  if(/\b(blanket|travel\s*blanket|plushie|stuffed\s*(?:toy|animal)|comfort\s*item|keepsake|earplugs?|personal\s*fan|portable\s*fan|sleep\s*aid|favorite\s*pillow|journal|photo|lucky\s*charm)\b/.test(value))return "🧸 Personal & Comfort";
  return "🧳 Other";
}
function smartPackingCategory(title,list=null){
  return smartPackingRememberedCategory(title)||smartPackingBuiltInCategory(title);
}
function normalizePackingStoredCategory(category,title){
  const current=String(category||"").trim();
  if(!current)return smartPackingBuiltInCategory(title);
  const direct={
    "👗 Clothes":"👗 Clothing",
    "🩲 Underwear & sleep":"🩲 Underwear & Sleepwear",
    "🧴 Toiletries":"🧴 Toiletries & Hygiene",
    "💇 Hair":"💇 Hair Care & Styling",
    "🌸 Feminine care":"🌸 Feminine Care"
  }[current];if(direct)return direct;
  if(current==="💄 Beauty & skincare"){
    const inferred=smartPackingBuiltInCategory(title);return inferred==="✨ Skincare & Sun Care"?inferred:"💄 Makeup & Beauty";
  }
  if(current==="💊 Medicine & supplements"){
    const inferred=smartPackingBuiltInCategory(title);return inferred==="🌿 Vitamins & Supplements"?inferred:"💊 Medicine & First Aid";
  }
  if(current==="🔌 Tech & travel gear"){
    const inferred=smartPackingBuiltInCategory(title);return ["🔌 Chargers & Power","🧳 Travel Gear"].includes(inferred)?inferred:"📱 Tech & Electronics";
  }
  if(current==="🧳 Other")return smartPackingBuiltInCategory(title);
  return current;
}
'''
app = regex_once(
    app,
    r'function smartPackingCategory\(title\)\{.*?\n\}\nfunction smartPackingSeparateNoteRequests',
    new_packing_logic + 'function smartPackingSeparateNoteRequests',
    'smart packing category engine',
    re.S
)

# Quick Add uses the same inference engine, and explicit category columns teach Hana.
old_quick = '''  const created = lines.map(line => {
    const [titleRaw, quantityRaw = "", detailRaw = ""] = line.split("|").map(part => part.trim());
    return { id: createId(), title: titleRaw, quantity: quantityRaw, detail: detailRaw, lane: quickLane, completed: false, createdAt: Date.now(), updatedAt: Date.now() };
  }).filter(item => item.title);'''
new_quick = '''  const created = lines.map(line => {
    const [titleRaw, quantityRaw = "", detailRaw = ""] = line.split("|").map(part => part.trim());
    const packing=isPackingList(list),title=packing?smartPackingCanonicalTitle(titleRaw):titleRaw;
    const detail=packing?(detailRaw||smartPackingCategory(title,list)):detailRaw;
    if(packing&&detailRaw){ensurePackingCustomCategory(list,detail);rememberPackingCategory(title,detail);}
    return { id: createId(), title, quantity: quantityRaw, detail, lane: quickLane, completed: false, createdAt: Date.now(), updatedAt: Date.now() };
  }).filter(item => item.title);'''
app = replace_once(app, old_quick, new_quick, 'quick add packing inference')

# Item editor: packing lists use a category select; ordinary lists keep their free-text Detail input.
old_open_block = '''  const quantityLabel=String(list.quantityLabel||"").trim(),detailLabel=String(list.detailLabel||"").trim();
  const quantityWrap=document.getElementById("listItemQuantity")?.closest(".form-group"),detailWrap=document.getElementById("listItemDetail")?.closest(".form-group");
  quantityWrap?.classList.toggle("hidden",!quantityLabel);detailWrap?.classList.toggle("hidden",!detailLabel);
  if(quantityLabel)document.getElementById("listItemQuantityLabel").innerHTML = `${escapeHTML(quantityLabel)} <span class="optional-label">optional</span>`;
  if(detailLabel)document.getElementById("listItemDetailLabel").innerHTML = `${escapeHTML(detailLabel)} <span class="optional-label">optional</span>`;'''
new_open_block = '''  const quantityLabel=String(list.quantityLabel||"").trim(),detailLabel=String(list.detailLabel||"").trim(),packingMode=isPackingList(list);
  const quantityWrap=document.getElementById("listItemQuantity")?.closest(".form-group"),detailWrap=document.getElementById("listItemDetail")?.closest(".form-group"),detailInput=document.getElementById("listItemDetail"),packingCategorySelect=document.getElementById("listItemPackingCategory"),packingCategoryHint=document.getElementById("listItemPackingCategoryHint");
  quantityWrap?.classList.toggle("hidden",!quantityLabel);detailWrap?.classList.toggle("hidden",packingMode?false:!detailLabel);
  if(quantityLabel)document.getElementById("listItemQuantityLabel").innerHTML = `${escapeHTML(quantityLabel)} <span class="optional-label">optional</span>`;
  if(packingMode){
    const current=normalizePackingStoredCategory(item?.detail||"",item?.title||"");populatePackingCategorySelect(list,current,item?.title||"");
    detailInput?.classList.add("hidden");packingCategorySelect?.classList.remove("hidden");packingCategoryHint?.classList.remove("hidden");
    document.getElementById("listItemDetailLabel").textContent="Category";
  }else{
    detailInput?.classList.remove("hidden");packingCategorySelect?.classList.add("hidden");packingCategoryHint?.classList.add("hidden");
    if(detailLabel)document.getElementById("listItemDetailLabel").innerHTML = `${escapeHTML(detailLabel)} <span class="optional-label">optional</span>`;
  }'''
app = replace_once(app, old_open_block, new_open_block, 'packing category dropdown modal')

# Save selected packing category and learn only when the user actually changes/selects it.
app = replace_once(
    app,
    '  const old = list.items.find(item => item.id === itemId);\n  const item = {',
    '  const old = list.items.find(item => item.id === itemId);\n  const packingMode=isPackingList(list),packingCategorySelect=document.getElementById("listItemPackingCategory");\n  const packingDetail=packingMode?String(packingCategorySelect?.value||smartPackingCategory(title,list)).trim():"";\n  if(packingMode)ensurePackingCustomCategory(list,packingDetail);\n  const item = {',
    'packing item save setup'
)
app = replace_once(
    app,
    '    detail: document.getElementById("listItemDetail").value.trim(),',
    '    detail: packingMode ? packingDetail : document.getElementById("listItemDetail").value.trim(),',
    'packing item save detail'
)
app = replace_once(
    app,
    '  if (old) list.items[list.items.findIndex(entry => entry.id === itemId)] = item;\n  else list.items.push(item);\n  list.updatedAt = Date.now();',
    '  if (old) list.items[list.items.findIndex(entry => entry.id === itemId)] = item;\n  else list.items.push(item);\n  if(packingMode&&packingCategorySelect?.dataset.manual==="true")rememberPackingCategory(title,packingDetail);\n  list.updatedAt = Date.now();',
    'packing item learning save'
)

# React to title/category editing without replacing a user's explicit category choice.
packing_events = r'''
document.getElementById("listItemTitle")?.addEventListener("input",event=>{
  const listId=document.getElementById("listItemListId")?.value||"",itemId=document.getElementById("listItemEditId")?.value||"",list=state.lists.find(entry=>entry.id===listId),select=document.getElementById("listItemPackingCategory");
  if(!list||!isPackingList(list)||itemId||!select||select.dataset.manual==="true")return;
  const category=smartPackingCategory(event.target.value,list),options=[...select.options].map(option=>option.value);
  if(category&&!options.includes(category)){const option=document.createElement("option");option.value=category;option.textContent=category;select.insertBefore(option,select.querySelector('option[value="__new__"]'));}
  select.value=category||"🧳 Other";select.dataset.previousCategory=select.value;
});
document.getElementById("listItemPackingCategory")?.addEventListener("change",event=>{
  const select=event.target,listId=document.getElementById("listItemListId")?.value||"",list=state.lists.find(entry=>entry.id===listId);if(!list||!isPackingList(list))return;
  const previous=String(select.dataset.previousCategory||"🧳 Other");
  if(select.value==="__new__"){
    const created=String(prompt("New packing category name","")||"").trim();if(!created){populatePackingCategorySelect(list,previous,document.getElementById("listItemTitle")?.value||"");return;}
    ensurePackingCustomCategory(list,created);populatePackingCategorySelect(list,created,document.getElementById("listItemTitle")?.value||"");select.value=created;select.dataset.previousCategory=created;select.dataset.manual="true";saveState();return;
  }
  if(select.value==="__rename__"){
    if(packingIsStandardCategory(previous)){populatePackingCategorySelect(list,previous,document.getElementById("listItemTitle")?.value||"");return;}
    const renamed=String(prompt("Rename packing category",previous)||"").trim();if(!renamed||!renamePackingCustomCategory(list,previous,renamed)){populatePackingCategorySelect(list,previous,document.getElementById("listItemTitle")?.value||"");return;}
    populatePackingCategorySelect(list,renamed,document.getElementById("listItemTitle")?.value||"");select.value=renamed;select.dataset.previousCategory=renamed;select.dataset.manual="true";return;
  }
  select.dataset.previousCategory=select.value;select.dataset.manual="true";
});
'''
app = replace_once(app, 'document.getElementById("tableTemplate")?.addEventListener', packing_events + '\ndocument.getElementById("tableTemplate")?.addEventListener', 'packing editor events')

# Index: preserve the old free-text field for normal lists, add a hidden packing dropdown beside it.
old_detail_markup = '<div class="form-group"><label for="listItemDetail" id="listItemDetailLabel">Detail <span class="optional-label">optional</span></label><input id="listItemDetail" type="text" placeholder="size M, aisle 4..." /></div>'
new_detail_markup = '<div class="form-group"><label for="listItemDetail" id="listItemDetailLabel">Detail <span class="optional-label">optional</span></label><input id="listItemDetail" type="text" placeholder="size M, aisle 4..." /><select id="listItemPackingCategory" class="hidden" aria-label="Packing category"></select><small id="listItemPackingCategoryHint" class="packing-category-hint hidden">Hana suggests a category. Change it anytime — manual choices are remembered for future packing lists.</small></div>'
index = replace_once(index, old_detail_markup, new_detail_markup, 'packing category select markup')
index = replace_once(index, '<meta name="hana-app-version" content="2.0.40" />', '<meta name="hana-app-version" content="2.0.41" />', 'index app version')
index = index.replace('style.css?v=2.0.40', 'style.css?v=2.0.41').replace('app.js?v=2.0.40', 'app.js?v=2.0.41')

# Small mobile-safe category editor styling.
style += '''\n\n/* SMART PACKING CATEGORY LEARNING v2.0.41 */\n#listItemPackingCategory{width:100%;min-height:44px;}\n.packing-category-hint{display:block;margin-top:6px;color:var(--text-soft);font-size:11px;line-height:1.45;}\n.packing-category-hint.hidden{display:none;}\n'''

# Cache/version parity.
sw = regex_once(sw, r'HANA 🌸 Service Worker v\d+[^\n]*', 'HANA 🌸 Service Worker v74 · Smart packing learning', 'service worker header')
sw = regex_once(sw, r'const CACHE_NAME = "hana-shell-v\d+";', 'const CACHE_NAME = "hana-shell-v74";', 'service worker cache')
sw = sw.replace('style.css?v=2.0.40', 'style.css?v=2.0.41').replace('app.js?v=2.0.40', 'app.js?v=2.0.41')

app_path.write_text(app)
index_path.write_text(index)
style_path.write_text(style)
sw_path.write_text(sw)
print('Hana 2.0.41 packing category learning patch applied')
