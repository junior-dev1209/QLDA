const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const release = JSON.parse(fs.readFileSync(path.join(root, "release.json"), "utf8"));
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const html = read("index.html");
const client = read("script.js");
const worker = read("service-worker.js");
const pwaManifest = read("manifest.webmanifest");
const edge = read("supabase/functions/kpi-sync/index.ts");
const phpApi = read("api/sync.php");
const deployScript = read("Deploy-KpiSync.ps1");
const workflow = read(".github/workflows/quality-gates.yml");
const releaseSync = read("tools/sync-release-versions.js");
const packageManifest = JSON.parse(read("package.json"));

assert.match(html, new RegExp(`<meta name="application-version" content="${release.frontendVersion.replaceAll(".", "\\.")}">`));
assert.match(client, new RegExp(`const APP_VERSION = "${release.frontendVersion.replaceAll(".", "\\.")}";`));
assert.match(worker, new RegExp(`const RELEASE_VERSION = "${release.frontendVersion.replaceAll(".", "\\.")}";`));
assert.match(pwaManifest, new RegExp(`"version": "${release.frontendVersion.replaceAll(".", "\\.")}"`));
assert.match(edge, new RegExp(`const deploymentVersion = "${release.edgeFunctionVersion.replaceAll(".", "\\.")}";`));
assert.match(phpApi, new RegExp(`const SYNC_DEPLOYMENT_VERSION = '${release.edgeFunctionVersion.replaceAll(".", "\\.")}';`));
assert.ok(deployScript.includes("$expectedDeploymentVersion = [string]$releaseManifest.edgeFunctionVersion"),
  "Deployment script must load the Edge version from release.json.");
assert.match(edge, /if \(action === "version" && request\.method === "GET"\) \{\s*return json\(request, \{ deploymentVersion \}\);/,
  "Edge Function phải cung cấp endpoint phiên bản chỉ đọc.");
assert.equal(packageManifest.scripts.test, "node tools/run-verifications.js");
assert.match(releaseSync, /const stagedChanges = new Map\(\)/, "Release sync phải gom nhiều thay đổi vào cùng một file thay vì ghi đè lẫn nhau.");
assert.match(releaseSync, /function sourceFor\(fullPath\)[\s\S]*?stagedChanges\.get\(fullPath\)/, "Mỗi bước đồng bộ cần đọc bản đã cập nhật trước đó.");
assert.match(workflow, /uses: actions\/checkout@v7/);
assert.match(workflow, /uses: actions\/setup-node@v7[\s\S]*?node-version: 24/);
assert.match(workflow, /uses: denoland\/setup-deno@v2[\s\S]*?deno-version-file: \.tool-versions/);
assert.match(workflow, /run: npm test/);
assert.match(workflow, /run: deno check supabase\/functions\/kpi-sync\/index\.ts/);
assert.doesNotMatch(workflow, /supabase (functions deploy|db push)|Deploy-KpiSync/, "Quality gate không được triển khai production.");

console.log(`release_contract=passed (${release.frontendVersion} / ${release.edgeFunctionVersion})`);
