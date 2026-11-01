const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Thiếu hàm ${name}.`);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next < 0 ? source.length : next)
    .replace(/([A-Za-z_$][\w$]*): JsonRecord/g, "$1")
    .replace(/\): boolean \{/g, ") {")
    .replace(/\): string \{/g, ") {");
}

function plusDays(date, days) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

const sandbox = {
  GPMB_STEP_ACTIVE: "active",
  GPMB_STEP_WAITING: "waiting",
  GPMB_STEP_SKIPPED: "skipped",
  gpmbIsoDate: (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "",
  gpmbWorkflowTodayIso: () => "2026-11-01",
  gpmbWorkflowCollaboratorIds: (ids) => Array.isArray(ids) ? ids : [],
  gpmbWorkflowCollaboratorNames: () => [],
  addDaysToIsoDate: plusDays,
};
vm.createContext(sandbox);
[
  "gpmbStepIsEnabled",
  "gpmbStepDuration",
  "gpmbWorkflowStepEnd",
  "gpmbWorkflowDefaultSteps",
].forEach((name) => vm.runInContext(extractFunction(client, name), sandbox));

const templates = [
  { id: "p1-01", title: "Bước đầu", phase: "1", ordinal: 1, days: 2 },
  { id: "p1-02", title: "Bước sau", phase: "1", ordinal: 2, days: 5 },
  { id: "p1-03", title: "Nhánh tùy chọn", phase: "1", ordinal: 3, days: 7, activationKey: "noHandover" },
];
const steps = sandbox.gpmbWorkflowDefaultSteps(
  "2026-11-01",
  "owner-1",
  "Nguyễn An",
  { noHandover: false },
  [],
  templates,
  { "p1-01": 3, "p1-02": 1, "p1-03": 12 },
);
assert.equal(steps[0].days, 3);
assert.equal(steps[0].startDate, "2026-11-01");
assert.equal(steps[0].due, "2026-11-03");
assert.equal(steps[1].startDate, "2026-11-04", "Bước tiếp theo phải nối sau hạn của bước trước.");
assert.equal(steps[1].due, "2026-11-04");
assert.equal(steps[2].days, 12, "Thời hạn nhánh chưa chọn vẫn được lưu để dùng nếu nhánh phát sinh sau.");
assert.equal(steps[2].status, "skipped");
assert.equal(steps[2].due, "");

let currentRole = "employee";
const clientPermissions = {
  isAdmin: () => currentRole === "admin",
  isDirector: () => currentRole === "director",
  isManager: () => currentRole === "manager",
  isDeputyManager: () => currentRole === "deputy_manager",
};
vm.createContext(clientPermissions);
vm.runInContext(extractFunction(client, "canAdjustGpmbWorkflowTimeline"), clientPermissions);
vm.runInContext(extractFunction(client, "canSetGpmbInitialStepDurations"), clientPermissions);
assert.equal(clientPermissions.canAdjustGpmbWorkflowTimeline(), false);
assert.equal(clientPermissions.canSetGpmbInitialStepDurations(), false);
currentRole = "manager";
assert.equal(clientPermissions.canSetGpmbInitialStepDurations(), true, "Trưởng phòng được đặt hạn ban đầu.");
currentRole = "deputy_manager";
assert.equal(clientPermissions.canSetGpmbInitialStepDurations(), true, "Phó phòng được đặt hạn ban đầu.");
assert.equal(clientPermissions.canAdjustGpmbWorkflowTimeline(), false, "Trưởng/Phó phòng không sửa hạn trong điều hành quy trình.");
currentRole = "director";
assert.equal(clientPermissions.canAdjustGpmbWorkflowTimeline(), true);
assert.equal(clientPermissions.canSetGpmbInitialStepDurations(), true);
currentRole = "admin";
assert.equal(clientPermissions.canAdjustGpmbWorkflowTimeline(), true);
assert.equal(clientPermissions.canSetGpmbInitialStepDurations(), true);

const serverPermissions = {
  isAdmin: (account) => account.role === "admin",
  isDirector: (account) => account.role === "director",
  hasDepartmentManagement: (account) => ["manager", "deputy_manager"].includes(account.role),
};
vm.createContext(serverPermissions);
vm.runInContext(extractFunction(edge, "canAdjustGpmbWorkflowTimeline"), serverPermissions);
vm.runInContext(extractFunction(edge, "canSetGpmbInitialStepDurations"), serverPermissions);
assert.equal(serverPermissions.canAdjustGpmbWorkflowTimeline({ role: "manager" }), false);
assert.equal(serverPermissions.canSetGpmbInitialStepDurations({ role: "manager" }), true);
assert.equal(serverPermissions.canSetGpmbInitialStepDurations({ role: "deputy_manager" }), true);
assert.equal(serverPermissions.canAdjustGpmbWorkflowTimeline({ role: "deputy_manager" }), false);
assert.equal(serverPermissions.canAdjustGpmbWorkflowTimeline({ role: "director" }), true);
assert.equal(serverPermissions.canAdjustGpmbWorkflowTimeline({ role: "admin" }), true);

assert.match(html, /id="gpmbWorkflowCreateStepDeadlines"/);
assert.match(html, /id="gpmbWorkflowCreateDeadlineNote"/);
assert.match(client, /gpmbWorkflowDefaultSteps\(startDate, ownerId, owner\?\.name \|\| "", conditions, collaboratorIds, GPMB_WORKFLOW_TEMPLATE, durationOverrides\)/);
assert.match(client, /data-gpmb-create-step-days/);
assert.match(client, /\$\{canAdjustTimeline \? "" : "disabled"\}/);
assert.match(client, /const canAdjustTimeline = canSetGpmbInitialStepDurations\(\);/);
assert.match(edge, /const canAdjustStepDurations = previous[\s\S]*?canSetGpmbInitialStepDurations\(actor\);/);
assert.match(edge, /function canSetGpmbInitialStepDurations\(actor: JsonRecord\): boolean/);
assert.match(edge, /gpmbStepDuration\(template, conditions, canAdjustStepDurations \? requested\.days : prior\?\.days\)/);
assert.match(edge, /if \(!enabled\) return \{ \.\.\.template,[^\n]*days,/);
assert.equal(fs.readFileSync("manifest.webmanifest", "utf8").includes('"version": "3.4.113"'), true);

console.log("GPMB create-step deadline checks passed.");
