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
  const next = client.indexOf("\nfunction ", start + marker.length);
  return client.slice(start, next < 0 ? client.length : next);
}

[
  'id="dashboardAnalyticsTitle"',
  'id="dashboardTrendChart"',
  'id="dashboardFunnelChart"',
  'id="dashboardOverdueAgeChart"',
  'id="dashboardPersonLoadChart"',
  'id="dashboardPersonalKpiChart"',
  'id="dashboardKpiCategoryChart"',
  'id="dashboardAttentionChart"',
  'id="dashboardAnalyticsProjects"',
  'id="dashboardProjectHealthChart"',
  'id="dashboardProjectTrendNote"',
  'id="dashboardProjectTrendFilter"',
  'id="dashboardProjectTrendChart"',
  'id="dashboardProjectTimelineChart"',
  'id="dashboardProjectResourceChart"',
  'id="dashboardDepartmentComparisonChart"',
  'id="dashboardHeatmapChart"',
  'id="dashboardDepartmentBacklogChart"',
  'id="dashboardDepartmentStatusChart"',
].forEach((marker) => assert.ok(html.includes(marker), `Thiếu biểu đồ Tổng quan: ${marker}`));

["MẪU 1", "MẪU 2", "MẪU 3", "MẪU 4"].forEach((label) => assert.ok(!html.includes(label), `Không được còn nhãn ${label} trong nhóm biểu đồ Dự án.`));
assert.ok(html.includes('id="dashboardProjectTrendFilter"'), "Biểu đồ xu hướng phải cho phép chọn từng dự án.");

[
  "function dashboardAnalyticsTrendBuckets",
  "function taskDisplayScopePeriod",
  "function dashboardAnalyticsOverdueAgeRows",
  "function dashboardAnalyticsInProgressTask",
  "function dashboardAnalyticsTaskStatusRows",
  "function dashboardAnalyticsWorkloadRows",
  "function dashboardAnalyticsProjectRows",
  "function dashboardProjectTimelineStatus",
  "function dashboardProjectTrendSvg",
  "function renderDashboardAnalyticsProjects",
  "function openDashboardAnalyticsProjectTimelineTasks",
  "function dashboardAnalyticsDepartmentRows",
  "function renderDashboardAnalytics",
  "function setDashboardAnalyticsTab",
  "renderDashboardAnalytics(periodTasks, kpiContext)",
  "data-dashboard-analytics-tab",
].forEach((marker) => assert.ok(client.includes(marker), `Thiếu luồng tổng hợp biểu đồ: ${marker}`));

