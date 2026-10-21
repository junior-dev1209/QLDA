const assert = require("node:assert/strict");
const fs = require("node:fs");

const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const html = fs.readFileSync("index.html", "utf8");

function assignmentsMatch(expectedIds, assignments) {
  const ids = assignments.map((assignment) => assignment.taskId);
  return assignments.length === expectedIds.length
    && new Set(ids).size === ids.length
    && [...ids].sort().join("|") === [...expectedIds].sort().join("|")
    && assignments.every((assignment) => assignment.successorPersonId);
}

function successorForDue(source, due, peopleById) {
  const handover = (source.recurrenceHandoverHistory || [])
    .filter((item) => item && item.effectiveDate <= due && item.toPersonId)
    .sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate))
    .at(-1);
  const owner = peopleById[handover?.toPersonId || source.ownerId];
  return owner?.employmentStatus === "active" ? owner : null;
}

const openAssignments = [
  { taskId: "task-a", successorPersonId: "receiver-1" },
  { taskId: "task-b", successorPersonId: "receiver-2" },
];
assert.equal(assignmentsMatch(["task-a", "task-b"], openAssignments), true, "Phải cho phép hai công việc chuyển cho hai người khác nhau.");
assert.equal(assignmentsMatch(["task-a", "task-b"], [{ taskId: "task-a", successorPersonId: "receiver-1" }]), false, "Không được bỏ sót công việc đang mở.");
assert.equal(assignmentsMatch(["task-a", "task-b"], [{ taskId: "task-a", successorPersonId: "receiver-1" }, { taskId: "task-a", successorPersonId: "receiver-2" }]), false, "Không được gửi trùng một công việc trong lệnh bàn giao.");

const people = {
  departing: { employmentStatus: "left" },
  receiver1: { employmentStatus: "active" },
  receiver2: { employmentStatus: "active" },
};
assert.equal(successorForDue({ ownerId: "departing", recurrenceHandoverHistory: [{ effectiveDate: "2026-10-01", toPersonId: "receiver1" }] }, "2026-10-15", people), people.receiver1, "Kỳ định kỳ phải dùng người tiếp quản của chính mẫu đó.");
assert.equal(successorForDue({ ownerId: "departing", recurrenceHandoverHistory: [{ effectiveDate: "2026-10-01", toPersonId: "receiver2" }] }, "2026-10-15", people), people.receiver2, "Hai mẫu định kỳ khác nhau có thể chuyển cho hai người khác nhau.");
assert.equal(successorForDue({ ownerId: "departing" }, "2026-10-15", people), null, "Không được tạo việc định kỳ cho người đã nghỉ nếu mẫu chưa được bàn giao.");

assert.ok(html.includes('id="employeeHandoverDialog"'), "Thiếu màn hình nghỉ việc và bàn giao.");
assert.ok(html.includes('id="employeeHandoverTaskList"'), "Thiếu danh sách phân công công việc đang mở.");
assert.ok(html.includes('id="employeeHandoverRecurringList"'), "Thiếu danh sách phân công mẫu công việc định kỳ.");
assert.ok(client.includes('data-handover-assignment-id'), "Mỗi dòng bàn giao phải có lựa chọn người tiếp quản riêng.");
assert.ok(html.includes('id="employeeHandoverRemoveCollaborator"'), "Phải có lựa chọn gỡ người nghỉ khỏi vai trò phối hợp.");
assert.ok(!client.includes("data-delete-person"), "Không được để lại thao tác xóa cứng nhân sự trên giao diện.");
assert.ok(!client.includes("employeeHandoverSuccessor"), "Không được duy trì một ô người tiếp quản duy nhất cho mọi công việc.");
assert.match(client, /function employeeHandoverAssignmentsFrom\(containerId\)/, "Client phải thu thập phân công theo từng dòng.");
assert.match(client, /taskAssignments: employeeHandoverAssignmentsFrom\("employeeHandoverTaskList"\)/, "Client phải gửi từng người nhận của công việc đang mở.");
assert.match(client, /recurrenceAssignments: employeeHandoverAssignmentsFrom\("employeeHandoverRecurringList"\)/, "Client phải gửi từng người nhận của mẫu định kỳ.");
assert.match(client, /taskAssignments\.length !== expectedTaskIds\.length/, "Client phải từ chối danh sách công việc bị thiếu hoặc trùng.");
assert.match(client, /employmentHandoverRecipientIds: recipientIds/, "Hồ sơ phải lưu đủ danh sách người nhận bàn giao.");
assert.match(client, /function recurrenceOwnerForDue\(sourceTask, due\)/, "Client phải dùng lịch sử bàn giao khi tạo việc định kỳ mới.");
assert.match(client, /deploymentVersionAtLeast\(sharedSync\.deploymentVersion, "2026\.09\.30\.1"\)/, "Client phải chặn máy chủ chưa hỗ trợ bàn giao nhiều người.");

assert.match(edge, /const deploymentVersion = "2026\.10\.21\.1"/, "Máy chủ phải công bố phiên bản hỗ trợ bàn giao nhiều người.");
assert.match(edge, /type EmployeeHandoverAssignment = \{[\s\S]*?successorPersonId: string;/, "Máy chủ phải dùng cấu trúc phân công từng công việc.");
assert.match(edge, /taskAssignments: EmployeeHandoverAssignment\[\];[\s\S]*?recurrenceAssignments: EmployeeHandoverAssignment\[\];/, "Máy chủ phải nhận phân công cho việc mở và mẫu định kỳ.");
assert.match(edge, /const taskSuccessorIds = new Map\(handover\.taskAssignments/, "Máy chủ phải ánh xạ người nhận theo từng công việc.");
assert.match(edge, /const recurrenceSuccessorIds = new Map\(handover\.recurrenceAssignments/, "Máy chủ phải ánh xạ người nhận theo từng mẫu định kỳ.");
assert.match(edge, /function recurringTaskSourceForHandover[\s\S]*?if \(assignedTask\(task\)\) return false;/, "Máy chủ phải dùng cùng phạm vi công việc định kỳ với giao diện.");
assert.match(edge, /sameJson\(expectedTaskIds, submittedTaskIds\)/, "Máy chủ phải kiểm tra đầy đủ danh sách công việc đang mở.");
assert.match(edge, /sameJson\(expectedRecurringIds, submittedRecurringIds\)/, "Máy chủ phải kiểm tra đầy đủ mẫu định kỳ cần bàn giao.");
assert.match(edge, /employmentHandoverRecipientIds: recipientIds/, "Máy chủ phải lưu tất cả người nhận bàn giao.");
assert.match(edge, /kpi_sync_sessions"\)\.delete\(\)\.in\("account_id", uniqueIds\)/, "Máy chủ phải thu hồi mọi phiên đăng nhập của người nghỉ.");
assert.match(edge, /await syncAllRecordProjections\(result\.state, result\.revision\)/, "Bàn giao phải đồng bộ các bảng nghiệp vụ Supabase.");
assert.match(edge, /personHasRetainedReferences/, "Máy chủ phải chặn xóa cứng hồ sơ còn lịch sử nghiệp vụ.");

console.log("employee_handover=passed");
