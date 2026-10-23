const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const manifest = fs.readFileSync("manifest.webmanifest", "utf8");
const serviceWorker = fs.readFileSync("service-worker.js", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = client.indexOf(marker);
  if (start < 0) throw new Error(`Thiếu hàm ${name}.`);
  const next = client.indexOf("\nfunction ", start + marker.length);
  return client.slice(start, next < 0 ? client.length : next);
}

[
  'data-dashboard-action="period-tasks"',
  'data-dashboard-action="period-completed-tasks"',
  'data-dashboard-kpi-summary',
  'id="dashboardDetailDialog"',
  'id="exportDashboardDetailExcel"',
  'id="exportTaskStatusDetailExcel"',
  'id="taskPersonFilterNote"',
  'id="dashboardWorkloadDepartmentFilter"',
  'data-dashboard-workload-view="projects"',
  'data-dashboard-workload-view="people"',
  'id="dashboardProjectHealthChart"',
  'id="dashboardProjectTrendNote"',
  'id="dashboardProjectTrendFilter"',
  'id="dashboardProjectTimelineChart"',
  'id="dashboardProjectResourceChart"',
  'id="dashboardTaskScope"',
  'id="taskScopeFilter"',
].forEach((marker) => assert.ok(html.includes(marker), `Thiếu thành phần truy xuất Tổng quan: ${marker}`));

assert.ok(html.includes('id="dashboardProjectTrendFilter"'), "Xu hướng dự án phải cho phép chọn một dự án để xem chi tiết.");
assert.ok(client.includes("dashboardProjectTrendKey"), "Xu hướng dự án phải lưu lựa chọn dự án hiện tại.");

assert.ok(!html.includes('data-dashboard-workload-period="day"'), "Không được còn nút chọn Hôm nay trong Thống kê công việc.");
assert.ok(!html.includes('data-dashboard-workload-period="week"'), "Không được còn nút chọn Tuần này trong Thống kê công việc.");

assert.ok(!html.includes("Điều hành công việc"), "Không được còn tiêu đề Điều hành công việc.");
assert.ok(!html.includes("dashboardOperationsSummary"), "Không được còn dòng tóm tắt điều hành công việc.");
assert.match(html, /<option value="current">Theo kỳ đánh giá<\/option>/, "Phạm vi mặc định phải hiển thị Theo kỳ đánh giá.");

[
  "function dashboardTasksForPeriod",
  "function dashboardApprovedTasksForPeriod",
  "function openDashboardPeriodTaskDetail",
  "function openDashboardKpiSummaryDialog",
  "function dashboardDepartmentFilterOptions",
  "function dashboardKpiSummaryDepartmentFilterHtml",
  "function openDashboardDepartmentTaskDetail",
  "function openDashboardPersonTasks",
  "function openDashboardOperationDetail",
  "function dashboardOperationRows",
  "function dashboardWorkloadProjectRows",
  "function dashboardWorkloadPeopleRows",
  "function openDashboardWorkloadProjectTasks",
  "function openDashboardAnalyticsProjectTasks",
  "function openDashboardAnalyticsProjectTimelineTasks",
  "function normalizeTaskDisplayScope",
  "function taskDisplayScopePeriod",
  "function taskMatchesDisplayScope",
  "function setTaskDisplayScope",
  "function latestEvaluationPeriod",
  "function selectLatestEvaluationPeriod",
  "function taskStatusDetailExportData",
  "function downloadDashboardPopupExcel",
  "openDashboardKpiSummaryDialog(gradeLink.dataset.dashboardGrade)",
  "taskDashboardPersonFilterId",
  "data-dashboard-person-tasks",
  "data-dashboard-project-workload",
  "data-dashboard-project-analytics",
  "data-dashboard-department-task-detail",
  "data-dashboard-operation",
  "dashboardWorkloadDepartmentFilter",
  "dashboardKpiSummaryDepartmentFilter",
].forEach((marker) => assert.ok(client.includes(marker), `Thiếu luồng chi tiết Tổng quan: ${marker}`));

