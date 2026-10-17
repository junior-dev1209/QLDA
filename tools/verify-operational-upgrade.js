const assert = require("node:assert/strict");
const fs = require("node:fs");

const client = fs.readFileSync("script.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");

[
  '"kpiPeriodLocks"',
  "function normalizeKpiPeriodLocks",
  "function renderKpiPeriodLocks",
  "function toggleKpiPeriodLock",
  "function renderDashboardOperations",
  "function taskHasOpenBlocker",
  "function taskDependencyIds",
  "followUpDate",
  "blockerStatus",
  "blockerNote",
].forEach((marker) => assert.ok(client.includes(marker), `Thiếu luồng điều hành trên giao diện: ${marker}`));

[
  'id="dashboardOperations"',
  'id="dashboardWorkload"',
  'id="taskPriority"',
  'id="taskFollowUpDate"',
  'id="taskBlockerStatus"',
  'id="taskDependencies"',
  'id="kpiPeriodLockPanel"',
].forEach((marker) => assert.ok(html.includes(marker), `Thiếu thành phần giao diện: ${marker}`));

assert.match(html, /<fieldset class="task-dependency-field">[\s\S]*id="taskDependencies" class="task-dependency-list" role="group"/, "Công việc phụ thuộc phải dùng danh sách checkbox.");
assert.ok(!html.includes('select id="taskDependencies" multiple'), "Không được dùng select nhiều lựa chọn cho công việc phụ thuộc.");
assert.ok(!html.includes("Giữ Ctrl hoặc Command"), "Không được yêu cầu giữ Ctrl hoặc Command khi chọn công việc phụ thuộc.");

[
  ".dashboard-operations-grid",
  ".dashboard-workload-row",
  ".task-tracking-panel",
  ".kpi-period-lock-panel",
].forEach((marker) => assert.ok(css.includes(marker), `Thiếu bố cục nâng cấp: ${marker}`));

assert.match(edge, /const deploymentVersion = "2026\.10\.16\.1";/, "Máy chủ chưa mang phiên bản nâng cấp điều hành.");
assert.match(edge, /"kpiPeriodLocks"/, "Máy chủ chưa đồng bộ dữ liệu chốt kỳ KPI.");
assert.match(edge, /"followUpDate"/, "Người thực hiện chưa thể đồng bộ mốc cập nhật.");
assert.match(edge, /function lockedKpiChangeAllowed/, "Máy chủ chưa kiểm tra quyền điều chỉnh sau chốt kỳ.");
assert.match(edge, /String\(value\.comment \|\| ""\)\.trim\(\)\.length >= 3/, "Điều chỉnh KPI sau chốt kỳ phải có lý do.");
assert.match(client, /input\[type="checkbox"\]:checked/, "Lưu công việc phải lấy các công việc phụ thuộc đã tích chọn.");
assert.match(client, /dependencyList\.querySelectorAll\('input\[type="checkbox"\]'\)/, "Quyền chỉnh sửa phải khóa từng checkbox công việc phụ thuộc.");
assert.match(css, /\.task-dependency-list[\s\S]*height: 118px;[\s\S]*max-height: 118px;[\s\S]*overflow-y: auto;/, "Danh sách công việc phụ thuộc phải gọn và có vùng cuộn riêng.");

console.log("operational_upgrade=passed");
