const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const release = JSON.parse(fs.readFileSync("release.json", "utf8"));

function readLiteral(pattern, source, label) {
  const match = source.match(pattern);
  assert.ok(match, `Không tìm thấy ${label}.`);
  return vm.runInNewContext(`(${match[1]})`);
}

const collections = readLiteral(/const SHARED_SYNC_COLLECTIONS = (\[[^;]+\]);/, client, "danh sách collection đồng bộ");
const fields = readLiteral(/const SHARED_SYNC_SCALAR_FIELDS = (\[[\s\S]*?\]);/, client, "danh sách trường đồng bộ");
const scopeLabels = readLiteral(/const SHARED_SYNC_SCOPE_LABELS = Object\.freeze\((\{[\s\S]*?\})\);/, client, "nhãn collection");
const fieldLabels = readLiteral(/const SHARED_SYNC_FIELD_LABELS = Object\.freeze\((\{[\s\S]*?\})\);/, client, "nhãn trường");

assert.equal(collections.filter((name) => !scopeLabels[name]).length, 0, "Mọi collection đồng bộ phải có tên hiển thị cụ thể.");
assert.equal(fields.filter((name) => !fieldLabels[name]).length, 0, "Mọi trường đồng bộ phải có tên hiển thị cụ thể.");
assert.doesNotMatch(client, /labels\[change\.scope\] \|\| "Dữ liệu hệ thống"/, "Không được che mất phân hệ bị từ chối bằng thông báo chung.");
assert.match(client, /function automaticClientDataMigrationsAllowed\(\)[\s\S]*?return isOfflineFileRuntime\(\) \|\| !sharedSyncSupported\(\);/, "Môi trường online phải chặn migration tự động phía client.");
assert.match(client, /if \(automaticClientDataMigrationsAllowed\(\)\) \{[\s\S]*?migrateDepartmentTermLabels\(\);[\s\S]*?syncPersonnelAccounts\(\)/, "Các migration khởi động phải nằm trong chốt chặn online.");
assert.match(client, /function syncPersonnelAccounts\(\) \{[\s\S]*?sharedSync\.session && !isOfflineFileRuntime\(\) && !isAdmin\(\)/, "Tài khoản thường không được gửi kèm thay đổi Tài khoản.");

const messageFunction = client.slice(
  client.indexOf("function sharedDeniedChangeMessage("),
  client.indexOf("function restoreDeniedSharedChanges("),
);
const messageSandbox = {
  SHARED_SYNC_SCOPE_LABELS: scopeLabels,
  SHARED_SYNC_FIELD_LABELS: fieldLabels,
  PUBLIC_INVESTMENT_LEGACY_APPRAISAL_VIEW: "public-investment-appraisal",
  state: { tasks: [] },
  Intl,
};
vm.createContext(messageSandbox);
vm.runInContext(messageFunction, messageSandbox);
const gpmbMessage = messageSandbox.sharedDeniedChangeMessage([
  { scope: "gpmbWorkflows", id: "workflow-1", reason: "GPMB workflow update is outside account scope." },
], {});
assert.match(gpmbMessage, /Quy trình GPMB/, "Thông báo phải nêu đúng phân hệ GPMB bị từ chối.");
const fieldMessage = messageSandbox.sharedDeniedChangeMessage([
  { scope: "field", id: "roles", reason: "Permission denied." },
], {});
assert.match(fieldMessage, /Danh mục chức vụ\/KPI/, "Thông báo phải nêu đúng trường cấu hình bị từ chối.");
assert.doesNotMatch(`${gpmbMessage} ${fieldMessage}`, /Dữ liệu hệ thống/, "Không được quay lại thông báo chung không thể chẩn đoán.");

[
  "Invalid notification acknowledgement.",
  "GPMB workflow update is outside account scope.",
  "GPMB case update is outside account scope.",
  "Public investment appraisal update is outside account scope.",
  "Public investment project update is outside account scope.",
  "Account update is outside account scope.",
].forEach((reason) => {
  assert.ok(edge.includes(reason), `Edge Function thiếu lý do từ chối: ${reason}`);
});
assert.match(edge, /collectionPermissionDeniedReason\(collection\)/, "Edge Function phải trả lý do theo collection.");
assert.ok(edge.includes(`const deploymentVersion = "${release.edgeFunctionVersion}";`), "Edge Function phải mang đúng phiên bản phát hành.");

console.log("online_sync_denials=passed");
