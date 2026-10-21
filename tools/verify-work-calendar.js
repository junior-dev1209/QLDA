const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { stripTypeScriptTypes } = require("node:module");
const calendarSource = fs.readFileSync("work-calendar.js", "utf8");
const source = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("work-calendar.css", "utf8");
const sandbox = { document: { addEventListener() {} }, TextEncoder, Date };
vm.createContext(sandbox);
vm.runInContext(calendarSource + "\nglobalThis.model = WorkCalendar;", sandbox);
const model = sandbox.model;
const plain = (value) => JSON.parse(JSON.stringify(value));
const employee = { id: "a1", role: "employee", personId: "p1", departmentId: "gpmb" };
const manager = { id: "m1", role: "manager", departmentId: "gpmb" };
const admin = { id: "admin", role: "admin" };
const meeting = { id: "e1", title: "Họp tiến độ", date: "2026-09-07", time: "08:00", endTime: "09:00", location: "Phòng họp 1", leaderIds: ["director"], participantIds: ["p1"], departmentIds: ["gpmb"], allHands: false, createdById: "m1", createdAt: "2026-09-01T00:00:00Z", note: "", conclusion: "" };
assert.equal(model.weekStart("2026-09-07"), "2026-09-07");
assert.equal(model.weekStart("2026-09-13"), "2026-09-07");
assert.equal(model.weekStart("2026-01-01"), "2025-12-29");
assert.equal(model.weekNumber("2026-09-07"), 37);
assert.equal(model.weekNumber("2026-01-01"), 1);
assert.equal(model.addDays("2024-02-28", 1), "2024-02-29");
assert.equal(model.parseDate("2026-02-29"), null);
assert.equal(model.validate(meeting), "");
assert.equal(model.validate({ ...meeting, title: "nội dung công việc ".repeat(600) }), "");
assert.notEqual(model.validate({ ...meeting, endTime: "07:59" }), "");
assert.notEqual(model.validate({ ...meeting, date: "2026-02-30" }), "");
assert.equal(model.validate({ ...meeting, departmentIds: [] }), "");
assert.notEqual(model.validate({ ...meeting, recurrence: "monthly" }), "");
assert.deepEqual(
  plain(model.occurrences({ ...meeting, date: "2026-08-31", recurrence: "weekly" }, "2026-09-07").map((event) => event.date)),
  ["2026-09-07"],
  "Lịch lặp hàng tuần phải xuất hiện đúng thứ trong tuần được xem.",
);
assert.equal(
  model.occurrences({ ...meeting, date: "2026-09-07", recurrence: "daily" }, "2026-09-07").length,
  7,
  "Lịch lặp hàng ngày phải xuất hiện đầy đủ trong tuần được xem.",
);
const events = [meeting, { ...meeting, id: "e2", date: "2026-09-13", time: "09:00", participantIds: [], departmentIds: ["kht"] }, { ...meeting, id: "e3", date: "2026-09-14" }];
const filters = { week: "2026-09-07", account: employee, personId: "p1", names: (event) => event.departmentIds };
assert.deepEqual(plain(model.filter(events, filters).map((event) => event.id)), ["e1", "e2"]);
assert.deepEqual(plain(model.filter(events, { ...filters, tab: "mine" }).map((event) => event.id)), ["e1"]);
assert.equal(model.filter(events, { ...filters, departmentId: "kht" })[0].id, "e2");
assert.equal(model.filter(events, { ...filters, search: "PHONG HOP" }).length, 2);
assert.equal(model.filter(events, { ...filters, search: "gpmb" }).length, 1);
assert.equal(model.filter(events, { ...filters, leaderId: "other" }).length, 0);
assert.equal(model.isMine({ ...meeting, allHands: true }, employee, "p3"), true);
assert.equal(model.canManage(employee), false);
assert.equal(model.canManage(manager), false);
assert.equal(model.canManage(manager, true), true);
assert.equal(model.canManage({ ...manager, id: "m2" }, true), true);
assert.equal(model.canManage(admin), true);
assert.equal(model.canManage({ role: "director" }), true);
const now = new Date("2026-09-07T00:45:00Z");
assert.equal(model.reminderEnabled(meeting), true, "Lịch cũ chưa có thiết lập nhắc phải mặc định được nhắc.");
assert.equal(model.reminderEnabled({ ...meeting, reminderEnabled: false }), false, "Có thể tắt nhắc riêng cho từng lịch.");
assert.equal(model.upcoming(events, employee, "p1", 15, now).length, 1);
assert.equal(model.upcoming([{ ...meeting, reminderEnabled: false }], employee, "p1", 15, now).length, 0, "Lịch tắt nhắc không được đưa vào thông báo sắp đến giờ.");
assert.equal(model.upcoming(events, employee, "p1", 5, now).length, 0);
assert.equal(model.upcoming(events, employee, "p1", 0, now).length, 0);
assert.equal(model.upcoming(events, employee, "other", 15, now).length, 0);
assert.equal(model.upcoming(events, null, "p1", 15, now).length, 0);
assert.equal(model.upcoming(events, employee, "p1", 60, new Date("2026-09-07T01:02:00Z")).length, 0);
const ics = model.toIcs([{ ...meeting, title: "Họp; nhóm, " + "Tiến độ ".repeat(40), note: "Dòng 1\nDòng 2" }], now);
assert.ok(ics.includes("DTSTART:20260907T010000Z"));
assert.ok(ics.includes("DTEND:20260907T020000Z"));
assert.ok(ics.includes("Họp\\; nhóm\\,"));
assert.ok(ics.includes("Dòng 1\\nDòng 2"));
ics.split("\r\n").forEach((line) => assert.ok(Buffer.byteLength(line) <= 75));

