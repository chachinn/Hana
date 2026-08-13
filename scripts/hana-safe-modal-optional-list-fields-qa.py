from pathlib import Path

app=Path('app.js').read_text(encoding='utf-8')
index=Path('index.html').read_text(encoding='utf-8')
style=Path('style.css').read_text(encoding='utf-8')
sw=Path('service-worker.js').read_text(encoding='utf-8')

checks={
    'build version': 'const HANA_APP_VERSION = "2.0.27";' in app,
    'display version remains 2': 'const HANA_DISPLAY_VERSION = "2";' in app,
    'new list quantity blank': 'document.getElementById("listQuantityLabel").value = "";' in app,
    'new list detail blank': 'document.getElementById("listDetailLabel").value = "";' in app,
    'save quantity stays blank': 'quantityLabel: document.getElementById("listQuantityLabel").value.trim(),' in app,
    'save detail stays blank': 'detailLabel: document.getElementById("listDetailLabel").value.trim(),' in app,
    'legacy quantity migration': 'hasQuantityLabel ? String(list.quantityLabel || "") : "Quantity"' in app,
    'legacy detail migration': 'hasDetailLabel ? String(list.detailLabel || "") : "Detail"' in app,
    'unused item quantity hidden': 'quantityWrap?.classList.toggle("hidden",!quantityLabel)' in app,
    'unused item detail hidden': 'detailWrap?.classList.toggle("hidden",!detailLabel)' in app,
    'quantity remains suggestion placeholder': 'id="listQuantityLabel" type="text" placeholder="Quantity"' in index,
    'detail remains suggestion placeholder': 'id="listDetailLabel" type="text" placeholder="Detail"' in index,
    'safe top inset': 'padding-top: calc(12px + env(safe-area-inset-top));' in style,
    'sticky modal header': '.modal-card > .modal-header' in style and 'position: sticky;' in style,
    'safe modal height': '100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom)' in style,
    'index version': 'hana-app-version" content="2.0.27"' in index,
    'service worker cache': 'hana-shell-v60' in sw,
    'service worker app query': './app.js?v=2.0.27' in sw,
}
failed=[name for name,ok in checks.items() if not ok]
if failed:
    raise SystemExit('QA failed: '+', '.join(failed))

# Regression guards: do not reintroduce forced defaults in clear/save paths.
for bad in [
    'document.getElementById("listQuantityLabel").value = "Quantity";',
    'document.getElementById("listDetailLabel").value = "Detail";',
    'quantityLabel: document.getElementById("listQuantityLabel").value.trim() || "Quantity"',
    'detailLabel: document.getElementById("listDetailLabel").value.trim() || "Detail"',
]:
    if bad in app:
        raise SystemExit('Regression guard failed: '+bad)

print('Hana safe modal + optional list fields QA passed:', ', '.join(checks))
