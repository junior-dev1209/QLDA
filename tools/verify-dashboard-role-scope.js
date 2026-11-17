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
  { id: "team-head", departmentId: "kth", kpiEligible: true },
  { id: "team-member", departmentId: "kth", sectionHeadId: "team-head", kpiEligible: true },
  { id: "same-dept-outsider", departmentId: "kth", kpiEligible: true },
];
let scope = "department";
let activePerson = people[0];
const sandbox = {
  state: { people },
  canViewSystemContent: () => scope === "system",
  hasDepartmentManagementAccess: () => scope === "department",
  isSectionHead: () => scope === "team",
  currentDepartmentId: () => activePerson.departmentId,
  currentPerson: () => activePerson,
  managedTeamMembers: (sectionHeadId) => people.filter((person) => person.sectionHeadId === sectionHeadId),
  isKpiEligiblePerson: (person) => person?.kpiEligible === true,
  taskParticipantIds: (task) => task.participantIds || [],
};

vm.createContext(sandbox);
vm.runInContext(extractFunction("dashboardHasManagedTeamScope"), sandbox);
vm.runInContext(extractFunction("dashboardScopePeople"), sandbox);
vm.runInContext(extractFunction("dashboardPeopleForEvaluation"), sandbox);
vm.runInContext(extractFunction("dashboardPersonIsInScope"), sandbox);
vm.runInContext(extractFunction("dashboardTaskMatchesAccountScope"), sandbox);

assert.deepEqual(
  Array.from(sandbox.dashboardPeopleForEvaluation(), (person) => person.id),
  ["deputy", "staff-1", "staff-2"],
  "Phó phòng phải thấy dữ liệu KPI của nhân sự đủ điều kiện trong phòng mình, không phải chỉ hồ sơ cá nhân.",
);

scope = "system";
assert.deepEqual(
  Array.from(sandbox.dashboardPeopleForEvaluation(), (person) => person.id),
  ["deputy", "staff-1", "staff-2", "team-head", "team-member", "same-dept-outsider"],
  "Admin/Ban giám đốc có quyền xem dữ liệu KPI toàn Ban, không gồm đối tượng miễn KPI.",
);

scope = "team";
activePerson = people[4];
assert.deepEqual(
  Array.from(sandbox.dashboardPeopleForEvaluation(), (person) => person.id),
  ["team-head", "team-member"],
  "Trưởng bộ phận/Trưởng nhóm phải thấy chính mình và đúng nhân sự được giao quản lý trực tiếp.",
);
assert.equal(
  sandbox.dashboardTaskMatchesAccountScope({ participantIds: ["team-member"] }),
  true,
  "Công việc của thành viên trực thuộc phải được tính trên Tổng quan của Trưởng nhóm.",
);
assert.equal(
  sandbox.dashboardTaskMatchesAccountScope({ participantIds: ["same-dept-outsider"] }),
  false,
  "Công việc của người cùng phòng nhưng ngoài nhóm không được tính trên Tổng quan của Trưởng nhóm.",
);
assert.equal(
  sandbox.dashboardTaskMatchesAccountScope({ participantIds: ["team-member", "same-dept-outsider"] }),
  true,
  "Công việc phối hợp chỉ được tính một lần khi có ít nhất một thành viên của nhóm tham gia.",
);

scope = "self";
activePerson = people[0];
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
  extractFunction("dashboardTasksForPeriod").includes("dashboardTaskMatchesAccountScope(task)"),
  "Các thẻ và biểu đồ công việc phải giới hạn theo nhóm nhân sự do Trưởng nhóm quản lý.",
);
assert.ok(
  extractFunction("dashboardOperationalTasks").includes("dashboardTaskMatchesAccountScope(task)"),
  "Cảnh báo điều hành phải giới hạn theo nhóm nhân sự do Trưởng nhóm quản lý.",
);
assert.ok(
  extractFunction("visiblePeopleForEvaluation").includes("if (isManager())"),
  "Thay đổi phạm vi Tổng quan không được nới quyền thao tác ở các màn KPI khác.",
);

console.log("dashboard_role_scope=passed");
