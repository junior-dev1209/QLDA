const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const assistant = fs.readFileSync("virtual-assistant.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = client.indexOf(marker);
  if (start < 0) throw new Error(`Thiếu hàm ${name}.`);
  const end = client.indexOf("\nfunction ", start + marker.length);
  return client.slice(start, end < 0 ? client.length : end);
}

assert.match(html, /dashboard-report-actions[\s\S]*dashboardDailyReportDate[\s\S]*exportDailyWorkReportPdf/, "Tổng quan phải giữ bộ chọn ngày và nút báo cáo ngày.");

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

assert.match(css, /\.dashboard-report-actions/);
assert.match(css, /\.dashboard-daily-report-button/);
assert.match(assistant, /function assistantWorkReportKind\(text\)/, "Luna phải nhận biết lệnh tạo báo cáo.");
assert.match(assistant, /window\.openAssistantWorkReport\(kind\)/, "Luna phải mở báo cáo trực tiếp sau khi nhận lệnh.");

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
      { id: "t9", title: "Việc chỉ có cập nhật tiến độ", projectId: "du-an-2", ownerId: "p2", createdAt: "2026-09-01T10:00:00", due: "2026-09-30", status: "Đang thực hiện", progress: 35, progressReports: [{ createdAt: "2026-09-18T13:00:00", note: "Đã hoàn thành rà soát đợt một" }] },
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
  isRecurrenceStoppedTask: (task) => task?.status === "Đã ngừng",
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
  "dailyWorkReportDocumentHtmlLegacy",
  "dailyWorkReportDocumentHtml",
  "weeklyWorkReportDateRange",
  "weeklyWorkReportCompletionEventDate",
  "taskOccurredInWeeklyWorkReport",
  "weeklyWorkReportTaskNote",
  "weeklyWorkReportData",
  "weeklyWorkReportTrendHtml",
  "weeklyWorkReportDocumentHtmlLegacy",
  "weeklyWorkReportDocumentHtml",
].forEach((name) => vm.runInContext(extractFunction(name), sandbox));

assert.match(extractFunction("dailyReportTaskEvents"), /task\.due/, "Báo cáo ngày phải tính công việc đến hạn trong ngày chọn.");
assert.doesNotMatch(extractFunction("dailyReportTaskEvents"), /updatedAt/, "Không được dùng mốc đồng bộ updatedAt để tính số liệu ngày.");
const report = JSON.parse(JSON.stringify(sandbox.dailyWorkReportData("2026-09-18")));
assert.equal(report.date, "2026-09-18");
assert.equal(sandbox.dailyReportDatePart("2026-09-17T17:30:00.000Z"), "2026-09-18", "Timestamp UTC phải được quy đổi về ngày địa phương trước khi lọc báo cáo.");
assert.equal(report.metrics.total, 7, "Báo cáo ngày phải gồm cả công việc chỉ có báo cáo tiến độ trong ngày.");
assert.equal(report.metrics.approved, 2, "Công việc được duyệt hoàn thành phải được tính riêng.");
assert.equal(report.metrics.pending, 2, "Công việc chờ duyệt phải được tính riêng, bao gồm việc cập nhật tiến độ trong ngày.");
assert.deepEqual(report.departments.map((row) => [row.name, row.total]), [["phòng QLHT", 4], ["phòng GPMB", 3]], "Báo cáo chỉ nhóm công việc theo phòng của người thực hiện, không nhân theo người phối hợp.");
assert.deepEqual(report.projects.map((row) => [row.name, row.dailyTasks.length]), [["Dự án 2", 4], ["Dự án 1", 3]], "Biểu đồ chỉ được gồm các dự án có công việc thuộc báo cáo trong ngày.");
assert.equal(report.tasks.some((task) => task.id === "t4"), false, "Không được đưa công việc không có diễn biến trong ngày vào báo cáo.");
assert.equal(report.tasks.some((task) => task.id === "t3"), true, "Báo cáo tiến độ trong ngày phải đưa công việc vào báo cáo.");
assert.equal(report.tasks.some((task) => task.id === "t9"), true, "Công việc cũ ngoài hạn vẫn phải xuất hiện nếu có báo cáo tiến độ trong ngày.");
assert.equal(report.tasks.some((task) => task.id === "t5"), true, "Công việc đến hạn trong ngày phải xuất hiện trong báo cáo.");
assert.equal(report.tasks.some((task) => task.id === "t6"), true, "Công việc có hạn ngoài ngày nhưng hoàn thành trong ngày phải xuất hiện trong báo cáo.");
assert.equal(report.tasks.some((task) => task.id === "t7"), true, "Công việc có hạn ngoài ngày nhưng duyệt hoàn thành trong ngày phải xuất hiện trong báo cáo.");
assert.equal(report.tasks.filter((task) => task.id === "t1").length, 1, "Một công việc có nhiều người tham gia chỉ được tính một lần.");
assert.equal(report.tasks.filter((task) => task.id === "t6").length, 1, "Bản ghi trùng mã công việc chỉ được tính một lần.");

const reportHtml = sandbox.dailyWorkReportDocumentHtml(report);
assert.match(reportHtml, /Báo cáo công việc hàng ngày/);
assert.match(reportHtml, /báo cáo tiến độ ghi nhận trong ngày/, "Bản in phải nêu rõ báo cáo tiến độ là căn cứ đưa việc vào phạm vi.");
assert.match(reportHtml, /thời điểm ghi nhận báo cáo tiến độ/, "Nguyên tắc tính trong bản in phải nêu mốc của báo cáo tiến độ.");
assert.match(reportHtml, /Rà soát phương án<\/strong><small>Dự án 1<\/small>/, "Dòng dưới tên công việc phải là tên dự án liên quan.");
assert.match(reportHtml, /Công việc \/ dự án/, "Tiêu đề cột phải phản ánh nội dung dự án.");
assert.match(reportHtml, /Dự án 1/);
assert.match(reportHtml, /Rà soát phương án/);
assert.match(reportHtml, /window\.print\(\)/, "Bản in phải gọi hộp thoại Lưu thành PDF của trình duyệt.");
assert.match(reportHtml, /afterprint/, "Cửa sổ báo cáo phải nhận biết lúc hoàn tất hoặc hủy thao tác in.");
assert.match(reportHtml, /window\.close\(\)/, "Cửa sổ báo cáo phải tự đóng sau thao tác in.");

const weeklyReport = JSON.parse(JSON.stringify(sandbox.weeklyWorkReportData("2026-09-18")));
assert.equal(weeklyReport.tasks.some((task) => task.id === "t9"), true, "Báo cáo tuần phải đưa vào việc cũ chỉ được cập nhật tiến độ trong tuần.");
assert.equal(weeklyReport.tasks.filter((task) => task.id === "t9").length, 1, "Báo cáo tuần không nhân bản một công việc có nhiều mốc cập nhật.");
assert.match(sandbox.weeklyWorkReportDocumentHtml(weeklyReport), /báo cáo tiến độ ghi nhận từ thứ Hai đến ngày chốt/, "Bản in tuần phải nêu rõ phạm vi tính báo cáo tiến độ.");

console.log("daily_work_report=passed");
