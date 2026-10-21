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
  'id="dashboardWeeklyReportDate"',
  'id="exportWeeklyWorkReportPdf"',
  "Báo cáo công việc hàng tuần",
].forEach((marker) => assert.ok(html.includes(marker), `Thiếu giao diện báo cáo tuần: ${marker}`));

const people = {
  p1: { id: "p1", name: "Nguyễn An", departmentId: "gpmb" },
  p2: { id: "p2", name: "Trần Bình", departmentId: "qlht" },
};
const departments = {
  gpmb: { id: "gpmb", name: "phòng GPMB" },
  qlht: { id: "qlht", name: "phòng QLHT" },
};
const projectNames = { project1: "Dự án 1", project2: "Dự án 2" };
const weeklyDateInput = { value: "2026-09-18" };
const reportWindow = {
  document: {
    html: "",
    open() {},
    write(value) { this.html = value; },
    close() {},
  },
  focus() {},
};
const sandbox = {
  Date,
  window: { open: () => reportWindow },
  byId: (id) => id === "dashboardWeeklyReportDate" ? weeklyDateInput : null,
  alert: (message) => { throw new Error(message); },
  state: {
    tasks: [
      { id: "w1", title: "Việc đến hạn thứ Hai", projectId: "project1", ownerId: "p1", collaboratorIds: ["p2"], due: "2026-09-14", progress: 30 },
      { id: "w2", title: "Việc mới chưa xong", projectId: "project2", ownerId: "p2", createdAt: "2026-09-15T09:00:00", due: "2026-09-22", status: "Đang thực hiện", progress: 20 },
      { id: "w3", title: "Hoàn thành trong tuần", projectId: "project1", ownerId: "p1", due: "2026-09-25", status: "Hoàn thành", completedAt: "2026-09-16T12:00:00", progress: 100 },
      { id: "w4", title: "Đến hạn rồi hoàn thành", projectId: "project1", ownerId: "p1", due: "2026-09-14", status: "Hoàn thành", completedAt: "2026-09-15T12:00:00", progress: 100 },
      { id: "w5", title: "Duyệt hoàn thành trong tuần", projectId: "project2", ownerId: "p2", due: "2026-10-02", status: "Hoàn thành", completionReviewStatus: "passed", completedAt: "2026-09-16T12:00:00", completionReviewedAt: "2026-09-17T14:00:00", progress: 100 },
      { id: "w6", title: "Ngoài tuần", projectId: "project2", ownerId: "p2", due: "2026-09-21", status: "Đang thực hiện", progress: 10 },
      { id: "w4", title: "Bản sao công việc", projectId: "project1", ownerId: "p2", due: "2026-09-14", status: "Hoàn thành", completedAt: "2026-09-15T12:00:00", progress: 100 },
    ],
  },
  padDatePart: (value) => String(value).padStart(2, "0"),
  taskCompletionIsApproved: (task) => task.completionReviewStatus === "passed",
  taskCompletionNeedsReview: (task) => task.completionReviewStatus === "pending",
  getDueStatus: (task) => task.overdue ? "Quá hạn" : task.status || "Đang thực hiện",
  normalizeTaskStatus: (status) => status || "Chuẩn bị thực hiện",
  isTaskFinishedStatus: (status) => ["Hoàn thành", "Đã kết thúc"].includes(status),
  taskParticipantIds: (task) => [task.ownerId, ...(task.collaboratorIds || [])].filter(Boolean),
  personById: (id) => people[id] || null,
  departmentById: (id) => departments[id] || null,
  projectNameForTask: (task) => projectNames[task.projectId] || "",
  canViewTaskRecord: () => true,
  clamp: (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0)),
  currentAccount: () => ({ displayName: "Admin tổng hợp" }),
  formatScore: (value) => Number(value || 0).toFixed(1).replace(".0", ""),
  formatDate: (value) => {
    const [year, month, day] = String(value).slice(0, 10).split("-");
    return year ? `${day}/${month}/${year}` : "";
  },
  formatDateTime: () => "19/10/2026 09:00:00",
  escapeHtml: (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]),
};
vm.createContext(sandbox);
[
  "dailyReportDateValue",
  "dailyReportDatePart",
  "taskIsCompletedByReportCutoff",
  "dailyReportTaskStatus",
  "dailyReportStatusTone",
  "dailyReportTaskOwner",
  "dailyReportTaskDepartment",
  "dailyReportTaskProjectName",
  "dailyReportTaskNote",
  "dailyReportProjectKey",
  "reportPrintAutoCloseScript",
  "applyReportPrintAutoClose",
  "dailyWorkReportDocumentTemplate",
  "weeklyWorkReportDateRange",
  "weeklyWorkReportCompletionEventDate",
  "taskOccurredInWeeklyWorkReport",
  "weeklyWorkReportTaskNote",
  "weeklyWorkReportData",
  "weeklyWorkReportTrendHtml",
  "weeklyWorkReportDocumentHtml",
  "exportWeeklyWorkReportPdf",
].forEach((name) => vm.runInContext(extractFunction(name), sandbox));

const range = sandbox.weeklyWorkReportDateRange("2026-09-18");
assert.deepEqual([range.startDate, range.endDate], ["2026-09-14", "2026-09-20"], "Tuần phải bắt đầu Thứ Hai và kết thúc Chủ nhật.");
const report = sandbox.weeklyWorkReportData("2026-09-18");
assert.equal(report.metrics.total, 5, "Báo cáo phải gồm việc đến hạn, phát sinh chưa hoàn thành hoặc hoàn thành/duyệt trong tuần.");
assert.equal(report.tasks.filter((task) => task.id === "w4").length, 1, "Công việc trùng mã hoặc nhiều người tham gia chỉ tính một lần.");
assert.equal(report.tasks.some((task) => task.id === "w6"), false, "Không đưa công việc nằm ngoài phạm vi tuần vào báo cáo.");
assert.deepEqual(JSON.parse(JSON.stringify(report.dailyDistribution.map((day) => day.due))), [2, 0, 0, 0, 0, 0, 0], "Biểu đồ phải phân bổ công việc theo ngày đến hạn.");
assert.equal(report.dailyDistribution[1].completed, 1, "Công việc hoàn thành phải xuất hiện ở đúng ngày trong tuần.");
assert.equal(report.dailyDistribution[3].completed, 1, "Ngày được duyệt hoàn thành phải được tính vào diễn biến ngày.");

const documentHtml = sandbox.weeklyWorkReportDocumentHtml(report);
assert.match(documentHtml, /Báo cáo công việc hàng tuần/);
assert.match(documentHtml, /Tuần báo cáo: <b>14\/09\/2026 - 20\/09\/2026<\/b>/);
assert.match(documentHtml, /Khối lượng theo ngày/);
assert.match(documentHtml, /Báo cáo công việc hàng tuần · 14\/09\/2026 - 20\/09\/2026/);
assert.match(documentHtml, /window\.print\(\)/);
assert.match(documentHtml, /window\.close\(\)/);
assert.match(client, /exportWeeklyWorkReportPdf"\)\?\.addEventListener\("click", exportWeeklyWorkReportPdf\)/, "Nút xuất tuần phải gọi đúng luồng PDF.");
sandbox.exportWeeklyWorkReportPdf();
assert.match(reportWindow.document.html, /Báo cáo công việc hàng tuần/, "Nút xuất tuần phải mở đúng nội dung PDF.");
assert.equal(weeklyDateInput.value, "2026-09-18", "Ngày đại diện đã chọn phải được giữ nguyên sau khi xuất.");

console.log("weekly_work_report=passed");
