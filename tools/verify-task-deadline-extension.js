const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Thiếu hàm ${name}.`);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next < 0 ? source.length : next)
    .replace(/([A-Za-z_$][\w$]*)\??: JsonRecord/g, "$1")
    .replace(/([A-Za-z_$][\w$]*)\??: unknown/g, "$1")
    .replace(/\): JsonRecord \| null \{/g, ") {")
    .replace(/\): boolean \{/g, ") {");
}

const extensionRequestFields = [
  "deadlineExtensionStatus",
  "deadlineExtensionRequestedDue",
  "deadlineExtensionOriginalDue",
  "deadlineExtensionReason",
  "deadlineExtensionRequestedAt",
  "deadlineExtensionRequestedById",
  "deadlineExtensionRequestedByName",
];
const extensionReviewFields = [
  "deadlineExtensionReviewedAt",
  "deadlineExtensionReviewedById",
  "deadlineExtensionReviewedByName",
  "deadlineExtensionReviewNote",
];
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const withoutKeys = (record, keys) => Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));
const baseTask = {
  id: "task-1",
  ownerId: "person-1",
  due: "2026-11-10",
  followUpDate: "2026-11-08",
  status: "Đang thực hiện",
  progress: 30,
  progressReports: [],
};
const sandbox = {
  taskDeadlineExtensionRequestFields: extensionRequestFields,
  taskDeadlineExtensionReviewFields: extensionReviewFields,
  sameJson,
  withoutKeys,
  clone: (value) => structuredClone(value),
  appendOnly: (before, after) => Array.isArray(after) && after.length >= before.length && before.every((item, index) => sameJson(item, after[index])),
  recordId: (record) => String(record?.id || ""),
  gpmbWorkflowManagedTask: (task) => Boolean(task?.gpmbWorkflowId && task?.gpmbStepId),
  taskProgressOnlyChange: () => true,
  validTaskIsoDate: (value) => {
    const date = String(value || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(`${date}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  },
};
vm.createContext(sandbox);
vm.runInContext(extractFunction(edge, "taskDeadlineExtensionRequestChanged"), sandbox);
vm.runInContext(extractFunction(edge, "normalizeTaskDeadlineExtensionRequest"), sandbox);
vm.runInContext(extractFunction(edge, "taskDeadlineExtensionReviewIntent"), sandbox);
vm.runInContext(extractFunction(edge, "normalizeTaskDeadlineExtensionReview"), sandbox);

const request = {
  ...baseTask,
  followUpDate: "2026-11-15",
  deadlineExtensionStatus: "pending",
  deadlineExtensionRequestedDue: "2026-11-15",
  deadlineExtensionReason: "Cần bổ sung hồ sơ theo ý kiến thẩm định.",
  progressReports: [{ id: "report-1", note: "Đã cập nhật" }],
};
const normalizedRequest = sandbox.normalizeTaskDeadlineExtensionRequest(
  { id: "employee-account", displayName: "Nguyễn An" },
  baseTask,
  request,
);
assert.equal(normalizedRequest.deadlineExtensionStatus, "pending");
assert.equal(normalizedRequest.deadlineExtensionOriginalDue, baseTask.due);
assert.equal(normalizedRequest.deadlineExtensionRequestedById, "employee-account");
assert.equal(normalizedRequest.due, baseTask.due, "Gửi đề nghị không được tự đổi hạn hoàn thành.");
assert.equal(normalizedRequest.blockerNote, request.deadlineExtensionReason, "Nội dung đề nghị dùng chung với trường trở ngại/hỗ trợ.");

