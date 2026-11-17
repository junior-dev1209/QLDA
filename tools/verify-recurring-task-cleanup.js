const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const vm = require("node:vm");

const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const php = fs.readFileSync("api/sync.php", "utf8");
const deploy = fs.readFileSync("Deploy-KpiSync.ps1", "utf8");

function extractEdgeFunction(name) {
  const start = edge.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Thiếu hàm Edge ${name}.`);
  const next = edge.indexOf("\nfunction ", start + 10);
  return edge.slice(start, next < 0 ? edge.length : next);
}

const timestampFunction = extractEdgeFunction("taskAuditTimestamp")
  .replace("function taskAuditTimestamp(value: unknown): number | null", "function taskAuditTimestamp(value)");
const stopTimestampFunction = extractEdgeFunction("taskStopTimestamp")
  .replace("function taskStopTimestamp(value: unknown): number | null", "function taskStopTimestamp(value)");
const cleanupFunction = extractEdgeFunction("cleanupStoppedRecurringTaskInstances")
  .replace(/function cleanupStoppedRecurringTaskInstances\(state: JsonRecord\): \{[\s\S]*?\n\} \{/, "function cleanupStoppedRecurringTaskInstances(state) {")
  .replaceAll("new Map<string, JsonRecord>()", "new Map()")
  .replaceAll("new Map<string, number>()", "new Map()")
  .replace("new Map<string, { source: JsonRecord; ids: string[] }>()", "new Map()")
  .replace("const activityIds: string[] = [];", "const activityIds = [];");
const seriesFunction = extractEdgeFunction("taskRecurrenceSeriesKey")
  .replace("function taskRecurrenceSeriesKey(task: JsonRecord): string", "function taskRecurrenceSeriesKey(task)");

const sandbox = {
  crypto: crypto.webcrypto,
  clone: (value) => structuredClone(value),
  records: (state, collection) => Array.isArray(state[collection]) ? state[collection] : [],
  recordId: (record) => String(record?.id || ""),
  assignedTask: (task) => task.kind === "assigned" || Boolean(task.assignedById || task.assignedAt || task.responseStatus || task.responseAt),
  recurringValueIsEnabled: (task) => ["daily", "weekly", "monthly", "quarterly", "hàng ngày", "hàng tuần", "hàng tháng", "hàng quý"].includes(String(task.recurrence || task.periodicity || "").toLowerCase()),
};
vm.createContext(sandbox);
vm.runInContext(`${timestampFunction}\n${stopTimestampFunction}\n${seriesFunction}\n${cleanupFunction}`, sandbox);

const stoppedAt = "2026-10-24T03:00:00.000Z";
const source = { id: "series-a", recurrence: "daily", recurrenceStoppedAt: stoppedAt, recurrenceStopDate: "2026-10-24", title: "Cập nhật văn bản đi hàng ngày" };
const state = {
  tasks: [
    source,
    { id: "before-stop", recurrenceSourceId: source.id, recurrenceSeriesId: source.id, createdAt: "2026-10-24T02:59:59.000Z", status: "Hoàn thành" },
    { id: "at-stop", recurrenceSourceId: source.id, recurrenceSeriesId: source.id, createdAt: stoppedAt, status: "Đã ngừng" },
    { id: "after-stop", recurrenceSourceId: source.id, recurrenceSeriesId: source.id, createdAt: "2026-10-24T03:00:01.000Z", status: "Chuẩn bị thực hiện" },
    { id: "log-fallback", recurrenceSourceId: source.id, recurrenceSeriesId: source.id, status: "Chuẩn bị thực hiện" },
    { id: "manual-task", createdAt: "2026-11-01T00:00:00.000Z", status: "Chuẩn bị thực hiện" },
    { id: "other-series", recurrenceSourceId: "series-other", recurrenceSeriesId: "series-other", createdAt: "2026-11-01T00:00:00.000Z" },
    { id: "assigned-series", recurrence: "daily", kind: "assigned", assignedById: "account-1", recurrenceStoppedAt: stoppedAt },
    { id: "assigned-child", recurrenceSourceId: "assigned-series", recurrenceSeriesId: "assigned-series", createdAt: "2026-11-01T00:00:00.000Z" },
  ],
  notifications: [
    { id: "notice-late", targetId: "after-stop" },
    { id: "notice-kept", targetId: "before-stop" },
  ],
  activityLog: [
    { id: "generation-log", action: "Tự tạo định kỳ", targetId: "log-fallback", createdAt: "2026-10-24T03:00:02.000Z" },
  ],
  deletedIds: [],
};

const cleaned = sandbox.cleanupStoppedRecurringTaskInstances(state);
assert.deepEqual(Array.from(cleaned.deletedTaskIds).sort(), ["after-stop", "log-fallback"], "Chỉ xóa các kỳ có dấu vết tạo sau thời điểm dừng.");
assert.deepEqual(Array.from(cleaned.deletedNotificationIds), ["notice-late"], "Xóa thông báo gắn với các kỳ bị dọn.");
assert.ok(cleaned.state.tasks.some((task) => task.id === "before-stop"), "Giữ kỳ được tạo trước thời điểm dừng.");
assert.ok(cleaned.state.tasks.some((task) => task.id === "at-stop"), "Giữ kỳ có thời điểm tạo đúng bằng thời điểm dừng.");
assert.ok(cleaned.state.tasks.some((task) => task.id === "manual-task"), "Không xóa công việc thủ công.");
assert.ok(cleaned.state.tasks.some((task) => task.id === "other-series"), "Không xóa công việc thuộc chuỗi khác.");
assert.ok(cleaned.state.tasks.some((task) => task.id === "assigned-child"), "Không áp dụng dọn chuỗi định kỳ thông thường lên công việc được giao.");
assert.ok(cleaned.state.activityLog.some((entry) => entry.id === "generation-log"), "Giữ nhật ký sinh công việc gốc.");
assert.equal(cleaned.activityIds.length, 1, "Ghi một nhật ký dọn cho chuỗi có dữ liệu lỗi.");
assert.match(cleaned.state.activityLog.at(-1).details, /Đã xóa 2 công việc tự sinh/);
assert.deepEqual(Array.from(sandbox.cleanupStoppedRecurringTaskInstances(cleaned.state).deletedTaskIds), [], "Dọn dữ liệu phải idempotent.");

const dateOnlyState = {
  tasks: [
    { id: "series-date-only", recurrence: "daily", recurrenceStopDate: "2026-10-24" },
    { id: "same-day", recurrenceSourceId: "series-date-only", recurrenceSeriesId: "series-date-only", createdAt: "2026-10-24T12:00:00.000Z" },
    { id: "next-day", recurrenceSourceId: "series-date-only", recurrenceSeriesId: "series-date-only", createdAt: "2026-10-25T00:00:00.000Z" },
  ],
  notifications: [],
  activityLog: [],
};
const dateOnlyCleanup = sandbox.cleanupStoppedRecurringTaskInstances(dateOnlyState);
assert.deepEqual(Array.from(dateOnlyCleanup.deletedTaskIds), ["next-day"], "Khi chỉ có ngày dừng, không xóa kỳ trong cùng ngày vì không xác định được giờ dừng.");
assert.equal(sandbox.taskStopTimestamp("2026-10-24"), Date.parse("2026-10-24T16:59:59.999Z"));

assert.match(edge, /cleanupStoppedRecurringTasksWithRetry\(\)/, "Edge phải chạy dọn dữ liệu khi tải trạng thái.");
assert.match(edge, /syncRecordProjectionForPatch\(saved\.state,[\s\S]*?tasks: \{ deletes:/, "Edge phải xóa các projection task và báo cáo tiến độ tương ứng.");
assert.match(php, /function phpCleanupStoppedRecurringTaskInstances\(/, "PHP fallback phải có cùng bộ lọc dọn dữ liệu.");
assert.match(php, /function phpTaskStopTimestamp\(/, "PHP phải áp dụng ranh giới cuối ngày khi dữ liệu cũ chỉ lưu ngày dừng.");
assert.match(php, /phpTaskIsAssigned\(\$task\)/, "PHP phải loại công việc được giao khỏi phạm vi dọn định kỳ.");
assert.match(php, /\$cleanup = phpCleanupStoppedRecurringTaskInstances\(\$snapshot\['state'\]\)/, "PHP phải dọn dữ liệu trước khi trả trạng thái online.");
assert.match(php, /\$cleanup = phpCleanupStoppedRecurringTaskInstances\(\$departmentStopEffects\['state'\]\)/, "PHP phải dọn dữ liệu cả khi lưu thay đổi.");
assert.match(edge, /recurringTaskCleanup: true/, "Edge status phải công bố khả năng dọn chuỗi đã dừng.");
assert.match(php, /'recurringTaskCleanup' => true/, "PHP status phải công bố khả năng dọn chuỗi đã dừng.");
assert.match(deploy, /-not \$status\.recurringTaskCleanup/, "Kiểm tra deploy phải xác nhận máy chủ đã có chức năng dọn.");

console.log("recurring_task_cleanup=passed");
