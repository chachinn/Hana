/* =====================================================
   HANA 🌸 Version 1 · skincare step sync
   Apply one skincare product step to selected days without
   replacing the rest of those days' routines.
   ===================================================== */

(() => {
  const FEATURE_KEY = "hana-v1-2026-08-16-skincare-step-sync";
  let activeStepId = "";

  function norm(value = "") {
    return String(value || "").trim().toLowerCase();
  }

  function routineOf(step = {}) {
    return (step.times || []).includes("pm") ? "pm" : "am";
  }

  function variantOf(step = {}) {
    return step.variant === "alternate" ? "alternate" : "primary";
  }

  function sameSlot(a = {}, b = {}) {
    return routineOf(a) === routineOf(b)
      && variantOf(a) === variantOf(b)
      && norm(a.category) === norm(b.category);
  }

  function sourceStep() {
    return (skincareEditorDraft?.days?.[activeSkincareEditDay] || []).find(step => String(step.id) === String(activeStepId)) || null;
  }

  function sourceOrdinal(step) {
    const rows = skincareEditorDraft?.days?.[activeSkincareEditDay] || [];
    const peers = rows.filter(item => sameSlot(item, step));
    const index = peers.findIndex(item => String(item.id) === String(step.id));
    return Math.max(0, index);
  }

  function featureCard() {
    return document.getElementById("skincareStepSyncCard");
  }

  function hideStepSyncCard() {
    activeStepId = "";
    const card = featureCard();
    if (card) card.classList.add("hidden");
  }

  function ensureStepSyncCard() {
    const editMode = document.getElementById("skincareEditMode");
    if (!editMode) return null;
    let card = featureCard();
    if (card) return card;

    card = document.createElement("section");
    card.id = "skincareStepSyncCard";
    card.className = "skincare-sync-card skincare-step-sync-card hidden";
    card.innerHTML = `
      <div class="skincare-step-sync-head">
        <div>
          <strong id="skincareStepSyncTitle">Apply this product to other days</strong>
          <p id="skincareStepSyncHelp">Only this product step changes. Every other skincare step stays exactly as it is.</p>
        </div>
        <button type="button" class="skincare-step-sync-close" data-skincare-step-sync-cancel aria-label="Close product sync">×</button>
      </div>
      <div id="skincareStepSyncDayChoices" class="skincare-sync-day-choices"></div>
      <div class="skincare-step-sync-actions">
        <button type="button" class="secondary-button" data-skincare-step-sync-all>Select all other days</button>
        <button type="button" class="primary-button" data-skincare-step-sync-apply>Apply product</button>
      </div>`;

    const wholeDayCard = editMode.querySelector(".skincare-sync-card:not(.skincare-step-sync-card)");
    if (wholeDayCard) {
      wholeDayCard.classList.add("skincare-whole-day-sync-card");
      wholeDayCard.parentNode.insertBefore(card, wholeDayCard);
    } else {
      const actions = editMode.querySelector(".modal-actions");
      if (actions) actions.parentNode.insertBefore(card, actions);
      else editMode.appendChild(card);
    }
    return card;
  }

  function renderStepSyncChoices(step) {
    const card = ensureStepSyncCard();
    if (!card || !step) return;
    const title = card.querySelector("#skincareStepSyncTitle");
    const help = card.querySelector("#skincareStepSyncHelp");
    const choices = card.querySelector("#skincareStepSyncDayChoices");
    const category = String(step.category || "Product").trim() || "Product";
    const product = String(step.product || "").trim();
    const routine = routineOf(step).toUpperCase();
    const variant = variantOf(step) === "alternate" ? " · Alternate" : "";

    if (title) title.textContent = `Apply ${category} to other days`;
    if (help) help.textContent = `${product ? `${product} · ` : ""}${routine}${variant}. Only this row will be updated or added; every other product on those days stays unchanged.`;
    if (choices) {
      choices.innerHTML = SKINCARE_WEEKDAYS
        .filter(meta => meta.day !== activeSkincareEditDay)
        .map(meta => `<button type="button" class="skincare-toggle-chip" aria-pressed="false" data-skincare-step-sync-day="${meta.day}">${meta.short}</button>`)
        .join("");
    }
    card.classList.remove("hidden");
  }

  function enhanceRows() {
    const editor = document.getElementById("skincareStepsEditor");
    if (!editor) return;
    editor.querySelectorAll("[data-skincare-step-row]").forEach(row => {
      const cell = row.querySelector(".skincare-product-cell");
      if (!cell || cell.querySelector("[data-skincare-step-sync-open]")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "skincare-step-apply-button";
      button.dataset.skincareStepSyncOpen = String(row.dataset.stepId || "");
      button.textContent = "Apply to other days";
      button.setAttribute("aria-label", "Apply only this product step to other days");
      cell.appendChild(button);
    });
  }

  function clarifyWholeDaySync() {
    const title = document.getElementById("skincareSyncTitle");
    const wholeCard = title?.closest(".skincare-sync-card");
    if (!title || !wholeCard) return;
    wholeCard.classList.add("skincare-whole-day-sync-card");
    title.textContent = `Copy entire ${skincareDayMeta(activeSkincareEditDay).label} routine to…`;
    const help = title.parentElement?.querySelector("p");
    if (help) help.textContent = "Copies this day's complete AM + PM routine and replaces the selected days. Use “Apply to other days” on a product row when you only want to change one step.";
  }

  function enhanceEditor() {
    ensureStepSyncCard();
    enhanceRows();
    clarifyWholeDaySync();
  }

  function openStepSync(stepId) {
    if (!commitSkincareEditorPage()) return;
    activeStepId = String(stepId || "");
    const step = sourceStep();
    if (!step) {
      hideStepSyncCard();
      return showToast("Hana couldn't find that skincare step.");
    }
    renderStepSyncChoices(step);
    featureCard()?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function toggleDay(button) {
    const selected = button.classList.toggle("selected");
    button.setAttribute("aria-pressed", String(selected));
  }

  function selectAllOtherDays() {
    const buttons = [...document.querySelectorAll("[data-skincare-step-sync-day]")];
    const shouldSelect = buttons.some(button => !button.classList.contains("selected"));
    buttons.forEach(button => {
      button.classList.toggle("selected", shouldSelect);
      button.setAttribute("aria-pressed", String(shouldSelect));
    });
  }

  function insertStepNearRoutine(targetRows, step) {
    const routine = routineOf(step);
    const variant = variantOf(step);
    let insertAt = -1;
    targetRows.forEach((item, index) => {
      if (routineOf(item) === routine && variantOf(item) === variant) insertAt = index;
    });
    const copy = {
      ...step,
      id: createId(),
      times: [...(step.times || [])],
      order: Math.max(0, insertAt + 1)
    };
    targetRows.splice(insertAt + 1, 0, copy);
  }

  function applyStepSync() {
    if (!commitSkincareEditorPage()) return;
    const step = sourceStep();
    if (!step) return showToast("Hana couldn't find that skincare step.");
    const selectedDays = [...document.querySelectorAll("[data-skincare-step-sync-day].selected")]
      .map(button => Number(button.dataset.skincareStepSyncDay))
      .filter(day => Number.isInteger(day));
    if (!selectedDays.length) return showToast("Choose at least one day to apply this product to.");

    const ordinal = sourceOrdinal(step);
    selectedDays.forEach(day => {
      const targetRows = skincareEditorDraft.days[day] || (skincareEditorDraft.days[day] = []);
      const candidateIndexes = [];
      targetRows.forEach((item, index) => { if (sameSlot(item, step)) candidateIndexes.push(index); });
      const targetIndex = candidateIndexes[ordinal] ?? (ordinal === 0 ? candidateIndexes[0] : undefined);

      if (targetIndex !== undefined) {
        const existing = targetRows[targetIndex];
        targetRows[targetIndex] = {
          ...existing,
          category: step.category || "Other",
          product: step.product || "",
          notes: step.notes || "",
          times: [...(step.times || [])],
          variant: variantOf(step),
          routineLabel: step.routineLabel || ""
        };
      } else {
        insertStepNearRoutine(targetRows, step);
      }
    });

    const label = String(step.category || "Product").trim() || "Product";
    const targets = selectedDays.map(day => skincareDayMeta(day).short).join(", ");
    hideStepSyncCard();
    renderSkincareEditorDay();
    showToast(`${label} applied to ${targets} — other steps were kept 🧴`);
  }

  // Keep the existing full-day copy tool, but make its destructive scope explicit.
  if (typeof renderSkincareSyncChoices === "function") {
    const baseRenderSyncChoices = renderSkincareSyncChoices;
    renderSkincareSyncChoices = function (...args) {
      const result = baseRenderSyncChoices.apply(this, args);
      clarifyWholeDaySync();
      return result;
    };
  }

  if (typeof renderSkincareEditorDay === "function") {
    const baseRenderEditorDay = renderSkincareEditorDay;
    renderSkincareEditorDay = function (...args) {
      activeStepId = "";
      const result = baseRenderEditorDay.apply(this, args);
      enhanceEditor();
      return result;
    };
  }

  document.addEventListener("click", event => {
    const open = event.target.closest("[data-skincare-step-sync-open]");
    if (open) {
      event.preventDefault();
      openStepSync(open.dataset.skincareStepSyncOpen);
      return;
    }
    const day = event.target.closest("[data-skincare-step-sync-day]");
    if (day) {
      event.preventDefault();
      toggleDay(day);
      return;
    }
    if (event.target.closest("[data-skincare-step-sync-all]")) {
      event.preventDefault();
      selectAllOtherDays();
      return;
    }
    if (event.target.closest("[data-skincare-step-sync-cancel]")) {
      event.preventDefault();
      hideStepSyncCard();
      return;
    }
    if (event.target.closest("[data-skincare-step-sync-apply]")) {
      event.preventDefault();
      applyStepSync();
    }
  });

  // Add this meaningful change to What’s New without changing Hana's public
  // Version 1 / 1.0.0 identity or its established release-key contract.
  if (typeof HANA_RELEASE_NOTES === "object" && Array.isArray(HANA_RELEASE_NOTES.items)) {
    const title = "Skincare step-by-step syncing";
    if (!HANA_RELEASE_NOTES.items.some(item => item.title === title)) {
      HANA_RELEASE_NOTES.items.unshift({
        icon: "🧴",
        title,
        text: "Edit or add one skincare product—such as Sunscreen—and apply only that step to selected days. Hana keeps every cleanser, toner, serum, moisturizer, alternate routine and day label you did not edit."
      });
    }
  }

  if (typeof finishTutorial === "function") {
    const baseFinishTutorial = finishTutorial;
    finishTutorial = function (...args) {
      state.settings.lastSeenSkincareStepSyncKey = FEATURE_KEY;
      return baseFinishTutorial.apply(this, args);
    };
  }

  if (typeof openWhatsNew === "function") {
    const baseOpenWhatsNew = openWhatsNew;
    openWhatsNew = function (options = {}) {
      const result = baseOpenWhatsNew.call(this, options);
      if (options.markSeen !== false && state?.settings?.lastSeenSkincareStepSyncKey !== FEATURE_KEY) {
        state.settings.lastSeenSkincareStepSyncKey = FEATURE_KEY;
        saveState({ snapshot: false });
      }
      return result;
    };
  }

  if (typeof maybeOpenUpdateNote === "function") {
    maybeOpenUpdateNote = function () {
      if (state.settings.tutorialCompleted !== true) return;
      if (state.settings.lastSeenWhatsNewKey !== HANA_WHATS_NEW_KEY || state.settings.lastSeenSkincareStepSyncKey !== FEATURE_KEY) {
        setTimeout(() => openWhatsNew(), 240);
      }
    };
  }

  // app.js may already have scheduled its startup check before this file loads.
  // This second guarded check ensures existing users still see this update once.
  setTimeout(() => {
    if (state?.settings?.tutorialCompleted !== true) return;
    if (state.settings.lastSeenSkincareStepSyncKey === FEATURE_KEY) return;
    const whatsNew = document.getElementById("whatsNewModal");
    if (whatsNew && !whatsNew.classList.contains("hidden")) {
      state.settings.lastSeenSkincareStepSyncKey = FEATURE_KEY;
      saveState({ snapshot: false });
      return;
    }
    openWhatsNew();
  }, 650);

  window.HanaSkincareStepSync = {
    featureKey: FEATURE_KEY,
    sameSlot,
    apply: applyStepSync,
    enhance: enhanceEditor
  };
})();
