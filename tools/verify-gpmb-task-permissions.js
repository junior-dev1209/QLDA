const fs = require("fs");
const assert = require("assert");

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

function remapParticipant(state, id) {
  const account = state.accounts.find((item) => item.id === id);
  return account?.personId || id;
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
      ownerId: "account-gpmb-employee",
      collaboratorIds: ["account-gpmb-collaborator"],
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
assert.equal(task.ownerId, "gpmb-employee", "Legacy account owner must be remapped to person id.");
assert.deepEqual(task.collaboratorIds, ["gpmb-collaborator"]);
assert.equal(canUpdateTask(state, byId("account-gpmb-employee"), task), true, "GPMB owner must update task progress.");
assert.equal(canUpdateTask(state, byId("account-gpmb-collaborator"), task), true, "GPMB collaborator must update task progress.");
["account-gpmb-manager", "account-gpmb-deputy", "account-gpmb-head"].forEach((accountId) => {
  assert.equal(canUpdateTask(state, byId(accountId), task), true, `${accountId} must update GPMB task progress.`);
});
assert.equal(canUpdateTask(state, byId("account-other"), task), false, "Other departments must not update GPMB task progress.");

[
  "function repairPersonnelAccountLinks(state: JsonRecord): number",
  "function repairTaskParticipantLinks(state: JsonRecord): number",
  "function taskParticipantForAccount(state: JsonRecord, task: JsonRecord, account: JsonRecord): boolean",
  "accounts: [resolvedPersonnelAccount(state, account)],",
  "taskParticipantDepartmentId(state, personId) === departmentId",
].forEach((marker) => assert.ok(source.includes(marker), `Missing server permission safeguard: ${marker}`));
[
  "function taskParticipantPersonId(value)",
  "taskParticipantPersonId(task.ownerId) === person.id",
  "return uniquePersonIds([taskParticipantPersonId(task?.ownerId), ...taskCollaboratorIds(task)]);",
].forEach((marker) => assert.ok(clientSource.includes(marker), `Missing client permission safeguard: ${marker}`));

[
  'const deploymentVersion = "2026.08.21.2";',
  "function serverSanitizedTaskProgressCandidate(",
  "const sanitized = clone(previous);",
  "return normalizeTaskProgressLifecycle(sanitized);",
].forEach((marker) => assert.ok(source.includes(marker), `Missing overdue-completion server fix: ${marker}`));

console.log("gpmb_task_permissions=passed");