assert.match(client, /const periodTasks = dashboardTasksForPeriod\(state\.activePeriod\);/, "Tổng số công việc phải tính theo kỳ báo cáo.");
assert.match(client, /\.filter\(\(task\) => taskMatchesDisplayScope\(task\)\)/, "Tổng quan phải áp dụng phạm vi công việc đang chọn.");
assert.match(client, /\.filter\(\(task\) => taskMatchesDisplayScope\(task\)\)[\s\S]*?\.filter\(\(task\) => taskMatchesStatusFilter/, "Danh mục Công việc phải áp dụng phạm vi hiển thị trước các bộ lọc khác.");
assert.match(client, /byId\("taskScopeFilter"\)\.addEventListener\("change", \(event\) => setTaskDisplayScope\(event\.target\.value\)\);/, "Bộ lọc phạm vi trong Công việc phải cập nhật dữ liệu.");
assert.match(client, /byId\("dashboardTaskScope"\)\.addEventListener\("change", \(event\) => setTaskDisplayScope\(event\.target\.value\)\);/, "Bộ lọc phạm vi trong Tổng quan phải cập nhật dữ liệu.");
assert.match(client, /const approvedPeriodTasks = periodTasks\.filter\(taskCompletionIsApproved\);/, "Tổng công việc hoàn thành phải chỉ tính việc đã đánh giá Đạt.");
assert.match(client, /\.filter\(\(task\) => !personId \|\| taskParticipantIds\(task\)\.includes\(personId\)\)/, "Lọc nhân sự phải gồm cả người thực hiện và người phối hợp.");
assert.match(client, /function openDashboardKpiSummaryDialog\(selectedGrade = "", selectedDepartmentId = ""\)/, "Popup KPI phải nhận phân loại và phòng được chọn.");
assert.match(client, /dashboardKpiSummaryDepartmentFilterHtml\(departmentOptions, departmentId\)/, "Popup KPI phải hiển thị bộ lọc phòng.");
assert.match(client, /gradeRows\.filter\(\(\{ person \}\) => person\.departmentId === departmentId\)/, "Popup KPI phải lọc đúng nhân sự theo phòng.");
assert.match(client, /function dashboardWorkloadScopedTasks[\s\S]*taskHasParticipantInDepartment\(task, selectedDepartment\.id\)/, "Bảng thống kê công việc phải lọc đúng công việc theo phòng của người tham gia.");
assert.match(client, /openDashboardKpiSummaryDialog\(dashboardKpiSummaryGradeFilter, event\.target\.value\)/, "Đổi phòng trong popup KPI phải tải lại số liệu.");
assert.match(client, /renderDashboardOperations\(dashboardOperationalTasks\(\)\)/, "Đổi phòng ở bảng công việc phải tải lại dữ liệu bảng.");
assert.match(client, /selectLatestEvaluationPeriod\(\);/, "Đăng nhập phải chọn kỳ đánh giá mới nhất.");
assert.match(client, /periodIndex\(period\) <= currentPeriodIndex/, "Kỳ tự chọn khi đăng nhập không được vượt quá tháng hiện tại.");
assert.match(client, /openDashboardOperationDetail\(operationDetail\.dataset\.dashboardOperation\)/, "Các thẻ điều hành phải mở popup chi tiết.");
assert.match(client, /const rows = dashboardAnalyticsProjectRows\(tasks, selectedDepartmentId\);/, "Biểu đồ Dự án phải tổng hợp toàn bộ dự án trong phạm vi được lọc.");
assert.ok(!client.includes("dashboardAnalyticsProjectRows(tasks, selectedDepartmentId).slice"), "Biểu đồ Dự án không được cắt bớt dữ liệu trước khi đưa vào khung cuộn.");
assert.match(client, /byId\("dashboardProjectTrendFilter"\)\?\.addEventListener\("change", \(event\) => \{[\s\S]*?dashboardProjectTrendKey = event\.target\.value;[\s\S]*?renderDashboardAnalyticsProjects\(dashboardTasksForPeriod\(\)\);/, "Đổi dự án phải vẽ lại riêng biểu đồ xu hướng.");
assert.match(client, /openDashboardAnalyticsProjectTimelineTasks\([\s\S]*analyticsProjectTimeline\.dataset\.dashboardProjectTimeline/, "Bấm mốc công việc dự án phải mở danh sách chi tiết.");
assert.match(client, /downloadDashboardPopupExcel\(taskStatusDetailExport\)/, "Popup danh sách công việc phải xuất Excel.");
assert.match(client, /downloadDashboardPopupExcel\(dashboardDetailExport\)/, "Popup KPI phải xuất Excel.");
assert.match(css, /\.dashboard-workload-list[\s\S]*max-height: calc\(\(var\(--dashboard-workload-row-height\) \* 5\) \+ var\(--dashboard-workload-header-height\) \+ 1px\);[\s\S]*overflow-y: auto;/, "Danh sách thống kê công việc phải hiện năm dòng và cuộn riêng.");
assert.match(css, /\.dashboard-workload-row\.dashboard-link:hover[\s\S]*transform: none;[\s\S]*box-shadow: none;/, "Hiệu ứng chọn dòng nhân sự phải nhẹ nhàng.");
assert.match(css, /\.dashboard-operation-item\.dashboard-link:hover[\s\S]*background: #f4f8fa;[\s\S]*transform: none;[\s\S]*box-shadow: none;/, "Hiệu ứng chọn thẻ điều hành phải nhẹ nhàng.");
assert.match(manifest, /"version": "3\.4\.64"/, "Manifest chưa tăng phiên bản giao diện.");
assert.match(serviceWorker, /phuc-thinh-kpi-v3464/, "Service worker chưa đổi cache để nhận giao diện mới.");

const departmentFilterSandbox = {
  departments: [
    { id: "g", name: "phòng GPMB" },
    { id: "k", name: "phòng KHTH" },
    { id: "q", name: "phòng QLHT" },
  ],
};
vm.createContext(departmentFilterSandbox);
vm.runInContext(extractFunction("dashboardDepartmentFilterOptions"), departmentFilterSandbox);
assert.deepEqual(
  JSON.parse(JSON.stringify(departmentFilterSandbox.dashboardDepartmentFilterOptions([
    { departmentId: "q" },
    { departmentId: "g" },
    { departmentId: "g" },
    { departmentId: "unknown" },
  ]))),
  [
    { value: "g", label: "phòng GPMB" },
    { value: "q", label: "phòng QLHT" },
  ],
  "Danh sách phòng lọc phải chỉ chứa các phòng có nhân sự trong phạm vi dữ liệu.",
);

const periodSandbox = {
  state: {
    evaluations: [{ period: "2026-07" }, { period: "2026-09" }],
    departmentEvaluations: [{ period: "2026-06" }],
    tasks: [{ period: "2026-10" }],
  },
  currentMonth: () => "2026-08",
  taskPeriod: (task) => task.period,
};
vm.createContext(periodSandbox);
["periodIndex", "latestEvaluationPeriod"].forEach((name) => vm.runInContext(extractFunction(name), periodSandbox));
assert.equal(periodSandbox.latestEvaluationPeriod(), "2026-07", "Kỳ tự chọn phải là kỳ có dữ liệu mới nhất nhưng không được ở tương lai.");

const scopeSandbox = {
  taskDisplayScope: "current",
  state: { activePeriod: "2026-08" },
  currentTaskDisplayScope: () => scopeSandbox.taskDisplayScope,
  currentMonth: () => "2026-09",
  taskPeriod: (task) => task.period,
};
vm.createContext(scopeSandbox);
["normalizeTaskDisplayScope", "taskDisplayScopePeriod", "taskMatchesDisplayScope"].forEach((name) => vm.runInContext(extractFunction(name), scopeSandbox));
assert.equal(scopeSandbox.normalizeTaskDisplayScope("all"), "all");
assert.equal(scopeSandbox.normalizeTaskDisplayScope("unexpected"), "current");
assert.equal(scopeSandbox.taskDisplayScopePeriod(), "2026-08");
assert.equal(scopeSandbox.taskMatchesDisplayScope({ period: "2026-08" }, "current"), true);
assert.equal(scopeSandbox.taskMatchesDisplayScope({ period: "2026-09" }, "current"), false);
assert.equal(scopeSandbox.taskMatchesDisplayScope({ period: "2026-09" }, "all"), true);

console.log("dashboard_drilldowns=passed");
