/* =====================================================
   HANA 🌸 Firebase bridge v2.0.4 — Accounts, Cloud Backup & Partner Link
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
    async restoreSnapshot() { throw new Error("Firebase is still loading."); },
    async createPartnerInvite() { throw new Error("Firebase is still loading."); },
    async probePartnerRules() { throw new Error("Firebase is still loading."); },
    async acceptPartnerInvite() { throw new Error("Firebase is still loading."); },
    async cancelPartnerInvite() { throw new Error("Firebase is still loading."); },
    async disconnectPartner() { throw new Error("Firebase is still loading."); },
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
      const partnerInviteRef = code => firestoreSdk.doc(db, "partnerInvites", code);
      const partnerLinkRef = linkId => firestoreSdk.doc(db, "partnerLinks", linkId);
      const sharedItemsRef = linkId => firestoreSdk.collection(db, "partnerLinks", linkId, "items");
      const sharedItemRef = (linkId, key) => firestoreSdk.doc(db, "partnerLinks", linkId, "items", key);
      const cleanCode = value => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const inviteAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const generateInviteCode = () => {
        const bytes = new Uint8Array(8); crypto.getRandomValues(bytes);
        return Array.from(bytes, value => inviteAlphabet[value % inviteAlphabet.length]).join("");
      };

      const isPartnerPermissionError = error => {
        const code = String(error?.code || "").toLowerCase();
        const message = String(error?.message || error || "");
        return code.includes("permission-denied") || /missing or insufficient permissions/i.test(message);
      };
      const rethrowPartnerPermission = (error, stage = "Partner Link") => {
        if (isPartnerPermissionError(error)) {
          throw new Error(`${stage} was blocked by Firestore. Publish the v2.0.4 Partner Link firestore.rules in Firebase → Firestore Database → Rules, wait about a minute, then try again.`);
        }
        throw error;
      };

      async function probePartnerRules(uid) {
        assertUser(uid);
        const probeCode = `HPRB${generateInviteCode().slice(0, 4)}`;
        const probeRef = partnerInviteRef(probeCode);
        const now = new Date().toISOString();
        const probe = {
          code: probeCode,
          ownerUid: uid,
          ownerName: "Hana rules probe",
          ownerEmail: "",
          status: "open",
          createdAt: now,
          expiresAt: now,
          probe: true
        };
        try {
          // A single-document GET on a missing code verifies the read rule without
          // needing any existing Partner Link data.
          await firestoreSdk.getDoc(partnerInviteRef("HANA_RULES_PROBE"));
        } catch (error) {
          rethrowPartnerPermission(error, "Reading the Partner invite collection");
        }
        try {
          await firestoreSdk.setDoc(probeRef, probe);
        } catch (error) {
          rethrowPartnerPermission(error, "Writing the Partner invite collection");
        }
        try {
          await firestoreSdk.deleteDoc(probeRef);
        } catch (error) {
          // A stranded probe is harmless and expires immediately, but surface the
          // permission mismatch because owner cleanup should be allowed.
          rethrowPartnerPermission(error, "Cleaning up the Partner rule test");
        }
        return true;
      }

      async function createPartnerInvite(uid, displayName = "") {
        const user = assertUser(uid);
        let profileSnap, pointerSnap;
        try {
          profileSnap = await firestoreSdk.getDoc(partnerProfileRef(uid));
          pointerSnap = await firestoreSdk.getDoc(partnerInviteStateRef(uid));
        } catch (error) {
          rethrowPartnerPermission(error, "Reading your private Partner Link settings");
        }
        if (profileSnap.exists()) throw new Error("This Hana account already has a Partner Link.");
        if (pointerSnap.exists() && pointerSnap.data().code) {
          try {
            const existingInvite = await firestoreSdk.getDoc(partnerInviteRef(pointerSnap.data().code));
            if (existingInvite.exists() && existingInvite.data().status === "open") {
              const expiresAt = existingInvite.data().expiresAt ? new Date(existingInvite.data().expiresAt).getTime() : 0;
              if (!expiresAt || expiresAt > Date.now()) return existingInvite.data();
              await firestoreSdk.updateDoc(partnerInviteRef(pointerSnap.data().code), {
                status: "cancelled",
                cancelledAt: new Date().toISOString()
              }).catch(() => {});
            }
          } catch (error) {
            rethrowPartnerPermission(error, "Reading your previous Partner invite");
          }
        }

        // Verify both Partner invite read + write rules before creating a real code.
        // This gives a precise error instead of Firestore's generic permission text.
        await probePartnerRules(uid);

        // Do NOT pre-read random candidate codes. An 8-character code from this
        // alphabet has roughly a trillion possible values; a collision is vastly
        // less likely than a permission/cache failure. More importantly, the old
        // pre-read was outside the guarded create step and was the source of the
        // raw "Missing or insufficient permissions" message.
        const code = generateInviteCode();
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        const data = {
          code,
          ownerUid: uid,
          ownerName: displayName || user.displayName || user.email?.split("@")[0] || "Hana user",
          ownerEmail: user.email || "",
          status: "open",
          createdAt: createdAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          schemaVersion: 4
        };
        try {
          await firestoreSdk.setDoc(partnerInviteRef(code), data);
        } catch (error) {
          rethrowPartnerPermission(error, "Creating the Partner invite");
        }
        try {
          await firestoreSdk.setDoc(partnerInviteStateRef(uid), {
            code,
            updatedAt: createdAt.toISOString(),
            schemaVersion: 4
          });
        } catch (error) {
          await firestoreSdk.deleteDoc(partnerInviteRef(code)).catch(() => {});
          rethrowPartnerPermission(error, "Saving the invite to your Hana account");
        }
        return data;
      }

      async function acceptPartnerInvite(uid, rawCode, displayName = "") {
        const user = assertUser(uid), code = cleanCode(rawCode);
        if (!code) throw new Error("Enter a valid Partner Link code.");
        let ownProfile, ownInvitePointer;
        try {
          ownProfile = await firestoreSdk.getDoc(partnerProfileRef(uid));
          ownInvitePointer = await firestoreSdk.getDoc(partnerInviteStateRef(uid));
        } catch (error) {
          rethrowPartnerPermission(error, "Reading your private Partner Link settings");
        }
        if (ownProfile.exists()) throw new Error("This Hana account is already connected to a partner.");
        if (ownInvitePointer.exists() && ownInvitePointer.data().code) {
          const ownInvite = await firestoreSdk.getDoc(partnerInviteRef(ownInvitePointer.data().code));
          if (ownInvite.exists() && ownInvite.data().status === "open") {
            throw new Error("Cancel your current Partner Link invite before joining someone else's link.");
          }
        }

        let inviteSnap;
        try {
          inviteSnap = await firestoreSdk.getDoc(partnerInviteRef(code));
        } catch (error) {
          rethrowPartnerPermission(error, "Reading the Partner invite");
        }
        if (!inviteSnap.exists()) throw new Error("That Partner Link code was not found.");
        let invite = inviteSnap.data();
        if (invite.ownerUid === uid) throw new Error("Use this code on your partner's Hana account.");
        if (invite.status === "cancelled") throw new Error("That Partner Link code was cancelled.");
        if (invite.status === "accepted" && invite.acceptedUid !== uid) throw new Error("That Partner Link code has already been used.");
        if (!['open','accepted'].includes(invite.status)) throw new Error("That Partner Link code is no longer available.");
        if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) throw new Error("That Partner Link code has expired. Ask for a new one.");

        const linkId = code;
        const partnerName = invite.ownerName || invite.ownerEmail?.split("@")[0] || "Partner";
        const myName = displayName || user.displayName || user.email?.split("@")[0] || "Hana user";
        const now = new Date().toISOString();

        // Step 1: create (or verify) the shared link while the invite is still open.
        // This avoids a cross-document atomic batch and makes retries recoverable.
        let linkSnap = null;
        try {
          linkSnap = await firestoreSdk.getDoc(partnerLinkRef(linkId));
        } catch (error) {
          // A missing link may be denied by member-only read rules, which is fine
          // before creation. The create attempt below is authoritative.
          if (!isPartnerPermissionError(error)) throw error;
        }
        if (linkSnap?.exists()) {
          const existing = linkSnap.data();
          if (!Array.isArray(existing.members) || !existing.members.includes(uid) || !existing.members.includes(invite.ownerUid)) {
            throw new Error("That Partner Link code is already attached to another connection.");
          }
        } else {
          try {
            await firestoreSdk.setDoc(partnerLinkRef(linkId), {
              linkId,
              members: [invite.ownerUid, uid],
              status: "active",
              createdAt: now,
              memberProfiles: [
                { uid: invite.ownerUid, name: partnerName },
                { uid, name: myName }
              ],
              schemaVersion: 4
            });
          } catch (error) {
            rethrowPartnerPermission(error, "Creating the shared Partner Link");
          }
        }

        // Step 2: mark the invitation accepted. On a retry by the same recipient,
        // this is already complete and we simply continue.
        if (invite.status === "open") {
          try {
            await firestoreSdk.updateDoc(partnerInviteRef(code), {
              status: "accepted",
              acceptedUid: uid,
              acceptedName: myName,
              acceptedEmail: user.email || "",
              acceptedAt: now,
              linkId
            });
          } catch (error) {
            rethrowPartnerPermission(error, "Accepting the Partner invite");
          }
          invite = { ...invite, status: "accepted", acceptedUid: uid, linkId };
        }

        // Step 3: save the recipient's private pointer. The owner creates their own
        // private pointer from the accepted-invite listener, so neither user ever
        // writes inside the other user's /users/{uid} tree.
        try {
          await firestoreSdk.setDoc(partnerProfileRef(uid), {
            linkId,
            partnerUid: invite.ownerUid,
            partnerName,
            partnerEmail: invite.ownerEmail || "",
            connectedAt: now,
            schemaVersion: 4
          });
        } catch (error) {
          rethrowPartnerPermission(error, "Saving Partner Link to your Hana account");
        }
        return { linkId, partnerUid: invite.ownerUid, partnerName, partnerEmail: invite.ownerEmail || "" };
      }

      async function cancelPartnerInvite(uid, rawCode) {
        assertUser(uid); const code=cleanCode(rawCode); if(!code)return;
        const snap=await firestoreSdk.getDoc(partnerInviteRef(code));
        if(snap.exists()&&snap.data().ownerUid===uid&&snap.data().status==="open")await firestoreSdk.updateDoc(partnerInviteRef(code),{status:"cancelled",cancelledAt:new Date().toISOString()});
        await firestoreSdk.deleteDoc(partnerInviteStateRef(uid)).catch(()=>{});
      }

      async function disconnectPartner(uid, linkId) {
        assertUser(uid);
        const snap=await firestoreSdk.getDoc(partnerLinkRef(linkId));
        if(snap.exists()&&Array.isArray(snap.data().members)&&snap.data().members.includes(uid))await firestoreSdk.updateDoc(partnerLinkRef(linkId),{status:"disconnected",disconnectedAt:new Date().toISOString(),disconnectedBy:uid});
        await firestoreSdk.deleteDoc(partnerProfileRef(uid)).catch(()=>{});
        await firestoreSdk.deleteDoc(partnerInviteStateRef(uid)).catch(()=>{});
      }

      function watchPartner(uid, callback) {
        assertUser(uid);
        let profile=null, invitePointer=null, invite=null, link=null;
        let stopInvite=()=>{}, stopLink=()=>{};
        const inviteUsable=()=>{
          if(!invitePointer||invite?.status!=="open")return false;
          if(!invite?.expiresAt)return true;
          const expiresAt=new Date(invite.expiresAt).getTime();
          return !Number.isFinite(expiresAt)||expiresAt>Date.now();
        };
        const publish=()=>{
          if(profile&&link?.status==="active") return callback({connected:true,linkId:profile.linkId,partnerUid:profile.partnerUid,partnerName:profile.partnerName,partnerEmail:profile.partnerEmail});
          if(inviteUsable()) return callback({connected:false,inviteCode:invitePointer.code,inviteExpiresAt:invite.expiresAt||""});
          callback({connected:false});
        };
        const attachLink=linkId=>{
          stopLink();stopLink=()=>{};link=null;
          if(!linkId)return publish();
          stopLink=firestoreSdk.onSnapshot(partnerLinkRef(linkId),async snap=>{
            link=snap.exists()?snap.data():null;
            if(profile&&(!link||link.status!=="active")){
              const endedLinkId=profile.linkId||linkId;
              await firestoreSdk.deleteDoc(partnerProfileRef(uid)).catch(()=>{});
              profile=null;
              callback({connected:false,disconnected:true,linkId:endedLinkId});
              return;
            }
            publish();
          },()=>publish());
        };
        const attachInvite=code=>{stopInvite();stopInvite=()=>{};invite=null;if(!code)return publish();stopInvite=firestoreSdk.onSnapshot(partnerInviteRef(code),async snap=>{
          invite=snap.exists()?snap.data():null;
          if(invite?.status==="accepted"&&invite.ownerUid===uid&&!profile){const now=new Date().toISOString();await firestoreSdk.setDoc(partnerProfileRef(uid),{linkId:invite.linkId||code,partnerUid:invite.acceptedUid,partnerName:invite.acceptedName||invite.acceptedEmail?.split("@")[0]||"Partner",partnerEmail:invite.acceptedEmail||"",connectedAt:now});}
          const expiresAt=invite?.expiresAt?new Date(invite.expiresAt).getTime():0;
          if(invite?.status==="open"&&invite.ownerUid===uid&&expiresAt&&expiresAt<=Date.now()){
            await firestoreSdk.updateDoc(partnerInviteRef(code),{status:"cancelled",cancelledAt:new Date().toISOString()}).catch(()=>{});
            await firestoreSdk.deleteDoc(partnerInviteStateRef(uid)).catch(()=>{});
            invite=null;
          }
          publish();
        },()=>publish());};
        const stopProfile=firestoreSdk.onSnapshot(partnerProfileRef(uid),snap=>{profile=snap.exists()?snap.data():null;attachLink(profile?.linkId||"");publish();},()=>publish());
        const stopPointer=firestoreSdk.onSnapshot(partnerInviteStateRef(uid),snap=>{invitePointer=snap.exists()?snap.data():null;attachInvite(invitePointer?.code||"");publish();},()=>publish());
        return ()=>{stopProfile();stopPointer();stopInvite();stopLink();};
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
        probePartnerRules,
        acceptPartnerInvite,
        cancelPartnerInvite,
        disconnectPartner,
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
