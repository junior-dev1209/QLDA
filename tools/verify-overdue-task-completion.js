const assert = require("node:assert/strict");
const fs = require("node:fs");

const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const html = fs.readFileSync("index.html", "utf8");

function editableStatus(task) {
  return task.status === "Quá hạn"
    ? (Number(task.progress) > 0 ? "Đang thực hiện" : "Chuẩn bị thực hiện")
    : task.status;
}

function canUpdateProgress(account, task) {
  const participant = task.ownerId === account.personId || task.collaboratorIds.includes(account.personId);
  const departmentParticipant = [task.ownerId, ...task.collaboratorIds].some((personId) => task.people[personId]?.departmentId === account.departmentId);
  const departmentLead = ["manager", "deputy_manager", "section_head"].includes(account.role) && departmentParticipant;
  const broadAccess = ["admin", "director"].includes(account.role);
  const approved = task.status === "Hoàn thành" && task.completionReviewStatus === "passed";
  return !approved && (participant || departmentLead || broadAccess);
}

const people = {
  owner: { departmentId: "gpmb" },
  collaborator: { departmentId: "gpmb" },
};
const accounts = [
  { personId: "owner", role: "employee", departmentId: "gpmb" },
  { personId: "collaborator", role: "employee", departmentId: "gpmb" },
  { personId: "manager", role: "manager", departmentId: "gpmb" },
  { personId: "other", role: "employee", departmentId: "kht" },
];

["daily", "weekly", "monthly", "none"].forEach((recurrence) => {
  const task = {
    status: "Quá hạn",
    progress: 0,
    recurrence,
    ownerId: "owner",
    collaboratorIds: ["collaborator"],
    completionReviewStatus: "",
    people,
  };
  assert.equal(editableStatus(task), "Chuẩn bị thực hiện", `${recurrence}: Quá hạn phải chuyển về trạng thái thao tác được.`);
  assert.equal(canUpdateProgress(accounts[0], task), true, `${recurrence}: người thực hiện phải hoàn thành được.`);
  assert.equal(canUpdateProgress(accounts[1], task), true, `${recurrence}: người phối hợp phải hoàn thành được.`);
  assert.equal(canUpdateProgress(accounts[2], task), true, `${recurrence}: quản lý phòng phải hoàn thành được.`);
  assert.equal(canUpdateProgress(accounts[3], task), false, `${recurrence}: tài khoản không liên quan không được cập nhật.`);
});

assert.equal(editableStatus({ status: "Quá hạn", progress: 40 }), "Đang thực hiện", "Quá hạn có tiến độ phải giữ trạng thái đang thực hiện trong biểu mẫu.");
assert.equal(editableStatus({ status: "Hoàn thành", progress: 100 }), "Hoàn thành", "Không được thay đổi trạng thái hoàn thành hợp lệ.");
assert.equal(
  canUpdateProgress(accounts[0], {
    status: "Hoàn thành",
    completionReviewStatus: "passed",
    ownerId: "owner",
    collaboratorIds: [],
    people,
  }),
  false,
  "Chỉ công việc đã được đánh giá Đạt mới bị khóa tiến độ.",
);

assert.match(client, /function editableTaskStatus\(task\)/, "Biểu mẫu phải có trạng thái thao tác riêng cho bản ghi Quá hạn.");
assert.match(client, /byId\("taskStatus"\)\.value = editableTaskStatus\(task\);/, "Mở công việc Quá hạn phải dùng trạng thái thao tác được.");
assert.match(client, /function currentPerson\(\) \{[\s\S]*?const matches = identities\.size/, "Tài khoản cũ chưa liên kết nhân sự phải có phương án nhận diện dự phòng.");
assert.match(client, /function ensureRecurringTasksForPeriod\([\s\S]*?TASK_RECURRENCE_DAILY[\s\S]*?TASK_RECURRENCE_WEEKLY[\s\S]*?TASK_RECURRENCE_MONTHLY/, "Công việc định kỳ ngày/tuần/tháng phải đi cùng một luồng tạo bản ghi.");
assert.match(client, /const repeatedTask = applyRecordAudit\([\s\S]*?status: TASK_STATUS_PREPARING,/, "Bản ghi định kỳ mới phải có trạng thái gốc hợp lệ để hệ thống tự suy ra Quá hạn.");
assert.match(html, /<select id="taskStatus"[\s\S]*?<option>Chuẩn bị thực hiện<\/option>[\s\S]*?<option>Đang thực hiện<\/option>[\s\S]*?<option>Hoàn thành<\/option>[\s\S]*?<\/select>/, "Biểu mẫu chỉ cho chọn ba trạng thái nghiệp vụ.");
assert.match(edge, /function taskParticipantForAccount\(state: JsonRecord, task: JsonRecord, account: JsonRecord\): boolean/, "Máy chủ phải nhận diện người thực hiện và phối hợp từ tài khoản.");
assert.match(edge, /function canUpdateTaskProgress\(state: JsonRecord, account: JsonRecord, task: JsonRecord\): boolean \{[\s\S]*?taskParticipantForAccount\(state, task, account\)\) return true;/, "Máy chủ phải cho người liên quan cập nhật tiến độ.");
assert.match(edge, /taskProgressOnlyChange\(previous, next\)/, "Chuyển Quá hạn sang Hoàn thành phải được xét như cập nhật tiến độ hợp lệ.");
assert.match(edge, /function rebaseTaskProgressChange\(live: JsonRecord, base: JsonRecord, next: JsonRecord\): JsonRecord \| null/, "Xung đột phiên bản của cập nhật tiến độ phải được hòa giải.");
assert.match(edge, /function normalizeTaskCompletionLifecycle\(next: JsonRecord\): JsonRecord[\s\S]*?String\(normalized\.status \|\| ""\)\.trim\(\) === "Quá hạn"/, "Máy chủ không được coi Quá hạn là trạng thái khóa cập nhật.");

console.log("overdue_task_completion=passed");
