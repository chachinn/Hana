from pathlib import Path

app_path=Path('app.js')
index_path=Path('index.html')
style_path=Path('style.css')
sw_path=Path('service-worker.js')

app=app_path.read_text(encoding='utf-8')
index=index_path.read_text(encoding='utf-8')
style=style_path.read_text(encoding='utf-8')
sw=sw_path.read_text(encoding='utf-8')

def one(text, old, new, label):
    count=text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old,new,1)

# Internal build only; visible product version remains Version 2.
app=one(app,'const HANA_APP_VERSION = "2.0.27";','const HANA_APP_VERSION = "2.0.28";','app version')

# Keep the release note concise and focused on the two UI fixes.
start='''  title: "Cleaner, safer template forms 🌸",
  intro: "Hana Version 2 keeps long forms safely below the iPhone status area and treats optional list fields as suggestions instead of forced content.",
  items: [
    { icon:"📱", title:"Close button stays reachable", text:"Long template and form modals now respect the iPhone safe area, with headers that stay available while you scroll." },
    { icon:"🫧", title:"Optional means optional", text:"New lists no longer pre-fill Quantity or Detail. Those names are suggestions only until you choose to use them." },
    { icon:"☑️", title:"Cleaner list items", text:"If an extra list field has no label, Hana hides that field when you add or edit list items instead of showing a meaningless input." },
    { icon:"🛡️", title:"Existing lists preserved", text:"Lists that already use Quantity, Detail or custom extra labels keep them exactly as saved." }
  ]'''
replacement='''  title: "Cleaner skincare tables & swipeable notes 🌸",
  intro: "Hana Version 2 makes weekly skincare editing feel like a real table and adds a faster mobile gesture for clearing notes.",
  items: [
    { icon:"🧴", title:"Skincare stays in rows", text:"Product Type, Product and Notes now stay on one compact table row instead of stacking Notes underneath every product on phones." },
    { icon:"↔️", title:"Table-friendly mobile editing", text:"Skincare routine tables can scroll sideways when needed, preserving readable columns without turning each entry into a tall card." },
    { icon:"👈", title:"Swipe notes to delete", text:"Swipe a note card left to use Hana’s normal Trash confirmation. Tapping the card still opens it." },
    { icon:"🛡️", title:"Safe delete path", text:"Swipe delete uses the existing Trash and Partner Link ownership safeguards rather than bypassing them." }
  ]'''
app=one(app,start,replacement,'release notes')

# Add swipe gesture support beside the existing tap-to-open behavior.
anchor='''function openNoteCardElement(card) {
  if(!card)return false;
  if(card.dataset.openSkincareCard){openSkincareRoutineModal(card.dataset.openSkincareCard,{edit:false});return true;}
  if(card.dataset.openNoteCard){openNoteModal(card.dataset.openNoteCard);return true;}
  return false;
}

installNoZoomGuards();'''
insert='''function openNoteCardElement(card) {
  if(!card)return false;
  if(card.dataset.openSkincareCard){openSkincareRoutineModal(card.dataset.openSkincareCard,{edit:false});return true;}
  if(card.dataset.openNoteCard){openNoteModal(card.dataset.openNoteCard);return true;}
  return false;
}

let noteSwipeGesture={card:null,noteId:"",startX:0,startY:0};
let noteGestureSuppressUntil=0;
function resetNoteSwipeGesture(){
  const card=noteSwipeGesture.card;
  if(card){card.style.transform="";card.style.transition="";card.classList.remove("note-swipe-active");}
  noteSwipeGesture={card:null,noteId:"",startX:0,startY:0};
}
function noteCardId(card){return card?.dataset?.openNoteCard||card?.dataset?.openSkincareCard||"";}

document.addEventListener("touchstart",event=>{
  const card=event.target.closest?.("[data-open-note-card],[data-open-skincare-card]");
  if(!card||noteCardTapIsInteractive(event.target))return;
  const touch=event.touches?.[0];if(!touch)return;
  resetNoteSwipeGesture();
  noteSwipeGesture={card,noteId:noteCardId(card),startX:touch.clientX,startY:touch.clientY};
},{passive:true});

document.addEventListener("touchmove",event=>{
  const {card,startX,startY}=noteSwipeGesture;if(!card)return;
  const touch=event.touches?.[0];if(!touch)return;
  const dx=touch.clientX-startX,dy=touch.clientY-startY;
  if(dx>=0||Math.abs(dx)<=Math.abs(dy)*1.15)return;
  const limited=Math.max(-92,dx);
  card.classList.add("note-swipe-active");
  card.style.transition="none";
  card.style.transform=`translateX(${limited}px)`;
},{passive:true});

document.addEventListener("touchend",event=>{
  const {card,noteId,startX,startY}=noteSwipeGesture;if(!card)return;
  const touch=event.changedTouches?.[0];
  const dx=touch?touch.clientX-startX:0,dy=touch?touch.clientY-startY:0;
  const shouldDelete=Boolean(noteId&&dx<=-72&&Math.abs(dx)>Math.abs(dy)*1.25);
  resetNoteSwipeGesture();
  if(!shouldDelete)return;
  noteGestureSuppressUntil=Date.now()+700;
  event.preventDefault();
  setTimeout(()=>deleteNote(noteId),0);
},{passive:false});

document.addEventListener("touchcancel",resetNoteSwipeGesture,{passive:true});

installNoZoomGuards();'''
app=one(app,anchor,insert,'note swipe gesture injection')

