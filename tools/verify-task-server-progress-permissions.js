const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const clientSource = fs.readFileSync("script.js", "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing ${name}.`);
  const nextFunction = source.indexOf("\nfunction ", start + 1);
  const nextConstant = source.indexOf("\nconst ", start + 1);
  const next = [nextFunction, nextConstant].filter((index) => index >= 0).sort((a, b) => a - b)[0];
  return source.slice(start, next < 0 ? source.length : next)
    .replace(/([A-Za-z_$][\w$]*)\??: JsonRecord/g, "$1")
    .replace(/([A-Za-z_$][\w$]*)\??: boolean/g, "$1")
    .replace(/\): string\[\] \{/g, ") {")
    .replace(/\): boolean \{/g, ") {");
}

const sandbox = {
  sameJson: (left, right) => JSON.stringify(left) === JSON.stringify(right),
  withoutKeys: (record, keys) => Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key))),
  appendOnly: (before, after) => Array.isArray(before) && Array.isArray(after)
    && after.length >= before.length && before.every((item, index) => JSON.stringify(item) === JSON.stringify(after[index])),
  isBlankTaskField: (value) => String(value ?? "").trim() === "",
  completedTaskStatus: (status) => ["Hoàn thành", "Hoan thanh"].includes(String(status || "")),
  taskDeadlineExtensionReviewChange: () => false,
  canReviewTaskDeadlineExtension: () => false,
  taskDeadlineExtensionRequestChanged: () => false,
  gpmbWorkflowManagedTask: () => false,
  taskParticipantForAccount: (_state, task, account) => [task.ownerId, ...(task.collaboratorIds || [])].includes(account.personId),
  isAdmin: (account) => account.role === "admin",
  isDirector: (account) => account.role === "director",
  hasDepartmentTaskAccess: (account) => ["manager", "deputy_manager", "section_head"].includes(account.role),
  accountDepartmentId: (_state, account) => account.departmentId || "",
  taskHasParticipantInDepartment: (_state, task, departmentId) => (task.participantDepartmentIds || []).includes(departmentId),
  canReviewTaskCompletion: () => false,
  taskCompletionReviewChange: () => false,
  taskCompletionRecoveryChange: () => false,
  canAssessTaskQuality: () => false,
  taskQualityOnlyChange: () => false,
  assignedTask: () => false,
  taskAssigner: () => false,
  personIsInManagedDepartment: () => false,
};
vm.createContext(sandbox);
[
  "taskProgressMutableFields",
  "taskProgressFields",
  "taskProgressLifecycleIsSafe",
  "taskProgressFieldsOnlyChange",
  "taskProgressOnlyChange",
  "taskProgressIsLocked",
  "canUpdateTask",
].forEach((name) => {
  if (name === "taskProgressMutableFields") return;
  try {
    vm.runInContext(extractFunction(name), sandbox);
  } catch (error) {
    throw new Error(`${name}: ${error.message}`);
  }
});
const mutableStart = source.indexOf("const taskProgressMutableFields = [");
const mutableEnd = source.indexOf("] as const;", mutableStart) + "] as const;".length;
const mutableFieldsSource = source.slice(mutableStart, mutableEnd).replace(/\] as const;$/, "];");
vm.runInContext(mutableFieldsSource, sandbox);

const previous = {
  id: "task-1",
  title: "Hoàn thiện hồ sơ",
  ownerId: "person-owner",
  collaboratorIds: ["person-collaborator"],
  participantDepartmentIds: ["dept-a"],
  status: "Chuẩn bị thực hiện",
  progress: 0,
  completionReviewStatus: "",
  progressReports: [],
};
const next = {
  ...previous,
  status: "Đang thực hiện",
  progress: 25,
  progressReports: [{ id: "report-1", status: "Đang thực hiện", progress: 25 }],
  updatedAt: "2026-11-03T10:00:00.000Z",
  updatedBy: "Người thực hiện",
  updatedById: "account-owner",
};
const state = {};

assert.equal(sandbox.canUpdateTask(state, { id: "account-owner", personId: "person-owner", role: "employee" }, previous, next), true,
  "Người thực hiện được đổi trạng thái và báo cáo tiến độ.");
assert.equal(sandbox.canUpdateTask(state, { id: "account-collab", personId: "person-collaborator", role: "employee" }, previous, next), true,
  "Người phối hợp được cập nhật trạng thái công việc liên quan.");
assert.equal(sandbox.canUpdateTask(state, { id: "account-other", personId: "person-other", role: "employee" }, previous, next), false,
  "Nhân viên không liên quan không được cập nhật công việc.");
assert.equal(sandbox.canUpdateTask(state, { id: "account-manager", personId: "manager", departmentId: "dept-a", role: "manager" }, previous, next), true,
  "Trưởng/Phó phòng được cập nhật công việc trong phòng mình.");
assert.equal(sandbox.canUpdateTask(state, { id: "account-other-manager", personId: "manager-b", departmentId: "dept-b", role: "deputy_manager" }, previous, next), false,
  "Quản lý phòng khác không được cập nhật công việc ngoài phạm vi.");
assert.equal(sandbox.canUpdateTask(state, { id: "admin", role: "admin" }, previous, { ...next, title: "Sửa ngoài phạm vi cập nhật tiến độ" }), true,
  "Admin giữ quyền quản trị cao nhất.");
assert.equal(sandbox.canUpdateTask(state, { id: "account-owner", personId: "person-owner", role: "employee" }, previous, { ...next, title: "Đổi tên trái phép" }), false,
  "Cập nhật trạng thái không được phép sửa thông tin gốc của công việc.");
assert.match(source, /Task module is not available to this account\./, "Máy chủ phải phân biệt quyền truy cập mục với phạm vi công việc.");
assert.match(source, /Task update is outside account scope\./, "Máy chủ phải trả lý do rõ khi tài khoản ngoài phạm vi.");
assert.match(clientSource, /Task module is not available to this account\.[\s\S]*?Cấu hình hệ thống > Phân quyền chức năng/);
assert.match(clientSource, /Task update is outside account scope\.[\s\S]*?liên kết tài khoản với nhân sự/);

console.log("task_server_progress_permissions=passed");
