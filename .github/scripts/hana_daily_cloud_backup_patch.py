from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)

app_path = Path("app.js")
index_path = Path("index.html")
sw_path = Path("service-worker.js")
app = app_path.read_text()
index = index_path.read_text()
sw = sw_path.read_text()

app = replace_once(app,
'''   HANA 🌸 Version 2 · internal build 2.0.38
   Mixed Documents + connected Smart Sort''',
'''   HANA 🌸 Version 2 · internal build 2.0.39
   Daily 8 AM cloud backup + provider-neutral account safety''',
"app header")

app = replace_once(app,
'''const LAST_EXPORT_KEY = "hana_last_export_at_v1";
const MAX_SAFETY_SNAPSHOTS = 6;''',
'''const LAST_EXPORT_KEY = "hana_last_export_at_v1";
const CLOUD_AUTO_BACKUP_META_KEY = "hana_cloud_auto_backup_meta_v1";
const CLOUD_BACKUP_BASELINE_KEY = "hana_cloud_backup_baseline_v1";
const CLOUD_AUTO_BACKUP_HOUR = 8;
const CLOUD_AUTO_BACKUP_CHECK_INTERVAL = 60 * 1000;
const CLOUD_AUTO_BACKUP_RETRY_GUARD = 5 * 60 * 1000;
const MAX_SAFETY_SNAPSHOTS = 6;''',
"cloud backup constants")

old_release = '''const HANA_APP_VERSION = "2.0.38";
const HANA_DISPLAY_VERSION = "2";
const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 14, 2026",
  title: "One document, many useful pieces 🧩",
  intro: "Smart Sort can now understand a document that contains several clearly labeled structures, turn each section into the right Hana object, and keep the results connected in one Memory Thread.",
  items: [
    { icon:"🧩", title:"Mixed Documents", text:"A single paste can contain meeting minutes, expenses, packing, project plans, trackers and other strong sections. Hana separates only when it sees at least two clear top-level structures." },
    { icon:"🧵", title:"The pieces stay connected", text:"Objects created from one mixed document are linked automatically in a Memory Thread so their original context is not lost." },
    { icon:"📄", title:"Works with local file import", text:"TXT, Markdown, CSV, TSV, JSON and HTML loaded into Brain Dump can use the same mixed-document understanding after you review the extracted text." },
    { icon:"🌿", title:"Conservative and bounded", text:"Meeting action items and project tasks stay inside their parent sections, skincare still gets first priority, and mixed imports are capped to protect iPhone smoothness." }
  ]
};'''
new_release = '''const HANA_APP_VERSION = "2.0.39";
const HANA_DISPLAY_VERSION = "2";
const HANA_RELEASE_NOTES = {
  version: HANA_DISPLAY_VERSION,
  date: "August 14, 2026",
  title: "A quieter cloud safety net ☁️",
  intro: "Signed-in Hana accounts can now keep one automatic cloud backup per day after 8:00 AM local time, using the same safe backup path for Google and email sign-in.",
  items: [
    { icon:"☁️", title:"Daily cloud backup", text:"After 8:00 AM local time, Hana makes one cloud backup for the day when the app is able to run. If Hana was closed or suspended at 8:00 AM, it catches up the next time you open it after 8." },
    { icon:"G", title:"Google sign-in", text:"Google-authenticated Hana accounts use the same automatic cloud-backup scheduler and Firestore backup path." },
    { icon:"✉️", title:"Email sign-in", text:"Email/password Hana accounts receive the same daily automatic cloud backup behavior—there is no separate or weaker backup mode." },
    { icon:"🛡️", title:"Safer on multiple devices", text:"A device that finds an existing cloud backup must be confirmed once with Back up Hana now or Restore from cloud before it can automatically replace that cloud copy." }
  ]
};'''
app = replace_once(app, old_release, new_release, "release notes")

