const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const php = fs.readFileSync("api/sync.php", "utf8");

for (const marker of [
  'id="accountChangePasswordButton"',
  'id="changePasswordForm"',
  'id="currentPasswordForChange"',
  'id="newPasswordForChange"',
  'id="confirmPasswordForChange"',
]) assert.ok(html.includes(marker), `Thiếu điều khiển đổi mật khẩu: ${marker}`);
assert.ok(html.indexOf('id="accountChangePasswordButton"') > html.indexOf('id="accounts"'), "Nút đổi mật khẩu phải nằm trong mục Tài khoản.");
assert.match(html, /<button type="submit">Lưu tài khoản<\/button>\s*<button id="accountChangePasswordButton"/, "Nút đổi mật khẩu phải nằm cạnh nút lưu tài khoản.");
assert.ok(html.includes('id="accountChangePasswordFallback"'), "Tài khoản không có quyền sửa biểu mẫu vẫn cần nút đổi mật khẩu.");
assert.doesNotMatch(html, /id="(?:changePasswordButton|mobileChangePasswordButton)"/, "Không để nút đổi mật khẩu ở hồ sơ thanh menu.");
assert.match(client, /async function submitOwnPasswordChange/);
assert.match(client, /sharedJsonRequest\("change-password"/);
assert.match(client, /newPassword !== confirmation/);
assert.match(client, /sharedSync\.session \|\| isOfflineFileRuntime\(\)/, "Đổi mật khẩu phải cần phiên máy chủ đang hoạt động.");
assert.match(client, /accountChangePasswordButton.*classList\.toggle\("is-hidden", !account \|\| !canEditAccount\)/, "Nút đổi mật khẩu trong biểu mẫu chỉ hiện khi biểu mẫu được phép sử dụng.");
assert.match(client, /accountPasswordFallback.*classList\.toggle\("is-hidden", !account \|\| canEditAccount\)/, "Tài khoản không sửa được biểu mẫu vẫn phải truy cập đổi mật khẩu.");
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
