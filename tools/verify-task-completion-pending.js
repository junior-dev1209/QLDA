const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("script.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${name}.`);
  const next = source.indexOf("\nfunction ", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

const sandbox = {
  TASK_STATUS_PENDING_REVIEW: "Chờ đánh giá",
  TASK_STATUS_COMPLETED: "Hoàn thành",
  state: {
    activePeriod: "2026-08",
    tasks: [
      { id: "pending", period: "2026-08", status: "Hoàn thành", pending: true, approved: false, departmentIds: ["gpm"] },
      { id: "approved", period: "2026-08", status: "Hoàn thành", pending: false, approved: true, departmentIds: ["kth"] },
      { id: "other-period", period: "2026-07", status: "Hoàn thành", pending: true, approved: false, departmentIds: ["kth"] },
    ],
  },
  taskPeriod: (task) => task.period,
  taskMatchesDisplayScope: (task) => task.period === "2026-08",
  canViewTaskRecord: () => true,
  taskCompletionNeedsReview: (task) => task.pending === true,
  taskCompletionIsApproved: (task) => task.approved === true,
  getDueStatus: (task) => task.status,
  normalizeTaskStatus: (status) => status,
  taskMatchesTimeFilter: () => true,
  taskMatchesProjectFilter: () => true,
  canViewAllData: () => true,
  currentTaskDepartmentFilter: () => "",
  taskHasParticipantInDepartment: (task, departmentId) => task.departmentIds?.includes(departmentId),
  taskParticipantIds: () => [],
  indexedTaskBoardSearchText: (task) => `${task.id} ${task.title || ""}`.toLowerCase(),
  compareTaskRecords: (left, right) => String(left.id).localeCompare(String(right.id)),
};
vm.createContext(sandbox);
["taskMatchesStatusFilter", "taskMatchesDepartmentFilter", "pendingTaskCompletionRecords"].forEach((name) => vm.runInContext(extractFunction(name), sandbox));

assert.equal(
  sandbox.taskMatchesStatusFilter({ computedStatus: "Hoàn thành", approved: false }, "Hoàn thành"),
  false,
  "Việc chưa được duyệt không được ở cột Hoàn thành.",
);
assert.equal(
  sandbox.taskMatchesStatusFilter({ computedStatus: "Hoàn thành", approved: true }, "Hoàn thành"),
  true,
  "Việc đã đánh giá Đạt phải ở cột Hoàn thành.",
);
assert.equal(
  sandbox.taskMatchesStatusFilter({ pending: true }, "Chờ đánh giá"),
  true,
  "Việc chờ phê duyệt phải có bộ lọc riêng.",
);
assert.deepEqual(
  Array.from(sandbox.pendingTaskCompletionRecords({ search: "", timeFilter: {}, projectFilter: "", personId: "" }), (task) => task.id),
  ["pending"],
  "Danh sách chờ phê duyệt chỉ lấy việc trong kỳ hiện tại đang chờ đánh giá.",
);
assert.deepEqual(
  Array.from(sandbox.pendingTaskCompletionRecords({ search: "pending", timeFilter: {}, projectFilter: "", personId: "" }), (task) => task.id),
  ["pending"],
  "Danh sách chờ phê duyệt phải áp dụng từ khóa tìm kiếm hiện tại.",
);
assert.deepEqual(
  Array.from(sandbox.pendingTaskCompletionRecords({ search: "", timeFilter: {}, projectFilter: "", departmentId: "gpm", personId: "" }), (task) => task.id),
  ["pending"],
  "Danh sách chờ phê duyệt phải lọc theo phòng của người thực hiện hoặc người phối hợp.",
);
assert.equal(
  sandbox.taskMatchesDepartmentFilter({ departmentIds: ["gpm", "kth"] }, "kth"),
  true,
  "Công việc phối hợp liên phòng phải xuất hiện khi lọc từng phòng liên quan.",
);
sandbox.canViewAllData = () => false;
assert.equal(
  sandbox.taskMatchesDepartmentFilter({ departmentIds: ["gpm"] }, "kth"),
  true,
  "Tài khoản không phải admin hoặc Ban giám đốc không được áp dụng bộ lọc phòng.",
);

const completionSandbox = {
  TASK_STATUS_PREPARING: "Chuẩn bị thực hiện",
  TASK_STATUS_OLD_PREPARING: "Chưa bắt đầu",
  TASK_STATUS_COMPLETED: "Hoàn thành",
  clamp: (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0)),
  normalizeNumberInput: (value) => {
    const numeric = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(numeric) ? numeric : 0;
  },
  isTimestampBeforeDeadline: () => true,
  personById: () => null,
  taskHasQualityPercent: (task) => String(task?.qualityPercent || "").trim() !== "",
};
vm.createContext(completionSandbox);
[
  "normalizeTaskStatus",
  "normalizeTaskQualityInput",
  "completionReviewReportDecision",
  "completionReviewReportQuality",
  "latestCompletionReviewEvidence",
  "recoverTaskCompletionReviewFromHistory",
  "normalizeTaskCompletionLifecycleState",
  "taskCompletionReviewStatus",
  "taskCompletionIsApproved",
  "taskCompletionNeedsReview",
].forEach((name) => vm.runInContext(extractFunction(name), completionSandbox));

const staleRecurringTask = {
  status: "Chuẩn bị thực hiện",
  completionReviewStatus: "pending",
  completedAt: "2026-09-02T08:00:00.000Z",
};
assert.equal(
  completionSandbox.taskCompletionReviewStatus(staleRecurringTask),
  "",
  "Việc chưa Hoàn thành không được hiện chờ đánh giá dù còn cờ cũ.",
);
assert.equal(
  completionSandbox.taskCompletionNeedsReview(staleRecurringTask),
  false,
  "Việc định kỳ chưa Hoàn thành không được vào danh sách chờ phê duyệt.",
);
const repairedRecurringTask = completionSandbox.normalizeTaskCompletionLifecycleState(staleRecurringTask);
assert.equal(repairedRecurringTask.completionReviewStatus, "", "Dữ liệu cờ chờ duyệt cũ phải được dọn khỏi việc chưa Hoàn thành.");
assert.equal(repairedRecurringTask.completedAt, "", "Việc chưa Hoàn thành không được giữ thời điểm hoàn thành cũ.");
assert.equal(
  completionSandbox.taskCompletionNeedsReview({ status: "Hoàn thành", completionReviewStatus: "pending" }),
  true,
  "Chỉ công việc Hoàn thành mới được chờ đánh giá.",
);

[
  'id="taskCompletionPendingPanel"',
  'id="taskCompletionPendingList"',
  'id="openTaskCompletionPendingList"',
  'id="dashboardDepartmentStatus"',
  'id="taskDepartmentFilter"',
].forEach((marker) => assert.ok(html.includes(marker), `Missing required surface: ${marker}`));
[
  "function renderTaskCompletionPendingList()",
  "function openTaskCompletionPendingDetailDialog()",
  "function normalizeTaskCompletionLifecycleState",
  "function repairInvalidTaskCompletionStates",
  "pendingTaskCompletionFilterSummary",
  "function currentTaskDepartmentFilter",
  "function renderTaskDepartmentFilterOptions",
  "function taskMatchesDepartmentFilter",
  "indexedTaskBoardSearchText(task).includes(search)",
  "function renderDashboardDepartmentStatus(",
  "visibleDepartmentsForDepartmentEvaluations().map",
  "taskCompletionIsApproved(task)",
].forEach((marker) => assert.ok(source.includes(marker), `Missing required workflow: ${marker}`));
assert.match(source, /status: TASK_STATUS_PREPARING,[\s\S]{0,500}completionReviewStatus: "",[\s\S]{0,500}lateCompletion: false,/, "Bản sao công việc định kỳ phải xóa trạng thái phê duyệt hoàn thành.");
assert.match(source, /if \(repairInvalidTaskCompletionStates\(\)\) saveState\(\);/, "Admin phải tự sửa dữ liệu phê duyệt cũ không hợp lệ.");
assert.match(source, /\.filter\(\(task\) => taskMatchesDepartmentFilter\(task, departmentId\)\)/, "Danh sách công việc và chờ phê duyệt phải dùng cùng bộ lọc phòng.");
assert.match(source, /byId\("taskDepartmentFilter"\)\.addEventListener\("change", renderTaskBoard\)/, "Đổi phòng phải tải lại mục Công việc.");
assert.match(source, /if \(!canViewAllData\(\)\) return "";/, "Chỉ admin và Ban giám đốc mới được dùng giá trị lọc phòng.");
assert.match(source, /select\.classList\.toggle\("is-hidden", !canUseFilter\);/, "Bộ lọc phòng phải ẩn với tài khoản không được phép.");
assert.match(html, /<div class="task-head-actions">[\s\S]*id="taskDepartmentFilter"[\s\S]*id="openTaskForm"/, "Bộ lọc phòng phải nằm cạnh nút Thêm công việc.");
const taskFilterMarkup = html.slice(html.indexOf('<div class="filter-row task-filter">'), html.indexOf('<div id="taskPersonFilterNote"'));
assert.ok(!taskFilterMarkup.includes('taskDepartmentFilter'), "Bộ lọc phòng không được còn nằm ở hàng lọc bên dưới.");
assert.match(styles, /\.task-head-actions select[\s\S]*width: min\(220px, 24vw\);/, "Bộ lọc phòng trên thanh tiêu đề phải có chiều rộng ổn định.");
assert.ok(!html.includes("<option>Chờ đánh giá</option>"), "Bộ lọc Chờ đánh giá phải được gỡ khỏi danh sách công việc.");
[
  "taskWorkspaceTrial",
  "renderTaskWorkspaceTrial",
  "task-workspace-",
].forEach((marker) => {
  assert.ok(!html.includes(marker) && !source.includes(marker) && !styles.includes(marker), `Trial UI remains: ${marker}`);
});

console.log("task_completion_pending=passed");