assert.match(css, /\.dashboard-analytics-grid[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, "Biểu đồ phải xếp hai cột trên màn hình rộng.");
assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.dashboard-analytics-grid[\s\S]*grid-template-columns: 1fr/, "Biểu đồ phải xếp một cột trên màn hình nhỏ.");
assert.match(css, /\.dashboard-analytics-tab\.is-active/, "Nhóm biểu đồ phải có trạng thái tab đang chọn.");
assert.match(css, /\.dashboard-project-health-row[\s\S]*?grid-template-columns/, "Biểu đồ sức khỏe dự án phải có dòng tương tác riêng.");
assert.match(css, /\.dashboard-project-timeline-chart[\s\S]*?overflow-x: auto/, "Ma trận mốc công việc phải tự cuộn trong khung trên màn hình nhỏ.");
assert.match(css, /\.dashboard-project-health-list[\s\S]*?max-height: calc\(\(82px \* 5\) \+ 2px\);[\s\S]*?overflow-y: auto;/, "Sức khỏe dự án phải hiển thị năm dòng và cuộn riêng.");
assert.match(css, /\.dashboard-project-trend-filter[\s\S]*?min-width: 260px;/, "Xu hướng dự án phải có bộ chọn dự án rõ ràng.");
assert.match(css, /\.dashboard-project-trend-svg[\s\S]*?min-width: 640px;/, "Biểu đồ xu hướng phải hiển thị đầy đủ trục thời gian của một dự án.");
assert.match(css, /\.dashboard-project-timeline-chart[\s\S]*?max-height: calc\(42px \+ \(64px \* 5\) \+ 2px\);[\s\S]*?overflow: auto;/, "Ma trận mốc dự án phải hiển thị năm dòng và cuộn riêng.");
assert.match(css, /\.dashboard-project-resource-list[\s\S]*?max-height: calc\(40px \+ \(64px \* 5\) \+ 2px\);[\s\S]*?overflow: auto;/, "Nguồn lực dự án phải hiển thị năm dòng và cuộn riêng.");
assert.match(client, /dashboard-comparison-value-label[\s\S]*?Kế hoạch[\s\S]*?dashboard-comparison-track/, "Giá trị kế hoạch KPI phải nằm ngoài thanh tỷ lệ.");
assert.match(client, /dashboard-comparison-value-label[\s\S]*?Hoàn thành đạt[\s\S]*?dashboard-comparison-track/, "Giá trị hiệu quả phòng phải nằm ngoài thanh tỷ lệ.");
assert.match(css, /\.dashboard-comparison-value-label b[\s\S]*color: var\(--primary-dark\)/, "Giá trị biểu đồ so sánh phải dùng màu chữ có tương phản cao.");
assert.match(css, /\.dashboard-comparison-track > span[\s\S]*width: var\(--dashboard-chart-size\)/, "Thanh màu chỉ được dùng để thể hiện tỷ lệ.");

const trendSandbox = {
  state: { activePeriod: "2026-08" },
  normalizeTaskDisplayScope: (value) => value === "all" ? "all" : "current",
  currentTaskDisplayScope: () => "current",
  currentMonth: () => "2026-09",
  daysInMonth: () => 30,
  taskPeriod: (task) => task.due.slice(0, 7),
  taskCompletionIsApproved: (task) => task.approved === true,
  taskCompletionNeedsReview: (task) => task.pending === true,
};
vm.createContext(trendSandbox);
vm.runInContext(extractFunction("taskDisplayScopePeriod"), trendSandbox);
vm.runInContext(extractFunction("dashboardAnalyticsTrendBuckets"), trendSandbox);
const trendRows = JSON.parse(JSON.stringify(trendSandbox.dashboardAnalyticsTrendBuckets([
  { due: "2026-08-03", approved: true },
  { due: "2026-08-09", pending: true },
  { due: "2026-08-16" },
  { due: "2026-08-28" },
])));
assert.deepEqual(
  trendRows.map((row) => ({ total: row.total, approved: row.approved, pending: row.pending, remaining: row.remaining })),
  [
    { total: 1, approved: 1, pending: 0, remaining: 0 },
    { total: 1, approved: 0, pending: 1, remaining: 0 },
    { total: 1, approved: 0, pending: 0, remaining: 1 },
    { total: 1, approved: 0, pending: 0, remaining: 1 },
  ],
  "Xu hướng phải tách đúng kế hoạch, chờ phê duyệt, hoàn thành đạt và chưa đạt theo mốc hoàn thành.",
);

const ageSandbox = {
  getDueStatus: () => "Quá hạn",
  taskDeadlineDate: (task) => new Date(`${task.due}T12:00:00`),
};
vm.createContext(ageSandbox);
vm.runInContext(extractFunction("dashboardAnalyticsOverdueAgeRows"), ageSandbox);
const ageRows = JSON.parse(JSON.stringify(ageSandbox.dashboardAnalyticsOverdueAgeRows([
  { due: "2026-09-12" },
  { due: "2026-09-09" },
  { due: "2026-09-02" },
  { due: "2026-08-20" },
], new Date("2026-09-15T12:00:00"))));
assert.deepEqual(ageRows.map((row) => row.value), [1, 1, 1, 1], "Tuổi việc quá hạn phải được phân vào đúng nhóm ngày.");

