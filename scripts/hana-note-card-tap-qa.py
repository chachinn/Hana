from pathlib import Path

app = Path('app.js').read_text(encoding='utf-8')
style = Path('style.css').read_text(encoding='utf-8')

checks = {
    'standard notes are tappable': 'data-open-note-card="${note.id}"' in app,
    'skincare notes are tappable': 'data-open-skincare-card="${note.id}"' in app,
    'interactive controls are excluded': 'noteCardTapIsInteractive' in app and 'button,a,input,textarea,select,label,summary' in app,
    'card opening helper exists': 'function openNoteCardElement(card)' in app,
    'tap handler exists': 'tappedNoteCard&&!noteCardTapIsInteractive(event.target)' in app,
    'keyboard access exists': 'document.addEventListener("keydown", event =>' in app and '["Enter"," "].includes(event.key)' in app,
    'open standard note': 'openNoteModal(card.dataset.openNoteCard)' in app,
    'open skincare routine': 'openSkincareRoutineModal(card.dataset.openSkincareCard,{edit:false})' in app,
    'tap styling exists': 'HANA TAPPABLE NOTE CARDS' in style and '.note-card-openable' in style,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Tappable note card QA failed: ' + ', '.join(failed))

print('Tappable note card QA passed:')
for name in checks:
    print(' -', name)
