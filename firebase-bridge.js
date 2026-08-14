/* =====================================================
   HANA 🌸 Firebase bridge v1.0.0 — Accounts, Cloud Backup & Partner Link
   Optional Authentication + Cloud Backup
   ===================================================== */

(() => {
  const SDK_VERSION = "12.16.0";
  const CHUNK_BYTES = 240000;
  const BRIDGE_VERSION = "1.0.0";
  const FIREBASE_PROJECT_ID = "hana-e78b1";

  const firebaseConfig = {
    apiKey: "AIzaSyClQ3ewSe27g2FuCVb3GNmNe28fZIKGL4A",
    authDomain: "hana-e78b1.firebaseapp.com",
    projectId: "hana-e78b1",
    storageBucket: "hana-e78b1.firebasestorage.app",
    messagingSenderId: "864880777906",
    appId: "1:864880777906:web:bc891a632c89f7f1e207ab"
  };

  const publicUser = user => user ? {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    providerId: user.providerData?.[0]?.providerId || ""
  } : null;

  const bytesToBase64 = bytes => {
    let binary = "";
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + step, bytes.length)));
    }
    return btoa(binary);
  };

  const base64ToBytes = value => {
    const binary = atob(value || "");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const concatBytes = arrays => {
    const total = arrays.reduce((sum, item) => sum + item.length, 0);
    const joined = new Uint8Array(total);
    let offset = 0;
    arrays.forEach(item => { joined.set(item, offset); offset += item.length; });
    return joined;
  };

  window.HanaFirebase = {
    available: false,
    error: null,
    user: null,
    ready: null,
    async createEmailAccount() { throw new Error("Firebase is still loading."); },
    async signInEmail() { throw new Error("Firebase is still loading."); },
    async signInGoogle() { throw new Error("Firebase is still loading."); },
    async resetPassword() { throw new Error("Firebase is still loading."); },
    async signOut() { throw new Error("Firebase is still loading."); },
    async getCloudMeta() { return null; },
    async backupSnapshot() { throw new Error("Firebase is still loading."); },
    async restoreSnapshot() { throw new Error("Firebase is still loading."); },
    async createPartnerInvite() { throw new Error("Firebase is still loading."); },
    async acceptPartnerInvite() { throw new Error("Firebase is still loading."); },
    async cancelPartnerInvite() { throw new Error("Firebase is still loading."); },
    async disconnectPartner() { throw new Error("Firebase is still loading."); },
    async diagnosePartner() { throw new Error("Firebase is still loading."); },
    validatePartnerCode() { return { valid: false, message: "Firebase is still loading." }; },
    watchPartner() { return () => {}; },
    watchSharedItems() { return () => {}; },
    async syncSharedChanges() { throw new Error("Firebase is still loading."); }
  };

  window.HanaFirebase.ready = (async () => {
    try {
      const [appSdk, authSdk, firestoreSdk] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`)
      ]);

      const app = appSdk.initializeApp(firebaseConfig);
      const auth = authSdk.getAuth(app);
      let db;
      try {
        db = firestoreSdk.initializeFirestore(app, {
          localCache: firestoreSdk.persistentLocalCache({
            tabManager: firestoreSdk.persistentMultipleTabManager()
          })
        });
      } catch (error) {
        console.info("Hana Firestore persistent cache unavailable; using memory cache:", error?.code || error?.message || error);
        db = firestoreSdk.getFirestore(app);
      }
      const googleProvider = new authSdk.GoogleAuthProvider();
      googleProvider.setCustomParameters({ prompt: "select_account" });

      await authSdk.setPersistence(auth, authSdk.browserLocalPersistence).catch(() => {});

      const assertUser = uid => {
        const current = auth.currentUser;
        if (!current || current.uid !== uid) throw new Error("Please sign in to this Hana account first.");
        return current;
      };

      async function preparePartnerUser(uid) {
        if (typeof auth.authStateReady === "function") await auth.authStateReady();
        const current = assertUser(uid);
        // Refresh the ID token before Partner Link operations. Cloud Backup can
        // work from an older session while a newly initialized Firestore request
        // is still waiting on refreshed credentials, especially after PWA resume.
        try { await current.getIdToken(true); } catch {}
        return assertUser(uid);
      }

      const metaRef = uid => firestoreSdk.doc(db, "users", uid, "hanaBackup", "meta");
      const chunkRef = (uid, generation, index) => firestoreSdk.doc(db, "users", uid, "hanaBackupChunks", `${generation}_${String(index).padStart(4, "0")}`);
      const profileRef = uid => firestoreSdk.doc(db, "users", uid, "hanaAccount", "profile");

      async function updateProfile(user) {
        if (!user) return;
        await firestoreSdk.setDoc(profileRef(user.uid), {
          email: user.email || "",
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      async function getCloudMeta(uid) {
        assertUser(uid);
        const snap = await firestoreSdk.getDoc(metaRef(uid));
        return snap.exists() ? snap.data() : null;
      }

      async function backupSnapshot(uid, payload) {
        const user = assertUser(uid);
        const json = JSON.stringify(payload);
        const bytes = new TextEncoder().encode(json);
        const generation = `g${Date.now().toString(36)}`;
        const chunks = [];
        for (let start = 0; start < bytes.length; start += CHUNK_BYTES) {
          chunks.push(bytes.subarray(start, Math.min(start + CHUNK_BYTES, bytes.length)));
        }
        if (!chunks.length) chunks.push(new Uint8Array());

        const previousSnap = await firestoreSdk.getDoc(metaRef(uid));
        const previous = previousSnap.exists() ? previousSnap.data() : null;

        for (let i = 0; i < chunks.length; i++) {
          await firestoreSdk.setDoc(chunkRef(uid, generation, i), {
            index: i,
            generation,
            data: bytesToBase64(chunks[i])
          });
        }

        const meta = {
          generation,
          chunkCount: chunks.length,
          sizeBytes: bytes.length,
          formatVersion: Number(payload?.formatVersion || 1),
          appVersion: String(payload?.appVersion || "1.9"),
          updatedAt: new Date().toISOString(),
          email: user.email || "",
          displayName: user.displayName || ""
        };
        await firestoreSdk.setDoc(metaRef(uid), meta);
        await updateProfile(user).catch(() => {});

        if (previous?.generation && previous.generation !== generation && Number(previous.chunkCount) > 0) {
          for (let i = 0; i < Number(previous.chunkCount); i++) {
            await firestoreSdk.deleteDoc(chunkRef(uid, previous.generation, i)).catch(() => {});
          }
        }
        return meta;
      }

      async function restoreSnapshot(uid) {
        assertUser(uid);
        const meta = await getCloudMeta(uid);
        if (!meta?.generation || !Number(meta.chunkCount)) return null;
        const parts = [];
        for (let i = 0; i < Number(meta.chunkCount); i++) {
          const snap = await firestoreSdk.getDoc(chunkRef(uid, meta.generation, i));
          if (!snap.exists()) throw new Error("This cloud backup is incomplete. Your local Hana data was not changed.");
          parts.push(base64ToBytes(snap.data().data));
        }
        const json = new TextDecoder().decode(concatBytes(parts));
        return { meta, payload: JSON.parse(json) };
      }


      const partnerProfileRef = uid => firestoreSdk.doc(db, "users", uid, "hanaPartner", "profile");
      const partnerInviteStateRef = uid => firestoreSdk.doc(db, "users", uid, "hanaPartner", "invite");
      const partnerInviteDocRef = (ownerUid, token) => firestoreSdk.doc(db, "users", ownerUid, "hanaPartnerInvites", token);
      const cleanInviteToken = value => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const inviteAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const generateInviteToken = () => {
        const bytes = new Uint8Array(12); crypto.getRandomValues(bytes);
        return Array.from(bytes, value => inviteAlphabet[value % inviteAlphabet.length]).join("");
      };
      const encodeUidForInvite = uid => bytesToBase64(new TextEncoder().encode(String(uid || "")))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
      const decodeUidFromInvite = encoded => {
        let value = String(encoded || "").replace(/-/g, "+").replace(/_/g, "/");
        while (value.length % 4) value += "=";
        return new TextDecoder().decode(base64ToBytes(value));
      };
      const makePartnerCode = (ownerUid, token) => `H2.${encodeUidForInvite(ownerUid)}.${cleanInviteToken(token)}`;
      const normalizePartnerCodeInput = raw => {
        let value = String(raw || "").trim().replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
        value = value.replace(/[。．]/g, ".");
        if (/^https?:\/\//i.test(value)) {
          try {
            const parsed = new URL(value);
            value = parsed.searchParams.get("hanaPartner") || parsed.searchParams.get("partner") || value;
          } catch {}
        }
        // Users commonly paste from Messages/Messenger with surrounding words.
        // Extract the first complete H2 key instead of requiring a perfectly raw field.
        const embedded = value.match(/H2\s*\.\s*([A-Za-z0-9_-]{6,})\s*\.\s*([A-Za-z0-9]{8,})/i);
        if (embedded) return `H2.${embedded[1]}.${embedded[2]}`;
        return value.replace(/\s+/g, "");
      };
      const parsePartnerCode = raw => {
        const value = normalizePartnerCodeInput(raw);
        const parts = value.split(".");
        const hasH2Prefix = parts[0]?.toUpperCase() === "H2";
        if (hasH2Prefix && parts.length !== 3) {
          throw new Error("That H2 Partner invite looks incomplete. Copy or Share the full invite again from your partner's Hana.");
        }
        if (!hasH2Prefix) {
          if (/^[A-Z0-9]{6,16}$/i.test(value)) throw new Error("That is a legacy short Partner code. Create a fresh H2 invite in the current Hana and use the full key.");
          throw new Error("Hana could not find a complete H2 Partner key in what was pasted. Use Copy full key or Share invite from the other phone, then paste again.");
        }
        if (parts.length !== 3) throw new Error("That H2 Partner invite is incomplete. Copy the full key again.");
        let ownerUid = "";
        try { ownerUid = decodeUidFromInvite(parts[1]); } catch {}
        const token = cleanInviteToken(parts[2]);
        if (!ownerUid || token.length < 8) throw new Error("That H2 Partner invite is not valid. Copy it again directly from Hana without editing it.");
        return { code: makePartnerCode(ownerUid, token), ownerUid, token };
      };
      const validatePartnerCode = raw => {
        try {
          const parsed = parsePartnerCode(raw);
          return { valid: true, code: parsed.code, ownerUid: parsed.ownerUid, token: parsed.token, message: "Valid H2 invite detected ✓" };
        } catch (error) {
          return { valid: false, message: String(error?.message || error || "Invalid Partner key") };
        }
      };
      const sharedItemsRef = linkId => {
        const { ownerUid, token } = parsePartnerCode(linkId);
        return firestoreSdk.collection(db, "users", ownerUid, "hanaShared", token, "items");
      };
      const sharedItemRef = (linkId, key) => {
        const { ownerUid, token } = parsePartnerCode(linkId);
        return firestoreSdk.doc(db, "users", ownerUid, "hanaShared", token, "items", key);
      };

      const isPartnerPermissionError = error => {
        const code = String(error?.code || "").toLowerCase();
        const message = String(error?.message || error || "");
        return code.includes("permission-denied") || /missing or insufficient permissions/i.test(message);
      };
      const rethrowPartnerPermission = (error, stage = "Partner Link") => {
        if (isPartnerPermissionError(error)) {
          const code = String(error?.code || "permission-denied");
          const wrapped = new Error(`${stage} was blocked by Firestore (${code}). Hana ${BRIDGE_VERSION} uses your authenticated user tree instead of the old top-level invite collection. Publish the matching Firestore rules for this build, then try again.`);
          wrapped.code = code;
          wrapped.stage = stage;
          wrapped.diagnostic = JSON.stringify({ stage, code, build: BRIDGE_VERSION, projectId: FIREBASE_PROJECT_ID, online: navigator.onLine, uid: auth.currentUser?.uid || "", architecture: "user-tree-v7" });
          throw wrapped;
        }
        throw error;
      };

      async function createPartnerInvite(uid, displayName = "") {
        const user = await preparePartnerUser(uid);
        let profileSnap, pointerSnap;
        try {
          profileSnap = await firestoreSdk.getDoc(partnerProfileRef(uid));
          pointerSnap = await firestoreSdk.getDoc(partnerInviteStateRef(uid));
        } catch (error) {
          rethrowPartnerPermission(error, "Reading your private Partner Link settings");
        }
        if (profileSnap.exists()) throw new Error("This Hana account already has a Partner Link.");

        if (pointerSnap.exists()) {
          const pointer = pointerSnap.data() || {};
          if (pointer.token && pointer.code) {
            try {
              const existingSnap = await firestoreSdk.getDoc(partnerInviteDocRef(uid, cleanInviteToken(pointer.token)));
              if (existingSnap.exists()) {
                const existing = existingSnap.data();
                if (existing.status === "open") {
                  const expiresAt = existing.expiresAt ? new Date(existing.expiresAt).getTime() : 0;
                  if (!expiresAt || expiresAt > Date.now()) {
                    const canonicalCode = makePartnerCode(uid, cleanInviteToken(existing.token || pointer.token));
                    if (existing.code !== canonicalCode) {
                      await firestoreSdk.updateDoc(existingSnap.ref, { code: canonicalCode, schemaVersion: 7 }).catch(() => {});
                    }
                    if (pointer.code !== canonicalCode) {
                      await firestoreSdk.setDoc(partnerInviteStateRef(uid), { ...pointer, code: canonicalCode, token: cleanInviteToken(existing.token || pointer.token), updatedAt: new Date().toISOString(), schemaVersion: 7 }, { merge: true }).catch(() => {});
                    }
                    return { ...existing, code: canonicalCode, token: cleanInviteToken(existing.token || pointer.token) };
                  }
                  await firestoreSdk.updateDoc(existingSnap.ref, { status: "cancelled", cancelledAt: new Date().toISOString() }).catch(() => {});
                }
                if (existing.status === "accepted" && existing.acceptedUid) {
                  throw new Error("Your Partner invite was already accepted. Reopen Hana on both devices so the connection can finish.");
                }
              }
            } catch (error) {
              if (!isPartnerPermissionError(error)) throw error;
              rethrowPartnerPermission(error, "Reading your existing Partner invite");
            }
          }
        }

        const token = generateInviteToken();
        const code = makePartnerCode(uid, token);
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        const data = {
          code,
          token,
          ownerUid: uid,
          ownerName: displayName || user.displayName || user.email?.split("@")[0] || "Hana user",
          ownerEmail: user.email || "",
          status: "open",
          createdAt: createdAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          schemaVersion: 7
        };
        try {
          await firestoreSdk.setDoc(partnerInviteDocRef(uid, token), data);
          await firestoreSdk.setDoc(partnerInviteStateRef(uid), {
            code,
            token,
            updatedAt: createdAt.toISOString(),
            schemaVersion: 7
          });
        } catch (error) {
          await firestoreSdk.deleteDoc(partnerInviteDocRef(uid, token)).catch(() => {});
          rethrowPartnerPermission(error, "Creating your private Partner invite");
        }
        return data;
      }

      async function acceptPartnerInvite(uid, rawCode, displayName = "") {
        const user = await preparePartnerUser(uid);
        const parsed = parsePartnerCode(rawCode);
        const { code, ownerUid, token } = parsed;
        if (ownerUid === uid) throw new Error("Open this Partner invite on your partner's Hana account, not your own.");

        let ownProfile, ownPointer;
        try {
          ownProfile = await firestoreSdk.getDoc(partnerProfileRef(uid));
          ownPointer = await firestoreSdk.getDoc(partnerInviteStateRef(uid));
        } catch (error) {
          rethrowPartnerPermission(error, "Reading your private Partner Link settings");
        }
        if (ownProfile.exists()) throw new Error("This Hana account is already connected to a partner.");
        if (ownPointer.exists() && ownPointer.data()?.token) {
          try {
            const ownInvite = await firestoreSdk.getDoc(partnerInviteDocRef(uid, cleanInviteToken(ownPointer.data().token)));
            if (ownInvite.exists() && ownInvite.data().status === "open") {
              throw new Error("Cancel your current Partner invite before joining someone else's link.");
            }
          } catch (error) {
            if (!isPartnerPermissionError(error)) throw error;
            rethrowPartnerPermission(error, "Reading your current Partner invite");
          }
        }

        let inviteSnap;
        try {
          inviteSnap = await firestoreSdk.getDoc(partnerInviteDocRef(ownerUid, token));
        } catch (error) {
          rethrowPartnerPermission(error, "Reading the Partner invite");
        }
        if (!inviteSnap.exists()) throw new Error("That Partner invite was not found. Ask your partner to create a new one.");
        let invite = inviteSnap.data();
        if (invite.ownerUid !== ownerUid || cleanInviteToken(invite.token) !== token) throw new Error("That Partner invite does not match its owner.");
        if (invite.status === "cancelled") throw new Error("That Partner invite was cancelled.");
        if (invite.status === "disconnected") throw new Error("That Partner Link was disconnected. Ask for a new invite.");
        if (invite.status === "accepted" && invite.acceptedUid !== uid) throw new Error("That Partner invite has already been used.");
        if (!['open', 'accepted'].includes(invite.status)) throw new Error("That Partner invite is no longer available.");
        if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) throw new Error("That Partner invite has expired. Ask for a new one.");

        const partnerName = invite.ownerName || invite.ownerEmail?.split("@")[0] || "Partner";
        const myName = displayName || user.displayName || user.email?.split("@")[0] || "Hana user";
        const now = new Date().toISOString();

        if (invite.status === "open") {
          try {
            await firestoreSdk.updateDoc(inviteSnap.ref, {
              status: "accepted",
              acceptedUid: uid,
              acceptedName: myName,
              acceptedEmail: user.email || "",
              acceptedAt: now,
              schemaVersion: 7
            });
          } catch (error) {
            rethrowPartnerPermission(error, "Accepting the Partner invite");
          }
          invite = { ...invite, status: "accepted", acceptedUid: uid, acceptedName: myName, acceptedEmail: user.email || "" };
        }

        try {
          await firestoreSdk.setDoc(partnerProfileRef(uid), {
            linkId: code,
            ownerUid,
            inviteToken: token,
            partnerUid: ownerUid,
            partnerName,
            partnerEmail: invite.ownerEmail || "",
            connectedAt: now,
            schemaVersion: 7
          });
        } catch (error) {
          rethrowPartnerPermission(error, "Saving Partner Link to your Hana account");
        }
        return { linkId: code, partnerUid: ownerUid, partnerName, partnerEmail: invite.ownerEmail || "" };
      }

      async function cancelPartnerInvite(uid, rawCode) {
        await preparePartnerUser(uid);
        let parsed = null;
        try { parsed = parsePartnerCode(rawCode); } catch {}
        let token = parsed?.ownerUid === uid ? parsed.token : "";
        if (!token) {
          const pointer = await firestoreSdk.getDoc(partnerInviteStateRef(uid));
          token = cleanInviteToken(pointer.data()?.token || "");
        }
        if (token) {
          const ref = partnerInviteDocRef(uid, token);
          const snap = await firestoreSdk.getDoc(ref).catch(() => null);
          if (snap?.exists() && snap.data().ownerUid === uid && snap.data().status === "open") {
            await firestoreSdk.updateDoc(ref, { status: "cancelled", cancelledAt: new Date().toISOString() });
          }
        }
        await firestoreSdk.deleteDoc(partnerInviteStateRef(uid)).catch(() => {});
      }

      async function disconnectPartner(uid, linkId) {
        await preparePartnerUser(uid);
        const { ownerUid, token } = parsePartnerCode(linkId);
        const ref = partnerInviteDocRef(ownerUid, token);
        let inviteSnap;
        try { inviteSnap = await firestoreSdk.getDoc(ref); }
        catch (error) { rethrowPartnerPermission(error, "Reading the active Partner Link"); }
        if (inviteSnap.exists()) {
          const invite = inviteSnap.data();
          const isMember = uid === ownerUid || uid === invite.acceptedUid;
          if (isMember && invite.status === "accepted") {
            try {
              await firestoreSdk.updateDoc(ref, { status: "disconnected", disconnectedAt: new Date().toISOString(), disconnectedBy: uid });
            } catch (error) {
              rethrowPartnerPermission(error, "Disconnecting Partner Link");
            }
          }
        }
        await firestoreSdk.deleteDoc(partnerProfileRef(uid)).catch(() => {});
        if (uid === ownerUid) await firestoreSdk.deleteDoc(partnerInviteStateRef(uid)).catch(() => {});
      }

      async function diagnosePartner(uid) {
        const tests = [];
        let user;
        try {
          user = await preparePartnerUser(uid);
          tests.push({ stage: "Firebase authentication", ok: true, uid: user.uid });
        } catch (error) {
          tests.push({ stage: "Firebase authentication", ok: false, code: String(error?.code || ""), message: String(error?.message || error) });
          return { build: BRIDGE_VERSION, projectId: FIREBASE_PROJECT_ID, online: navigator.onLine, architecture: "user-tree-v7", tests };
        }
        try {
          await firestoreSdk.getDoc(partnerProfileRef(uid));
          tests.push({ stage: "Private Partner settings read", ok: true });
        } catch (error) {
          tests.push({ stage: "Private Partner settings read", ok: false, code: String(error?.code || ""), message: String(error?.message || error) });
          return { build: BRIDGE_VERSION, projectId: FIREBASE_PROJECT_ID, online: navigator.onLine, uid: user.uid, architecture: "user-tree-v7", tests };
        }
        const token = generateInviteToken();
        const ref = partnerInviteDocRef(uid, token);
        try {
          await firestoreSdk.setDoc(ref, { code: makePartnerCode(uid, token), token, ownerUid: uid, status: "open", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString(), diagnostic: true, schemaVersion: 7 });
          tests.push({ stage: "Private invite create", ok: true });
        } catch (error) {
          tests.push({ stage: "Private invite create", ok: false, code: String(error?.code || ""), message: String(error?.message || error) });
          return { build: BRIDGE_VERSION, projectId: FIREBASE_PROJECT_ID, online: navigator.onLine, uid: user.uid, architecture: "user-tree-v7", tests };
        }
        try {
          const snap = await firestoreSdk.getDoc(ref);
          tests.push({ stage: "Private invite get", ok: Boolean(snap.exists()) });
        } catch (error) {
          tests.push({ stage: "Private invite get", ok: false, code: String(error?.code || ""), message: String(error?.message || error) });
        }
        try {
          await firestoreSdk.deleteDoc(ref);
          tests.push({ stage: "Private invite cleanup", ok: true });
        } catch (error) {
          tests.push({ stage: "Private invite cleanup", ok: false, code: String(error?.code || ""), message: String(error?.message || error) });
        }
        return { build: BRIDGE_VERSION, projectId: FIREBASE_PROJECT_ID, online: navigator.onLine, uid: user.uid, architecture: "user-tree-v7", tests };
      }

      function watchPartner(uid, callback) {
        assertUser(uid);
        let profile = null, ownPointer = null, ownInvite = null, linkInvite = null;
        let profileLoaded = false, pointerLoaded = false;
        let ownInviteLoading = false, linkInviteLoading = false;
        let stopOwnInvite = () => {}, stopLinkInvite = () => {};

        const validOpenInvite = () => {
          if (!ownPointer?.token || !ownInvite || ownInvite.status !== "open") return false;
          const expiresAt = ownInvite.expiresAt ? new Date(ownInvite.expiresAt).getTime() : 0;
          return !expiresAt || expiresAt > Date.now();
        };
        const memberOf = invite => Boolean(invite && invite.status === "accepted" && (invite.ownerUid === uid || invite.acceptedUid === uid));
        const promotingAcceptedInvite = () => Boolean(!profile && ownInvite?.status === "accepted" && ownInvite.ownerUid === uid && ownInvite.acceptedUid);
        const publish = () => {
          // Do not emit a false "disconnected" state while Firestore is still
          // hydrating the documents that determine Partner Link membership.
          // The app treats connected:false as authoritative and would otherwise
          // stop Shared realtime and kick the user out of Shared mode on startup.
          if (!profileLoaded || !pointerLoaded) return;
          if (profile && linkInviteLoading) return;
          if (!profile && ownPointer?.token && ownInviteLoading) return;
          if (promotingAcceptedInvite()) return;
          if (profile && memberOf(linkInvite)) {
            callback({ connected: true, linkId: profile.linkId, partnerUid: profile.partnerUid, partnerName: profile.partnerName, partnerEmail: profile.partnerEmail });
            return;
          }
          if (!profile && validOpenInvite()) {
            callback({ connected: false, inviteCode: makePartnerCode(uid, cleanInviteToken(ownInvite.token || ownPointer.token)), inviteExpiresAt: ownInvite.expiresAt || "" });
            return;
          }
          callback({ connected: false });
        };

        const attachOwnInvite = pointer => {
          stopOwnInvite(); stopOwnInvite = () => {}; ownInvite = null; ownInviteLoading = false;
          const token = cleanInviteToken(pointer?.token || "");
          if (!token) return publish();
          ownInviteLoading = true;
          stopOwnInvite = firestoreSdk.onSnapshot(partnerInviteDocRef(uid, token), async snap => {
            ownInviteLoading = false;
            ownInvite = snap.exists() ? snap.data() : null;
            if (ownInvite?.status === "accepted" && ownInvite.ownerUid === uid && ownInvite.acceptedUid && !profile) {
              const now = new Date().toISOString();
              const code = ownInvite.code || makePartnerCode(uid, token);
              await firestoreSdk.setDoc(partnerProfileRef(uid), {
                linkId: code,
                ownerUid: uid,
                inviteToken: token,
                partnerUid: ownInvite.acceptedUid,
                partnerName: ownInvite.acceptedName || ownInvite.acceptedEmail?.split("@")[0] || "Partner",
                partnerEmail: ownInvite.acceptedEmail || "",
                connectedAt: now,
                schemaVersion: 7
              }).catch(() => {});
            }
            const expiresAt = ownInvite?.expiresAt ? new Date(ownInvite.expiresAt).getTime() : 0;
            if (ownInvite?.status === "open" && expiresAt && expiresAt <= Date.now()) {
              await firestoreSdk.updateDoc(partnerInviteDocRef(uid, token), { status: "cancelled", cancelledAt: new Date().toISOString() }).catch(() => {});
              await firestoreSdk.deleteDoc(partnerInviteStateRef(uid)).catch(() => {});
              ownInvite = null;
            }
            publish();
          }, error => {
            ownInviteLoading = false;
            console.warn("Hana Partner invite listener:", error);
            publish();
          });
        };

        const attachLinkInvite = linkId => {
          stopLinkInvite(); stopLinkInvite = () => {}; linkInvite = null; linkInviteLoading = false;
          if (!linkId) return publish();
          let parsed;
          try { parsed = parsePartnerCode(linkId); }
          catch {
            const ended = profile?.linkId || linkId;
            firestoreSdk.deleteDoc(partnerProfileRef(uid)).catch(() => {});
            profile = null;
            callback({ connected: false, disconnected: true, linkId: ended });
            return;
          }
          linkInviteLoading = true;
          stopLinkInvite = firestoreSdk.onSnapshot(partnerInviteDocRef(parsed.ownerUid, parsed.token), async snap => {
            linkInviteLoading = false;
            linkInvite = snap.exists() ? snap.data() : null;
            if (profile && !memberOf(linkInvite)) {
              const ended = profile.linkId || linkId;
              await firestoreSdk.deleteDoc(partnerProfileRef(uid)).catch(() => {});
              profile = null;
              callback({ connected: false, disconnected: true, linkId: ended });
              return;
            }
            publish();
          }, error => {
            linkInviteLoading = false;
            console.warn("Hana Partner membership listener:", error);
            // A listener error is not proof that the relationship ended. Keep a
            // known profile intact and let Firestore retry instead of tearing down
            // Shared mode because of a transient network/permission read failure.
            if (!profile) publish();
          });
        };

        const stopProfile = firestoreSdk.onSnapshot(partnerProfileRef(uid), snap => {
          profileLoaded = true;
          profile = snap.exists() ? snap.data() : null;
          attachLinkInvite(profile?.linkId || "");
          publish();
        }, error => {
          profileLoaded = true;
          console.warn("Hana Partner profile listener:", error);
          publish();
        });
        const stopPointer = firestoreSdk.onSnapshot(partnerInviteStateRef(uid), snap => {
          pointerLoaded = true;
          ownPointer = snap.exists() ? snap.data() : null;
          attachOwnInvite(ownPointer);
          publish();
        }, error => {
          pointerLoaded = true;
          console.warn("Hana Partner invite-state listener:", error);
          publish();
        });
        return () => { stopProfile(); stopPointer(); stopOwnInvite(); stopLinkInvite(); };
      }

      const granularFieldForType = type => type === "list" ? "listItems" : type === "table" ? "tableRows" : "";
      const childArrayForType = type => type === "list" ? "items" : type === "table" ? "rows" : "";
      const safeChildFieldKey = value => encodeURIComponent(String(value || "")).replaceAll(".", "%2E");
      const stripWireOrder = value => { const copy={...(value||{})}; delete copy.__hanaOrder; return copy; };
      const splitGranularData = (type, rawData={}) => {
        const data={...(rawData||{})};
        const arrayField=childArrayForType(type), granularField=granularFieldForType(type);
        if(!arrayField||!granularField)return {data,granularField:"",children:{}};
        const rows=Array.isArray(data[arrayField])?data[arrayField]:[];
        delete data[arrayField];
        const children={};
        rows.forEach((item,index)=>{
          if(!item?.id)return;
          children[safeChildFieldKey(item.id)]={...item,__hanaOrder:index};
        });
        return {data,granularField,children};
      };
      const hydrateGranularData = value => {
        const type=value.type||"";
        const data={...(value.data||{})};
        const arrayField=childArrayForType(type), granularField=granularFieldForType(type);
        if(arrayField&&granularField&&value[granularField]&&typeof value[granularField]==="object"){
          data[arrayField]=Object.values(value[granularField])
            .sort((a,b)=>Number(a?.__hanaOrder||0)-Number(b?.__hanaOrder||0))
            .map(stripWireOrder);
        }
        return data;
      };

      function watchSharedItems(linkId, callback) {
        let first=true;
        return firestoreSdk.onSnapshot(sharedItemsRef(linkId), snapshot => {
          const docs=snapshot.docs.map(snap=>{
            const value=snap.data();
            const hydrated=hydrateGranularData(value);
            return {key:snap.id,type:value.type||"",itemId:value.itemId||"",data:hydrated,ownerUid:value.ownerUid||hydrated?.sharedOwnerUid||"",ownerName:value.ownerName||hydrated?.sharedOwnerName||"",updatedByUid:value.updatedByUid||"",updatedByName:value.updatedByName||""};
          });
          callback({docs,initial:first}); first=false;
        }, error => console.warn("Hana Partner Link listener:",error));
      }

      async function syncSharedChanges(linkId, changes=[]) {
        if(!changes.length)return true;
        // Keep list items and tracker rows as individual map fields inside their
        // shared document. Different rows/items can then update without replacing
        // the whole array, greatly reducing couple-edit conflicts.
        const chunkSize=350;
        for(let start=0;start<changes.length;start+=chunkSize){
          const batch=firestoreSdk.writeBatch(db);
          changes.slice(start,start+chunkSize).forEach(change=>{
            const ref=sharedItemRef(linkId,change.key);
            if(change.action==="delete"){batch.delete(ref);return;}
            const ownerUid=change.ownerUid||change.data?.sharedOwnerUid||"";
            const ownerName=change.ownerName||change.data?.sharedOwnerName||"";
            const current=splitGranularData(change.type,change.data||{});
            const previous=change.previousData?splitGranularData(change.type,change.previousData):null;
            const base={type:change.type,itemId:change.itemId,data:current.data,ownerUid,ownerName,updatedByUid:change.updatedByUid||"",updatedByName:change.updatedByName||"",serverUpdatedAt:firestoreSdk.serverTimestamp(),structureVersion:2};
            if(!previous){
              if(current.granularField)base[current.granularField]=current.children;
              batch.set(ref,base);
              return;
            }

            // Existing shared entries are patched field-by-field instead of
            // replacing the whole data object. This lets two partners safely edit
            // different fields at nearly the same time without needless last-write
            // replacement of unrelated values.
            const patch={
              type:change.type,
              itemId:change.itemId,
              ownerUid,
              ownerName,
              updatedByUid:change.updatedByUid||"",
              updatedByName:change.updatedByName||"",
              serverUpdatedAt:firestoreSdk.serverTimestamp(),
              structureVersion:2
            };
            const dataKeys=new Set([...Object.keys(previous.data||{}),...Object.keys(current.data||{})]);
            dataKeys.forEach(key=>{
              const before=previous.data?.[key],after=current.data?.[key];
              if(JSON.stringify(before)===JSON.stringify(after))return;
              const field=`data.${key}`;
              if(!Object.prototype.hasOwnProperty.call(current.data||{},key))patch[field]=firestoreSdk.deleteField();
              else patch[field]=after;
            });
            if(current.granularField){
              const allKeys=new Set([...Object.keys(previous.children),...Object.keys(current.children)]);
              allKeys.forEach(key=>{
                const before=previous.children[key],after=current.children[key];
                const field=`${current.granularField}.${key}`;
                if(!after)patch[field]=firestoreSdk.deleteField();
                else if(!before||JSON.stringify(before)!==JSON.stringify(after))patch[field]=after;
              });
            }
            batch.update(ref,patch);
          });
          await batch.commit();
        }
        return true;
      }

      Object.assign(window.HanaFirebase, {
        available: true,
        error: null,
        auth,
        db,
        async createEmailAccount(email, password) {
          const result = await authSdk.createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(result.user).catch(() => {});
          return publicUser(result.user);
        },
        async signInEmail(email, password) {
          const result = await authSdk.signInWithEmailAndPassword(auth, email, password);
          await updateProfile(result.user).catch(() => {});
          return publicUser(result.user);
        },
        async signInGoogle() {
          try {
            const result = await authSdk.signInWithPopup(auth, googleProvider);
            await updateProfile(result.user).catch(() => {});
            return publicUser(result.user);
          } catch (error) {
            if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(error?.code)) {
              sessionStorage.setItem("hana_google_redirect_pending", "1");
              await authSdk.signInWithRedirect(auth, googleProvider);
              return null;
            }
            throw error;
          }
        },
        async resetPassword(email) {
          await authSdk.sendPasswordResetEmail(auth, email);
          return true;
        },
        async signOut() {
          await authSdk.signOut(auth);
          return true;
        },
        getCloudMeta,
        backupSnapshot,
        restoreSnapshot,
        createPartnerInvite,
        acceptPartnerInvite,
        cancelPartnerInvite,
        disconnectPartner,
        diagnosePartner,
        validatePartnerCode,
        watchPartner,
        watchSharedItems,
        syncSharedChanges
      });

      authSdk.onAuthStateChanged(auth, user => {
        window.HanaFirebase.user = publicUser(user);
        window.dispatchEvent(new CustomEvent("hana:auth-changed", { detail: window.HanaFirebase.user }));
      });

      try {
        const redirect = await authSdk.getRedirectResult(auth);
        if (redirect?.user) {
          await updateProfile(redirect.user).catch(() => {});
          sessionStorage.removeItem("hana_google_redirect_pending");
        }
      } catch (error) {
        console.warn("Hana Google redirect result:", error);
      }

      window.dispatchEvent(new CustomEvent("hana:firebase-ready"));
      return window.HanaFirebase;
    } catch (error) {
      console.error("Hana Firebase could not initialize:", error);
      window.HanaFirebase.available = false;
      window.HanaFirebase.error = error;
      window.dispatchEvent(new CustomEvent("hana:firebase-unavailable", { detail: { message: error?.message || "Firebase unavailable" } }));
      return window.HanaFirebase;
    }
  })();
})();
