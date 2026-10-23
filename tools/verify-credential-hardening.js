const assert = require("assert");
const fs = require("fs");
const { webcrypto } = require("crypto");
const { stripTypeScriptTypes } = require("node:module");

const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const php = fs.readFileSync("api/sync.php", "utf8");
const headers = fs.readFileSync(".htaccess", "utf8");

assert.match(edge, /const passwordHashIterations = 310_000;/, "PBKDF2 phải có số vòng lặp đủ cao.");
assert.match(edge, /crypto\.getRandomValues\(new Uint8Array\(passwordSaltBytes\)\)/, "Mỗi mật khẩu mới phải có muối ngẫu nhiên.");
assert.match(edge, /delete account\.password;/, "Mật khẩu dạng rõ phải được xóa sau khi băm.");
assert.match(edge, /await secureMutatedAccountCredentials\(result\.state, patch\);/, "Tài khoản được tạo hoặc đổi mật khẩu phải được băm trước khi ghi máy chủ.");
assert.match(edge, /await migrateLegacyAccountPassword\(current, account, password\);/, "Mật khẩu hiện có phải được chuyển đổi mà không bắt buộc đổi mật khẩu.");
assert.match(edge, /credentialHashing: true/, "Endpoint trạng thái phải công bố cơ chế băm mật khẩu đã sẵn sàng.");
assert.match(edge, /recordProjectionHealth/, "Endpoint trạng thái phải kiểm tra độ đồng bộ của các bảng bản ghi.");
assert.ok(!client.includes("LOGIN_SESSION_CREDENTIAL_KEY"), "Không được giữ khóa lưu mật khẩu trong phiên trình duyệt.");
assert.ok(!client.includes("password: String(password)"), "Không được ghi mật khẩu người dùng vào sessionStorage.");
assert.match(client, /sessionStorage\.removeItem\("phuc-thinh-login-session-v1"\)/, "Giá trị mật khẩu còn sót từ bản cũ phải được dọn khi tải ứng dụng.");
assert.match(php, /function sanitizedState/, "API PHP dự phòng không được trả mật khẩu trong trạng thái đăng nhập.");
assert.match(php, /function mergeAccountCredentials/, "API PHP dự phòng phải bảo toàn thông tin xác thực đã băm khi cập nhật hồ sơ.");
assert.match(headers, /Content-Security-Policy/, "Hosting Apache phải có CSP.");
assert.match(headers, /frame-ancestors 'none'/, "Trang không được cho phép nhúng iframe.");
assert.match(headers, /X-Frame-Options "DENY"/, "Hosting phải chặn clickjacking cho trình duyệt cũ.");

async function verifyCredentialRuntime() {
  const runtimeSource = stripTypeScriptTypes(
    edge.replace(/^import[^\n]*\n/gm, "").replace(/^/, "const createClient = () => ({});\n"),
  );
  const createRuntime = new Function("Deno", "crypto", `${runtimeSource}; return { setAccountPasswordCredential, accountPasswordMatches, hasPasswordHash, sanitizedAccount };`);
  const runtime = createRuntime({
    env: { get: (key) => key === "SUPABASE_URL" || key === "SUPABASE_SERVICE_ROLE_KEY" ? "test" : "" },
    serve: () => {},
  }, webcrypto);
  const account = { id: "account-test", password: "mat-khau-dang-su-dung" };
  assert.equal(await runtime.accountPasswordMatches(account, "mat-khau-dang-su-dung"), true, "Mật khẩu cũ phải xác thực được trước khi chuyển đổi.");
  await runtime.setAccountPasswordCredential(account, "mat-khau-dang-su-dung");
  assert.equal(account.password, undefined, "Mật khẩu rõ phải bị xóa sau khi chuyển đổi.");
  assert.equal(runtime.hasPasswordHash(account), true, "Tài khoản phải nhận được thông tin băm có phiên bản.");
  assert.equal(await runtime.accountPasswordMatches(account, "mat-khau-dang-su-dung"), true, "Mật khẩu cũ phải giữ hiệu lực sau khi chuyển đổi.");
  assert.equal(await runtime.accountPasswordMatches(account, "mat-khau-sai"), false, "Mật khẩu sai không được xác thực.");
  const publicAccount = runtime.sanitizedAccount(account);
  assert.equal(publicAccount.passwordHash, undefined, "Hash mật khẩu không được trả về trình duyệt.");
  assert.equal(publicAccount.passwordSalt, undefined, "Muối mật khẩu không được trả về trình duyệt.");
}

verifyCredentialRuntime()
  .then(() => console.log("credential_hardening=passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
