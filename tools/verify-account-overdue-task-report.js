const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("script.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${name}.`);
  const next = source.indexOf("\nfunction ", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

const state = {
  people: [
    { id: "person-a", departmentId: "dept-a" },
    { id: "person-b", departmentId: "dept-b" },
  ],
  accounts: [
    { id: "account-a", displayName: "Nguyễn Văn A", username: "nguyenvana", personId: "person-a", departmentId: "dept-a" },
    { id: "account-b", displayName: "Trần Văn B", username: "tranvanb", personId: "person-b", departmentId: "dept-b" },
    { id: "account-c", displayName: "Tài khoản không liên quan", username: "other", personId: "", departmentId: "dept-b" },
  ],
  tasks: [
    { id: "overdue-a", title: "Việc A", createdById: "account-a", ownerId: "person-b", collaboratorIds: ["person-a"], due: "2020-01-01", status: "Đang thực hiện" },
    { id: "overdue-b", title: "Việc B", createdById: "account-b", ownerId: "person-b", collaboratorIds: ["person-a"], due: "2020-01-02", status: "Đang thực hiện" },
    { id: "overdue-legacy", title: "Việc cũ", createdBy: "nguyenvana", due: "2020-01-03", status: "Chuẩn bị thực hiện" },
    { id: "not-due", title: "Việc chưa quá hạn", createdById: "account-a", ownerId: "person-a", due: "2099-01-01", status: "Đang thực hiện" },
    { id: "completed", title: "Việc đã hoàn thành", createdById: "account-a", ownerId: "person-a", due: "2020-01-01", status: "Hoàn thành" },
  ],
};

const sandbox = {
  state,
  TASK_STATUS_CLOSED: "Đã kết thúc",
  TASK_STATUS_COMPLETED: "Hoàn thành",
  TASK_STATUS_PREPARING: "Chuẩn bị thực hiện",
  personById: (id) => state.people.find((person) => person.id === id),
  normalizeSearchText: (value) => String(value || "").toLocaleLowerCase("vi").trim(),
  taskParticipantPersonId: (id) => String(id || "").trim(),
  taskCollaboratorIds: (task) => Array.isArray(task?.collaboratorIds) ? task.collaboratorIds : [],
  normalizeTaskStatus: (status) => String(status || "").trim(),
  taskDeadlineDate: (task) => task?.due ? new Date(`${task.due}T23:59:00`) : null,
};
vm.createContext(sandbox);
[
  "accountDepartmentIdForStatistics",
  "taskCreatorAccountLookup",
  "taskCreatorAccount",
  "editableTaskStatus",
  "getDueStatus",
  "taskAccountRelationLabels",
  "accountRelatedOverdueTasks",
  "accountOverdueTaskStatistics",
  "accountOverdueTaskReportEntries",
  "spreadsheetSafeText",
  "escapeSpreadsheetXml",
  "spreadsheetXmlRow",
  "reportFileNamePart",
].forEach((name) => vm.runInContext(extractFunction(name), sandbox));

const all = sandbox.accountOverdueTaskStatistics();
assert.equal(all.totalRelated, 5, "Phải cộng lượt công việc quá hạn cho từng tài khoản liên quan.");
assert.equal(all.rows.find((row) => row.account.id === "account-a").overdueCount, 3, "Người tạo, người thực hiện và người phối hợp phải đều được nhận diện.");
assert.equal(all.rows.find((row) => row.account.id === "account-b").overdueCount, 2, "Người thực hiện phải có đủ công việc quá hạn liên quan.");
assert.equal(all.rows.find((row) => row.account.id === "account-c").overdueCount, 0, "Tài khoản không liên quan không được nhận công việc quá hạn.");
assert.deepEqual(
  Array.from(sandbox.accountRelatedOverdueTasks(state.accounts[0])[0].relationLabels),
  ["Người tạo", "Người phối hợp"],
  "Một công việc có nhiều vai trò phải hiển thị đủ quan hệ nhưng chỉ được đếm một lần.",
);
assert.equal(sandbox.accountOverdueTaskStatistics("dept-a").totalRelated, 3, "Lọc phòng phải chỉ tính tài khoản thuộc phòng đã chọn.");
assert.equal(sandbox.accountOverdueTaskReportEntries().length, 5, "Báo cáo tổng phải có đủ một dòng cho mỗi lượt công việc quá hạn đã thống kê.");
assert.equal(sandbox.accountOverdueTaskReportEntries("dept-a").length, 3, "Báo cáo tổng phải bám theo bộ lọc phòng hiện tại.");
assert.equal(sandbox.spreadsheetSafeText("=SUM(A1:A2)"), "'=SUM(A1:A2)", "Dữ liệu Excel phải chống chèn công thức.");
assert.ok(sandbox.escapeSpreadsheetXml("A & B").includes("&amp;"), "Xuất Excel phải mã hóa ký tự XML.");
assert.ok(sandbox.spreadsheetXmlRow(["Công việc", "Quá hạn"], "Header").includes('ss:StyleID="Header"'), "Dòng Excel phải giữ định dạng tiêu đề.");
assert.equal(sandbox.reportFileNamePart("Đặng Văn A"), "dang-van-a", "Tên tệp xuất phải tương thích trên thiết bị.");

[
  "function accountOverdueTaskStatistics(departmentId = \"\")",
  "function downloadAccountOverdueTaskReport(accountId)",
  "function downloadAllOverdueTaskReport()",
  "id=\"exportAllOverdueTasks\"",
  'id="accountTaskOverdueList"',
  "data-export-overdue-account",
].forEach((marker) => assert.ok(`${source}\n${html}`.includes(marker), `Missing overdue report capability: ${marker}`));

console.log("account_overdue_task_report=passed");
