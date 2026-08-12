from pathlib import Path

APP = Path('app.js')
STYLE = Path('style.css')
app = APP.read_text(encoding='utf-8')
style = STYLE.read_text(encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)

# Standard notes: whole card opens the note editor, while internal controls remain independent.
app = replace_once(
    app,
    'return `<article class="note-card ${note.pinned ? "pinned" : ""}">',
    'return `<article class="note-card note-card-openable ${note.pinned ? "pinned" : ""}" data-open-note-card="${note.id}" role="button" tabindex="0" aria-label="Open note: ${escapeHTML(note.title)}">',
    'standard note card tap target'
)

# Skincare is also a note, but tapping the card should open its dedicated routine view.
app = replace_once(
    app,
    'return `<article class="note-card skincare-note-card ${note.pinned ? "pinned" : ""}">',
    'return `<article class="note-card skincare-note-card note-card-openable ${note.pinned ? "pinned" : ""}" data-open-skincare-card="${note.id}" role="button" tabindex="0" aria-label="Open skincare routine: ${escapeHTML(note.title)}">',
    'skincare note card tap target'
)

helper = '''function noteCardTapIsInteractive(target) {
  return Boolean(target?.closest?.("button,a,input,textarea,select,label,summary,[contenteditable='true']"));
}

function openNoteCardElement(card) {
  if(!card)return false;
  if(card.dataset.openSkincareCard){openSkincareRoutineModal(card.dataset.openSkincareCard,{edit:false});return true;}
  if(card.dataset.openNoteCard){openNoteModal(card.dataset.openNoteCard);return true;}
  return false;
}

installNoZoomGuards();

document.addEventListener("keydown", event => {
  if(!["Enter"," "].includes(event.key)||noteCardTapIsInteractive(event.target))return;
  const card=event.target.closest?.("[data-open-note-card],[data-open-skincare-card]");
  if(!card||event.target!==card)return;
  event.preventDefault();
  openNoteCardElement(card);
});

/* ================= EVENTS ================= */'''
app = replace_once(
    app,
    'installNoZoomGuards();\n\n/* ================= EVENTS ================= */',
    helper,
    'note card open helper'
)

# Handle card taps early, but explicitly ignore buttons/checklist controls/links/fields.
click_anchor = 'document.addEventListener("click", event => {\n'
click_insert = '''document.addEventListener("click", event => {
  const tappedNoteCard=event.target.closest?.("[data-open-note-card],[data-open-skincare-card]");
  if(tappedNoteCard&&!noteCardTapIsInteractive(event.target)){openNoteCardElement(tappedNoteCard);return;}
'''
app = replace_once(app, click_anchor, click_insert, 'note card click handler')

css_marker = '/* HANA TAPPABLE NOTE CARDS */'
if css_marker in style:
    raise SystemExit('tappable note card CSS already exists')
style += '''\n\n/* HANA TAPPABLE NOTE CARDS */
.note-card-openable{cursor:pointer;touch-action:manipulation;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}.note-card-openable:active{transform:scale(.992)}.note-card-openable:focus-visible{outline:2px solid var(--rose);outline-offset:3px}@media(hover:hover){.note-card-openable:hover{border-color:color-mix(in srgb,var(--rose) 34%,var(--border));box-shadow:0 8px 24px rgba(86,61,72,.07)}}
'''

APP.write_text(app, encoding='utf-8')
STYLE.write_text(style, encoding='utf-8')
print('Tappable note cards patch applied.')
