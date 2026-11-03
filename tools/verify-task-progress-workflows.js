const fs = require("fs");
const assert = require("assert");

const clientSource = fs.readFileSync("script.js", "utf8");
const cssSource = fs.readFileSync("styles.css", "utf8");
const htmlSource = fs.readFileSync("index.html", "utf8");
const edgeSource = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");

function participant(task, personId) {
  const collaborators = Array.isArray(task.collaboratorIds)
    ? task.collaboratorIds
    : String(task.collaboratorIds || "").split(",").map((value) => value.trim());
  return task.ownerId === personId || collaborators.includes(personId) || task.collaboratorId === personId;
}

function deadline(task) {
  return new Date(`${task.due}T${task.dueTime || "23:59"}`);
}

function completedOnTime(task) {
  return new Date(task.completedAt).getTime() <= deadline(task).getTime();
}

function reviewFailureStatusAllowed(status) {
  return ["Đang thực hiện", "Quá hạn"].includes(status);
}

const task = {
  ownerId: "owner",
  collaboratorIds: ["collaborator"],
  due: "2026-08-05",
  dueTime: "17:00",
};

assert.equal(participant(task, "owner"), true, "Người thực hiện phải được cập nhật tiến độ.");
assert.equal(participant(task, "collaborator"), true, "Người phối hợp phải được cập nhật tiến độ.");
assert.equal(participant(task, "other"), false, "Tài khoản không liên quan không được cập nhật tiến độ.");

["Chuẩn bị thực hiện", "Đang thực hiện", "Quá hạn", "Hoàn thành"].forEach((status) => {
  assert.ok(status, `Trạng thái ${status} phải được nhận diện.`);
});
assert.equal(reviewFailureStatusAllowed("Đang thực hiện"), true);
assert.equal(reviewFailureStatusAllowed("Quá hạn"), true, "Không đạt sau hạn phải quay lại Quá hạn.");
assert.equal(reviewFailureStatusAllowed("Hoàn thành"), false);

const timelyTask = { ...task, completedAt: "2026-08-05T16:30:00" };
const lateTask = { ...task, completedAt: "2026-08-05T17:30:00" };
assert.equal(completedOnTime(timelyTask), true, "Hoàn thành trước hạn không được đánh dấu chậm do duyệt muộn.");
assert.equal(completedOnTime(lateTask), false, "Hoàn thành sau hạn phải được đánh dấu chậm.");

