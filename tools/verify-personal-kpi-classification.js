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

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const people = new Map([["person-1", { id: "person-1", roleId: "role-1" }]]);
const roles = new Map([[
  "role-1",
  {
    id: "role-1",
    criteria: [
      ["Hồ sơ dự án", 50],
      ["Hồ sơ dự án hoàn thành", 50],
    ],
  },
]]);

const sandbox = {
  console,
  normalizeSearchText,
  personById: (id) => people.get(id),
  roleById: (id) => roles.get(id),
  taskParticipantIds: (task) => task.participantIds || [],
  taskKpiActualScore: (task) => Number(task.actualScore || 0),
};
vm.createContext(sandbox);
[
  "personalCriterionForTask",
  "kpiCriterionKeywords",
  "kpiTaskSearchText",
  "kpiCriterionKey",
  "taskMatchesKpiCriterion",
  "taskBelongsToPersonForKpi",
  "taskCountsForPersonalCriterion",
  "plannedTaskCountForPersonalCriterion",
  "actualTaskScoreForPersonalCriterion",
].forEach((name) => vm.runInContext(extractFunction(name), sandbox));

const exactCategoryTask = {
  participantIds: ["person-1"],
  category: "Hồ sơ dự án",
  actualScore: 0.8,
};
assert.equal(
  sandbox.personalCriterionForTask(exactCategoryTask, "person-1"),
  "Hồ sơ dự án",
  "Danh mục đã chọn phải là tiêu chí KPI quyết định.",
);
assert.equal(
  sandbox.plannedTaskCountForPersonalCriterion("person-1", "2026-08", "Hồ sơ dự án", [exactCategoryTask]),
  1,
);
assert.equal(
  sandbox.plannedTaskCountForPersonalCriterion("person-1", "2026-08", "Hồ sơ dự án hoàn thành", [exactCategoryTask]),
  0,
  "Một công việc không được tính sang tiêu chí có tên gần giống.",
);
assert.equal(
  sandbox.actualTaskScoreForPersonalCriterion("person-1", "2026-08", "Hồ sơ dự án", [exactCategoryTask]),
  0.8,
);
assert.equal(
  sandbox.actualTaskScoreForPersonalCriterion("person-1", "2026-08", "Hồ sơ dự án hoàn thành", [exactCategoryTask]),
  0,
);

const ambiguousLegacyTask = {
  participantIds: ["person-1"],
  title: "Hoàn thiện hồ sơ dự án hoàn thành",
};
assert.equal(
  sandbox.personalCriterionForTask(ambiguousLegacyTask, "person-1"),
  "Chưa gắn tiêu chí KPI",
  "Dữ liệu cũ khớp nhiều tiêu chí phải được loại khỏi phép tính để tránh cộng trùng.",
);

assert.match(source, /function kpiTasksForCriterion\(scope, criterionName\)[\s\S]*?taskCountsForPersonalCriterion\(task, personId, criterionName\)/);
console.log("personal_kpi_classification=passed");
