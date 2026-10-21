const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("script.js", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${name}.`);
  const next = source.indexOf("\nfunction ", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

const departments = [
  { id: "gpm", name: "phòng GPMB" },
  { id: "kth", name: "phòng KHTH" },
];
const tasksByDepartment = {
  gpm: [
    { id: "g1", approved: true, pending: false, dueStatus: "Hoàn thành" },
    { id: "g2", approved: false, pending: true, dueStatus: "Hoàn thành" },
    { id: "g3", approved: false, pending: false, dueStatus: "Quá hạn" },
  ],
  kth: [{ id: "k1", approved: true, pending: false, dueStatus: "Hoàn thành" }],
};
const sandbox = {
  state: { activePeriod: "2026-08" },
  visibleDepartmentsForDepartmentEvaluations: () => departments,
  dashboardDepartmentTasks: (departmentId) => tasksByDepartment[departmentId] || [],
  canViewTaskRecord: () => true,
  taskCompletionIsApproved: (task) => task.approved === true,
  taskCompletionNeedsReview: (task) => task.pending === true,
  getDueStatus: (task) => task.dueStatus,
};
vm.createContext(sandbox);
vm.runInContext(extractFunction("dashboardDepartmentSituationRows"), sandbox);

const rows = Array.from(sandbox.dashboardDepartmentSituationRows("2026-08"));
assert.deepEqual(
  rows.map((row) => ({ id: row.department.id, total: row.total, approved: row.approved, pending: row.pending, overdue: row.overdue })),
  [
    { id: "gpm", total: 3, approved: 1, pending: 1, overdue: 1 },
    { id: "kth", total: 1, approved: 1, pending: 0, overdue: 0 },
  ],
  "Tình hình phòng phải tổng hợp đúng tổng việc, đã đạt, chờ duyệt và quá hạn.",
);
assert.ok(
  source.includes("visibleDepartmentsForDepartmentEvaluations().map"),
  "Bảng tình hình phòng phải chỉ dùng các phòng đủ điều kiện KPI, loại trừ Ban giám đốc.",
);
assert.ok(source.includes(".slice(0, DASHBOARD_VISIBLE_LIST_ROWS)"), "Bảng xếp hạng phải giới hạn ở 10 dòng.");
assert.ok(styles.includes("--dashboard-list-height"), "Cảnh báo phải có khung hiển thị 10 dòng riêng.");
assert.ok(styles.includes("overscroll-behavior: contain"), "Cảnh báo phải cuộn độc lập trong bảng.");
const situationCellStyles = styles.slice(
  styles.indexOf("#dashboard .dashboard-department-status-row span"),
  styles.indexOf("@media print", styles.indexOf("#dashboard .dashboard-department-status-row span")),
);
assert.ok(!situationCellStyles.includes("text-overflow"), "Số liệu tình hình phòng không được rút gọn bằng dấu ba chấm.");
assert.ok(!situationCellStyles.includes("min-width: max-content"), "Số liệu tình hình phòng không được ép rộng làm tràn khung.");
assert.ok(styles.includes("max-width: 100%"), "Bảng tình hình phòng phải được giới hạn trong chiều rộng khung.");

console.log("dashboard_department_situation=passed");