function extract(text, name) {
  const start = text.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = text.indexOf("\nfunction ", start + 1);
  return text.slice(start, end < 0 ? text.length : end);
}
const server = {
  records: (state, name) => state[name] || [], recordId: (record) => record.id,
  isRecord: (record) => !!record && typeof record === "object",
  clone: (record) => JSON.parse(JSON.stringify(record)),
  completedTaskStatus: (status) => status === "Hoàn thành",
  isBlankTaskField: (value) => String(value ?? "").trim() === "",
  moduleIsAvailableToAccount: (state) => !state.disableCalendar,
  isAdmin: (actor) => actor.role === "admin", isDirector: (actor) => actor.role === "director",
  hasDepartmentManagement: (actor) => ["manager", "deputy_manager"].includes(actor.role),
  accountRole: (actor) => actor.role, accountDepartmentId: (state, actor) => actor.departmentId,
  accountAccessGrants: (actor) => ({ calendarWrite: actor.accessGrants?.calendarWrite === true }),
  canCreateTask: () => true, canUpdateTask: () => true,
};
vm.createContext(server);
for (const name of ["calendarIds", "validCalendarEvent", "canManageCalendarEvent", "calendarPublicDirectory", "canUpsert", "canDelete"]) {
  vm.runInContext(stripTypeScriptTypes(extract(edge, name)), server);
}
[
  "normalizeCompletionReviewQuality",
  "completionReviewReportDecision",
  "completionReviewReportQuality",
  "latestCompletionReviewEvidence",
  "completedAfterDeadline",
  "recoverTaskCompletionReviewFromHistory",
  "normalizeTaskCompletionLifecycle",
].forEach((name) => vm.runInContext(stripTypeScriptTypes(extract(edge, name)), server));
const db = { people: [{ id: "p1", name: "Nhân viên", password: "private", phone: "private" }, { id: "director", name: "Giám đốc" }], departments: [{ id: "gpmb" }, { id: "kht" }], tasks: [], calendarEvents: [meeting] };
const calendarEditor = { ...employee, accessGrants: { calendarWrite: true } };
assert.equal(server.canUpsert(db, manager, "calendarEvents", undefined, meeting), false);
assert.equal(server.canUpsert(db, employee, "calendarEvents", undefined, { ...meeting, createdById: employee.id }), false);
assert.equal(server.canUpsert(db, calendarEditor, "calendarEvents", undefined, { ...meeting, createdById: employee.id }), true);
assert.equal(server.canUpsert(db, calendarEditor, "calendarEvents", meeting, { ...meeting, title: "Sửa lịch", departmentIds: ["kht"] }), true);
assert.equal(server.canUpsert(db, { ...manager, id: "other" }, "calendarEvents", meeting, meeting), false);
assert.equal(server.canUpsert(db, admin, "calendarEvents", meeting, { ...meeting, createdById: "spoof" }), false);
assert.equal(server.canUpsert(db, admin, "calendarEvents", meeting, { ...meeting, date: "2026-02-30" }), false);
assert.equal(server.canUpsert(db, calendarEditor, "calendarEvents", meeting, { ...meeting, departmentIds: ["kht"] }), true);
assert.equal(server.canUpsert(db, admin, "calendarEvents", meeting, { ...meeting, participantIds: ["unknown"] }), false);
assert.equal(server.canUpsert(db, calendarEditor, "calendarEvents", meeting, { ...meeting, title: "nội dung công việc ".repeat(600), recurrence: "weekly" }), true);
assert.equal(server.canUpsert(db, calendarEditor, "calendarEvents", meeting, { ...meeting, recurrence: "daily", departmentIds: [] }), true);
assert.equal(server.canUpsert(db, calendarEditor, "calendarEvents", meeting, { ...meeting, reminderEnabled: false }), true);
assert.equal(server.canUpsert(db, calendarEditor, "calendarEvents", meeting, { ...meeting, reminderEnabled: "false" }), false, "Máy chủ chỉ chấp nhận cờ nhắc lịch dạng boolean.");
assert.equal(server.canUpsert(db, calendarEditor, "calendarEvents", meeting, { ...meeting, recurrence: "monthly" }), false);
assert.equal(server.canUpsert({ ...db, disableCalendar: true }, calendarEditor, "calendarEvents", meeting, meeting), false);
assert.equal(server.canDelete(db, calendarEditor, "calendarEvents", meeting), true);
assert.equal(server.canDelete({ ...db, tasks: [{ sourceCalendarEventId: "e1" }] }, admin, "calendarEvents", meeting), false);
assert.equal(server.canUpsert(db, admin, "tasks", undefined, { sourceCalendarEventId: "missing" }), false);
assert.equal(server.canUpsert(db, admin, "tasks", undefined, { sourceCalendarEventId: "e1" }), true);
assert.equal(server.canUpsert(db, employee, "tasks", undefined, { sourceCalendarEventId: "e1" }), false);
assert.equal(server.canUpsert(db, calendarEditor, "tasks", undefined, { sourceCalendarEventId: "e1" }), true);
assert.equal(server.normalizeTaskCompletionLifecycle({ status: "Quá hạn", progress: 0 }).status, "Chuẩn bị thực hiện");
assert.equal(server.normalizeTaskCompletionLifecycle({ status: "Quá hạn", progress: 40 }).status, "Đang thực hiện");
const directory = plain(server.calendarPublicDirectory(db));
assert.equal(directory[0].password, undefined);
assert.equal(directory[0].phone, undefined);

