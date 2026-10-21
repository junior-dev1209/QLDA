const assert = require("assert");
const fs = require("fs");

const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260825000000_kpi_record_tables_and_single_session.sql", "utf8");

[
  "public.people",
  "public.tasks",
  "public.task_progress_reports",
  "public.evaluations",
  "public.kpi_catalog",
  "public.activity_log",
].forEach((table) => {
  assert.ok(migration.includes(`create table if not exists ${table}`), `Thiếu bảng ${table}.`);
});
assert.match(migration, /version bigint not null default 1/g, "Mỗi bảng nghiệp vụ phải có phiên bản bản ghi.");
assert.match(migration, /alter table public\.tasks enable row level security/, "Bảng nghiệp vụ phải bật RLS.");
assert.match(migration, /insert into public\.task_progress_reports/, "Migration phải chuyển báo cáo tiến độ cũ sang bảng riêng.");
assert.match(edge, /function syncRecordProjectionForPatch/, "Mỗi lệnh được chấp nhận phải phản chiếu theo từng bản ghi.");
assert.match(edge, /function syncAllRecordProjections/, "Khởi tạo dữ liệu phải tạo đủ bảng bản ghi.");
assert.match(edge, /function replaceTaskProgressProjection/, "Báo cáo tiến độ phải được tách khỏi công việc.");
assert.match(edge, /await syncRecordProjectionForPatch\(result\.state, projectionPatch, nextSnapshot\.snapshot\.revision\)/, "Lệnh thay đổi phải có phiên bản máy chủ sau khi ghi.");
assert.match(edge, /function canUpsert/, "Phân quyền thao tác vẫn phải kiểm tra ở máy chủ.");
assert.match(edge, /const comparisonBaseValue = collection === "tasks" && taskBaseValue \? taskBaseValue : operation\.baseValue;[\s\S]*?sameJson\(comparisonBaseValue, serverValue\)/, "Thay đổi phải kiểm tra giá trị gốc của bản ghi, kể cả công việc có dữ liệu nguồn cũ.");
assert.match(edge, /storageModel: "record-projection-transition"/, "Trạng thái triển khai phải công khai cho kiểm tra vận hành.");

console.log("record_table_transition=passed");
