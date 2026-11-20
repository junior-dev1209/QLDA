(() => {
"use strict";
const FEATURE_VERSION = "3.4.160";

function identity() {
  return JSON.stringify([String(currentAccount()?.id || ""),sharedSync.sessionToken,sharedSync.localChangeVersion,sharedSync.revision]);
}
function eligible() {
  return taskServerReadsEnabled() && !sharedSync.pending && !sharedSync.dirty && !sharedSync.inFlight;
}
async function request(action, query) {
  const actor = identity();
  const result = await sharedJsonRequest(action,{query});
  if (identity() !== actor || !eligible() || !canAccessView("tasks")) throw new Error("TASK_READ_SUPERSEDED");
  if (result.response.status === 401) {
    handleSharedSessionUnauthorized();
    throw new Error("TASK_READ_UNAUTHORIZED");
  }
  if (result.response.status === 501 && result.payload?.code === "TASK_QUERY_UNSUPPORTED") {
    sharedSync.taskQuerySupported = false;
    return null;
  }
  if (!result.response.ok) {
    const error = new Error(result.payload?.code === "TASK_PAGE_CHANGED"
      ? "Danh sách công việc đã thay đổi. Hãy tải lại danh sách trước khi xem tiếp."
      : "Chưa đọc được công việc từ máy chủ. Dữ liệu và nội dung đang nhập không bị thay đổi.");
    error.code = result.payload?.code || `server-${result.response.status}`;
    throw error;
  }
  if (!Number.isSafeInteger(result.payload?.revision) || result.payload.revision < sharedSync.revision) throw new Error("TASK_READ_STALE");
  return result.payload;
}
async function readPage(query) {
  if (!eligible()) return null;
  const payload = await request("task-list",query);
  if (payload === null) return null;
  if (payload.protocol !== "task-page-v1" || !Array.isArray(payload.buckets) || !Array.isArray(payload.projects)
    || !Array.isArray(payload.departmentIds) || payload.buckets.length > 5
    || payload.buckets.some((bucket) => !Array.isArray(bucket.tasks) || bucket.tasks.length > 40
      || !Number.isSafeInteger(bucket.total) || bucket.total < bucket.tasks.length || typeof bucket.nextCursor !== "string"
      || bucket.tasks.some((task) => !task || typeof task.id !== "string" || !Array.isArray(task.progressReports || [])))) {
    throw new Error("TASK_READ_INVALID");
  }
  return payload;
}
async function readForOpen(taskId) {
  if (!eligible()) return true;
  const local = state.tasks.find((task) => String(task.id) === String(taskId));
  const localBefore = JSON.stringify(local);
  const baseBefore = JSON.stringify(sharedSync.baseState?.tasks?.find((task) => String(task.id) === String(taskId)));
  if (localBefore !== baseBefore) return true;
  const payload = await request("task-read",{id:taskId});
  if (payload === null) return true;
  if (!payload.task || isRetiredLegacyTaskRecord(payload.task) || String(payload.task.id) !== String(taskId) || !Array.isArray(payload.task.progressReports || [])
    || !Array.isArray(payload.task.attachments || []) || !canViewTaskRecord(payload.task)) return false;
  if (!eligible() || JSON.stringify(state.tasks.find((task) => String(task.id) === String(taskId))) !== localBefore) return false;
  // A full row refresh is not a page-as-snapshot replacement or a local write.
  // Keep all other tasks/history and the global revision; commands retain their existing CAS/ACL.
  for (const target of [state,sharedSync.baseState,sharedSync.serverBaseState]) {
    if (!target || !Array.isArray(target.tasks)) continue;
    const index = target.tasks.findIndex((task) => String(task.id) === String(taskId));
    if (index < 0) target.tasks.push(cloneStatePayload(payload.task));
    else target.tasks[index] = cloneStatePayload(payload.task);
  }
  invalidateDerivedState();
  return true;
}
globalThis.QldaFeatures.register("tasks-reader",FEATURE_VERSION,{eligible,readPage,readForOpen});
})();
