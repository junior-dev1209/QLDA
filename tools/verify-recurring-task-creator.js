const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");

function extractFunction(source, name, nextFunctionName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`\nfunction ${nextFunctionName}(`, start);
  assert.notEqual(start, -1, `${name} phải tồn tại.`);
  assert.notEqual(end, -1, `${name} phải kết thúc trước ${nextFunctionName}.`);
  return source.slice(start, end).trim();
}

function recurringCreator(task, owner, accounts) {
  const recurrence = String(task.recurrence || "").toLowerCase();
  const recurringValues = ["daily", "weekly", "monthly", "quarterly", "hàng ngày", "hàng tuần", "hàng tháng", "hàng quý", "hang ngay", "hang tuan", "hang thang", "hang quy"];
  if (task.kind !== "regular" || !recurringValues.includes(recurrence)) return null;
  const account = accounts.find((item) => !item.disabled && item.personId === owner.id);
  return { id: account?.id || owner.id, name: owner.name };
}

const owner = { id: "person-huong", name: "Nguyễn Thu Hương" };
const accounts = [{ id: "account-huong", personId: "person-huong", disabled: false }];
for (const recurrence of ["daily", "weekly", "monthly", "quarterly"]) {
  assert.deepEqual(
    recurringCreator({ kind: "regular", recurrence }, owner, accounts),
    { id: "account-huong", name: "Nguyễn Thu Hương" },
    `${recurrence}: Người tạo phải là người thực hiện, không phải người đang đăng nhập.`,
  );
}
assert.deepEqual(
  recurringCreator({ kind: "regular", recurrence: "Hàng tháng" }, owner, accounts),
  { id: "account-huong", name: "Nguyễn Thu Hương" },
  "Mẫu định kỳ cũ ghi theo nhãn tiếng Việt cũng phải nhận đúng người tạo.",
);
assert.equal(recurringCreator({ kind: "regular", recurrence: "none" }, owner, accounts), null, "Việc không định kỳ phải giữ nguyên quy tắc người tạo.");
assert.deepEqual(
  recurringCreator({ kind: "regular", recurrence: "weekly" }, owner, []),
  { id: "person-huong", name: "Nguyễn Thu Hương" },
  "Nhân sự chưa có tài khoản vẫn phải được ghi nhận đúng tên.",
);