assert.equal(sandbox.normalizeTaskDeadlineExtensionRequest(
  { id: "employee-account" }, baseTask, { ...request, deadlineExtensionReason: "Thiếu" },
), null, "Lý do quá ngắn phải bị từ chối ở máy chủ.");
assert.equal(sandbox.normalizeTaskDeadlineExtensionRequest(
  { id: "employee-account" }, baseTask, { ...request, due: "2026-11-15" },
), null, "Người đề nghị không được tự đổi hạn gốc.");
assert.equal(sandbox.normalizeTaskDeadlineExtensionRequest(
  { id: "employee-account" }, baseTask, { ...request, followUpDate: "2026-02-31", deadlineExtensionRequestedDue: "2026-02-31" },
), null, "Ngày không hợp lệ phải bị từ chối.");
assert.equal(sandbox.normalizeTaskDeadlineExtensionRequest(
  { id: "employee-account" }, baseTask, { ...request, gpmbWorkflowId: "workflow-1", gpmbStepId: "step-1" },
), null, "Công việc GPMB không được gia hạn bằng luồng thông thường.");
const beforeDeadlineChange = { ...baseTask, followUpDate: "2026-11-10" };
assert.equal(sandbox.normalizeTaskDeadlineExtensionRequest({ id: "employee-account" }, baseTask, beforeDeadlineChange).due, baseTask.due,
  "Mốc bằng hoặc trước hạn không đổi Ngày hoàn thành.");

const pendingTask = {
  ...normalizedRequest,
  deadlineExtensionOriginalDue: baseTask.due,
  deadlineExtensionRequestedAt: "2026-10-30T00:00:00.000Z",
  deadlineExtensionRequestedById: "employee-account",
  deadlineExtensionRequestedByName: "Nguyễn An",
  deadlineExtensionReviewedAt: "",
  deadlineExtensionReviewedById: "",
  deadlineExtensionReviewedByName: "",
  deadlineExtensionReviewNote: "",
};
const reviewBase = {
  ...pendingTask,
  deadlineExtensionStatus: "pending",
  progressReports: pendingTask.progressReports,
};
const approved = sandbox.normalizeTaskDeadlineExtensionReview(reviewBase, {
  ...reviewBase,
  due: "2026-11-15",
  deadlineExtensionStatus: "approved",
  deadlineExtensionReviewedAt: "client-time",
  deadlineExtensionReviewedById: "manager-account",
  deadlineExtensionReviewedByName: "Trưởng phòng",
  deadlineExtensionReviewNote: "Chấp nhận do hồ sơ cần bổ sung.",
  progressReports: [...reviewBase.progressReports, { id: "review-1", type: "deadline-extension-review" }],
  updatedAt: "client-time",
  updatedBy: "Trưởng phòng",
  updatedById: "manager-account",
}, { id: "manager-account", displayName: "Trưởng phòng" });
assert.equal(approved.due, "2026-11-15", "Duyệt đạt mới áp dụng ngày đề nghị.");
assert.equal(approved.deadlineExtensionReviewedById, "manager-account");

const rejected = sandbox.normalizeTaskDeadlineExtensionReview(reviewBase, {
  ...reviewBase,
  due: reviewBase.due,
  deadlineExtensionStatus: "rejected",
  deadlineExtensionReviewedAt: "client-time",
  deadlineExtensionReviewedById: "manager-account",
  deadlineExtensionReviewedByName: "Trưởng phòng",
  deadlineExtensionReviewNote: "Chưa đủ căn cứ gia hạn.",
  progressReports: [...reviewBase.progressReports, { id: "review-2", type: "deadline-extension-review" }],
  updatedAt: "client-time",
  updatedBy: "Trưởng phòng",
  updatedById: "manager-account",
}, { id: "manager-account", displayName: "Trưởng phòng" });
assert.equal(rejected.due, baseTask.due, "Từ chối phải giữ hạn cũ.");
assert.equal(sandbox.normalizeTaskDeadlineExtensionReview(reviewBase, {
  ...reviewBase,
  deadlineExtensionStatus: "approved",
  deadlineExtensionReviewNote: "",
}, { id: "manager-account", displayName: "Trưởng phòng" }), null, "Không chấp nhận quyết định thiếu ý kiến.");

