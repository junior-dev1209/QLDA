const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const php = fs.readFileSync("api/sync.php", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = client.indexOf(marker);
  assert.notEqual(start, -1, `Thiếu hàm ${name}.`);
  const next = client.indexOf("\nfunction ", start + marker.length);
  return client.slice(start, next < 0 ? client.length : next);
}

const today = "2026-10-20";
const source = { id: "source-1", recurrence: "weekly", status: "Đang thực hiện", ownerId: "person-1", due: today };
const future = { id: "future-1", recurrenceSourceId: source.id, recurrenceSeriesId: source.id, recurrence: "weekly", status: "Chuẩn bị thực hiện", progress: 0, due: "2026-10-27" };
const active = { id: "active-1", recurrenceSourceId: source.id, recurrenceSeriesId: source.id, recurrence: "weekly", status: "Đang thực hiện", progress: 35, due: "2026-10-13" };
const completed = { id: "completed-1", recurrenceSourceId: source.id, recurrenceSeriesId: source.id, recurrence: "weekly", status: "Hoàn thành", progress: 100, due: "2026-10-06" };
const sandbox = {
  state: { tasks: [source, future, active, completed], activityLog: [] },
  TASK_STATUS_REGULAR: "regular",
  TASK_KIND_REGULAR: "regular",
  TASK_RECURRENCE_NONE: "none",
  TASK_STATUS_PREPARING: "Chuẩn bị thực hiện",
  TASK_STATUS_RECURRENCE_STOPPED: "Đã ngừng",
  normalizeTaskKind: () => "regular",
  normalizeTaskRecurrence: (task) => task.recurrence || "none",
  normalizeTaskStatus: (value) => String(value || ""),
  recurrenceSeriesKey: (task) => String(task.recurrenceSeriesId || task.recurrenceSourceId || task.id || ""),
  recurrenceSourceForTask: (task) => sandbox.state.tasks.find((item) => item.id === (task.recurrenceSourceId || task.id)) || source,
  recurrenceSeriesIsActive: () => true,
  canStopTaskRecurrence: () => true,
  dailyReportDateValue: () => today,
  isTaskFinishedStatus: (status) => ["Hoàn thành", "Đã ngừng"].includes(String(status || "")),
  currentActorInfo: () => ({ id: "account-owner", name: "Nguyễn An" }),
  uid: (prefix) => `${prefix}-new`,
  formatDate: (value) => value,
  applyTaskRecordAudit: (record) => record,
  personById: (id) => ({ id, departmentId: "dept-1" }),
  taskOwnerPersonId: (task) => task.ownerId,
  taskPeriod: (task) => String(task.due || "").slice(0, 7),
  logActivity: (entry) => sandbox.state.activityLog.push(entry),
};
vm.createContext(sandbox);
vm.runInContext(extractFunction("applyRecurringTaskStop"), sandbox);

const result = sandbox.applyRecurringTaskStop(source.id);
assert.equal(result.stoppedOccurrences, 1, "Chỉ kỳ tương lai chưa bắt đầu mới chuyển sang Đã ngừng.");
assert.equal(result.updatedTasks, 4, "Dấu vết dừng phải được lưu cho toàn bộ chuỗi.");
assert.equal(sandbox.state.tasks.find((task) => task.id === future.id).status, "Đã ngừng");
assert.equal(sandbox.state.tasks.find((task) => task.id === future.id).progressReports.length, 1, "Kỳ bị ngừng phải có lịch sử.");
assert.equal(sandbox.state.tasks.find((task) => task.id === active.id).status, "Đang thực hiện", "Không thay trạng thái kỳ đang làm.");
assert.equal(sandbox.state.tasks.find((task) => task.id === completed.id).status, "Hoàn thành", "Không thay trạng thái kỳ đã hoàn thành.");
assert.ok(sandbox.state.tasks.every((task) => task.recurrenceStoppedAt), "Toàn chuỗi cần lưu thời điểm dừng để chặn sinh kỳ mới.");
assert.equal(sandbox.state.activityLog[0].action, "Dừng định kỳ", "Thao tác phải được ghi nhật ký hệ thống.");

assert.match(client, /if \(recurrence === TASK_RECURRENCE_NONE \|\| sourceTask\.recurrenceStoppedAt \|\| !sourceTask\.due\) return;/, "Bộ sinh định kỳ phải bỏ qua chuỗi đã dừng.");
assert.match(client, /task-stop-recurrence-button/, "Chi tiết công việc phải có nút Dừng định kỳ.");
assert.match(edge, /action === "stop-recurring-task" && request\.method === "POST"/, "Edge Function phải có endpoint dừng chuỗi.");
assert.match(edge, /function canStopRecurringSeries\(/, "Máy chủ phải kiểm tra quyền dừng định kỳ.");
const edgePermission = edge.match(/function canStopRecurringSeries\(state: JsonRecord, actor: JsonRecord, source: JsonRecord\): boolean \{[\s\S]*?\n\}/)?.[0];
assert.ok(edgePermission, "Thiếu hàm phân quyền dừng chuỗi phía máy chủ.");
const permissionSandbox = {
  isAdmin: (actor) => actor.role === "admin",
  isDirector: (actor) => actor.role === "director",
  recurrenceOwnerForDate: () => ({ id: "owner", departmentId: "dept-1" }),
  vietnamDateKey: () => today,
  accountPersonId: (_state, actor) => actor.personId || "",
  taskParticipantPerson: (_state, id) => ({ id, roleId: id === "lead" ? "truong-phong-kt" : "employee", departmentId: "dept-1" }),
  hasDepartmentManagement: (actor) => ["manager", "deputy_manager"].includes(actor.role),
  accountDepartmentId: (_state, actor) => actor.departmentId || "",
};
vm.createContext(permissionSandbox);
vm.runInContext(edgePermission.replace("function canStopRecurringSeries(state: JsonRecord, actor: JsonRecord, source: JsonRecord): boolean", "function canStopRecurringSeries(state, actor, source)"), permissionSandbox);
assert.equal(permissionSandbox.canStopRecurringSeries({}, { role: "employee", personId: "owner", departmentId: "dept-1" }, {}), true, "Người đang phụ trách phải được dừng chuỗi của mình.");
assert.equal(permissionSandbox.canStopRecurringSeries({}, { role: "employee", personId: "lead", departmentId: "dept-1" }, {}), true, "Trưởng phòng được nhận diện theo chức vụ, khớp với giao diện.");
assert.equal(permissionSandbox.canStopRecurringSeries({}, { role: "employee", personId: "other", departmentId: "dept-2" }, {}), false, "Người ngoài phòng và không phụ trách không được dừng chuỗi.");
assert.equal(permissionSandbox.canStopRecurringSeries({}, { role: "director" }, {}), true, "Ban giám đốc được dừng chuỗi khi cần.");
assert.match(edge, /function migrateTaskCategoriesForCatalogChange\(/, "Máy chủ phải ánh xạ nhiệm vụ sang mục danh mục được chỉnh sửa.");
assert.match(php, /if \(\$action === 'stop-recurring-task' && \$_SERVER\['REQUEST_METHOD'\] === 'POST'\)/, "PHP shared-sync cũng phải hỗ trợ dừng chuỗi định kỳ.");
assert.match(php, /str_starts_with\(\$positionId, 'truong-phong-'\)/, "PHP shared-sync phải nhận Trưởng phòng theo chức vụ, đồng nhất với Edge Function.");

console.log("recurring_task_stop=passed");
