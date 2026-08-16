/* =====================================================
   HANA 🌸 Version 1 · list column scroll preservation
   Keep the user's horizontal position when checking items
   in four- or five-column checklists.
   ===================================================== */

(() => {
  const FEATURE_KEY = "hana-v1-2026-08-16-list-column-scroll";
  const SETTING_KEY = "lastSeenListColumnScrollKey";

  function boardForList(listId) {
    const id = String(listId || "");
    const boards = [...document.querySelectorAll(".list-column-board")];
    const tagged = boards.find(board => String(board.dataset.hanaListScrollId || "") === id);
    if (tagged) return tagged;

    const containing = boards.find(board => [...board.querySelectorAll("[data-list-id]")]
      .some(node => String(node.dataset.listId || "") === id));
    if (containing) return containing;

    return boards.length === 1 ? boards[0] : null;
  }

  function restoreBoardPosition(listId, scrollLeft) {
    const restore = () => {
      const board = boardForList(listId);
      if (!board) return;
      const max = Math.max(0, board.scrollWidth - board.clientWidth);
      const target = Math.max(0, Math.min(Number(scrollLeft) || 0, max));
      board.scrollLeft = target;
    };

    // render() is synchronous, but iOS can apply scroll snapping/layout on the
    // next paint. Restore once now and once after layout so the fourth/fifth
    // column does not jump back to the first columns.
    restore();
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
  }

  if (typeof renderListColumnBoard === "function") {
    const baseRenderListColumnBoard = renderListColumnBoard;
    renderListColumnBoard = function (list, items) {
      const html = baseRenderListColumnBoard.apply(this, arguments);
      const id = typeof escapeHTML === "function" ? escapeHTML(String(list?.id || "")) : String(list?.id || "");
      return html.replace(
        '<div class="list-column-board',
        `<div data-hana-list-scroll-id="${id}" class="list-column-board`
      );
    };
  }

  if (typeof toggleListItem === "function") {
    const baseToggleListItem = toggleListItem;
    toggleListItem = function (listId, itemId) {
      const board = boardForList(listId);
      const scrollLeft = board?.scrollLeft || 0;
      const shouldRestore = Boolean(board && board.scrollWidth > board.clientWidth + 1);
      const result = baseToggleListItem.apply(this, arguments);
      if (shouldRestore) restoreBoardPosition(listId, scrollLeft);
      return result;
    };
  }

  // Surface this visible behavior fix in What's New while Hana remains
  // public Version 1 / app 1.0.0.
  if (typeof HANA_RELEASE_NOTES === "object" && Array.isArray(HANA_RELEASE_NOTES.items)) {
    const title = "Lists stay where you’re working";
    if (!HANA_RELEASE_NOTES.items.some(item => item.title === title)) {
      HANA_RELEASE_NOTES.items.unshift({
        icon: "☑️",
        title,
        text: "Checking or unchecking an item in a 4- or 5-column list now keeps the list at the same horizontal position, so working in Column 4 or 5 no longer jumps you back to the left."
      });
    }
  }

  if (typeof finishTutorial === "function") {
    const baseFinishTutorial = finishTutorial;
    finishTutorial = function (...args) {
      state.settings[SETTING_KEY] = FEATURE_KEY;
      return baseFinishTutorial.apply(this, args);
    };
  }

  if (typeof openWhatsNew === "function") {
    const baseOpenWhatsNew = openWhatsNew;
    openWhatsNew = function (options = {}) {
      const result = baseOpenWhatsNew.call(this, options);
      if (options.markSeen !== false && state?.settings?.[SETTING_KEY] !== FEATURE_KEY) {
        state.settings[SETTING_KEY] = FEATURE_KEY;
        saveState({ snapshot: false });
      }
      return result;
    };
  }

  if (typeof maybeOpenUpdateNote === "function") {
    const baseMaybeOpenUpdateNote = maybeOpenUpdateNote;
    maybeOpenUpdateNote = function (...args) {
      const result = baseMaybeOpenUpdateNote.apply(this, args);
      if (state?.settings?.tutorialCompleted === true && state.settings[SETTING_KEY] !== FEATURE_KEY) {
        setTimeout(() => {
          if (state.settings[SETTING_KEY] === FEATURE_KEY) return;
          const modal = document.getElementById("whatsNewModal");
          if (modal && !modal.classList.contains("hidden")) {
            state.settings[SETTING_KEY] = FEATURE_KEY;
            saveState({ snapshot: false });
          } else {
            openWhatsNew();
          }
        }, 320);
      }
      return result;
    };
  }

  // app.js and earlier feature modules may already have scheduled their startup
  // checks before this file loads. Give existing users one guarded second check.
  setTimeout(() => {
    if (state?.settings?.tutorialCompleted !== true) return;
    if (state.settings[SETTING_KEY] === FEATURE_KEY) return;
    const modal = document.getElementById("whatsNewModal");
    if (modal && !modal.classList.contains("hidden")) {
      state.settings[SETTING_KEY] = FEATURE_KEY;
      saveState({ snapshot: false });
      return;
    }
    openWhatsNew();
  }, 760);

  window.HanaListScrollMemory = {
    featureKey: FEATURE_KEY,
    boardForList,
    restore: restoreBoardPosition
  };
})();