const statusContext = { TASK_STATUS_PREPARING: "Chuẩn bị thực hiện", TASK_STATUS_CLOSED: "Kết thúc", TASK_STATUS_COMPLETED: "Hoàn thành", normalizeTaskStatus: (value) => value, Date,
  taskDeadlineDate: (task) => task.due ? new Date(`${task.due}T23:59:00`) : null,
  normalizeSearchText: (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase() };
vm.createContext(statusContext);
vm.runInContext(extract(source, "getDueStatus"), statusContext);
vm.runInContext(extract(source, "taskBulkImportStatus"), statusContext);
vm.runInContext(extract(calendarSource, "editableTaskStatus"), statusContext);
assert.equal(statusContext.editableTaskStatus({ status: "Quá hạn", progress: 40 }), "Đang thực hiện");
assert.equal(statusContext.editableTaskStatus({ status: "Quá hạn", progress: 0 }), "Chuẩn bị thực hiện");
assert.equal(statusContext.getDueStatus({ status: "Đang thực hiện", due: "2000-01-01" }), "Quá hạn");
assert.equal(statusContext.getDueStatus({ status: "Hoàn thành", due: "2000-01-01" }), "Hoàn thành");
assert.equal(statusContext.getDueStatus({ status: "Quá hạn", progress: 40, due: "2099-12-31" }), "Đang thực hiện");
assert.equal(statusContext.taskBulkImportStatus("Quá hạn"), "Đang thực hiện");
const titleContext = {};
vm.createContext(titleContext);
vm.runInContext(extract(calendarSource, "calendarTitleWithCapitalizedFirstLetter"), titleContext);
assert.equal(titleContext.calendarTitleWithCapitalizedFirstLetter("nội dung công việc"), "Nội dung công việc");
assert.equal(titleContext.calendarTitleWithCapitalizedFirstLetter("  kế hoạch tuần"), "  Kế hoạch tuần");
const leaderContext = {
  state: { calendarDirectory: [], people: [
    { id: "director", departmentId: "ban-giam-doc", roleId: "giam-doc" },
    { id: "manager", departmentId: "gpmb", roleId: "truong-phong-gpmb" },
    { id: "deputy", departmentId: "gpmb", roleId: "pho-phong-gpmb" },
    { id: "employee", departmentId: "gpmb", roleId: "nhan-vien" },
  ] },
  roleById: (id) => ({
    "truong-phong-gpmb": { accountRole: "manager", name: "Trưởng phòng" },
    "pho-phong-gpmb": { accountRole: "deputy_manager", name: "Phó phòng" },
  })[id] || null,
};
vm.createContext(leaderContext);
["calendarDirectory", "calendarLeaders", "calendarFilterLeaders"].forEach((name) => vm.runInContext(extract(calendarSource, name), leaderContext));
assert.deepEqual(plain(leaderContext.calendarLeaders().map((person) => person.id)), ["director", "manager", "deputy"], "Danh sách Lãnh đạo phải có cả Trưởng phòng và Phó phòng.");
assert.deepEqual(plain(leaderContext.calendarFilterLeaders().map((person) => person.id)), ["director"], "Bộ lọc Lãnh đạo chỉ được hiển thị Ban giám đốc.");
const statusField = html.slice(html.indexOf('<fieldset class="task-status-field'), html.indexOf('<label class="task-progress-field'));
assert.equal((statusField.match(/name="taskStatusChoice"/g) || []).length, 3);
assert.equal(statusField.includes("Quá hạn"), false);
assert.ok(source.includes("calendarEvents: exported.calendarEvents || []"));
assert.ok(edge.indexOf('"calendarEvents", "tasks"') > 0);
assert.ok(html.includes('id="calendarMobileRows"'));
assert.ok(html.includes('id="accountCanManageCalendar"'));
assert.ok(html.includes('id="calendarRecurrence"'));
assert.ok(html.includes('id="calendarReminderEnabled"'));
assert.ok(html.includes('id="calendarDetailDialog"'));
assert.ok(html.includes('id="calendarDetailEdit"'));
assert.ok(html.includes('<option value="daily">Hàng ngày</option>'));
assert.ok(html.includes("Phòng chuẩn bị (nếu có)"));
assert.ok(html.includes("<th>Thành phần tham dự</th>"));
assert.equal(html.includes('id="calendarTitle" required maxlength="500"'), false, "Nội dung lịch không được giới hạn 500 ký tự.");
assert.ok(source.includes("calendarWrite: grants.calendarWrite === true"));
assert.ok(calendarSource.includes('function openCalendarDialog(id = "", mode = id ? "detail" : "edit")'));
assert.ok(calendarSource.includes("function openCalendarDetailDialog(id)"));
assert.ok(calendarSource.includes("function calendarTitleWithCapitalizedFirstLetter(value)"));
assert.ok(calendarSource.includes("reminderEnabled: byId(\"calendarReminderEnabled\").checked"));
assert.ok(calendarSource.includes("return reminderEnabled(event) && isMine(event, account, personId)"));
assert.ok(html.includes('<label class="task-category-field">Danh mục nhiệm vụ'), "Biểu mẫu công việc phải dùng nhãn Danh mục nhiệm vụ.");
assert.ok(source.includes('[TASK_KIND_REGULAR]: "Danh mục nhiệm vụ"'), "Loại nhiệm vụ thường xuyên phải dùng nhãn mới.");
assert.ok(source.includes('category: ["danh mục nhiệm vụ", "nhiệm vụ", "danh mục kpi cá nhân"'), "Nhập liệu phải nhận cả nhãn mới và tệp cũ.");
assert.ok(calendarSource.includes('addEventListener("paste", () => requestAnimationFrame(normalizeCalendarTitleInput))'));
assert.ok(calendarSource.includes("manager\", \"deputy_manager"));
assert.ok(edge.includes('["none", "daily", "weekly"].includes(recurrence)'));
assert.equal(edge.includes("event.title.length <= 500"), false, "Máy chủ không được chặn nội dung lịch dài.");
assert.match(css, /\.task-priority-field,[\s\S]*?\.task-due-field \{ grid-column: span 3; \}/, "Bốn trường thiết lập công việc phải có kích thước đồng đều trên một hàng.");
assert.match(css, /\.calendar-form > \.calendar-recurrence-field \{ grid-column: 1 \/ span 1; grid-row: 3; \}/, "Lặp lại phải nằm ở cột đầu của hàng thiết lập lịch.");
assert.match(css, /\.calendar-form > \.calendar-reminder-field \{ grid-column: 1 \/ span 1; grid-row: 4; \}/, "Nhắc lịch phải nằm thẳng bên dưới Lặp lại.");
assert.match(css, /\.calendar-reminder-toast \{[\s\S]*?bottom: 24px;[\s\S]*?left: 24px;[\s\S]*?right: auto;/, "Toast lịch dự phòng phải hiển thị ở góc dưới bên trái.");
assert.match(css, /\.calendar-reminder-toast \{ bottom: 85px; left: 16px; right: auto; \}/, "Toast lịch trên mobile phải hiển thị ở góc dưới bên trái.");
assert.match(css, /\.calendar-mobile-list \{ display: grid;/, "Lịch phải có bố cục thẻ riêng cho thiết bị di động.");
console.log("work_calendar=passed (week/date, filters, permissions, reminders, ICS, server validation, automatic overdue)");
