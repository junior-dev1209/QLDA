const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = client.indexOf(marker);
  if (start < 0) throw new Error(`Thiếu hàm ${name}.`);
  const end = client.indexOf("\nfunction ", start + marker.length);
  return client.slice(start, end < 0 ? client.length : end);
}

[
  'id="dashboardDailyReportDate"',
  'id="exportDailyWorkReportPdf"',
  "Báo cáo công việc hàng ngày",
].forEach((marker) => assert.ok(html.includes(marker), `Thiếu điều khiển báo cáo ngày: ${marker}`));

[
  "function dailyReportDateValue",
  "function taskOccurredInDailyReport",
  "function dailyWorkReportData",
  "function reportPrintAutoCloseScript",
  "function applyReportPrintAutoClose",
  "function dailyWorkReportDocumentHtml",
  "function exportDailyWorkReportPdf",
  "window.print()",
].forEach((marker) => assert.ok(client.includes(marker), `Thiếu luồng PDF báo cáo ngày: ${marker}`));

assert.match(css, /\.dashboard-report-actions[\s\S]*?margin-top: -7px;/, "Nhóm báo cáo phải nằm sát dưới tiêu đề Tổng quan.");
assert.match(css, /\.dashboard-daily-report-button[\s\S]*?background: #176878;/, "Nút xuất báo cáo ngày phải có trạng thái thao tác rõ ràng.");

const people = {
  p1: { id: "p1", name: "Nguyễn An", departmentId: "gpmb" },
  p2: { id: "p2", name: "Trần Bình", departmentId: "qlht" },
};
const departments = {
  gpmb: { id: "gpmb", name: "phòng GPMB" },
  qlht: { id: "qlht", name: "phòng QLHT" },
};
const sandbox = {
  Date,
  state: {
    tasks: [
      { id: "t1", title: "Rà soát phương án", projectId: "du-an-1", ownerId: "p1", collaboratorIds: ["p2"], createdAt: "2026-09-18T08:00:00", updatedAt: "2026-09-18T09:30:00", due: "2026-09-20", progress: 50, progressReports: [{ createdAt: "2026-09-18T09:30:00", note: "Đã rà soát hồ sơ" }] },
      { id: "t2", title: "Kiểm tra hiện trường", projectId: "du-an-1", ownerId: "p1", due: "2026-09-18", progress: 100, completionReviewStatus: "passed", completedAt: "2026-09-18T15:00:00", progressReports: [] },
      { id: "t3", title: "Tổng hợp báo cáo", projectId: "du-an-2", ownerId: "p2", due: "2026-09-19", progress: 70, completionReviewStatus: "pending", progressReports: [{ createdAt: "2026-09-18T14:00:00", note: "Đã gửi xin duyệt" }] },
      { id: "t4", title: "Công việc ngày khác", projectId: "du-an-1", ownerId: "p2", createdAt: "2026-09-17T10:00:00", due: "2026-09-25", progress: 20, progressReports: [] },
      { id: "t5", title: "Chỉ đến hạn", projectId: "du-an-2", ownerId: "p2", due: "2026-09-18", progress: 0, progressReports: [] },
      { id: "t6", title: "Hoàn thành ngoài hạn ngày", projectId: "du-an-1", ownerId: "p1", due: "2026-09-20", status: "Hoàn thành", completionReviewStatus: "pending", completedAt: "2026-09-18T16:00:00", progress: 100, progressReports: [] },
      { id: "t7", title: "Duyệt hoàn thành ngoài hạn ngày", projectId: "du-an-2", ownerId: "p2", due: "2026-09-20", status: "Hoàn thành", completionReviewStatus: "passed", completedAt: "2026-09-17T16:00:00", completionReviewedAt: "2026-09-18T17:00:00", progress: 100, progressReports: [] },
      { id: "t6", title: "Bản ghi lặp của cùng công việc", projectId: "du-an-1", ownerId: "p2", due: "2026-09-20", status: "Hoàn thành", completionReviewStatus: "pending", completedAt: "2026-09-18T16:00:00", progress: 100, progressReports: [] },
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
  projectNameForTask: (task) => ({ "du-an-1": "Dự án 1", "du-an-2": "Dự án 2" })[task.projectId] || "",
  canViewTaskRecord: () => true,
  clamp: (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0)),
  currentAccount: () => ({ displayName: "Admin tổng hợp" }),
  formatScore: (value) => Number(value || 0).toFixed(1).replace(".0", ""),
  formatDate: (value) => {
    const [year, month, day] = String(value).slice(0, 10).split("-");
    return year ? `${day}/${month}/${year}` : "";
  },
  formatDateTime: () => "18/09/2026 16:00:00",
  escapeHtml: (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]),
};
vm.createContext(sandbox);
[
  "dailyReportDateValue",
  "dailyReportDatePart",
  "dailyReportTaskEvents",
  "taskIsCompletedByReportCutoff",
  "taskHasReportableCompletionEventOnDate",
  "taskOccurredInDailyReport",
  "dailyReportTaskStatus",
  "dailyReportStatusTone",
  "dailyReportTaskOwner",
  "dailyReportTaskDepartment",
  "dailyReportTaskProjectName",
  "dailyReportTaskActivity",
  "dailyReportTaskNote",
  "dailyReportProjectKey",
  "dailyWorkReportData",
  "reportPrintAutoCloseScript",
  "applyReportPrintAutoClose",
  "dailyWorkReportDocumentTemplate",
  "dailyWorkReportDocumentHtml",
].forEach((name) => vm.runInContext(extractFunction(name), sandbox));

assert.match(extractFunction("dailyReportTaskEvents"), /task\.due/, "Báo cáo ngày phải tính công việc đến hạn trong ngày chọn.");
assert.doesNotMatch(extractFunction("dailyReportTaskEvents"), /updatedAt/, "Không được dùng mốc đồng bộ updatedAt để tính số liệu ngày.");
const report = JSON.parse(JSON.stringify(sandbox.dailyWorkReportData("2026-09-18")));
assert.equal(report.date, "2026-09-18");
assert.equal(report.metrics.total, 5, "Báo cáo ngày phải gồm việc đến hạn, phát sinh chưa hoàn thành, hoàn thành hoặc duyệt hoàn thành trong ngày.");
assert.equal(report.metrics.approved, 2, "Công việc được duyệt hoàn thành phải được tính riêng.");
assert.equal(report.metrics.pending, 1, "Công việc chờ duyệt phải được tính riêng.");
assert.deepEqual(report.departments.map((row) => [row.name, row.total]), [["phòng GPMB", 3], ["phòng QLHT", 2]], "Báo cáo chỉ nhóm công việc theo phòng của người thực hiện, không nhân theo người phối hợp.");
assert.deepEqual(report.projects.map((row) => [row.name, row.dailyTasks.length]), [["Dự án 1", 3], ["Dự án 2", 2]], "Biểu đồ chỉ được gồm các dự án có công việc thuộc báo cáo trong ngày.");
assert.equal(report.tasks.some((task) => task.id === "t4"), false, "Không được đưa công việc không có diễn biến trong ngày vào báo cáo.");
assert.equal(report.tasks.some((task) => task.id === "t3"), false, "Mốc tiến độ hoặc phản hồi không được tự đưa công việc vào báo cáo.");
assert.equal(report.tasks.some((task) => task.id === "t5"), true, "Công việc đến hạn trong ngày phải xuất hiện trong báo cáo.");
assert.equal(report.tasks.some((task) => task.id === "t6"), true, "Công việc có hạn ngoài ngày nhưng hoàn thành trong ngày phải xuất hiện trong báo cáo.");
assert.equal(report.tasks.some((task) => task.id === "t7"), true, "Công việc có hạn ngoài ngày nhưng duyệt hoàn thành trong ngày phải xuất hiện trong báo cáo.");
assert.equal(report.tasks.filter((task) => task.id === "t1").length, 1, "Một công việc có nhiều người tham gia chỉ được tính một lần.");
assert.equal(report.tasks.filter((task) => task.id === "t6").length, 1, "Bản ghi trùng mã công việc chỉ được tính một lần.");

const reportHtml = sandbox.dailyWorkReportDocumentHtml(report);
assert.match(reportHtml, /Báo cáo công việc hàng ngày/);
assert.match(reportHtml, /có hạn hoàn thành trong ngày/, "Bản in phải nêu rõ phạm vi thống kê mới.");
assert.match(reportHtml, /không dùng mốc tiến độ, phản hồi hoặc đồng bộ kỹ thuật/, "Bản in phải loại mốc tiến độ và phản hồi khỏi phạm vi thống kê.");
assert.match(reportHtml, /Rà soát phương án<\/strong><small>Dự án 1<\/small>/, "Dòng dưới tên công việc phải là tên dự án liên quan.");
assert.match(reportHtml, /Công việc \/ dự án/, "Tiêu đề cột phải phản ánh nội dung dự án.");
assert.match(reportHtml, /Dự án 1/);
assert.match(reportHtml, /Rà soát phương án/);
assert.match(reportHtml, /window\.print\(\)/, "Bản in phải gọi hộp thoại Lưu thành PDF của trình duyệt.");
assert.match(reportHtml, /afterprint/, "Cửa sổ báo cáo phải nhận biết lúc hoàn tất hoặc hủy thao tác in.");
assert.match(reportHtml, /window\.close\(\)/, "Cửa sổ báo cáo phải tự đóng sau thao tác in.");

console.log("daily_work_report=passed");
