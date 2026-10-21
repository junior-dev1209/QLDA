const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = client.indexOf(marker);
  if (start < 0) throw new Error(`Thiếu hàm ${name}.`);
  const end = client.indexOf("\nfunction ", start + marker.length);
  return client.slice(start, end < 0 ? client.length : end);
}

[
  'id="exportMonthlyWorkReportPdf"',
  'id="dashboardMonthlyReportPeriod"',
  "Báo cáo công việc hàng tháng",
].forEach((marker) => assert.ok(html.includes(marker), `Thiếu điều khiển báo cáo tháng: ${marker}`));

[
  "function canViewMonthlyWorkReport",
  "function monthlyWorkReportLoginMetrics",
  "function monthlyWorkReportData",
  "function reportPrintAutoCloseScript",
  "function applyReportPrintAutoClose",
  "function monthlyWorkReportDocumentHtml",
  "function monthlyWorkReportPrintOverrideCss",
  "function applyMonthlyWorkReportPrintOverrides",
  "function exportMonthlyWorkReportPdf",
].forEach((marker) => assert.ok(client.includes(marker), `Thiếu luồng báo cáo tháng: ${marker}`));
assert.match(client, /monthly-login-summary/, "Báo cáo tháng phải lấy lượt đăng nhập từ máy chủ.");

