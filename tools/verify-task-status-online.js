const assert = require("node:assert/strict");
const fs = require("node:fs");

const client = fs.readFileSync("script.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const release = require("../release.json");

assert.doesNotMatch(html, /id="assignmentTaskForm"/, "Giao diện hiện tại không còn biểu mẫu giao việc cũ.");
assert.match(client, /function assignmentTaskWorkspaceAvailable\(\)[\s\S]*?byId\("assignmentTaskForm"\)[\s\S]*?byId\("taskInboxDialog"\)/,
  "Mã tương thích phải kiểm tra đầy đủ giao diện cũ trước khi sử dụng.");
assert.match(client, /function taskUsesAssignmentWorkspace\(task\)[\s\S]*?isAssignedTask\(task\) && assignmentTaskWorkspaceAvailable\(\)/);
assert.match(client, /const useAssignmentWorkspace = taskUsesAssignmentWorkspace\(task\);[\s\S]*?byId\(useAssignmentWorkspace \? "assignmentTaskForm" : "taskForm"\)/,
  "Công việc được giao cũ phải quay về biểu mẫu Công việc thống nhất khi giao diện cũ không tồn tại.");
assert.match(client, /assignedCompatibilityMode \? String\(existingTask\.responseStatus \|\| ""\) : ""[\s\S]*?assignedCompatibilityMode \? String\(existingTask\.responseNote \|\| ""\) : ""/,
  "Cập nhật trạng thái qua biểu mẫu thống nhất không được xóa phản hồi giao việc cũ.");
assert.match(client, /if \(existingTask && !await ensureTaskMutationContractSupported\(\)\) return false;/,
  "Thay đổi công việc online phải kiểm tra hợp đồng phiên bản trước khi sửa trạng thái cục bộ.");
assert.match(client, /if \(!await confirmTaskMutationOnline\(auditedRecord\.id\)\) return false;/,
  "Màn hình chỉ được hoàn tất thao tác sau khi đã kiểm tra kết quả đồng bộ công việc.");
assert.match(client, /result\.denied\.some\(\(change\) => change\?\.scope === "tasks"/,
  "Kết quả từ chối riêng của công việc phải được nhận diện.");
assert.match(client, /TASK_MUTATION_DEPLOYMENT_VERSION = "2026\.11\.17\.2"/);
assert.match(edge, /const deploymentVersion = "2026\.11\.17\.2";/);
assert.equal(release.edgeFunctionVersion, "2026.11.17.2", "Release phải yêu cầu đúng Edge Function xử lý trạng thái.");

assert.match(edge, /function taskProgressLifecycleIsSafe\(next: JsonRecord\): boolean \{[\s\S]*?const allowedStatuses = new Set\([\s\S]*?"Chuẩn bị thực hiện"[\s\S]*?"Đang thực hiện"[\s\S]*?"Hoàn thành"[\s\S]*?if \(!allowedStatuses\.has/,
  "Máy chủ phải từ chối trạng thái ngoài vòng đời công việc cho thao tác cập nhật tiến độ.");
assert.match(edge, /function canUpdateTaskProgress\(state: JsonRecord, account: JsonRecord, task: JsonRecord\): boolean \{[\s\S]*?taskParticipantForAccount[\s\S]*?hasDepartmentTaskAccess/,
  "Người thực hiện, phối hợp và quản lý đúng phạm vi phải được cập nhật trạng thái.");
assert.match(edge, /function normalizeGpmbWorkflowTaskProgressMutation\([\s\S]*?candidate: normalizeTaskProgressLifecycle\(canonicalCandidate\)/,
  "Công việc GPMB phải dùng cùng vòng đời trạng thái nhưng giữ metadata quy trình từ máy chủ.");

console.log("task_status_online=passed");
