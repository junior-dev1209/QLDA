const fs = require("fs");
const assert = require("assert");
const release = require("../release.json");

const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");

assert.ok(client.includes('"systemSettings"'), "Frontend phải đồng bộ collection systemSettings.");
assert.match(client, /keys\.push\(`module\.\$\{module\.id\}\.role\.\$\{role\}`\)/);
assert.ok(client.includes("SETTINGS_CONFLICT_FREE_DEPLOYMENT_VERSION") && client.includes("systemSettings"), "Frontend phải có đường tương thích theo phiên bản máy chủ.");
assert.ok(client.includes("serverVersion") && client.includes("serverUpdatedAt") && client.includes("serverUpdatedBy"), "Frontend phải hiển thị đủ phiên bản, thời điểm và tài khoản gây xung đột.");
assert.match(client, /applySystemSettingsToState\(merged, merged\.systemSettings\)/);
assert.match(client, /function canonicalSystemSettingKey\(/, "Frontend phải gộp khóa phân hệ thẩm định cũ vào phân hệ dự án đầu tư công.");
assert.match(client, /PUBLIC_INVESTMENT_LEGACY_APPRAISAL_VIEW[\s\S]*?Bật mục Dự án đầu tư công/, "Thông báo tương thích không được lộ mã phân hệ cũ.");

assert.match(edge, /"systemSettings"\] as const/);
assert.match(edge, /systemSettingConflict[\s\S]*serverVersion[\s\S]*serverUpdatedAt[\s\S]*serverUpdatedBy/);
assert.match(edge, /Setting changed by another user\./);
assert.match(edge, /committedSystemSettingRecord[\s\S]*version[\s\S]*updatedDeviceId/);
assert.match(edge, /applyLegacySystemSettingFields[\s\S]*moduleSettings[\s\S]*systemCustomization/);
assert.match(edge, /function canonicalSystemSettingKey\(/, "Edge Function phải chuẩn hóa khóa cấu hình cũ trước khi so phiên bản.");
assert.match(edge, /const keys = \[\.\.\.new Set\(\[\.\.\.systemSettingKeys\(\), \.\.\.values\.keys\(\)\]\)\]/, "Edge Function không được giữ lại khóa cấu hình đã ngừng sử dụng.");
assert.ok(edge.includes(`const deploymentVersion = "${release.edgeFunctionVersion}";`), "Edge Function phải mang đúng phiên bản phát hành.");

console.log("settings_conflict_merge=passed");