const statusSandbox = {
  TASK_STATUS_PREPARING: "Chuẩn bị thực hiện",
  normalizeTaskStatus: (status) => status,
  dashboardAnalyticsInProgressTask: (task) => task.status === "Đang thực hiện",
  getDueStatus: (task) => task.overdue ? "Quá hạn" : task.status,
  taskCompletionNeedsReview: (task) => task.pending === true,
  taskCompletionIsApproved: (task) => task.approved === true,
};
vm.createContext(statusSandbox);
vm.runInContext(extractFunction("dashboardAnalyticsTaskStatusRows"), statusSandbox);
const statusRows = JSON.parse(JSON.stringify(statusSandbox.dashboardAnalyticsTaskStatusRows([
  { status: "Chuẩn bị thực hiện" },
  { status: "Đang thực hiện" },
  { status: "Chuẩn bị thực hiện", overdue: true },
  { status: "Hoàn thành", pending: true },
  { status: "Hoàn thành", approved: true },
])));
assert.deepEqual(
  statusRows.map((row) => ({ id: row.id, value: row.value })),
  [
    { id: "preparing", value: 1 },
    { id: "active", value: 1 },
    { id: "pending", value: 1 },
    { id: "approved", value: 1 },
    { id: "overdue", value: 1 },
  ],
  "Cơ cấu trạng thái không được đếm trùng công việc Chuẩn bị thực hiện vào Đang thực hiện.",
);

const timelineSandbox = {
  getDueStatus: (task) => task.overdue ? "Quá hạn" : task.status || "Đang thực hiện",
  taskCompletionNeedsReview: (task) => task.pending === true,
  dashboardAnalyticsOpenTask: (task) => task.open === true,
  taskCompletionIsApproved: (task) => task.approved === true,
};
vm.createContext(timelineSandbox);
vm.runInContext(extractFunction("dashboardProjectTimelineStatus"), timelineSandbox);
assert.deepEqual(
  JSON.parse(JSON.stringify(timelineSandbox.dashboardProjectTimelineStatus([
    { approved: true },
    { overdue: true },
    { pending: true },
  ]))),
  { tone: "is-overdue", label: "Quá hạn", value: 1 },
  "Mốc dự án phải ưu tiên hiển thị quá hạn khi một mốc có nhiều trạng thái.",
);
assert.deepEqual(
  JSON.parse(JSON.stringify(timelineSandbox.dashboardProjectTimelineStatus([{ approved: true }]))),
  { tone: "is-complete", label: "Đã đạt", value: 1 },
  "Mốc chỉ có công việc đạt phải hiển thị Đã đạt.",
);

const workloadSandbox = {
  taskCompletionIsApproved: (task) => task.approved === true,
  taskCompletionNeedsReview: (task) => task.pending === true,
  taskParticipantIds: (task) => task.people,
  personById: (id) => ({ a: { id: "a", name: "An" }, b: { id: "b", name: "Bình" } })[id] || null,
  getDueStatus: (task) => task.overdue ? "Quá hạn" : "Đang thực hiện",
  taskHasOpenBlocker: (task) => task.blocked === true,
};
vm.createContext(workloadSandbox);
vm.runInContext(extractFunction("dashboardAnalyticsWorkloadRows"), workloadSandbox);
const workloadRows = JSON.parse(JSON.stringify(workloadSandbox.dashboardAnalyticsWorkloadRows([
  { people: ["a", "b"], overdue: true },
  { people: ["a"], pending: true },
  { people: ["a"], approved: true },
  { people: ["b"], blocked: true },
])));
assert.deepEqual(
  workloadRows.map((row) => ({ id: row.person.id, total: row.total, active: row.active, pending: row.pending, overdue: row.overdue, blocked: row.blocked })),
  [
    { id: "b", total: 2, active: 1, pending: 0, overdue: 1, blocked: 1 },
    { id: "a", total: 2, active: 0, pending: 1, overdue: 1, blocked: 0 },
  ],
  "Tải công việc phải tính cả người thực hiện/người phối hợp nhưng không tính việc đã hoàn thành đạt.",
);

console.log("dashboard_analytics=passed");
