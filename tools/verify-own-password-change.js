const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const php = fs.readFileSync("api/sync.php", "utf8");

for (const marker of [
  'id="changePasswordButton"',
  'id="mobileChangePasswordButton"',
  'id="changePasswordForm"',
  'id="currentPasswordForChange"',
  'id="newPasswordForChange"',
  'id="confirmPasswordForChange"',
]) assert.ok(html.includes(marker), `Thiếu điều khiển đổi mật khẩu: ${marker}`);
assert.match(client, /async function submitOwnPasswordChange/);
assert.match(client, /sharedJsonRequest\("change-password"/);
assert.match(client, /newPassword !== confirmation/);
assert.match(client, /sharedSync\.session \|\| isOfflineFileRuntime\(\)/, "Đổi mật khẩu phải cần phiên máy chủ đang hoạt động.");
assert.match(client, /changePasswordButton.*classList\.toggle\("is-hidden", !account\)/, "Nút đổi mật khẩu phải khả dụng cho mọi tài khoản đang đăng nhập.");
assert.match(edge, /if \(action === "change-password" && request\.method === "POST"\)/);
assert.match(edge, /accountPasswordMatches\(account, currentPassword\)/, "Supabase phải xác nhận mật khẩu hiện tại trước khi thay đổi.");
assert.match(edge, /setAccountPasswordCredential\(nextAccount, newPassword\)/, "Mật khẩu mới phải được băm bằng cơ chế máy chủ hiện có.");
assert.match(edge, /expected_revision: current\.revision/, "Thay đổi phải bảo vệ khỏi xung đột đồng thời.");
assert.match(php, /if \(\$action === 'change-password' && \$_SERVER\['REQUEST_METHOD'\] === 'POST'\)/);
assert.match(php, /accountPasswordMatches\(\$account, \$currentPassword\)/, "PHP dự phòng phải xác nhận mật khẩu hiện tại.");
assert.match(php, /setAccountPasswordCredential\(\$account, \$newPassword\)/, "PHP dự phòng phải dùng cùng cơ chế băm mật khẩu.");
assert.match(php, /flock\(\$lock, LOCK_EX\)/, "Cập nhật trên PHP phải nằm trong khóa ghi dữ liệu.");
assert.match(php, /function accountPasswordMatches\(array \$account, string \$password\): bool\s*\{\s*if \(\$password === '' \|\| strlen\(\$password\) > 512\)/, "Bộ kiểm tra đăng nhập phải hỗ trợ mật khẩu Unicode tối đa 128 ký tự.");

console.log("own_password_change=passed");
