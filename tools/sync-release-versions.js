const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const release = JSON.parse(fs.readFileSync(path.join(root, "release.json"), "utf8"));
const checkOnly = process.argv.includes("--check");
const stagedChanges = new Map();

if (!/^\d+\.\d+\.\d+$/.test(release.frontendVersion || "")) {
  throw new Error("release.json must contain a valid frontendVersion.");
}
if (!/^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(release.edgeFunctionVersion || "")) {
  throw new Error("release.json must contain a valid edgeFunctionVersion.");
}

function sourceFor(fullPath) {
  return stagedChanges.get(fullPath)?.updated ?? fs.readFileSync(fullPath, "utf8");
}

function stageUpdate(fullPath, file, updated) {
  const change = { fullPath, file, updated };
  stagedChanges.set(fullPath, change);
  return change;
}

function replaceExpectedCount(file, pattern, replacement, expectedCount = 1) {
  const fullPath = path.join(root, file);
  const source = sourceFor(fullPath);
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))];
  if (matches.length !== expectedCount) {
    throw new Error(`${file}: expected ${expectedCount} release marker(s), found ${matches.length}.`);
  }
  const updated = source.replace(pattern, replacement);
  if (updated === source) return null;
  return stageUpdate(fullPath, file, updated);
}

function replaceFrontendAssetQueries() {
  const file = "index.html";
  const fullPath = path.join(root, file);
  const source = sourceFor(fullPath);
  const matches = source.match(/\?v=\d+\.\d+\.\d+/g) || [];
  if (matches.length < 10) throw new Error(`${file}: expected at least 10 versioned assets, found ${matches.length}.`);
  const updated = source.replace(/(\?v=)\d+\.\d+\.\d+/g, `$1${release.frontendVersion}`);
  return updated === source ? null : stageUpdate(fullPath, file, updated);
}

[
  replaceFrontendAssetQueries(),
  replaceExpectedCount("index.html", /(<meta name="application-version" content=")[^"]+(">)/, `$1${release.frontendVersion}$2`),
  replaceExpectedCount("index.html", /(Phiên bản )\d+\.\d+\.\d+/g, `$1${release.frontendVersion}`, 2),
  replaceExpectedCount("script.js", /const APP_VERSION = "[^"]+";/, `const APP_VERSION = "${release.frontendVersion}";`),
  replaceExpectedCount("service-worker.js", /const RELEASE_VERSION = "[^"]+";/, `const RELEASE_VERSION = "${release.frontendVersion}";`),
  replaceExpectedCount("manifest.webmanifest", /("version": ")[^"]+("\s*,)/, `$1${release.frontendVersion}$2`),
  replaceExpectedCount("supabase/functions/kpi-sync/index.ts", /const deploymentVersion = "[^"]+";/, `const deploymentVersion = "${release.edgeFunctionVersion}";`),
  replaceExpectedCount("api/sync.php", /const SYNC_DEPLOYMENT_VERSION = '[^']+';/, `const SYNC_DEPLOYMENT_VERSION = '${release.edgeFunctionVersion}';`),
];

const changes = [...stagedChanges.values()];

if (checkOnly) {
  if (changes.length) {
    console.error(`Release files are out of sync: ${changes.map((change) => change.file).join(", ")}. Run npm run release:sync.`);
    process.exit(1);
  }
  console.log(`Release versions are synchronized: frontend ${release.frontendVersion}, Edge Function ${release.edgeFunctionVersion}.`);
} else {
  changes.forEach(({ fullPath, updated }) => fs.writeFileSync(fullPath, updated, "utf8"));
  console.log(changes.length
    ? `Synchronized ${changes.length} release file(s) from release.json.`
    : "Release versions were already synchronized.");
}