const reviewer = extractFunction(edge, "canReviewTaskDeadlineExtension");
vm.runInContext(reviewer, Object.assign(sandbox, {
  isAdmin: (account) => account.role === "admin",
  hasDepartmentManagement: (account) => ["manager", "deputy_manager"].includes(account.role),
  personIsInManagedDepartment: (_state, account, ownerId) => account.departmentId === "dept-1" && ownerId === "person-1",
}));
assert.equal(sandbox.canReviewTaskDeadlineExtension({}, { id: "manager-account", role: "manager", departmentId: "dept-1" }, pendingTask), true);
assert.equal(sandbox.canReviewTaskDeadlineExtension({}, { id: "employee-account", role: "manager", departmentId: "dept-1" }, pendingTask), false,
  "Người gửi không được tự duyệt đề nghị của mình.");
assert.equal(sandbox.canReviewTaskDeadlineExtension({}, { id: "other-manager", role: "manager", departmentId: "dept-2" }, pendingTask), false,
  "Quản lý phòng khác không được duyệt.");
assert.equal(sandbox.canReviewTaskDeadlineExtension({}, { id: "admin", role: "admin" }, pendingTask), true);

assert.doesNotMatch(html, /id="taskDeadlineExtensionReason"/);
assert.match(html, /id="taskBlockerNote"/);
assert.match(html, /<strong>Nội dung trở ngại \/ đề nghị hỗ trợ<\/strong>/);
assert.match(client, /const reason = String\(byId\("taskBlockerNote"\)\.value \|\| ""\)\.trim\(\)/);
assert.match(client, /task-deadline-extension-detail-head/);
assert.match(client, /data-review-deadline-extension="\$\{escapeHtml\(task\.id\)\}"/);
assert.match(client, /task-progress-update-button task-deadline-review-button/);
assert.doesNotMatch(client, /deadlineReviewable \? `<button class="ghost task-deadline-review-button"/);
assert.match(html, /id="taskDeadlineExtensionReviewForm"/);
assert.match(html, /Mốc bằng hoặc trước Ngày hoàn thành không đổi hạn/);
assert.match(client, /Chờ duyệt gia hạn/);
const operationRows = extractFunction(client, "dashboardOperationRows");
assert.doesNotMatch(operationRows, /deadline-extension-review|Chờ duyệt gia hạn/, "Không thêm thẻ tổng hợp Chờ duyệt gia hạn vào Tổng quan.");
assert.match(client, /deadlineExtensionRequest = true/);
assert.match(client, /sharedSyncSupportsTaskDeadlineExtensionReview\(\)/);
assert.match(edge, /function normalizeTaskDeadlineExtensionRequest\(/);
assert.match(edge, /function normalizeTaskDeadlineExtensionReview\(/);
assert.match(edge, /function canReviewTaskDeadlineExtension\(/);
assert.match(edge, /title: "Đề nghị gia hạn công việc cần duyệt"/);
assert.match(edge, /const deploymentVersion = "2026\.10\.30\.3"/);
assert.match(styles, /\.task-deadline-extension-detail\.is-approved/);
assert.match(styles, /grid-template-columns: minmax\(0, 1fr\);[\s\S]*?\.task-deadline-extension-review-form/);
assert.match(styles, /\.task-deadline-extension-review-modal \{[\s\S]*?width: min\(620px, 100%\)/);
assert.match(styles, /\.task-progress-update-button[\s\S]*?background: var\(--primary\)/);
assert.match(styles, /\.task-tracking-grid \.task-deadline-extension-notice \{[\s\S]*?grid-column: 1 \/ -1/);

const trackingOrder = [
  html.indexOf('id="taskFollowUpDate"'),
  html.indexOf('id="taskBlockerStatus"'),
  html.indexOf('id="taskDeadlineExtensionNotice"'),
  html.indexOf('id="taskDependencies"'),
  html.indexOf('id="taskBlockerNote"'),
];
assert.deepEqual(trackingOrder, [...trackingOrder].sort((left, right) => left - right), "Theo dõi điều hành phải xếp ngày/trạng thái trước, phụ thuộc/nội dung sau.");

console.log("Task deadline extension approval checks passed.");