# Prevent the synthetic click after a successful swipe from opening the card.
old_click='''  const tappedNoteCard=event.target.closest?.("[data-open-note-card],[data-open-skincare-card]");
  if(tappedNoteCard&&!noteCardTapIsInteractive(event.target)){openNoteCardElement(tappedNoteCard);return;}'''
new_click='''  const tappedNoteCard=event.target.closest?.("[data-open-note-card],[data-open-skincare-card]");
  if(tappedNoteCard&&!noteCardTapIsInteractive(event.target)){
    if(Date.now()<noteGestureSuppressUntil){event.preventDefault();return;}
    openNoteCardElement(tappedNoteCard);return;
  }'''
app=one(app,old_click,new_click,'note swipe click suppression')

# Append a narrow, explicit override instead of rewriting the mature skincare renderer.
marker='/* HANA COMPACT SKINCARE TABLE + NOTE SWIPE 2.0.28 */'
if marker in style:
    raise SystemExit('style marker already present')
style += r'''

/* HANA COMPACT SKINCARE TABLE + NOTE SWIPE 2.0.28 */
.skincare-routine-table {
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}
.skincare-routine-table-head,
.skincare-table-row {
  grid-template-columns: 118px 170px minmax(190px, 1fr) 34px;
  min-width: 560px;
  align-items: center;
}
.skincare-routine-table-head {
  display: grid;
  position: sticky;
  top: 0;
  z-index: 1;
}
.skincare-table-row {
  padding: 7px 8px;
}
.skincare-table-cell-label {
  display: none !important;
}
.skincare-table-cell input,
.skincare-table-cell select {
  height: 38px;
  min-height: 38px;
  padding: 7px 9px;
}
.skincare-notes-cell,
.skincare-type-cell,
.skincare-product-cell {
  grid-column: auto !important;
  grid-row: auto !important;
}
.skincare-table-remove {
  grid-column: auto !important;
  grid-row: auto !important;
  margin-top: 0 !important;
}
.note-card-openable.note-swipe-active {
  border-color: color-mix(in srgb, var(--danger) 40%, var(--border));
  box-shadow: 8px 0 0 color-mix(in srgb, var(--danger) 12%, transparent);
}
@media (max-width: 390px) {
  .skincare-routine-table-head { display:grid !important; }
  .skincare-table-row {
    grid-template-columns: 110px 155px 180px 32px !important;
    min-width: 515px;
    align-items:center !important;
    padding:7px 8px !important;
  }
  .skincare-routine-table-head {
    grid-template-columns:110px 155px 180px 32px !important;
    min-width:515px;
  }
  .skincare-table-cell-label { display:none !important; }
  .skincare-notes-cell,
  .skincare-type-cell,
  .skincare-product-cell,
  .skincare-table-remove {
    grid-column:auto !important;
    grid-row:auto !important;
  }
}
'''

# PWA build/cache bump.
index=one(index,'hana-app-version" content="2.0.27"','hana-app-version" content="2.0.28"','index meta version')
index=one(index,'style.css?v=2.0.27','style.css?v=2.0.28','style version')
index=one(index,'app.js?v=2.0.27','app.js?v=2.0.28','script version')
sw=one(sw,'Service Worker v60','Service Worker v61','service worker banner')
sw=one(sw,'hana-shell-v60','hana-shell-v61','cache name')
sw=one(sw,'./style.css?v=2.0.27','./style.css?v=2.0.28','sw style version')
sw=one(sw,'./app.js?v=2.0.27','./app.js?v=2.0.28','sw app version')

app_path.write_text(app,encoding='utf-8')
index_path.write_text(index,encoding='utf-8')
style_path.write_text(style,encoding='utf-8')
sw_path.write_text(sw,encoding='utf-8')
