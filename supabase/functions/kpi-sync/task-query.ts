type QueryRecord = Record<string, unknown>;
export const taskQueryStatuses = ["Chuẩn bị thực hiện", "Đang thực hiện", "Hoàn thành", "Quá hạn"];
export const taskQueryPending = "Chờ đánh giá";
export const taskQueryStopped = "Đã ngừng";
export type TaskPageQuery = {
  scope: string; period: string; search: string; project: string; department: string; person: string;
  from: string; to: string; status: string; bucket: string; limit: number; cursor: string; offsetMinutes: number;
};
export function parseTaskPageQuery(params: URLSearchParams): TaskPageQuery {
  const value = (name: string, max = 200) => {
    const text = params.get(name) || "";
    if (text.length > max) throw new Error(`Invalid ${name}.`);
    return text;
  };
  const scope = value("scope") || "current", period = value("period"), from = value("from"), to = value("to");
  const status = value("status"), bucket = value("bucket") || "board";
  const statuses = [...taskQueryStatuses, taskQueryPending, taskQueryStopped];
  const limit = Number(value("limit") || 40), offsetMinutes = Number(value("offsetMinutes") || 0);
  if (!["current", "all"].includes(scope) || (scope === "current" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
    || [from,to].some((date) => date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))))
    || (from && to && from > to) || (status && !statuses.includes(status))
    || !["board","all",...statuses].includes(bucket) || !Number.isInteger(limit) || limit < 1 || limit > 40
    || !Number.isInteger(offsetMinutes) || offsetMinutes < -840 || offsetMinutes > 840) throw new Error("Invalid task query.");
  return { scope, period, from, to, status, bucket, limit, offsetMinutes, search: value("search",500).trim().toLowerCase(),
    project: value("project",1000), department: value("department"), person: value("person"), cursor: value("cursor",2000) };
}
export function taskQueryNormalized(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase();
}
export function taskQueryStatus(task: QueryRecord, now: number, offsetMinutes: number): string {
  let status = String(task.status || "Chuẩn bị thực hiện");
  if (status === "Chưa bắt đầu") status = "Chuẩn bị thực hiện";
  if (status === "Quá hạn") status = Number(task.progress) > 0 ? "Đang thực hiện" : "Chuẩn bị thực hiện";
  if (["Hoàn thành","Đã kết thúc",taskQueryStopped].includes(status) || !task.due) return status;
  const deadline = Date.parse(`${task.due}T${task.dueTime || "23:59"}Z`) + offsetMinutes * 60_000;
  return deadline < now ? "Quá hạn" : status;
}
export function taskQueryApproved(task: QueryRecord): boolean {
  const quality = task.qualityPercent;
  const hasQuality = quality !== null && quality !== undefined && String(quality).trim() !== "";
  return task.status === "Hoàn thành" && task.completionReviewStatus !== "pending" && hasQuality;
}
export function taskQueryMatchesStatus(task: QueryRecord, status: string, now: number, offsetMinutes: number): boolean {
  if (!status) return true;
  if (status === taskQueryPending) return task.status === "Hoàn thành" && !taskQueryApproved(task);
  const computed = taskQueryStatus(task,now,offsetMinutes);
  return computed === status && (status !== "Hoàn thành" || taskQueryApproved(task));
}
export function taskQueryWorkMeta(task: QueryRecord): string {
  const work = task.workType || task.taskType || "";
  const type = work === "arising" || taskQueryNormalized(work).includes("phat sinh") ? "Công việc phát sinh" : "Công việc thường xuyên";
  const recurrence = task.recurrence || task.periodicity || "";
  const normalized = taskQueryNormalized(recurrence);
  const repeat = [["daily","hang ngay","Hàng ngày"],["weekly","hang tuan","Hàng tuần"],
    ["monthly","hang thang","Hàng tháng"],["quarterly","hang quy","Hàng quý"]]
    .find(([id,text]) => recurrence === id || normalized.includes(text));
  return `${type} · ${repeat?.[2] || "Không định kỳ"}`;
}
export function taskQueryCompare(a: QueryRecord, b: QueryRecord): number {
  const deadline = (task: QueryRecord) => task.due && !Number.isNaN(Date.parse(`${task.due}T${task.dueTime || "23:59"}`))
    ? `${task.due}T${task.dueTime || "23:59"}` : "9999-12-31";
  return deadline(a).localeCompare(deadline(b)) || String(a.title || "").localeCompare(String(b.title || ""),"vi")
    || String(a.id).localeCompare(String(b.id));
}
