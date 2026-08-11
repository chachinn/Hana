/* =====================================================
   HANA 🌸 Firebase bridge v1.9
   Optional Authentication + Cloud Backup
   ===================================================== */

(() => {
  const SDK_VERSION = "12.16.0";
  const CHUNK_BYTES = 240000;

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
    async restoreSnapshot() { throw new Error("Firebase is still loading."); }
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
      const db = firestoreSdk.getFirestore(app);
      const googleProvider = new authSdk.GoogleAuthProvider();
      googleProvider.setCustomParameters({ prompt: "select_account" });

      await authSdk.setPersistence(auth, authSdk.browserLocalPersistence).catch(() => {});

      const assertUser = uid => {
        const current = auth.currentUser;
        if (!current || current.uid !== uid) throw new Error("Please sign in to this Hana account first.");
        return current;
      };

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
        restoreSnapshot
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