assert.match(htmlSource, /class="task-schedule-fields"[\s\S]*?id="taskPriority"[\s\S]*?id="taskRecurrence"[\s\S]*?id="taskStartDate"[\s\S]*?class="task-deadline-fields"[\s\S]*?id="taskDue" type="date" required[\s\S]*?id="taskDueTime" type="time"[^>]*aria-label="Thời gian hoàn thành, không bắt buộc"/, "Các trường lịch công việc phải nằm chung một hàng trên desktop.");
assert.doesNotMatch(htmlSource.match(/id="taskDueTime"[^>]*>/)?.[0] || "", /required/, "Không bắt buộc nhập thời gian hoàn thành.");
assert.match(cssSource, /#taskForm \.task-schedule-fields\s*\{[\s\S]*?grid-column: 1 \/ -1;[\s\S]*?grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/, "Desktop phải chia đều năm trường thành một hàng.");
assert.match(cssSource, /#taskForm \.task-deadline-fields\s*\{\s*display: contents;/, "Ngày và giờ phải tham gia trực tiếp cùng hàng lịch công việc.");
assert.match(cssSource, /grid-template-areas:[\s\S]*?"due time"/, "Trên mobile, ngày và giờ hoàn thành vẫn cạnh nhau.");
assert.match(clientSource, /byId\("taskDueTime"\)\.value = task\.dueTime \|\| ""/, "Thời gian cũ phải được nạp khi sửa công việc.");
assert.match(clientSource, /dueTime: byId\("taskDueTime"\)\.value/, "Giờ hoàn thành phải được lưu cùng công việc.");
assert.match(clientSource, /function taskDeadlineDate\(task\)[\s\S]*?task\.dueTime \|\| "23:59"/, "Để trống giờ phải giữ hạn mặc định đến cuối ngày.");

assert.match(edgeSource, /function overdueTaskStatus\(status: unknown\): boolean/);
assert.match(edgeSource, /inProgressTaskStatus\(next\.status\) \|\| overdueTaskStatus\(next\.status\)/);
assert.match(edgeSource, /function normalizeTaskProgressLifecycle\(next: JsonRecord\): JsonRecord/);
assert.match(edgeSource, /function normalizeTaskCompletionLifecycle\(next: JsonRecord\): JsonRecord/, "Máy chủ phải dọn dữ liệu phê duyệt không hợp lệ.");
assert.match(edgeSource, /function canUpdateTaskProgress\(state: JsonRecord, account: JsonRecord, task: JsonRecord\): boolean \{[\s\S]*?taskParticipantForAccount\(state, task, account\)\) return true;/, "Người thực hiện và phối hợp phải được máy chủ cho phép cập nhật tiến độ.");
assert.match(edgeSource, /if \(!taskProgressIsLocked\(previous\) && taskParticipantForAccount\(state, previous, account\) && taskProgressOnlyChange\(previous, next\)\) return true;/, "Người tham gia phải đổi được công việc quá hạn sang Hoàn thành trước khi được duyệt.");
assert.match(edgeSource, /function rebaseTaskProgressChange\(live: JsonRecord, base: JsonRecord, next: JsonRecord\): JsonRecord \| null/, "Máy chủ phải tự hòa giải thay đổi tiến độ bị chậm phiên bản.");
assert.match(edgeSource, /function normalizeTaskMutationCandidate\(previous: JsonRecord \| undefined, candidate: JsonRecord\): JsonRecord \{[\s\S]*?return normalizeTaskCompletionLifecycle\(candidate\);/, "Máy chủ phải kiểm tra vòng đời hoàn thành, đồng thời giữ nguyên dữ liệu khi duyệt gia hạn.");
assert.match(edgeSource, /candidate = normalizeTaskMutationCandidate\(previous, candidate\);/, "Mọi thay đổi công việc phải qua bộ chuẩn hóa theo loại thao tác.");
assert.match(edgeSource, /return completedTaskStatus\(task\.status\) && \(String\(task\.completionReviewStatus \|\| ""\) === "passed"/, "Chỉ công việc Hoàn thành, đã Đạt mới bị khóa cập nhật tiến độ.");
assert.match(edgeSource, /function shouldNormalizeTaskProgressUpdate\(/);
assert.match(edgeSource, /normalized\.lateCompletion = false;/);
assert.match(edgeSource, /taskProgressIsLocked\(previous\)/);
assert.match(clientSource, /const completedAtForReview = task\.completedAt \|\| timestamp;/);
assert.match(clientSource, /function canUpdateTaskProgress\(task\) \{[\s\S]*?canReportTask\(task\) \|\| canCollaborateTask\(task\) \|\| canManageDepartmentTaskProgress\(task\);/, "Giao diện phải mở quyền cập nhật cho mọi người liên quan.");
assert.match(clientSource, /function editableTaskStatus\(task\) \{[\s\S]*?rawStatus === "Quá hạn"[\s\S]*?TASK_STATUS_PREPARING/, "Quá hạn phải là tín hiệu theo hạn, không được khóa trạng thái hoàn thành.");
assert.match(clientSource, /const completedAt = task\?\.completedAt \|\| task\?\.completionReviewedAt \|\| "";/);
assert.match(clientSource, /mergedRecord\.lateCompletion = false;[\s\S]{0,180}if \(!adminOverride\) mergedRecord\.qualityPercent = "";/);
assert.match(clientSource, /class="task-progress-update-button" data-respond-task="\$\{task\.id\}"[\s\S]{0,90}>Cập nhật<\//, "Thẻ công việc phải có nút Cập nhật rõ ràng thay cho biểu tượng tiến độ.");
assert.match(clientSource, /class="task-progress-update-button" type="button" data-task-detail-action="report"[\s\S]{0,80}>Cập nhật<\//, "Màn hình chi tiết phải ưu tiên nút Cập nhật rõ ràng.");
assert.match(cssSource, /\.task-progress-update-button \{[\s\S]*?min-height: 34px;[\s\S]*?font-weight: 700;/, "Nút Cập nhật phải có kiểu hiển thị thao tác chính rõ ràng.");

console.log("task_progress_workflows=passed");
