const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("script.js", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${name}.`);
  const next = source.indexOf("\nfunction ", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

const behaviorRules = [
  ["Không báo cáo đúng hạn", -2],
  ["Chậm thời hạn hoàn thành", -3],
  ["Làm vượt tiến độ", 2],
  ["Sáng kiến", 5],
];
const sandbox = {
  behaviorRules,
  state: { tasks: [] },
  taskBelongsToPersonForKpi: (task, personId) => task.participantIds.includes(personId),
  taskPeriod: (task) => task.period,
  taskCompletionIsApproved: (task) => task.approved === true,
  taskCompletionTimingStatus: (task) => task.ahead === true ? "ahead" : "",
  taskParticipantPersonId: (value) => value,
  taskViolationReasons: (task) => task.reasons || [],
  personalCriterionForTask: (task) => task.category || "Chưa gắn tiêu chí KPI",
  clamp: (value, min, max) => Math.min(Math.max(Number(value) || 0, min), max),
};
vm.createContext(sandbox);
["taskBehaviorRuleIndexes", "automaticTaskBehaviorRuleIndexes", "taskIsApprovedAheadOfSchedule", "automaticTaskBehaviorForPerson", "behaviorManualValues", "calculatedTaskBehaviorForPerson"].forEach((name) => vm.runInContext(extractFunction(name), sandbox));

const aheadTask = {
  id: "task-ahead",
  title: "Hoàn thành sớm",
  ownerId: "owner",
  participantIds: ["owner", "collaborator"],
  category: "Tiêu chí A",
  period: "2026-08",
  approved: true,
  ahead: true,
};
const rewardIndex = behaviorRules.findIndex(([name]) => name === "Làm vượt tiến độ");
const reportIndex = behaviorRules.findIndex(([name]) => name === "Không báo cáo đúng hạn");
const deadlineIndex = behaviorRules.findIndex(([name]) => name === "Chậm thời hạn hoàn thành");

const automaticIndexes = sandbox.automaticTaskBehaviorRuleIndexes();
assert.equal(automaticIndexes.has(reportIndex), false, "Không báo cáo đúng hạn phải là tiêu chí nhập tay.");
assert.equal(automaticIndexes.has(deadlineIndex), true, "Chậm thời hạn hoàn thành phải được hệ thống tự ghi nhận.");
assert.equal(automaticIndexes.has(rewardIndex), true, "Làm vượt tiến độ phải được hệ thống tự ghi nhận.");

["owner", "collaborator"].forEach((personId) => {
  const result = sandbox.automaticTaskBehaviorForPerson(personId, "2026-08", [aheadTask]);
  assert.equal(result.counts[rewardIndex], 1, `${personId} phải được ghi nhận Làm vượt tiến độ.`);
  assert.equal(result.links.length, 1);
  assert.equal(result.links[0].type, "reward");
  assert.deepEqual([...result.links[0].reasons], ["Làm vượt tiến độ"]);
});

const lateTask = {
  id: "task-late",
  title: "Hoàn thành chậm",
  ownerId: "owner",
  participantIds: ["owner", "collaborator"],
  category: "Tiêu chí A",
  period: "2026-08",
  reasons: ["Chưa báo cáo tiến độ trước thời hạn hoàn thành", "Chậm thời hạn hoàn thành"],
};
const ownerResult = sandbox.automaticTaskBehaviorForPerson("owner", "2026-08", [lateTask]);
const collaboratorResult = sandbox.automaticTaskBehaviorForPerson("collaborator", "2026-08", [lateTask]);
assert.equal(ownerResult.counts[deadlineIndex], 1, "Lỗi trễ hạn vẫn tính cho Người thực hiện.");
assert.equal(ownerResult.counts[reportIndex] || 0, 0, "Không báo cáo đúng hạn không được hệ thống tự cộng từ công việc.");
assert.deepEqual([...ownerResult.links[0].reasons], ["Chậm thời hạn hoàn thành"], "Chi tiết chậm hạn chỉ được ghi nhận đúng nguyên nhân của tiêu chí.");
assert.equal(collaboratorResult.counts[deadlineIndex] || 0, 0, "Lỗi trễ hạn không được chuyển sang Người phối hợp.");

const unapprovedAheadTask = { ...aheadTask, id: "task-unapproved", approved: false };
const unapprovedResult = sandbox.automaticTaskBehaviorForPerson("owner", "2026-08", [unapprovedAheadTask]);
assert.equal(unapprovedResult.counts[rewardIndex] || 0, 0, "Chỉ công việc được đánh giá Đạt mới được tính Làm vượt tiến độ.");

const normalized = sandbox.calculatedTaskBehaviorForPerson(
  "owner",
  "2026-08",
  { behaviorManual: { 0: 6, 1: 9, 2: 7, 3: 4 } },
  [aheadTask, lateTask],
);
assert.equal(normalized.behaviorManual[reportIndex], 6, "Không báo cáo đúng hạn phải giữ số lượng nhập tay.");
assert.equal(normalized.behaviorManual[deadlineIndex], 0, "Không được giữ số nhập tay tại tiêu chí Chậm thời hạn hoàn thành.");
assert.equal(normalized.behaviorManual[rewardIndex], 0, "Không được giữ số nhập tay tại tiêu chí Làm vượt tiến độ.");
assert.equal(normalized.behavior[deadlineIndex], 1, "Chậm thời hạn hoàn thành chỉ nhận số lượng từ hệ thống.");
assert.equal(normalized.behavior[rewardIndex], 1, "Làm vượt tiến độ chỉ nhận số lượng từ hệ thống.");
assert.equal(normalized.behaviorManual[3], 4, "Tiêu chí không tự động vẫn giữ được số nhập tay.");

console.log("ahead_of_schedule_reward=passed");
