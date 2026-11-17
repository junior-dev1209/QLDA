const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("script.js", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Thiếu hàm ${name}.`);
  const next = source.indexOf("\nfunction ", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

const people = [
  { id: "deputy", departmentId: "gpm", kpiEligible: true },
  { id: "staff-1", departmentId: "gpm", kpiEligible: true },
  { id: "staff-2", departmentId: "gpm", kpiEligible: true },
  { id: "director", departmentId: "leadership", kpiEligible: false },
  { id: "other-dept", departmentId: "kth", kpiEligible: true },
];
let scope = "department";
const sandbox = {
  state: { people },
  canViewSystemContent: () => scope === "system",
  hasDepartmentManagementAccess: () => scope === "department",
  currentDepartmentId: () => "gpm",
  currentPerson: () => people[0],
  isKpiEligiblePerson: (person) => person?.kpiEligible === true,
};

vm.createContext(sandbox);
vm.runInContext(extractFunction("dashboardPeopleForEvaluation"), sandbox);

assert.deepEqual(
  Array.from(sandbox.dashboardPeopleForEvaluation(), (person) => person.id),
  ["deputy", "staff-1", "staff-2"],
  "Phó phòng phải thấy dữ liệu KPI của nhân sự đủ điều kiện trong phòng mình, không phải chỉ hồ sơ cá nhân.",
);

scope = "system";
assert.deepEqual(
  Array.from(sandbox.dashboardPeopleForEvaluation(), (person) => person.id),
  ["deputy", "staff-1", "staff-2", "other-dept"],
  "Admin/Ban giám đốc có quyền xem dữ liệu KPI toàn Ban, không gồm đối tượng miễn KPI.",
);

scope = "self";
assert.deepEqual(
  Array.from(sandbox.dashboardPeopleForEvaluation(), (person) => person.id),
  ["deputy"],
  "Tài khoản thông thường chỉ xem KPI của chính mình trên Tổng quan.",
);

assert.ok(
  extractFunction("dashboardKpiSummaryRows").includes("dashboardPeopleForEvaluation()"),
  "Bảng tổng hợp điểm KPI phải dùng phạm vi nhân sự dành cho Tổng quan.",
);
assert.ok(
  extractFunction("renderDashboard").includes("dashboardPeopleForEvaluation().filter(isActivePerson)"),
  "Các thẻ tổng hợp và xếp hạng Tổng quan phải dùng đúng phạm vi nhân sự.",
);
assert.ok(
  extractFunction("visiblePeopleForEvaluation").includes("if (isManager())"),
  "Thay đổi phạm vi Tổng quan không được nới quyền thao tác ở các màn KPI khác.",
);

console.log("dashboard_role_scope=passed");