cloud_helpers_anchor = '''function renderAccountSettingsCard(){'''
cloud_helpers = '''function readCloudAutoBackupMeta(){
  try{return JSON.parse(localStorage.getItem(CLOUD_AUTO_BACKUP_META_KEY)||"{}")||{};}catch{return {};}
}
function writeCloudAutoBackupMeta(patch={}){
  const next={...readCloudAutoBackupMeta(),...patch};
  try{localStorage.setItem(CLOUD_AUTO_BACKUP_META_KEY,JSON.stringify(next));}catch{}
  return next;
}
function readCloudBackupBaseline(){
  try{return JSON.parse(localStorage.getItem(CLOUD_BACKUP_BASELINE_KEY)||"{}")||{};}catch{return {};}
}
function markCloudBackupBaseline(uid){
  if(!uid)return;
  try{localStorage.setItem(CLOUD_BACKUP_BASELINE_KEY,JSON.stringify({uid,ready:true,confirmedAt:Date.now()}));}catch{}
}
function cloudBackupBaselineReady(user=hanaAccountState.user){
  if(!user?.uid)return false;
  const baseline=readCloudBackupBaseline();
  return baseline.uid===user.uid&&baseline.ready===true;
}
function cloudAutoBackupLabel(user=hanaAccountState.user){
  if(!user?.uid)return "Sign in to enable";
  const meta=readCloudAutoBackupMeta();
  if(meta.uid===user.uid&&Number(meta.lastSuccessAt||0)){
    const date=new Date(Number(meta.lastSuccessAt));
    if(!Number.isNaN(date.getTime()))return `On · last automatic backup ${date.toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}`;
  }
  if(hanaAccountState.meta&&!cloudBackupBaselineReady(user))return "Needs one-time device confirmation";
  return "On · daily after 8:00 AM";
}
function cloudAutoBackupHelp(user=hanaAccountState.user){
  if(user?.uid&&hanaAccountState.meta&&!cloudBackupBaselineReady(user))return "For data safety, confirm this device once with Back up Hana now or Restore from cloud. Daily automatic backups start after that.";
  return "Works with Google and email sign-in. If Hana is closed or suspended at 8:00 AM, it catches up the next time you open it after 8:00 AM.";
}

function renderAccountSettingsCard(){'''
app = replace_once(app, cloud_helpers_anchor, cloud_helpers, "cloud helper insertion")

old_signed = '''  return `<section id="hanaAccountSection" class="section settings-section"><div class="section-header"><h2>Hana Account</h2></div><div class="settings-card account-settings-card"><div class="account-settings-heading"><div class="account-avatar">${user.photoURL?`<img src="${escapeHTML(user.photoURL)}" alt="" referrerpolicy="no-referrer" />`:"🌸"}</div><div><h3>${escapeHTML(accountDisplayName(user))}</h3><p>${escapeHTML(user.email||"Signed in")}</p></div><span class="account-signed-badge">Signed in</span></div><div class="cloud-backup-status"><span>☁️ Cloud backup</span><strong>${escapeHTML(cloudMetaLabel())}</strong>${hanaAccountState.meta?.sizeBytes?`<small>${Math.max(1,Math.round(Number(hanaAccountState.meta.sizeBytes)/1024))} KB · ${Number(hanaAccountState.meta.chunkCount||1)} cloud part${Number(hanaAccountState.meta.chunkCount||1)===1?"":"s"}</small>`:""}</div><div class="data-actions backup-actions"><button class="primary-button" data-cloud-backup-now>Back up Hana now</button><button class="secondary-button" data-cloud-restore-now ${hanaAccountState.meta?"":"disabled"}>Restore from cloud</button><button class="secondary-button" data-refresh-cloud-meta>Refresh status</button><button class="text-button danger-text" data-auth-signout>Sign out</button></div><small class="field-help">Cloud backup stores your Hana data in Firestore under your account. Wallpaper photos stay local; use Export full backup if you also want the wallpaper in your backup file.</small></div></section>`;'''
new_signed = '''  return `<section id="hanaAccountSection" class="section settings-section"><div class="section-header"><h2>Hana Account</h2></div><div class="settings-card account-settings-card"><div class="account-settings-heading"><div class="account-avatar">${user.photoURL?`<img src="${escapeHTML(user.photoURL)}" alt="" referrerpolicy="no-referrer" />`:"🌸"}</div><div><h3>${escapeHTML(accountDisplayName(user))}</h3><p>${escapeHTML(user.email||"Signed in")}</p></div><span class="account-signed-badge">Signed in</span></div><div class="cloud-backup-status"><span>☁️ Cloud backup</span><strong>${escapeHTML(cloudMetaLabel())}</strong>${hanaAccountState.meta?.sizeBytes?`<small>${Math.max(1,Math.round(Number(hanaAccountState.meta.sizeBytes)/1024))} KB · ${Number(hanaAccountState.meta.chunkCount||1)} cloud part${Number(hanaAccountState.meta.chunkCount||1)===1?"":"s"}</small>`:""}</div><div class="cloud-backup-status"><span>🔄 Daily automatic backup</span><strong>${escapeHTML(cloudAutoBackupLabel(user))}</strong><small>${escapeHTML(cloudAutoBackupHelp(user))}</small></div><div class="data-actions backup-actions"><button class="primary-button" data-cloud-backup-now>Back up Hana now</button><button class="secondary-button" data-cloud-restore-now ${hanaAccountState.meta?"":"disabled"}>Restore from cloud</button><button class="secondary-button" data-refresh-cloud-meta>Refresh status</button><button class="text-button danger-text" data-auth-signout>Sign out</button></div><small class="field-help">Cloud backup stores your Hana data in Firestore under your account. Wallpaper photos stay local; use Export full backup if you also want the wallpaper in your backup file.</small></div></section>`;'''
app = replace_once(app, old_signed, new_signed, "signed-in account card")

