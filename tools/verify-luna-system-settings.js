const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("script.js", "utf8");
const assistant = fs.readFileSync("virtual-assistant.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

assert.match(html, /id="systemLunaEnabled" type="checkbox"/, "Cấu hình hệ thống cần có công tắc hiển thị Luna.");
assert.match(html, /Ẩn hoặc hiển thị Luna và các lời nhắc chủ động trên toàn hệ thống\./, "Công tắc phải được mô tả là thiết lập dùng chung.");
assert.match(app, /lunaEnabled: true/, "Luna phải tiếp tục bật mặc định để tương thích cấu hình hiện tại.");
assert.match(app, /lunaEnabled: customization\.lunaEnabled !== false/, "Thiết lập cũ thiếu giá trị phải được chuẩn hóa là đang bật.");
assert.match(app, /byId\("systemLunaEnabled"\)\.addEventListener\("change",[\s\S]*?if \(!isAdmin\(\)\) return;[\s\S]*?state\.systemCustomization\.lunaEnabled = enabled;[\s\S]*?saveState\(\);/, "Chỉ admin được cập nhật và lưu trạng thái Luna.");
assert.match(app, /document\.body\.dataset\.lunaEnabled = String\(state\.systemCustomization\.lunaEnabled\)/, "Trạng thái chung phải được chuyển tới widget.");
assert.match(app, /if \(!account\) \{[\s\S]*?window\.virtualAssistantSyncAccount\?\.\(\);[\s\S]*?return "";/, "Đăng xuất phải đồng bộ ẩn widget trước khi rời giao diện tài khoản.");
assert.match(app, /localStorage\.removeItem\(SESSION_KEY\);\s*window\.virtualAssistantSyncAccount\?\.\(\);\s*renderAll\(\);/, "Nút đăng xuất phải đóng thông báo Luna ngay trong cùng thao tác.");
assert.match(assistant, /function assistantIsEnabled\(\)[\s\S]*?document\.body\.dataset\.lunaEnabled !== "false"/, "Widget phải đọc cấu hình hiển thị dùng chung.");
assert.match(assistant, /root\.classList\.toggle\("is-hidden", !loggedIn \|\| !enabled\)/, "Luna phải ẩn khi đăng xuất hoặc bị tắt ở cấu hình.");
assert.match(assistant, /if \(!assistantIsEnabled\(\) \|\| !account \|\| !item/, "Thông báo chủ động không được hiện khi Luna đang tắt.");
assert.match(assistant, /function syncAccountAccess\(\)[\s\S]*?if \(!enabled\) \{\s*cancelLunaAiRequest\(\);\s*hideQuickNotice\(\);/, "Tắt Luna phải hủy tác vụ hội thoại và xóa bong bóng đang chờ.");
assert.match(assistant, /phuc-thinh-luna-visibility-change/, "Widget phải cập nhật ngay khi cấu hình đổi.");

for (const asset of ["luna-outfit-field.png", "luna-outfit-aodai-red.png", "luna-outfit-aodai-heritage.png"]) {
  assert.match(assistant, new RegExp(`assets/${asset.replaceAll(".", "\\.")}`), `Theme Luna thiếu ánh xạ asset: ${asset}`);
  assert.match(worker, new RegExp(`"assets/${asset.replaceAll(".", "\\.")}"`), `Service worker chưa precache: ${asset}`);
  assert.ok(fs.statSync(`assets/${asset}`).size > 50000, `Asset Luna có vẻ không hợp lệ: ${asset}`);
}
assert.match(assistant, /tet: "assets\/luna-outfit-aodai-red\.png"/, "Theme Tết cần dùng áo dài đỏ.");
assert.match(assistant, /"vietnamese-culture-day": "assets\/luna-outfit-aodai-heritage\.png"/, "Theme văn hóa cần dùng áo dài di sản.");
assert.doesNotMatch(app, /Tính lỗi KPI:/, "Thẻ công việc không còn tiền tố 'Tính lỗi KPI'.");

console.log("luna_system_settings=passed");