const people = {
  p1: { id: "p1", name: "Nguyễn An", departmentId: "gpmb" },
  p2: { id: "p2", name: "Trần Bình", departmentId: "qlht" },
  p3: { id: "p3", name: "Lãnh đạo Ban", departmentId: "ban-giam-doc" },
};
const departmentsById = {
  gpmb: { id: "gpmb", name: "phòng GPMB" },
  qlht: { id: "qlht", name: "phòng QLHT" },
  "ban-giam-doc": { id: "ban-giam-doc", name: "Ban giám đốc", leadershipOnly: true, kpiExempt: true },
};
const sandbox = {
  Date,
  state: {
    activePeriod: "2026-09",
    people: Object.values(people),
    accounts: [
      { id: "a1", personId: "p1" },
      { id: "a2", personId: "p2" },
      { id: "a3", personId: "p3" },
      { id: "a4", personId: "p1", disabled: true },
    ],
    tasks: [
      { id: "t1", title: "Hoàn thành", ownerId: "p1", createdAt: "2026-09-02T08:00:00", due: "2026-09-12", status: "Hoàn thành" },
      { id: "t2", title: "Chưa đến hạn", ownerId: "p1", createdAt: "2026-09-05T08:00:00", due: "2026-09-30", status: "Đang thực hiện" },
      { id: "t3", title: "Quá hạn", ownerId: "p2", createdAt: "2026-09-08T08:00:00", due: "2026-09-10", status: "Đang thực hiện" },
      { id: "t3", title: "Bản sao trùng mã", ownerId: "p1", createdAt: "2026-09-08T08:00:00", due: "2026-09-10", status: "Đang thực hiện" },
      { id: "t4", title: "Ngoài kỳ", ownerId: "p2", createdAt: "2026-08-31T08:00:00", due: "2026-09-09", status: "Hoàn thành" },
      { id: "t5", title: "Phát sinh chưa hoàn thành", ownerId: "p1", createdAt: "2026-09-12T08:00:00", due: "2026-10-09", status: "Đang thực hiện" },
      { id: "t6", title: "Hoàn thành ngoài hạn kỳ", ownerId: "p1", createdAt: "2026-08-28T08:00:00", due: "2026-10-12", status: "Hoàn thành", completionReviewStatus: "pending", completedAt: "2026-09-22T10:00:00" },
      { id: "t7", title: "Duyệt hoàn thành ngoài hạn kỳ", ownerId: "p2", createdAt: "2026-08-28T08:00:00", due: "2026-10-14", status: "Hoàn thành", completionReviewStatus: "passed", completedAt: "2026-08-31T10:00:00", completionReviewedAt: "2026-09-24T10:00:00" },
      { id: "t8", title: "Chỉ cập nhật tiến độ", ownerId: "p2", createdAt: "2026-08-28T08:00:00", due: "2026-10-14", status: "Đang thực hiện", progressReports: [{ createdAt: "2026-09-20T10:00:00", note: "Không thuộc báo cáo tháng" }] },
      { id: "t9", title: "Việc Ban giám đốc", ownerId: "p3", createdAt: "2026-09-16T08:00:00", due: "2026-09-26", status: "Đang thực hiện" },
    ],
  },
  departments: Object.values(departmentsById),
  currentMonth: () => "2026-10",
  padDatePart: (value) => String(value).padStart(2, "0"),
  dailyReportDateValue: (value) => String(value || "").slice(0, 10),
  dailyReportDatePart: (value) => String(value || "").slice(0, 10),
  periodFromTimestamp: (value) => String(value || "").slice(0, 7),
  taskParticipantIds: (task) => [task.ownerId, ...(task.collaboratorIds || [])].filter(Boolean),
  personById: (id) => people[id] || null,
  departmentById: (id) => departmentsById[id] || null,
  normalizeTaskStatus: (status) => status || "Chuẩn bị thực hiện",
  isTaskFinishedStatus: (status) => ["Hoàn thành", "Đã kết thúc"].includes(status),
  taskCompletionIsApproved: (task) => task.completionReviewStatus === "passed",
  currentAccount: () => ({ displayName: "Admin tổng hợp" }),
  formatMonthPeriod: (period) => `${period.slice(5, 7)}/${period.slice(0, 4)}`,
  formatDate: (value) => {
    const [year, month, day] = String(value || "").slice(0, 10).split("-");
    return year ? `${day}/${month}/${year}` : "";
  },
  formatDateTime: () => "30/09/2026 16:00:00",
  escapeHtml: (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]),
};
vm.createContext(sandbox);
[
  "monthlyWorkReportPeriodValue",
  "monthlyWorkReportCutoffDate",
  "taskIsCompletedByReportCutoff",
  "taskOccurredInMonthlyWorkReport",
  "monthlyWorkReportTaskStatus",
  "monthlyWorkReportMetrics",
  "monthlyWorkReportDepartmentIsIncluded",
  "monthlyWorkReportPersonIsIncluded",
  "monthlyWorkReportLoginMetrics",
  "monthlyWorkReportData",
  "reportPrintAutoCloseScript",
  "applyReportPrintAutoClose",
  "monthlyWorkReportDocumentTemplate",
  "monthlyWorkReportDocumentHtml",
  "monthlyWorkReportPrintOverrideCss",
  "applyMonthlyWorkReportPrintOverrides",
].forEach((name) => vm.runInContext(extractFunction(name), sandbox));

