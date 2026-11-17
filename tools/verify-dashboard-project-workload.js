const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const client = fs.readFileSync("script.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = client.indexOf(marker);
  if (start < 0) throw new Error(`Thiếu hàm ${name}.`);
  const next = client.indexOf("\nfunction ", start + marker.length);
  return client.slice(start, next < 0 ? client.length : next);
}

[
  'id="dashboardWorkload"',
  'data-dashboard-workload-view="projects"',
  'data-dashboard-workload-view="people"',
  'id="dashboardAnalyticsProjects"',
  'id="dashboardProjectHealthChart"',
  'id="dashboardProjectTrendFilter"',
  'id="dashboardProjectTrendChart"',
  'id="dashboardProjectTimelineChart"',
  'id="dashboardProjectResourceChart"',
].forEach((marker) => assert.ok(html.includes(marker), `Thiếu thành phần báo cáo dự án: ${marker}`));

assert.ok(!html.includes("dashboard-workload-period-switch"), "Không được còn cụm chọn Hôm nay/Tuần này trong bảng Thống kê công việc.");

const people = {
  a: { id: "a", name: "An", departmentId: "g" },
  b: { id: "b", name: "Bình", departmentId: "g" },
  c: { id: "c", name: "Chi", departmentId: "q" },
};
const departments = {
  g: { id: "g", name: "phòng GPMB" },
  q: { id: "q", name: "phòng QLHT" },
};
const sandbox = {
  dashboardWorkloadPeriod: "day",
  dashboardWorkloadDepartmentFilter: "",
  dashboardWorkloadView: "projects",
  uniquePersonIds: (values) => [...new Set(values.filter(Boolean))],
  projectIdForTask: (task) => task.projectId || "",
  projectNameForTask: (task) => task.projectName || "",
  taskParticipantIds: (task) => task.people || [],
  personById: (id) => people[id] || null,
  departmentById: (id) => departments[id] || null,
  dashboardDepartmentFilterOptions: (rows) => [...new Set(rows.map((person) => person.departmentId))].map((id) => ({ value: id, label: departments[id].name })),
  taskHasParticipantInDepartment: (task, departmentId) => (task.people || []).some((id) => people[id]?.departmentId === departmentId),
  dashboardTasksForPeriod: () => [],
  taskCompletionIsApproved: (task) => task.approved === true,
  getDueStatus: (task) => task.overdue ? "Quá hạn" : task.status || "Đang thực hiện",
  dashboardAnalyticsTasksForDepartment: (tasks, departmentId) => departmentId ? tasks.filter((task) => (task.people || []).some((id) => people[id]?.departmentId === departmentId)) : tasks,
  dashboardAnalyticsInProgressTask: (task) => !task.approved && !task.pending && !task.overdue,
  dashboardAnalyticsOpenTask: (task) => !task.approved && !task.pending && !task.overdue,
  taskCompletionNeedsReview: (task) => task.pending === true,
  taskIsLateCompletion: (task) => task.late === true,
  dashboardAnalyticsPercent: (value, total) => total ? (value / total) * 100 : 0,
};
vm.createContext(sandbox);
[
  "dashboardWorkloadDateKey",
  "dashboardWorkloadWeekBounds",
  "dashboardWorkloadTasksInRange",
  "dashboardWorkloadProjectKey",
  "dashboardWorkloadProjectName",
  "dashboardWorkloadDepartmentOptions",
  "dashboardWorkloadScopedTasks",
  "dashboardWorkloadProjectRows",
  "dashboardWorkloadPeopleRows",
  "dashboardAnalyticsProjectRows",
].forEach((name) => vm.runInContext(extractFunction(name), sandbox));

const tasks = [
  { id: "a-today", due: "2026-09-18", projectId: "p-a", projectName: "Dự án A", people: ["a", "b"], approved: true },
  { id: "a-week", due: "2026-09-19", projectId: "p-a", projectName: "Dự án A", people: ["a"], overdue: true },
  { id: "b-week", due: "2026-09-15", projectId: "p-b", projectName: "Dự án B", people: ["c"], pending: true },
  { id: "outside", due: "2026-09-25", projectId: "p-b", projectName: "Dự án B", people: ["c"] },
];
const now = new Date("2026-09-18T10:00:00");

assert.deepEqual(
  JSON.parse(JSON.stringify(sandbox.dashboardWorkloadTasksInRange(tasks, "day", now).map((task) => task.id))),
  ["a-today"],
  "Báo cáo Hôm nay chỉ được tính công việc có hạn hoàn thành trong ngày.",
);
assert.deepEqual(
  JSON.parse(JSON.stringify(sandbox.dashboardWorkloadTasksInRange(tasks, "week", now).map((task) => task.id))),
  ["a-today", "a-week", "b-week"],
  "Báo cáo Tuần này phải tính từ thứ Hai đến Chủ nhật hiện tại.",
);

let projectRows = JSON.parse(JSON.stringify(sandbox.dashboardWorkloadProjectRows(tasks, now)));
assert.deepEqual(
  projectRows.map((row) => ({ name: row.name, day: row.dailyTasks.length, week: row.weeklyTasks.length, people: row.participants, overdue: row.overdue })),
  [
    { name: "Dự án A", day: 1, week: 2, people: 2, overdue: 0 },
    { name: "Dự án B", day: 0, week: 1, people: 1, overdue: 0 },
  ],
  "Dòng dự án phải tách đúng khối lượng ngày/tuần và số cán bộ liên quan.",
);

sandbox.dashboardWorkloadPeriod = "week";
projectRows = JSON.parse(JSON.stringify(sandbox.dashboardWorkloadProjectRows(tasks, now)));
assert.equal(projectRows[0].overdue, 1, "Quá hạn của dự án phải theo kỳ đang chọn.");

const peopleRows = JSON.parse(JSON.stringify(sandbox.dashboardWorkloadPeopleRows(tasks, now)));
assert.deepEqual(
  peopleRows.map((row) => ({ name: row.person.name, day: row.dailyTasks.length, week: row.weeklyTasks.length })),
  [
    { name: "An", day: 1, week: 2 },
    { name: "Bình", day: 1, week: 1 },
    { name: "Chi", day: 0, week: 1 },
  ],
  "Bảng nhân sự phải tính cả người thực hiện và người phối hợp.",
);

sandbox.dashboardWorkloadDepartmentFilter = "g";
projectRows = JSON.parse(JSON.stringify(sandbox.dashboardWorkloadProjectRows(tasks, now)));
assert.deepEqual(projectRows.map((row) => row.name), ["Dự án A"], "Lọc phòng phải chỉ giữ dự án có cán bộ phòng đó tham gia.");

const analyticsRows = JSON.parse(JSON.stringify(sandbox.dashboardAnalyticsProjectRows(tasks, "")));
const projectA = analyticsRows.find((row) => row.name === "Dự án A");
assert.deepEqual(
  { total: projectA.total, approved: projectA.approved, overdue: projectA.overdue, people: projectA.people, onTimeRate: projectA.onTimeRate },
  { total: 2, approved: 1, overdue: 1, people: 2, onTimeRate: 100 },
  "Biểu đồ dự án phải tổng hợp đúng khối lượng, kết quả duyệt, quá hạn và số cán bộ.",
);

console.log("dashboard_project_workload=passed");
