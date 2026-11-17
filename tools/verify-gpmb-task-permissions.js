const fs = require("fs");
const assert = require("assert");
const vm = require("vm");
const release = require("../release.json");

const source = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const clientSource = fs.readFileSync("script.js", "utf8");

function key(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function roleForPerson(person) {
  if (person.roleId.startsWith("truong-phong-")) return "manager";
  if (person.roleId.startsWith("pho-phong-")) return "deputy_manager";
  if (person.roleId.startsWith("truong-bo-phan-")) return "section_head";
  return "employee";
}

function personForAccount(state, account) {
  const direct = state.people.find((person) => person.id === account.personId);
  if (direct) return direct;
  const candidates = state.people.filter((person) => [key(account.username), key(account.displayName)].includes(key(person.name)));
  return candidates.length === 1 ? candidates[0] : null;
}

function repairAccountLinks(state) {
  state.accounts.forEach((account) => {
    const person = personForAccount(state, account);
    if (!person) return;
    account.personId = person.id;
    account.departmentId = person.departmentId;
    if (["employee", "section_head", "manager", "deputy_manager", ""].includes(account.role)) account.role = roleForPerson(person);
  });
}

function remapParticipant(state, value) {
  const id = String(value || "").trim();
  if (!id || state.people.some((person) => person.id === id)) return id;
  const identity = key(id);
  const accounts = state.accounts.filter((account) =>
    [account.id, account.username, account.displayName].some((candidate) => key(candidate) === identity)
  );
  if (accounts.length === 1 && accounts[0].personId) return accounts[0].personId;
  const people = state.people.filter((person) => key(person.name) === identity);
  return people.length === 1 ? people[0].id : id;
}

function repairTaskParticipants(state) {
  state.tasks.forEach((task) => {
    task.ownerId = remapParticipant(state, task.ownerId);
    task.collaboratorIds = (task.collaboratorIds || []).map((id) => remapParticipant(state, id));
  });
}

function participantIds(task) {
  return [task.ownerId, ...(task.collaboratorIds || [])].filter(Boolean);
}

function canUpdateTask(state, account, task) {
  if (account.role === "admin" || account.role === "director") return true;
  if (participantIds(task).includes(account.personId) || participantIds(task).includes(account.id)) return true;
  const departmentTask = participantIds(task).some((personId) => state.people.find((person) => person.id === personId)?.departmentId === account.departmentId);
  return ["manager", "deputy_manager", "section_head"].includes(account.role) && departmentTask;
}

const state = {
  people: [
    { id: "gpmb-employee", name: "Nguyen Van A", departmentId: "gpmb", roleId: "can-bo-gpmb" },
    { id: "gpmb-collaborator", name: "Tran Thi B", departmentId: "gpmb", roleId: "can-bo-gpmb" },
    { id: "gpmb-manager", name: "Le Van C", departmentId: "gpmb", roleId: "truong-phong-gpmb" },
    { id: "gpmb-deputy", name: "Pham Thi D", departmentId: "gpmb", roleId: "pho-phong-gpmb" },
    { id: "gpmb-head", name: "Hoang Van E", departmentId: "gpmb", roleId: "truong-bo-phan-gpmb" },
    { id: "other-employee", name: "Do Van F", departmentId: "ke-hoach", roleId: "can-bo-ke-hoach" },
  ],
  accounts: [
    { id: "account-gpmb-employee", username: "nguyenvana", displayName: "Nguyen Van A", role: "employee", personId: "", departmentId: "" },
    { id: "account-gpmb-collaborator", username: "tranthib", displayName: "Tran Thi B", role: "employee", personId: "", departmentId: "" },
    { id: "account-gpmb-manager", username: "levanc", displayName: "Le Van C", role: "manager", personId: "", departmentId: "" },
    { id: "account-gpmb-deputy", username: "phamthid", displayName: "Pham Thi D", role: "deputy_manager", personId: "", departmentId: "" },
    { id: "account-gpmb-head", username: "hoangvane", displayName: "Hoang Van E", role: "section_head", personId: "", departmentId: "" },
    { id: "account-other", username: "dovanf", displayName: "Do Van F", role: "employee", personId: "", departmentId: "" },
  ],
  tasks: [
    {
      id: "legacy-gpmb-task",
      ownerId: "nguyenvana",
      collaboratorIds: ["Tran Thi B", "account-gpmb-collaborator"],
      status: "Qua han",
      progressReports: [],
    },
  ],
};

repairAccountLinks(state);
repairTaskParticipants(state);

const byId = (id) => state.accounts.find((account) => account.id === id);
const task = state.tasks[0];

assert.equal(byId("account-gpmb-employee").personId, "gpmb-employee");
assert.equal(byId("account-gpmb-employee").departmentId, "gpmb");
assert.equal(task.ownerId, "gpmb-employee", "Username của Người thực hiện phải được chuẩn hóa về ID nhân sự.");
assert.deepEqual(task.collaboratorIds, ["gpmb-collaborator", "gpmb-collaborator"], "Tên hiển thị và ID tài khoản của Người phối hợp phải cùng nhận diện một nhân sự.");
assert.equal(canUpdateTask(state, byId("account-gpmb-employee"), task), true, "GPMB owner must update task progress.");
assert.equal(canUpdateTask(state, byId("account-gpmb-collaborator"), task), true, "GPMB collaborator must update task progress.");
["account-gpmb-manager", "account-gpmb-deputy", "account-gpmb-head"].forEach((accountId) => {
  assert.equal(canUpdateTask(state, byId(accountId), task), true, `${accountId} must update GPMB task progress.`);
});
assert.equal(canUpdateTask(state, byId("account-other"), task), false, "Other departments must not update GPMB task progress.");

[
  "function repairPersonnelAccountLinks(state: JsonRecord): number",
  "function repairTaskParticipantLinks(state: JsonRecord): number",
  "function taskParticipantValues(task: JsonRecord): string[]",
  "function taskParticipantPerson(state: JsonRecord, value: unknown): JsonRecord | undefined",
  "function taskParticipantForAccount(state: JsonRecord, task: JsonRecord, account: JsonRecord): boolean",
  "accounts: [resolvedPersonnelAccount(state, account)],",
  "taskParticipantDepartmentId(state, personId) === departmentId",
  "function gpmbWorkflowTaskProgressMutationIntent(base: JsonRecord, candidate: JsonRecord): boolean",
  "function normalizeGpmbWorkflowTaskProgressMutation(",
  "const canonicalBase = clone(previous);",
  "candidate: normalizeTaskProgressLifecycle(canonicalCandidate)",
  'reason: "Invalid GPMB task progress update."',
].forEach((marker) => assert.ok(source.includes(marker), `Missing server permission safeguard: ${marker}`));
[
  "function taskParticipantPersonId(value)",
  "Older task records may contain a username or display name",
  "taskParticipantPersonId(task.ownerId) === person.id",
  "return uniquePersonIds([taskParticipantPersonId(task?.ownerId), ...taskCollaboratorIds(task)]);",
].forEach((marker) => assert.ok(clientSource.includes(marker), `Missing client permission safeguard: ${marker}`));
assert.ok(clientSource.includes('change.reason === "Invalid GPMB task progress update."'), "Frontend phải giải thích riêng lỗi cập nhật tiến độ GPMB.");

const normalizerStart = source.indexOf("function normalizeGpmbWorkflowTaskProgressMutation(");
const normalizerEnd = source.indexOf("\nfunction normalizeGpmbWorkflow(", normalizerStart);
assert.ok(normalizerStart >= 0 && normalizerEnd > normalizerStart, "Không trích xuất được bộ chuẩn hóa tiến độ GPMB.");
const normalizerSource = source.slice(normalizerStart, normalizerEnd).replace(
  /function normalizeGpmbWorkflowTaskProgressMutation\([\s\S]*?\): \{ baseValue: JsonRecord; candidate: JsonRecord \} \| null \{/,
  "function normalizeGpmbWorkflowTaskProgressMutation(state, actor, previous, base, candidate) {",
);
const progressFields = [
  "status", "progress", "followUpDate", "blockerStatus", "blockerNote", "attachments", "progressReports",
  "completedAt", "completedById", "completedByName", "completionReviewStatus", "completionReviewedAt",
  "completionReviewedById", "completionReviewedByName", "completionReviewNote", "lateCompletion", "qualityPercent",
  "qualityAssessedAt", "qualityAssessedById", "qualityAssessedByName", "updatedAt", "updatedBy", "updatedById",
  "collaboratorIds", "collaboratorId",
];
const normalizerSandbox = {
  clone: (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value)),
  sameJson: (left, right) => JSON.stringify(left) === JSON.stringify(right),
  appendOnly: (before, after) => Array.isArray(before) && Array.isArray(after)
    && after.length >= before.length && before.every((item, index) => JSON.stringify(item) === JSON.stringify(after[index])),
  gpmbWorkflowManagedTask: (item) => Boolean(item?.gpmbWorkflowId && item?.gpmbStepId),
  canUpdateTaskProgress: (_state, actor) => actor.allowed === true,
  taskProgressIsLocked: (item) => item.completionReviewStatus === "passed",
  taskProgressFields: () => progressFields,
  normalizeTaskProgressLifecycle: (item) => ({ ...item, completionReviewStatus: item.status === "Hoàn thành" ? "pending" : "" }),
};
vm.createContext(normalizerSandbox);
vm.runInContext(normalizerSource, normalizerSandbox);
const liveGpmbTask = {
  id: "gpmb-task-1", gpmbWorkflowId: "workflow-1", gpmbStepId: "p1-01", title: "Tên chuẩn từ máy chủ",
  projectName: "Dự án đã đồng bộ", ownerId: "gpmb-employee", status: "Chuẩn bị thực hiện", progress: 0,
  completionReviewStatus: "", progressReports: [], collaboratorIds: [],
};
const staleBase = { ...liveGpmbTask, title: "Tên cũ trên thiết bị", projectName: "Dự án cũ" };
const staleCandidate = {
  ...staleBase,
  status: "Đang thực hiện",
  progress: 30,
  progressReports: [{ id: "report-1", progress: 30 }],
};
const normalizedProgress = normalizerSandbox.normalizeGpmbWorkflowTaskProgressMutation({}, { allowed: true }, liveGpmbTask, staleBase, staleCandidate);
assert.equal(normalizedProgress.candidate.title, liveGpmbTask.title, "Tiến độ hợp lệ phải giữ tiêu đề mới nhất từ máy chủ.");
assert.equal(normalizedProgress.candidate.projectName, liveGpmbTask.projectName, "Tiến độ hợp lệ phải giữ dự án mới nhất từ máy chủ.");
assert.equal(normalizedProgress.candidate.status, "Đang thực hiện", "Trạng thái người dùng chọn phải được giữ lại.");
assert.equal(normalizedProgress.candidate.progress, 30, "Tiến độ người dùng nhập phải được giữ lại.");
assert.equal(normalizerSandbox.normalizeGpmbWorkflowTaskProgressMutation({}, { allowed: false }, liveGpmbTask, staleBase, staleCandidate), null, "Tài khoản ngoài phạm vi vẫn phải bị chặn.");
assert.equal(normalizerSandbox.normalizeGpmbWorkflowTaskProgressMutation({}, { allowed: true }, liveGpmbTask, staleBase, { ...staleCandidate, gpmbStepId: "p1-02" }), null, "Không được đổi mã bước GPMB qua cập nhật tiến độ.");

assert.ok(source.includes(`const deploymentVersion = "${release.edgeFunctionVersion}";`), "Máy chủ phải dùng bản triển khai mới cho quy tắc người phối hợp.");
assert.match(clientSource, /deploymentVersionAtLeast\(sharedSync\.deploymentVersion, "2026\.08\.21\.1"\)/, "Ứng dụng phải nhận diện đúng phiên bản máy chủ xử lý tiến độ.");

console.log("gpmb_task_permissions=passed");
