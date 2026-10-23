const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${name}.`);
  const next = source.indexOf("\nfunction ", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

assert.ok(!html.includes("Nạp dữ liệu mẫu"), "Nạp dữ liệu mẫu phải được gỡ khỏi giao diện.");
assert.ok(!client.includes("seedDemoData"), "Không được giữ hàm nạp dữ liệu mẫu trong mã chạy.");
assert.match(html, /id="printReport" class="[^"]*admin-only-action/, "In báo cáo phải được đánh dấu chỉ dành cho Admin.");
assert.match(extractFunction(client, "openPrintDialog"), /if \(!isAdmin\(\)\) return;/, "Không cho mở popup In báo cáo ngoài Admin.");
assert.match(extractFunction(client, "printSelectedSections"), /if \(!isAdmin\(\)\) return;/, "Không cho chạy lệnh in ngoài Admin.");
assert.match(extractFunction(client, "applyAccessControls"), /\.admin-only-action[\s\S]*?!isAdmin\(\)/, "Nút In báo cáo phải ẩn với mọi vai trò ngoài Admin.");

const clientSandbox = {
  isAdmin: () => false,
  isDirector: () => true,
  isManager: () => false,
  isDeputyManager: () => false,
  isSectionHead: () => false,
};
vm.createContext(clientSandbox);
["canManageAccounts", "canManageProjectCatalog", "canViewProjectCatalog"].forEach((name) => {
  vm.runInContext(extractFunction(client, name), clientSandbox);
});
assert.equal(clientSandbox.canManageAccounts(), false, "Ban giám đốc không được sửa hoặc xóa danh mục tài khoản.");
assert.equal(clientSandbox.canManageProjectCatalog(), false, "Ban giám đốc chỉ được xem, không quản lý danh mục dự án.");
assert.equal(clientSandbox.canViewProjectCatalog(), true, "Ban giám đốc phải xem được Danh mục dự án.");
assert.match(extractFunction(client, "renderTaskProjectCatalog"), /classList\.toggle\("is-hidden", !canManage\)/, "Biểu mẫu danh mục dự án phải ẩn với người chỉ có quyền xem.");
assert.match(extractFunction(client, "renderTaskProjectCatalog"), /\$\{canManage \? `<div class="project-catalog-actions">/, "Nút sửa/xóa dự án chỉ hiển thị cho người có quyền quản lý.");
assert.match(extractFunction(client, "renderAccountTable"), /const canEditAccount = canManageAccounts\(\) \|\| canEditOwnAccount\(\);[\s\S]*accountForm\?\.classList\.toggle\("is-hidden", !canEditAccount\)/, "Ban giám đốc chỉ xem danh sách, không thấy biểu mẫu sửa tài khoản.");
assert.match(client, /canEditOwnAccount\(\) && account\.id === currentAccount\(\)\?\.id/, "Mở tài khoản từ lịch sử phải tôn trọng quyền sửa tài khoản cá nhân.");

const serverSandbox = {
  isAdmin: (account) => account.role === "admin",
  isDirector: (account) => account.role === "director",
};
vm.createContext(serverSandbox);
const accountChangeCode = extractFunction(edge, "accountChangeAllowed")
  .replace("function accountChangeAllowed(actor: JsonRecord, previous: JsonRecord | undefined, next: JsonRecord): boolean {", "function accountChangeAllowed(actor, previous, next) {");
const accountDeleteCode = extractFunction(edge, "canDelete")
  .replace("function canDelete(state: JsonRecord, actor: JsonRecord, collection: CollectionName, previous: JsonRecord): boolean {", "function canDelete(state, actor, collection, previous) {");
vm.runInContext(accountChangeCode, serverSandbox);
vm.runInContext(accountDeleteCode, serverSandbox);
const director = { id: "director-1", role: "director" };
const account = { id: "account-2", role: "employee" };
assert.equal(serverSandbox.accountChangeAllowed(director, account, account), false, "Edge Function phải từ chối mọi yêu cầu sửa tài khoản từ Ban giám đốc.");
assert.equal(serverSandbox.canDelete({}, director, "accounts", account), false, "Edge Function phải từ chối xóa tài khoản từ Ban giám đốc.");
assert.equal(serverSandbox.canDelete({}, { id: "admin-1", role: "admin" }, "accounts", account), true, "Admin vẫn có thể xóa tài khoản.");
assert.match(edge, /if \(collection === "accounts"\) return moduleIsAvailableToAccount\(state, actor, "accounts"\) && accountChangeAllowed\(actor, previous, next\);/, "Lệnh sửa tài khoản phải qua kiểm tra quyền máy chủ.");
assert.match(edge, /if \(collection === "projectCatalog"\) return moduleIsAvailableToAccount\(state, actor, "tasks"\) && \(isAdmin\(actor\) \|\| hasDepartmentManagement\(actor\) \|\| accountRole\(actor\) === "section_head"\);/, "Ban giám đốc chỉ được đọc danh mục dự án; quyền ghi vẫn bị chặn ở máy chủ.");

console.log("access_role_boundaries=passed");
