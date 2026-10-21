const assert = require("assert");
const fs = require("fs");

const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260825000000_kpi_record_tables_and_single_session.sql", "utf8");

assert.match(migration, /create unique index if not exists kpi_sync_sessions_one_active_account_idx/, "Một tài khoản phải chỉ có một phiên máy chủ.");
assert.match(migration, /create or replace function public\.kpi_replace_sync_session/, "Cần có lệnh thay phiên nguyên tử.");
assert.match(migration, /pg_advisory_xact_lock/, "Hai lần đăng nhập đồng thời phải được tuần tự hóa.");
assert.match(migration, /delete from public\.kpi_sync_sessions[\s\S]*?where account_id = p_account_id/, "Phiên cũ phải bị thu hồi trước khi tạo phiên mới.");
assert.match(edge, /admin\.rpc\("kpi_replace_sync_session"/, "Đăng nhập phải thay phiên qua máy chủ.");
assert.ok(!edge.includes("kpi_sync_sessions\").insert({ token_hash"), "Không được tạo thêm phiên độc lập ngoài RPC thay phiên.");
assert.match(client, /function expireSharedSession\(message = "Phiên đăng nhập đã kết thúc vì tài khoản này vừa đăng nhập trên thiết bị khác/, "Thiết bị cũ phải có thông báo đăng xuất rõ ràng.");
assert.match(client, /document\.documentElement\.classList\.remove\("is-authenticated"\)/, "Thiết bị cũ phải hiện lại màn hình đăng nhập.");
assert.match(client, /localStorage\.removeItem\(SHARED_SYNC_SESSION_TOKEN_KEY\)/, "Token bị thu hồi phải được xóa cục bộ.");

console.log("single_device_session=passed");
