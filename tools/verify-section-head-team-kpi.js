const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("script.js", "utf8");
const edgeSource = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${name}.`);
  const next = source.indexOf("\nfunction ", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

const SECTION_HEAD_PERSONAL_CRITERION = "Hoàn thành kế hoạch công việc";
const SECTION_HEAD_TEAM_CRITERION = "Kiểm soát và đảm bảo tiến độ công việc nhóm";
const roles = [
  {
    id: "section-head",
    accountRole: "section_head",
    criteria: [[SECTION_HEAD_PERSONAL_CRITERION, 50], [SECTION_HEAD_TEAM_CRITERION, 50]],
  },
  { id: "employee", accountRole: "employee", criteria: [["Công việc", 100]] },
];
const state = {
  people: [
    { id: "head", name: "Trưởng nhóm", departmentId: "gpmb", roleId: "section-head" },
    { id: "member-a", name: "Nhân sự A", departmentId: "gpmb", roleId: "employee", sectionHeadId: "head" },
    { id: "member-b", name: "Nhân sự B", departmentId: "gpmb", roleId: "employee", sectionHeadId: "head" },
    { id: "other", name: "Nhân sự khác", departmentId: "gpmb", roleId: "employee" },
  ],
  tasks: [
    { id: "task-head", due: "2026-08-10", participantIds: ["head"], status: "Hoàn thành", approved: true, quality: 1 },
    { id: "task-a", due: "2026-08-11", participantIds: ["member-a"], status: "Hoàn thành", approved: true, quality: 0.8 },
    { id: "task-b", due: "2026-08-12", participantIds: ["member-a", "member-b"], status: "Hoàn thành", approved: true, quality: 1.2 },
    { id: "task-pending", due: "2026-08-13", participantIds: ["member-b"], status: "Hoàn thành", approved: false, quality: 1 },
    { id: "task-other", due: "2026-08-14", participantIds: ["other"], status: "Hoàn thành", approved: true, quality: 1 },
  ],
};
const sandbox = {
  state,
  roles,
  SECTION_HEAD_PERSONAL_CRITERION,
  SECTION_HEAD_TEAM_CRITERION,
  TASK_STATUS_COMPLETED: "Hoàn thành",
  configurablePersonnelAccountRoles: ["employee", "section_head", "manager", "deputy_manager", "director"],
  roleById: (id) => roles.find((role) => role.id === id),
  personById: (id) => state.people.find((person) => person.id === id),
  taskPeriod: (task) => task.due.slice(0, 7),
  taskParticipantIds: (task) => task.participantIds,
  taskBelongsToPersonForKpi: (task, personId) => task.participantIds.includes(personId),
  normalizeTaskStatus: (status) => status,
  taskCompletionIsApproved: (task) => task.approved === true,
  taskKpiActualScore: (task) => task.approved === true ? task.quality : 0,
  kpiCriterionKey: (value) => String(value || "").toLocaleLowerCase("vi").trim(),
  taskCountsForPersonalCriterion: () => false,
  plannedTaskCountForPersonalCriterion: () => 0,
  actualTaskScoreForPersonalCriterion: () => 0,
  calculateCriterionResult: (plan, actual, weight) => {
    const completionPercent = plan ? (actual / plan) * 100 : 0;
    return { completionPercent, points: (completionPercent / 100) * weight };
  },
  isKpiEligiblePerson: () => true,
  calculatedTaskBehaviorForPerson: () => ({
    behavior: {},
    behaviorAutomatic: {},
    taskBehaviorLinks: [],
    behaviorScore: 0,
  }),
  calculatePersonalFinalScore: (personalScore) => personalScore,
  gradePersonal: (score) => `Xếp loại ${score}`,
};
vm.createContext(sandbox);
[
  "accountRoleForPerson",
  "isSectionHeadPerson",
  "sectionHeadForPerson",
  "managedTeamMembers",
  "normalizeSectionHeadIdForPerson",
  "normalizeSectionHeadManagementLinks",
  "uniqueTaskRecords",
  "approvedCompletedTaskCount",
  "approvedTaskKpiActualScore",
  "sectionHeadKpiScopes",
  "sectionHeadCriterionScope",
  "personalKpiTaskScope",
  "personalCriteriaScoresFromTasks",
  "recalculateSavedPersonalEvaluationScores",
].forEach((name) => vm.runInContext(extractFunction(name), sandbox));

const scopes = sandbox.sectionHeadKpiScopes("head", "2026-08");
assert.deepEqual([...scopes.ownTasks.map((task) => task.id)], ["task-head"], "Tiêu chí kế hoạch chỉ lấy công việc của Trưởng nhóm.");
assert.deepEqual([...scopes.teamTasks.map((task) => task.id)], ["task-a", "task-b", "task-pending"], "Tiêu chí tiến độ nhóm không được tính công việc ngoài nhóm.");

const groupScope = sandbox.sectionHeadCriterionScope(scopes, SECTION_HEAD_TEAM_CRITERION);
assert.equal(groupScope.type, "team");
assert.equal(groupScope.tasks.length, 3, "Một công việc có hai thành viên nhóm chỉ được tính một lần.");
assert.equal(sandbox.approvedCompletedTaskCount(groupScope.tasks), 2, "Chỉ công việc Hoàn thành được đánh giá Đạt mới tính Thực hiện.");
assert.equal(sandbox.approvedTaskKpiActualScore(groupScope.tasks), 2, "Thực hiện nhóm phải cộng điểm chất lượng 80% + 120% thành 2 đơn vị.");

const calculated = sandbox.personalCriteriaScoresFromTasks("head", "2026-08");
assert.equal(calculated.criteriaScores[0].plan, 1);
assert.equal(calculated.criteriaScores[0].actual, 1);
assert.equal(calculated.criteriaScores[0].points, 50);
assert.equal(calculated.criteriaScores[1].plan, 3);
assert.equal(calculated.criteriaScores[1].actual, 2);
assert.equal(Number(calculated.criteriaScores[1].completionPercent.toFixed(2)), 66.67);
assert.equal(Number(calculated.criteriaScores[1].points.toFixed(2)), 33.33);
assert.equal(Number(calculated.personalScore.toFixed(2)), 83.33, "Tổng điểm phải tách riêng công việc cá nhân và công việc nhóm.");

state.evaluations = [{
  id: "eval-head",
  personId: "head",
  period: "2026-08",
  criteriaScores: {},
  personalScore: 0,
  departmentScore: 0,
  behaviorScore: 0,
  finalScore: 0,
  grade: "",
}];
assert.equal(sandbox.recalculateSavedPersonalEvaluationScores(), true, "Cập nhật danh mục phải tính lại KPI đã lưu.");
assert.equal(Number(state.evaluations[0].personalScore.toFixed(2)), 83.33, "KPI đã lưu phải tách đúng hai nguồn dữ liệu.");

state.people[2].sectionHeadId = "missing-head";
assert.equal(sandbox.normalizeSectionHeadManagementLinks(), true, "Liên kết nhóm không hợp lệ phải được làm sạch.");
assert.equal(state.people[2].sectionHeadId, "");

[
  "const SECTION_HEAD_PERSONAL_CRITERION = \"Hoàn thành kế hoạch công việc\";",
  "const SECTION_HEAD_TEAM_CRITERION = \"Kiểm soát và đảm bảo tiến độ công việc nhóm\";",
  "function sectionHeadKpiScopes(personId, period, preparedTasks = null)",
  "const calculated = person ? personalCriteriaScoresFromTasks(person.id, period) : null;",
  "roles: cloneKpiCatalog(roles)",
].forEach((marker) => assert.ok(source.includes(marker), `Missing section-head KPI safeguard: ${marker}`));

assert.match(edgeSource, /sectionHeadKpiCatalogVersion/, "Máy chủ phải đồng bộ phiên bản danh mục KPI của Trưởng bộ phận/Trưởng nhóm.");
assert.match(edgeSource, /const deploymentVersion = "2026\.10\.23\.1";/, "Máy chủ phải dùng bản triển khai có hỗ trợ danh mục KPI mới.");

console.log("section_head_team_kpi=passed");
