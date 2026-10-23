const assert = require("node:assert/strict");
const fs = require("node:fs");

const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");

function preserveOrigin(previous, candidate) {
  const next = { ...candidate };
  ["createdAt", "createdBy", "createdById"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(previous, field)) next[field] = previous[field];
    else delete next[field];
  });
  return next;
}

const legacyTask = {
  id: "legacy-task",
  status: "Đang thực hiện",
  progress: 0,
  createdAt: "",
  createdBy: "",
  createdById: "",
};
const staleClientCandidate = {
  ...legacyTask,
  status: "Hoàn thành",
  progress: 100,
  createdAt: "2026-09-24T08:00:00.000Z",
  createdBy: "Người đang cập nhật",
  createdById: "current-account",
};
const repairedCandidate = preserveOrigin(legacyTask, staleClientCandidate);

assert.equal(repairedCandidate.status, "Hoàn thành", "Không được làm mất thay đổi trạng thái hợp lệ.");
assert.equal(repairedCandidate.progress, 100, "Không được làm mất thay đổi tiến độ hợp lệ.");
assert.deepEqual(
  [repairedCandidate.createdAt, repairedCandidate.createdBy, repairedCandidate.createdById],
  ["", "", ""],
  "Công việc cũ phải giữ nguyên nguồn gốc chưa xác định, không gán người cập nhật thành người tạo.",
);

const taskWithoutOriginFields = { id: "legacy-no-origin", status: "Đang thực hiện" };
const candidateWithInventedOrigin = preserveOrigin(taskWithoutOriginFields, {
  ...taskWithoutOriginFields,
  status: "Hoàn thành",
  createdAt: "2026-09-24T08:00:00.000Z",
  createdBy: "Người đang cập nhật",
  createdById: "current-account",
});
["createdAt", "createdBy", "createdById"].forEach((field) => {
  assert.equal(Object.prototype.hasOwnProperty.call(candidateWithInventedOrigin, field), false, `Không được thêm ${field} vào bản ghi nguồn gốc chưa có.`);
});

assert.match(client, /function applyTaskRecordAudit\(record, existing\)/, "Máy khách phải có hàm audit riêng cho công việc.");
assert.match(client, /const auditedTask = applyTaskRecordAudit\(nextTask, task\);/, "Duyệt hoàn thành phải giữ nguồn gốc công việc cũ.");
assert.match(client, /const auditedRecord = applyTaskRecordAudit\(mergedRecord, existingTask\);/, "Cập nhật tiến độ phải giữ nguồn gốc công việc cũ.");
assert.match(edge, /const taskOriginAuditFields = \["createdAt", "createdBy", "createdById"\] as const;/, "Máy chủ phải khóa các trường nguồn gốc của công việc hiện hữu.");
assert.match(edge, /function preserveTaskOriginAudit\(previous: JsonRecord, candidate: JsonRecord\): JsonRecord/, "Máy chủ phải chuẩn hóa audit của công việc cũ trước khi xét quyền.");
assert.match(edge, /candidate = preserveTaskOriginAudit\(previous, candidate\);/, "Máy chủ phải loại thay đổi nguồn gốc cũ trước khi kiểm tra tiến độ.");
assert.match(edge, /taskBaseValue = preserveTaskOriginAudit\(previous, taskBaseValue\);/, "Máy chủ phải hòa giải bản gốc cũ trước khi xử lý xung đột phiên bản.");
assert.match(edge, /\? stampTaskAudit\(next, previous, candidate, actor\)/, "Máy chủ phải ghi audit cập nhật bằng tài khoản phiên hiện tại.");
assert.match(edge, /saved\.updatedBy = String\(actor\.displayName \|\| actor\.username \|\| "Tai khoan"\);/, "Máy chủ phải ghi người cập nhật theo tài khoản phiên hiện tại.");
assert.match(edge, /if \(!previous\) \{[\s\S]*?saved\.createdAt = timestamp;/, "Máy chủ chỉ gán nguồn gốc cho công việc mới.");
assert.match(edge, /const deploymentVersion = "2026\.10\.23\.1";/, "Máy chủ phải công bố phiên bản sửa lỗi công việc cũ.");

console.log("legacy_task_origin_audit=passed");