assert.match(client, /function recurringTaskCreatorForOwner\(task\)/, "Khách phải nhận diện người tạo theo người thực hiện cho việc định kỳ.");
assert.match(client, /const recurringCreator = recurringTaskCreatorForOwner\(audited\);[\s\S]*?audited\.createdBy = recurringCreator\.name;/, "Công việc định kỳ mới phải được đóng dấu đúng ngay tại giao diện.");
assert.match(client, /function taskRecordedCreatorName\(task, fallback = "Chưa ghi nhận"\)/, "Bản ghi định kỳ cũ phải hiển thị đúng người thực hiện.");
assert.match(client, /<strong>Người tạo<\/strong>\$\{escapeHtml\(taskRecordedCreatorName\(task\)\)\}/, "Màn hình chi tiết phải dùng tên người tạo đã chuẩn hóa.");
assert.match(edge, /function recurringTaskCreator\(state: JsonRecord, task: JsonRecord\)/, "Máy chủ phải tự quyết định người tạo bản ghi định kỳ.");
assert.match(edge, /saved\.createdBy = recurringCreator\?\.name \|\| String\(actor\.displayName/, "Máy chủ không được tin dữ liệu người tạo do trình duyệt gửi lên.");
assert.match(edge, /else if \(recurringCreator\) \{[\s\S]*?saved\.createdBy = recurringCreator\.name;/, "Bản ghi định kỳ cũ phải được sửa đúng khi có lần cập nhật hợp lệ tiếp theo.");

const recurrenceConstants = {
  TASK_RECURRENCE_NONE: "none",
  TASK_RECURRENCE_DAILY: "daily",
  TASK_RECURRENCE_WEEKLY: "weekly",
  TASK_RECURRENCE_MONTHLY: "monthly",
  TASK_RECURRENCE_QUARTERLY: "quarterly",
};
const nextRecurringOccurrence = vm.runInNewContext(
  `(${extractFunction(client, "nextRecurringOccurrence", "ensureRecurringTasksForPeriod")})`,
  {
    ...recurrenceConstants,
    taskCompletionNeedsReview: (task) => task?.status === "Hoàn thành" && task?.completionReviewStatus === "pending",
    normalizeTaskRecurrence: (task) => task.recurrence,
    recurrenceStepMonths: (recurrence) => recurrence === "monthly" ? 1 : recurrence === "quarterly" ? 3 : 0,
    addDaysToIsoDate: (date, offset) => {
      const result = new Date(`${date}T00:00:00Z`);
      result.setUTCDate(result.getUTCDate() + offset);
      return result.toISOString().slice(0, 10);
    },
    addMonthsToIsoDate: (date, offset, preferredDay) => {
      const [year, month] = date.split("-").map(Number);
      const target = new Date(Date.UTC(year, month - 1 + offset, 1));
      const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
      target.setUTCDate(Math.min(preferredDay, lastDay));
      return target.toISOString().slice(0, 10);
    },
  },
);

for (const [recurrence, due, expectedDue] of [
  ["daily", "2026-11-03", "2026-11-04"],
  ["weekly", "2026-11-03", "2026-11-10"],
  ["monthly", "2026-01-31", "2026-02-28"],
  ["quarterly", "2026-10-31", "2027-01-31"],
]) {
  const next = nextRecurringOccurrence(
    { recurrence, due, startDate: due, recurrenceAnchorDay: Number(due.slice(8, 10)) },
    { status: "Hoàn thành", completionReviewStatus: "pending", due, startDate: due },
  );
  assert.equal(next?.due, expectedDue, `${recurrence}: chỉ tạo đúng kỳ kế tiếp.`);
  assert.equal(next?.startDate, expectedDue, `${recurrence}: ngày bắt đầu được dịch cùng kỳ.`);
}
assert.equal(
  nextRecurringOccurrence(
    { recurrence: "daily", due: "2026-11-03" },
    { status: "Đang thực hiện", due: "2026-11-03" },
  ),
  null,
  "Không sinh kỳ mới khi kỳ hiện tại chưa hoàn thành chờ duyệt.",
);
assert.equal(
  nextRecurringOccurrence(
    { recurrence: "daily", due: "2026-11-03" },
    { status: "Hoàn thành", completionReviewStatus: "passed", due: "2026-11-03" },
  ),
  null,
  "Không sinh kỳ mới sau khi kỳ hiện tại đã được duyệt xong.",
);
assert.equal(
  nextRecurringOccurrence(
    { recurrence: "daily", due: "2026-11-03", recurrenceStoppedAt: "2026-11-03T10:00:00Z" },
    { status: "Hoàn thành", completionReviewStatus: "pending", due: "2026-11-03" },
  ),
  null,
  "Chuỗi đã dừng không được sinh kỳ mới.",
);
assert.match(client, /const latestTask = seriesTasks\.reduce[\s\S]*?nextRecurringOccurrence\(sourceTask, latestTask\)/, "Chỉ kỳ mới nhất trong chuỗi mới được quyết định sinh kỳ kế tiếp.");
assert.match(client, /additions\.push\(repeatedTask\)/, "Mỗi chuỗi chỉ thêm bản ghi kế tiếp đã được xác nhận.");

function runRecurringEnsure(tasks) {
  const context = {
    state: { tasks },
    derivedStateRevision: 1,
    recurringTasksEnsuredRevision: -1,
    recurringTasksEnsuredPeriod: "",
    TASK_KIND_REGULAR: "regular",
    TASK_RECURRENCE_NONE: "none",
    TASK_RECURRENCE_DAILY: "daily",
    TASK_RECURRENCE_WEEKLY: "weekly",
    TASK_RECURRENCE_MONTHLY: "monthly",
    TASK_RECURRENCE_QUARTERLY: "quarterly",
    TASK_STATUS_PREPARING: "Chuẩn bị thực hiện",
    normalizeTaskKind: (task) => task.kind || "regular",
    normalizeTaskRecurrence: (task) => task.recurrence || "none",
    taskCompletionNeedsReview: (task) => task?.status === "Hoàn thành" && task?.completionReviewStatus === "pending",
    recurrenceStepMonths: (recurrence) => recurrence === "monthly" ? 1 : recurrence === "quarterly" ? 3 : 0,
    addDaysToIsoDate: (date, offset) => {
      const result = new Date(`${date}T00:00:00Z`);
      result.setUTCDate(result.getUTCDate() + offset);
      return result.toISOString().slice(0, 10);
    },
    addMonthsToIsoDate: (date, offset, preferredDay) => {
      const [year, month] = date.split("-").map(Number);
      const target = new Date(Date.UTC(year, month - 1 + offset, 1));
      const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
      target.setUTCDate(Math.min(preferredDay, lastDay));
      return target.toISOString().slice(0, 10);
    },
    periodIndex: (period) => /^\d{4}-\d{2}$/.test(period) ? Number(period.replace("-", "")) : -1,
    recurrenceOwnerForDue: () => ({ id: "person-1", name: "Nguyễn Văn A" }),
    applyRecordAudit: (record) => record,
    uid: () => "next-task",
    personById: () => ({ departmentId: "dept-1" }),
    taskPeriod: (task) => task.due.slice(0, 7),
    formatTaskDeadline: (task) => task.due,
    taskRecurrenceLabels: { daily: "Hàng ngày" },
    logActivity: () => {},
    saveState: () => {},
  };
  context.nextRecurringOccurrence = vm.runInNewContext(
    `(${extractFunction(client, "nextRecurringOccurrence", "ensureRecurringTasksForPeriod")})`,
    context,
  );
  const ensure = vm.runInNewContext(
    `(${extractFunction(client, "ensureRecurringTasksForPeriod", "activityTargetKey")})`,
    context,
  );
  return { context, ensure };
}

const pendingRoot = {
  id: "series-1",
  kind: "regular",
  recurrence: "daily",
  due: "2026-11-03",
  startDate: "2026-11-03",
  ownerId: "person-1",
  ownerName: "Nguyễn Văn A",
  title: "Cập nhật hồ sơ",
  status: "Hoàn thành",
  completionReviewStatus: "pending",
};
const pendingSeries = runRecurringEnsure([pendingRoot]);
assert.equal(pendingSeries.ensure("2026-11"), true, "Kỳ chờ phê duyệt phải tạo một kỳ kế tiếp.");
assert.equal(pendingSeries.context.state.tasks.length, 2, "Không tạo chuỗi nhiều kỳ tương lai cùng lúc.");
assert.equal(pendingSeries.context.state.tasks[1].due, "2026-11-04", "Ngày hạn của kỳ kế tiếp phải đúng nhịp định kỳ.");
assert.equal(pendingSeries.context.state.tasks[1].status, "Chuẩn bị thực hiện", "Kỳ kế tiếp bắt đầu ở trạng thái chuẩn bị.");
pendingSeries.context.derivedStateRevision += 1;
assert.equal(pendingSeries.ensure("2026-11"), false, "Không sinh thêm kỳ khi kỳ kế tiếp chưa hoàn thành chờ duyệt.");
assert.equal(pendingSeries.context.state.tasks.length, 2, "Lặp lại đồng bộ không được nhân đôi hoặc tạo chuỗi.");

const activeSeries = runRecurringEnsure([{ ...pendingRoot, status: "Đang thực hiện", completionReviewStatus: "" }]);
assert.equal(activeSeries.ensure("2026-11"), false, "Không tạo kỳ mới khi công việc hiện tại còn đang thực hiện.");
assert.equal(activeSeries.context.state.tasks.length, 1);

const legacyFutureSeries = runRecurringEnsure([
  pendingRoot,
  { ...pendingRoot, id: "legacy-future", recurrenceSourceId: "series-1", recurrenceSeriesId: "series-1", due: "2026-11-05", startDate: "2026-11-05", status: "Chuẩn bị thực hiện", completionReviewStatus: "" },
]);
assert.equal(legacyFutureSeries.ensure("2026-11"), false, "Một kỳ tương lai đã tồn tại không được nhân thêm kỳ mới.");
assert.equal(legacyFutureSeries.context.state.tasks.length, 2, "Không tự xóa bản ghi kỳ tương lai cũ.");

console.log("recurring_task_creator=passed");
