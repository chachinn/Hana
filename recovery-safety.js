/* =====================================================
   HANA 🌸 Version 1 · recovery/data-safety guard
   Public app version remains 1.0.0.
   ===================================================== */
(() => {
  const SAFETY_BUILD = "v1-data-safe-1";
  let firebaseBootstrapComplete = false;
  let hooksInstalled = false;
  let lastRecoveryReport = null;

  const publicUser = user => user ? {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    providerId: user.providerData?.[0]?.providerId || ""
  } : null;

  window.addEventListener("hana:auth-changed", event => {
    if (!firebaseBootstrapComplete && !event.detail) event.stopImmediatePropagation();
  });

  function seedSettledFirebaseUser() {
    const fb = window.HanaFirebase;
    const current = fb?.auth?.currentUser || null;
    if (current) fb.user = publicUser(current);
  }

  function escapeRecoveryHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function recoveryNoteKey(note = {}) {
    const id = String(note.id || "").trim();
    if (id) return `id:${id}`;
    return `content:${String(note.title || "").trim()}\u0000${String(note.content || "").trim()}\u0000${String(note.structuredType || "")}`;
  }

  function recoveryNoteText(note = {}) {
    const lines = [];
    if (note.title) lines.push(String(note.title));
    if (note.content) lines.push(String(note.content));
    if (Array.isArray(note.checklist) && note.checklist.length) {
      lines.push("", ...note.checklist.map(item => `${item?.completed ? "[x]" : "[ ]"} ${String(item?.text || item?.title || "").trim()}`.trim()));
    }
    return lines.join("\n").trim() || "Untitled Hana note";
  }

  async function scanMissingNotes() {
    if (typeof getSafetySnapshots !== "function" || typeof state === "undefined") {
      return { build: SAFETY_BUILD, snapshotCount: 0, preSignoutCount: 0, currentNoteCount: 0, candidates: [], error: "Recovery storage is not ready yet." };
    }
    const snapshots = await getSafetySnapshots().catch(() => []);
    const currentNotes = Array.isArray(state.notes) ? state.notes : [];
    const currentKeys = new Set(currentNotes.map(recoveryNoteKey));
    const seen = new Set();
    const candidates = [];
    let preSignoutCount = 0;

    for (const snapshot of snapshots) {
      if (snapshot?.reason === "pre-account-signout") preSignoutCount += 1;
      let parsed = null;
      try { parsed = JSON.parse(snapshot?.stateJson || ""); } catch {}
      const notes = Array.isArray(parsed?.notes) ? parsed.notes : [];
      for (const note of notes) {
        if (!note || typeof note !== "object") continue;
        const key = recoveryNoteKey(note);
        if (currentKeys.has(key) || seen.has(key)) continue;
        seen.add(key);
        candidates.push({
          key,
          note,
          snapshotAt: Number(snapshot?.createdAt || 0),
          reason: String(snapshot?.reason || "safety copy"),
          sharedWithPartner: Boolean(note.sharedWithPartner)
        });
        if (candidates.length >= 100) break;
      }
      if (candidates.length >= 100) break;
    }

    lastRecoveryReport = {
      build: SAFETY_BUILD,
      snapshotCount: snapshots.length,
      preSignoutCount,
      currentNoteCount: currentNotes.length,
      candidates
    };
    return lastRecoveryReport;
  }

  function ensureRecoveryModal() {
    let modal = document.getElementById("hanaRecoveryAuditModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "hanaRecoveryAuditModal";
    modal.className = "modal-overlay hidden";
    modal.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="hanaRecoveryAuditTitle">
        <div class="modal-header">
          <div><p class="eyebrow">RECOVERY ONLY · READ-ONLY</p><h2 id="hanaRecoveryAuditTitle">Recovery audit 🌸</h2></div>
          <button type="button" class="modal-close" data-hana-recovery-close aria-label="Close">×</button>
        </div>
        <div class="modal-content">
          <div class="settings-card">
            <h3>Nothing is restored automatically</h3>
            <p>This audit only reads Hana's existing on-device safety copies and compares their Notes with what is in Hana now. It does not overwrite, delete, restore, sign in, sign out, connect, or disconnect anything.</p>
          </div>
          <div id="hanaRecoveryAuditStatus" class="settings-card"><p>Checking safety copies…</p></div>
          <div id="hanaRecoveryAuditResults"></div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", event => {
      if (event.target === modal || event.target.closest("[data-hana-recovery-close]")) modal.classList.add("hidden");
    });
    return modal;
  }

  async function openRecoveryAudit() {
    const modal = ensureRecoveryModal();
    modal.classList.remove("hidden");
    const status = document.getElementById("hanaRecoveryAuditStatus");
    const results = document.getElementById("hanaRecoveryAuditResults");
    status.innerHTML = "<p>Checking safety copies…</p>";
    results.innerHTML = "";

    const report = await scanMissingNotes();
    const fbUser = window.HanaFirebase?.user || null;
    const partner = typeof hanaPartnerState !== "undefined" ? hanaPartnerState : null;
    status.innerHTML = `<div class="backup-status-grid">
      <div><span>Hana account</span><strong>${fbUser ? "Signed in" : "No active session"}</strong></div>
      <div><span>Partner Link</span><strong>${partner?.connected ? `Connected to ${escapeRecoveryHTML(partner.partnerName || "partner")}` : (partner?.inviteCode ? "Invite pending" : "Not active in this session")}</strong></div>
      <div><span>Safety copies checked</span><strong>${report.snapshotCount}</strong></div>
      <div><span>Pre-sign-out safety copies</span><strong>${report.preSignoutCount}</strong></div>
    </div>`;

    if (report.error) {
      results.innerHTML = `<div class="settings-card"><strong>Audit unavailable</strong><p>${escapeRecoveryHTML(report.error)}</p></div>`;
      return report;
    }
    if (!report.candidates.length) {
      results.innerHTML = `<div class="settings-card"><h3>No missing-note candidates found locally</h3><p>None of the Notes in Hana's retained on-device safety copies are absent from your current Notes. This does not inspect an older cloud backup or Partner Firestore history.</p></div>`;
      return report;
    }

    results.innerHTML = `<div class="settings-card"><h3>${report.candidates.length} note${report.candidates.length === 1 ? "" : "s"} found in safety copies but not in current Notes</h3><p>Review these carefully: older safety copies can also contain notes you intentionally deleted. Copying a note is safe and does not change Hana.</p></div>${report.candidates.map((entry, index) => {
      const note = entry.note || {};
      const when = entry.snapshotAt ? new Date(entry.snapshotAt).toLocaleString() : "Unknown time";
      const preview = String(note.content || "").replace(/\s+/g, " ").trim().slice(0, 180);
      return `<article class="settings-card" data-recovery-note-card="${index}"><div class="section-header"><h3>${escapeRecoveryHTML(note.title || "Untitled note")}</h3>${entry.sharedWithPartner ? "<span class=\"badge\">Partner-shared</span>" : ""}</div><small>${escapeRecoveryHTML(entry.reason)} · ${escapeRecoveryHTML(when)}</small>${preview ? `<p>${escapeRecoveryHTML(preview)}${String(note.content || "").length > 180 ? "…" : ""}</p>` : ""}<button type="button" class="secondary-button" data-copy-recovery-note="${index}">Copy note text</button></article>`;
    }).join("")}`;
    return report;
  }

  async function copyRecoveryNote(index) {
    const entry = lastRecoveryReport?.candidates?.[Number(index)];
    if (!entry) return;
    const text = recoveryNoteText(entry.note);
    try {
      await navigator.clipboard.writeText(text);
      if (typeof showToast === "function") showToast("Recovery note copied. Hana was not changed.");
    } catch {
      window.prompt("Copy this recovered note text", text);
    }
  }

  function injectRecoveryAuditButton() {
    const backupCard = document.querySelector(".backup-card");
    const actions = backupCard?.querySelector(".backup-actions");
    if (!actions || document.getElementById("hanaRecoveryAuditButton")) return;
    const button = document.createElement("button");
    button.id = "hanaRecoveryAuditButton";
    button.type = "button";
    button.className = "secondary-button";
    button.textContent = "Recovery audit";
    actions.appendChild(button);
    if (!backupCard.querySelector("[data-hana-recovery-help]")) {
      const help = document.createElement("small");
      help.className = "field-help";
      help.dataset.hanaRecoveryHelp = "true";
      help.textContent = "Recovery audit is read-only: it can look for notes in safety copies without restoring or replacing your current Hana.";
      backupCard.appendChild(help);
    }
  }

  function installAppSafetyHooks() {
    if (hooksInstalled) return true;
    if (typeof window.cleanupSharedLocalForSignedOut !== "function" || typeof window.getSafetySnapshots !== "function") return false;

    window.cleanupSharedLocalForSignedOut = async function hanaNonDestructiveSignedOutCleanup() {
      const modeChanged = typeof state !== "undefined" && state.currentMode === "shared";
      if (modeChanged) state.currentMode = "all";
      return modeChanged;
    };
    window.cleanupSharedLocalForSignedOut.__hanaNonDestructive = true;

    const page = document.getElementById("pageContent");
    if (page) {
      const observer = new MutationObserver(() => injectRecoveryAuditButton());
      observer.observe(page, { childList: true, subtree: true });
    }
    document.addEventListener("click", event => {
      if (event.target.closest("#hanaRecoveryAuditButton")) { openRecoveryAudit(); return; }
      const copy = event.target.closest("[data-copy-recovery-note]");
      if (copy) copyRecoveryNote(copy.dataset.copyRecoveryNote);
    });
    injectRecoveryAuditButton();
    hooksInstalled = true;
    return true;
  }

  async function waitForAppSafetyHooks() {
    for (let attempt = 0; attempt < 400; attempt += 1) {
      if (installAppSafetyHooks()) return true;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return false;
  }

  const fb = window.HanaFirebase;
  if (fb?.ready?.then) {
    const originalReady = fb.ready;
    fb.ready = (async () => {
      const value = await originalReady;
      seedSettledFirebaseUser();
      await waitForAppSafetyHooks();
      firebaseBootstrapComplete = true;
      return value;
    })();
  } else {
    setTimeout(async () => {
      await waitForAppSafetyHooks();
      firebaseBootstrapComplete = true;
    }, 0);
  }

  window.addEventListener("hana:firebase-ready", seedSettledFirebaseUser, { once: true });
  window.HanaRecoveryAudit = {
    build: SAFETY_BUILD,
    scanMissingNotes,
    open: openRecoveryAudit,
    status: () => ({ firebaseBootstrapComplete, hooksInstalled, nonDestructiveAuthCleanup: Boolean(window.cleanupSharedLocalForSignedOut?.__hanaNonDestructive) })
  };
})();
