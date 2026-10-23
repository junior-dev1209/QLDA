const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("virtual-assistant.js", "utf8");
const assistantCss = fs.readFileSync("virtual-assistant.css", "utf8");
const appCss = fs.readFileSync("styles.css", "utf8");

assert.match(client, /function setAssistantMinimized\(minimized/);
assert.match(client, /root\.classList\.toggle\("is-minimized", next\)/);
assert.match(client, /minimizeButton\.addEventListener\("click", \(\) => setAssistantMinimized\(true\)\)/);
assert.match(client, /restoreButton\.addEventListener\("click", \(\) => setAssistantMinimized\(false\)\)/);
assert.match(client, /phuc-thinh-assistant-minimized-v1:/, "Trạng thái thu nhỏ phải lưu theo tài khoản hiện tại.");
assert.match(client, /setAssistantMinimized\(false\)/, "Icon khôi phục phải gọi lại nhân vật đầy đủ.");
assert.match(assistantCss, /\.virtual-assistant\.is-minimized \.assistant-launcher,[\s\S]*?\.assistant-speech-tail \{ display: none !important; \}/);
assert.match(assistantCss, /\.assistant-restore\s*\{[\s\S]*?right:\s*18px;[\s\S]*?bottom:\s*104px;[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/);
assert.match(assistantCss, /\.assistant-restore \{ right: 12px; bottom: calc\(150px \+ env\(safe-area-inset-bottom\)\); \}/, "Icon mobile phải nằm cao hơn vùng nút cuộn và thanh điều hướng.");
assert.match(appCss, /\.view-scroll-actions \{[\s\S]*?right:\s*18px;[\s\S]*?bottom:\s*18px;/);
assert.match(appCss, /\.task-scroll-actions,[\s\S]*?\.view-scroll-actions \{[\s\S]*?bottom:\s*68px !important;/, "Vị trí icon không được trùng hai nút cuộn trên mobile.");
assert.equal((html.match(/data-assistant-enabled-toggle/g) || []).length, 0, "Không còn công tắc bật/tắt ở hồ sơ.");

console.log("virtual_assistant_minimize=passed");
