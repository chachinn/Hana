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

# Internal build only; visible version stays Version 2.
app=one(app,'const HANA_APP_VERSION = "2.0.26";','const HANA_APP_VERSION = "2.0.27";','app version')

old_release='''  title: "Build templates your way ✨",
  intro: "Hana Version 2 now separates a guided Smart Template from a truly empty Blank Template, while structured categories and fields stay fully customizable.",
  items: [
    { icon:"✨", title:"Smart Template", text:"Answer “What do you need?” and Hana points you to the closest meeting, routine, reference, checklist, tracker or plain-note structure." },
    { icon:"⬜", title:"Actually blank", text:"Blank Template starts with zero categories and zero fields. You decide the first category and every field yourself." },
    { icon:"🗂️", title:"Real category controls", text:"Add, rename and delete categories; add fields inside any category and move fields between categories." },
    { icon:"↔️", title:"Flexible field types", text:"Each custom field can switch between Short text, Long text, Date and Number without rebuilding the whole form." },
    { icon:"🛡️", title:"Safe migration", text:"Existing Bionote, Strategy and Measurement entries keep their values while old section names become editable categories." }
  ]'''
new_release='''  title: "Cleaner, safer template forms 🌸",
  intro: "Hana Version 2 keeps long forms safely below the iPhone status area and treats optional list fields as suggestions instead of forced content.",
  items: [
    { icon:"📱", title:"Close button stays reachable", text:"Long template and form modals now respect the iPhone safe area, with headers that stay available while you scroll." },
    { icon:"🫧", title:"Optional means optional", text:"New lists no longer pre-fill Quantity or Detail. Those names are suggestions only until you choose to use them." },
    { icon:"☑️", title:"Cleaner list items", text:"If an extra list field has no label, Hana hides that field when you add or edit list items instead of showing a meaningless input." },
    { icon:"🛡️", title:"Existing lists preserved", text:"Lists that already use Quantity, Detail or custom extra labels keep them exactly as saved." }
  ]'''
app=one(app,old_release,new_release,'release notes')

# Preserve explicit blank optional labels while migrating truly old lists that never had the properties.
old_norm='''  const labels = list.columnLabels && typeof list.columnLabels === "object" ? list.columnLabels : {};
  const rawCount = Number(list.columnCount || 3);'''
new_norm='''  const labels = list.columnLabels && typeof list.columnLabels === "object" ? list.columnLabels : {};
  const hasQuantityLabel = Object.prototype.hasOwnProperty.call(list, "quantityLabel");
  const hasDetailLabel = Object.prototype.hasOwnProperty.call(list, "detailLabel");
  const rawCount = Number(list.columnCount || 3);'''
app=one(app,old_norm,new_norm,'normalize list optional label flags')
app=one(app,'    quantityLabel: String(list.quantityLabel || "Quantity"),','    quantityLabel: hasQuantityLabel ? String(list.quantityLabel || "") : "Quantity",','normalize quantity label')
app=one(app,'    detailLabel: String(list.detailLabel || "Detail"),','    detailLabel: hasDetailLabel ? String(list.detailLabel || "") : "Detail",','normalize detail label')

# New list forms should start blank. The HTML placeholders remain Quantity / Detail as suggestions.
app=one(app,'  document.getElementById("listQuantityLabel").value = "Quantity";','  document.getElementById("listQuantityLabel").value = "";','clear quantity label')
app=one(app,'  document.getElementById("listDetailLabel").value = "Detail";','  document.getElementById("listDetailLabel").value = "";','clear detail label')

# Editing existing lists must honor intentionally blank labels.
app=one(app,'    document.getElementById("listQuantityLabel").value = list.quantityLabel || "Quantity";','    document.getElementById("listQuantityLabel").value = list.quantityLabel ?? "";','edit quantity label')
app=one(app,'    document.getElementById("listDetailLabel").value = list.detailLabel || "Detail";','    document.getElementById("listDetailLabel").value = list.detailLabel ?? "";','edit detail label')

# Saving a blank optional label must not silently force it back on.
app=one(app,'    quantityLabel: document.getElementById("listQuantityLabel").value.trim() || "Quantity",','    quantityLabel: document.getElementById("listQuantityLabel").value.trim(),','save quantity label')
app=one(app,'    detailLabel: document.getElementById("listDetailLabel").value.trim() || "Detail",','    detailLabel: document.getElementById("listDetailLabel").value.trim(),','save detail label')

# Hide unused optional item fields; retain stored item values so re-enabling a label later is non-destructive.
old_item='''  document.getElementById("listItemQuantityLabel").innerHTML = `${escapeHTML(list.quantityLabel || "Quantity")} <span class="optional-label">optional</span>`;
  document.getElementById("listItemDetailLabel").innerHTML = `${escapeHTML(list.detailLabel || "Detail")} <span class="optional-label">optional</span>`;'''
new_item='''  const quantityLabel=String(list.quantityLabel||"").trim(),detailLabel=String(list.detailLabel||"").trim();
  const quantityWrap=document.getElementById("listItemQuantity")?.closest(".form-group"),detailWrap=document.getElementById("listItemDetail")?.closest(".form-group");
  quantityWrap?.classList.toggle("hidden",!quantityLabel);detailWrap?.classList.toggle("hidden",!detailLabel);
  if(quantityLabel)document.getElementById("listItemQuantityLabel").innerHTML = `${escapeHTML(quantityLabel)} <span class="optional-label">optional</span>`;
  if(detailLabel)document.getElementById("listItemDetailLabel").innerHTML = `${escapeHTML(detailLabel)} <span class="optional-label">optional</span>`;'''
app=one(app,old_item,new_item,'list item optional fields')

# Cache/version busting.
index=index.replace('2.0.26','2.0.27')
sw=one(sw,'Service Worker v59','Service Worker v60','service worker banner')
sw=one(sw,'hana-shell-v59','hana-shell-v60','service worker cache')
sw=sw.replace('2.0.26','2.0.27')

# Global safe-area handling for every long form/modal, including templates.
marker='/* HANA SAFE MODALS + OPTIONAL LIST FIELDS 2.0.27 */'
if marker in style:
    raise SystemExit('safe modal CSS already exists')
style += '''\n\n/* HANA SAFE MODALS + OPTIONAL LIST FIELDS 2.0.27 */
.modal-overlay {
  padding-top: calc(12px + env(safe-area-inset-top));
}
.modal-card {
  max-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 30px);
}
.modal-card > .modal-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255,250,253,.97);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
@media (max-width: 420px) {
  .modal-overlay {
    padding-top: calc(8px + env(safe-area-inset-top));
    padding-left: 8px;
    padding-right: 8px;
  }
  .modal-card {
    max-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 20px);
  }
}
'''

app_path.write_text(app,encoding='utf-8')
index_path.write_text(index,encoding='utf-8')
style_path.write_text(style,encoding='utf-8')
sw_path.write_text(sw,encoding='utf-8')
print('Applied Hana safe modal + optional list fields patch')