old_backup = '''async function backupHanaToCloud(options={}){
  const user=hanaAccountState.user;if(!user){openModal("accountWelcomeModal");return false;}
  if(cloudOperationBusy)return false;
  if(options.confirmReplace&&hanaAccountState.meta&&!confirm("Replace your existing Hana cloud backup with the data on this device?"))return false;
  cloudOperationBusy=true;showToast("Backing up Hana to cloud…");
  try{
    const fb=await firebaseReady();
    const meta=await fb.backupSnapshot(user.uid,buildCloudBackupPayload());
    hanaAccountState.meta=meta;
    showToast("Hana cloud backup updated ☁️🌸");
    if(state.currentPage==="settings")renderSettings();
    return true;
  }catch(error){console.error("Cloud backup failed:",error);showToast(firebaseFriendlyError(error));return false;}
  finally{cloudOperationBusy=false;}
}'''
new_backup = '''async function backupHanaToCloud(options={}){
  const user=hanaAccountState.user;if(!user){if(!options.quiet)openModal("accountWelcomeModal");return false;}
  if(cloudOperationBusy)return false;
  if(options.confirmReplace&&hanaAccountState.meta&&!confirm("Replace your existing Hana cloud backup with the data on this device?"))return false;
  cloudOperationBusy=true;if(!options.quiet)showToast("Backing up Hana to cloud…");
  try{
    const fb=await firebaseReady();
    const meta=await fb.backupSnapshot(user.uid,buildCloudBackupPayload());
    hanaAccountState.meta=meta;
    if(options.source!=="auto")markCloudBackupBaseline(user.uid);
    if(!options.quiet)showToast("Hana cloud backup updated ☁️🌸");
    if(state.currentPage==="settings")renderSettings();
    return true;
  }catch(error){console.error("Cloud backup failed:",error);if(!options.quiet)showToast(firebaseFriendlyError(error));return false;}
  finally{cloudOperationBusy=false;}
}

async function maybeRunAutomaticCloudBackup(options={}){
  const user=hanaAccountState.user;
  if(!user?.uid||hanaAccountState.status!=="ready"||cloudOperationBusy||!navigator.onLine)return false;
  const now=options.now instanceof Date?options.now:new Date();
  if(now.getHours()<CLOUD_AUTO_BACKUP_HOUR)return false;
  const localDay=localDateISO(now);
  const autoMeta=readCloudAutoBackupMeta();
  if(autoMeta.uid===user.uid&&autoMeta.lastSuccessDate===localDay)return true;
  if(hanaAccountState.meta&&!cloudBackupBaselineReady(user))return false;
  const realNow=Date.now();
  if(!options.force&&autoMeta.uid===user.uid&&Number(autoMeta.lastAttemptAt||0)&&realNow-Number(autoMeta.lastAttemptAt)<CLOUD_AUTO_BACKUP_RETRY_GUARD)return false;
  writeCloudAutoBackupMeta({uid:user.uid,lastAttemptAt:realNow,lastAttemptDate:localDay});
  const success=await backupHanaToCloud({confirmReplace:false,quiet:true,source:"auto"});
  if(!success)return false;
  markCloudBackupBaseline(user.uid);
  writeCloudAutoBackupMeta({uid:user.uid,lastSuccessDate:localDay,lastSuccessAt:Date.now(),lastAttemptAt:realNow,lastAttemptDate:localDay});
  if(state.currentPage==="settings")renderSettings();
  if(options.showToast!==false&&document.visibilityState==="visible")showToast("Daily Hana cloud backup saved ☁️🌸");
  return true;
}'''
app = replace_once(app, old_backup, new_backup, "backup function and scheduler")

