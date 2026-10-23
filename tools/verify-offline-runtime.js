const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "script.js"), "utf8");
const markup = fs.readFileSync(path.join(root, "index.html"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");

const requirements = [
  [
    "file runtime detector",
    'function isOfflineFileRuntime() {\n  return window.location.protocol === "file:";\n}',
  ],
  [
    "cloud sync disabled for file runtime",
    "return !isOfflineFileRuntime() && (Boolean(supabaseSyncConfig())",
  ],
  [
    "Supabase transport disabled for file runtime",
    "return !isOfflineFileRuntime() && Boolean(supabaseSyncConfig());",
  ],
  [
    "local file login mode",
    "if (isOfflineFileRuntime()) {\n    sharedSync.session = false;",
  ],
  [
    "offline personnel bootstrap",
    "mergeImportedPeopleIntoState();",
  ],
  [
    "offline credential verifier removed",
    "OFFLINE_LOGIN_PROOFS_KEY",
    true,
  ],
  [
    "offline save bypasses cloud queue",
    "if (!isOfflineFileRuntime()) queueSharedStateSync();",
  ],
  [
    "offline retry timer disabled",
    "if (isOfflineFileRuntime() || !sharedSync.session || !sharedSync.dirty || sharedSync.retryTimer",
  ],
  [
    "offline refresh timer disabled",
    "if (isOfflineFileRuntime() || sharedSync.refreshTimer || !sharedSync.session",
  ],
  [
    "offline state refresh disabled",
    "if (isOfflineFileRuntime() || !sharedSync.session || document.visibilityState === \"hidden\"",
  ],
  ["state refresh avoids concurrent writes", "if (sharedSync.inFlight) {\n    if (force) queueLunaAnnouncementRefresh();"],
];

const missing = requirements
  .filter(([, marker, absent]) => absent ? source.includes(marker) : !source.includes(marker))
  .map(([name]) => name);
if (missing.length) {
  throw new Error(`Offline runtime checks failed: ${missing.join(", ")}`);
}

const peopleScript = '<script src="people-data.js?v=3.4.64"></script>';
const calendarScript = '<script src="work-calendar.js?v=3.4.64"></script>';
const assistantScript = '<script src="virtual-assistant.js?v=3.4.64"></script>';
const runtimeScript = '<script src="script.js?v=3.4.64"></script>';
if (!markup.includes(peopleScript) || !markup.includes(calendarScript) || !markup.includes(assistantScript) || !markup.includes(runtimeScript)) {
  throw new Error("Offline runtime scripts are missing from index.html.");
}
if (markup.indexOf(peopleScript) > markup.indexOf(calendarScript) || markup.indexOf(calendarScript) > markup.indexOf(runtimeScript)) {
  throw new Error("Personnel bootstrap data must load before script.js.");
}
if (markup.indexOf(peopleScript) > markup.indexOf(calendarScript) || markup.indexOf(calendarScript) > markup.indexOf(assistantScript) || markup.indexOf(assistantScript) > markup.indexOf(runtimeScript)) {
  throw new Error("Offline application data and assistant bridge must load before the core runtime's first notification scan.");
}
if (!serviceWorker.includes('"people-data.js"') || !serviceWorker.includes('"work-calendar.js"') || !serviceWorker.includes('"work-calendar.css"') || !serviceWorker.includes('"script.js"') || !serviceWorker.includes('RELEASE_VERSION')) {
  throw new Error("Offline application shell is incomplete in service-worker.js.");
}
if (!serviceWorker.includes('"virtual-assistant.js"') || !serviceWorker.includes('"virtual-assistant.css"')) {
  throw new Error("Assistant assets must be included in the offline application shell.");
}

console.log("offline_runtime=passed");
