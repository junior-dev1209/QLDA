const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const start = client.indexOf("function normalizeTaskQualityInput");
const end = client.indexOf("function repairInvalidTaskCompletionStates", start);

assert.ok(start >= 0 && end > start, "Không đọc được bộ xử lý vòng đời hoàn thành ở giao diện.");
assert.match(edge, /function recoverTaskCompletionReviewFromHistory\(task: JsonRecord\)/, "Máy chủ phải có cơ chế khôi phục trạng thái duyệt từ lịch sử hợp lệ.");
assert.match(edge, /function taskCompletionRecoveryChange\(/, "Máy chủ phải chỉ chấp nhận khôi phục đúng dữ liệu lịch sử.");
assert.match(edge, /taskCompletionRecoveryChange\(base, candidate\)/, "Máy chủ không được xóa dữ liệu khôi phục như một cập nhật tiến độ thông thường.");
assert.match(edge, /progress,\s*completionReviewStatus/, "Khôi phục duyệt phải đồng thời sửa tiến độ hoàn thành.");
assert.match(client, /mergedRecord\.progress = 100;/, "Chọn Hoàn thành phải luôn đồng bộ tiến độ 100%.");

const sandbox = {
  TASK_STATUS_COMPLETED: "Hoàn thành",
  clamp: (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0)),
  normalizeNumberInput: (value) => {
    const numeric = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(numeric) ? numeric : 0;
  },
  normalizeTaskStatus: (value) => String(value || "").trim(),
  isTimestampBeforeDeadline: (timestamp, task) => new Date(timestamp).getTime() <= new Date(`${task.due}T${task.dueTime || "23:59"}`).getTime(),
  personById: () => null,
};
vm.runInNewContext(client.slice(start, end), sandbox);

const corruptedApproval = {
  id: "task-corrupt-approval",
  status: "Hoàn thành",
  progress: 0,
  due: "2026-08-20",
  completionReviewStatus: "pending",
  qualityPercent: "",
  progressReports: [{
    id: "review-1",
    type: "completion-review",
    decision: "passed",
    action: "Đánh giá hoàn thành: Đạt · Chất lượng: 100%",
    qualityPercent: 100,
    completionTiming: "late",
    createdAt: "2026-08-22T09:00:00.000Z",
    createdById: "reviewer",
    createdBy: "Người duyệt",
  }],
};

const recovered = sandbox.recoverTaskCompletionReviewFromHistory(corruptedApproval);
assert.equal(recovered.progress, 100, "Bản ghi đã duyệt không được giữ tiến độ 0%.");
assert.equal(recovered.completionReviewStatus, "passed", "Phải khôi phục kết quả Đạt từ lịch sử duyệt hợp lệ.");
assert.equal(recovered.qualityPercent, 100, "Phải khôi phục đánh giá chất lượng đã ghi nhận.");
assert.equal(recovered.completionReviewedByName, "Người duyệt", "Phải giữ người duyệt từ lịch sử.");
assert.equal(recovered.lateCompletion, true, "Phải giữ trạng thái chậm tiến độ đã được đánh giá.");

const laterFailure = {
  ...corruptedApproval,
  progressReports: [
    ...corruptedApproval.progressReports,
    { id: "review-2", type: "completion-review", decision: "failed", createdAt: "2026-08-23T09:00:00.000Z" },
  ],
};
const notRecoveredAfterFailure = sandbox.recoverTaskCompletionReviewFromHistory(laterFailure);
assert.equal(notRecoveredAfterFailure.completionReviewStatus, "pending", "Không được phục hồi Đạt khi lần đánh giá cuối cùng là Không đạt.");
assert.equal(notRecoveredAfterFailure.progress, 100, "Công việc đã ở trạng thái Hoàn thành vẫn phải được chuẩn hóa tiến độ 100%.");

console.log("task_completion_recovery=passed");