app = replace_once(app,
'''    hanaAccountState.meta=restored.meta;
    await applyAppearance();''',
'''    hanaAccountState.meta=restored.meta;
    markCloudBackupBaseline(user.uid);
    await applyAppearance();''',
"restore baseline")

old_auth = '''    let pending=authActionPending;try{pending=pending||sessionStorage.getItem("hana_auth_flow_pending")==="1";}catch{}
    if(pending){authActionPending=false;try{sessionStorage.removeItem("hana_auth_flow_pending");}catch{};setTimeout(openCloudChoiceForUser,100);}'''
new_auth = '''    let pending=authActionPending;try{pending=pending||sessionStorage.getItem("hana_auth_flow_pending")==="1";}catch{}
    if(pending){authActionPending=false;try{sessionStorage.removeItem("hana_auth_flow_pending");}catch{};setTimeout(openCloudChoiceForUser,100);}
    else setTimeout(()=>maybeRunAutomaticCloudBackup({showToast:false}).catch(()=>{}),120);'''
app = replace_once(app, old_auth, new_auth, "auth auto backup hook")

old_start = '''window.addEventListener("online",()=>checkHanaUpdateAvailability({force:true}).catch(()=>{}));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){refreshSkincareQuickButton();refreshPackingQuickButton();}});
setInterval(()=>{
  if(document.visibilityState==="visible")checkHanaUpdateAvailability().catch(()=>{});
},HANA_UPDATE_CHECK_INTERVAL);

setInterval(checkReminders,30*1000);checkReminders();'''
new_start = '''window.addEventListener("online",()=>{checkHanaUpdateAvailability({force:true}).catch(()=>{});maybeRunAutomaticCloudBackup({showToast:false}).catch(()=>{});});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){refreshSkincareQuickButton();refreshPackingQuickButton();maybeRunAutomaticCloudBackup({showToast:false}).catch(()=>{});}});
setInterval(()=>{
  if(document.visibilityState==="visible")checkHanaUpdateAvailability().catch(()=>{});
},HANA_UPDATE_CHECK_INTERVAL);
setInterval(()=>{
  if(document.visibilityState==="visible")maybeRunAutomaticCloudBackup({showToast:false}).catch(()=>{});
},CLOUD_AUTO_BACKUP_CHECK_INTERVAL);

setInterval(checkReminders,30*1000);checkReminders();'''
app = replace_once(app, old_start, new_start, "startup scheduler hooks")

index = index.replace("2.0.38", "2.0.39")
sw = sw.replace("Service Worker v71 · Mixed Documents", "Service Worker v72 · Daily cloud backup")
sw = sw.replace('hana-shell-v71', 'hana-shell-v72')
sw = sw.replace("2.0.38", "2.0.39")

app_path.write_text(app)
index_path.write_text(index)
sw_path.write_text(sw)
print("Hana 2.0.39 daily cloud backup patch applied")