const loginPayload = {
  available: true,
  accounts: [
    { accountId: "a1", loginCount: 3 },
    { accountId: "a2", loginCount: 2 },
    { accountId: "a3", loginCount: 9 },
    { accountId: "a4", loginCount: 7 },
  ],
};
const report = JSON.parse(JSON.stringify(sandbox.monthlyWorkReportData("2026-09", loginPayload)));
assert.equal(report.cutoffDate, "2026-09-30", "Kỳ quá khứ phải chốt số liệu vào ngày cuối kỳ.");
assert.equal(
  sandbox.monthlyWorkReportTaskStatus({ status: "Hoàn thành", completedAt: "2026-10-01T08:00:00", due: "2026-09-10" }, "2026-09-30"),
  "overdue",
  "Công việc hoàn thành sau ngày chốt không được tính hoàn thành cho kỳ cũ.",
);
assert.deepEqual(report.metrics, { total: 7, completed: 4, notDue: 2, overdue: 1 }, "Ba trạng thái công việc phải loại trừ nhau trong số việc thuộc kỳ báo cáo.");
assert.deepEqual(
  report.departments.map((row) => [row.name, row.total, row.completed, row.notDue, row.overdue, row.loginCount]),
  [["phòng GPMB", 4, 2, 2, 0, 3], ["phòng QLHT", 3, 2, 0, 1, 2]],
  "Phòng phải nhận mỗi công việc đúng một lần theo người thực hiện chính.",
);
assert.deepEqual(
  report.people.map((row) => [row.name, row.total, row.loginCount]),
  [["Nguyễn An", 4, 3], ["Trần Bình", 3, 2]],
  "Nhân sự phải nhận đúng số việc theo người thực hiện chính.",
);
assert.equal(report.tasks.some((task) => task.id === "t5"), true, "Công việc phát sinh trong kỳ nhưng chưa hoàn thành phải được tính.");
assert.equal(report.tasks.some((task) => task.id === "t6"), true, "Công việc có hạn ngoài kỳ nhưng hoàn thành trong kỳ phải được tính.");
assert.equal(report.tasks.some((task) => task.id === "t7"), true, "Công việc có hạn ngoài kỳ nhưng được duyệt hoàn thành trong kỳ phải được tính.");
assert.equal(report.tasks.some((task) => task.id === "t8"), false, "Mốc tiến độ không được tự đưa công việc vào báo cáo tháng.");
assert.equal(report.tasks.some((task) => task.id === "t9"), false, "Công việc của Ban giám đốc không được tính vào báo cáo tháng.");
assert.equal(report.departments.some((row) => row.id === "ban-giam-doc"), false, "Tổng hợp phòng không được hiển thị Ban giám đốc.");
assert.equal(report.people.some((row) => row.id === "p3"), false, "Chi tiết nhân viên không được hiển thị thành viên Ban giám đốc.");
assert.equal(report.loginCount, 5, "Tổng lượt đăng nhập chỉ tính tài khoản còn hiệu lực, liên kết với nhân sự thuộc báo cáo.");

const documentHtml = sandbox.monthlyWorkReportDocumentHtml(report);
assert.match(documentHtml, /Báo cáo tổng hợp công việc hàng tháng/);
assert.match(documentHtml, /Chi tiết theo nhân viên/);
assert.match(documentHtml, /Mỗi mã công việc chỉ được tính một lần/);
assert.match(documentHtml, /có hạn hoàn thành trong kỳ/, "Bản in phải nêu rõ phạm vi thống kê mới.");
assert.match(documentHtml, /Không tính công việc theo mốc cập nhật tiến độ/, "Bản in phải loại mốc tiến độ khỏi phạm vi thống kê.");
assert.match(documentHtml, /Kế hoạch/, "Bản in phải dùng nhãn Kế hoạch.");
assert.doesNotMatch(documentHtml, /Thuộc kỳ/, "Bản in không được dùng nhãn Thuộc kỳ.");
assert.doesNotMatch(documentHtml, /Ban giám đốc/, "Bản in không được hiển thị Ban giám đốc.");
assert.match(documentHtml, /Lượt đăng nhập/, "Báo cáo tháng phải hiển thị lượt đăng nhập.");
assert.match(documentHtml, />5<\/strong>/, "Bản in phải hiển thị tổng lượt đăng nhập.");
assert.match(documentHtml, /window\.print\(\)/, "Báo cáo tháng phải gọi hộp thoại Lưu thành PDF của trình duyệt.");
assert.match(documentHtml, /afterprint/, "Báo cáo tháng phải nhận biết lúc hoàn tất hoặc hủy thao tác in.");
assert.match(documentHtml, /window\.close\(\)/, "Cửa sổ báo cáo tháng phải tự đóng sau thao tác in.");
assert.match(sandbox.monthlyWorkReportPrintOverrideCss(), /page-two-header/, "Bản in phải có quy tắc tương phản riêng cho tiêu đề chi tiết.");

console.log("monthly_work_report=passed");
