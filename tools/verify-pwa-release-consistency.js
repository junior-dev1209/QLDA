const assert = require("node:assert/strict");
const fs = require("node:fs");

const index = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const manifest = fs.readFileSync("manifest.webmanifest", "utf8");
const apacheConfig = fs.readFileSync(".htaccess", "utf8");
const releaseVersion = "3.4.64";

[
  `manifest.webmanifest?v=${releaseVersion}`,
  `supabase-config.js?v=${releaseVersion}`,
  `styles.css?v=${releaseVersion}`,
  `work-calendar.css?v=${releaseVersion}`,
  `virtual-assistant.css?v=${releaseVersion}`,
  `people-data.js?v=${releaseVersion}`,
  `work-calendar.js?v=${releaseVersion}`,
  `script.js?v=${releaseVersion}`,
  `virtual-assistant.js?v=${releaseVersion}`,
].forEach((asset) => assert.ok(index.includes(asset), `Tài nguyên lõi chưa gắn phiên bản phát hành: ${asset}`));

assert.match(index, new RegExp(`data-app-version>Phiên bản ${releaseVersion}<`), "HTML không được hiện phiên bản cũ trước khi JavaScript tải xong.");
assert.match(client, new RegExp(`const APP_VERSION = "${releaseVersion}";`), "JavaScript không cùng phiên bản với giao diện.");
assert.match(manifest, new RegExp(`"version": "${releaseVersion}"`), "Manifest không cùng phiên bản với giao diện.");
assert.match(client, /service-worker\.js\?v=\$\{encodeURIComponent\(APP_VERSION\)\}/, "Service worker phải được đăng ký theo phiên bản giao diện.");
assert.match(client, /pwaControllerChangeCanReload \|\|= Boolean\(navigator\.serviceWorker\.controller\);/, "Chỉ trang đã có controller cũ mới tự tải lại khi cập nhật.");
assert.match(client, /sessionStorage\.setItem\(PWA_RELEASE_RELOAD_KEY, "1"\)/, "Mỗi phát hành chỉ được tự tải lại một lần.");
assert.match(worker, new RegExp(`const RELEASE_VERSION = "${releaseVersion}";`), "Service worker không cùng phiên bản với giao diện.");
assert.match(worker, /new Request\(asset, \{ cache: "reload" \}\)/, "Cài đặt service worker phải bỏ qua HTTP cache cũ.");
assert.match(worker, /"work-calendar\.css"/, "Service worker phải lưu CSS của Lịch công việc.");
assert.match(worker, /"work-calendar\.js"/, "Service worker phải lưu mã Lịch công việc.");
assert.match(worker, /"assets\/notification-bell-glass\.png"/, "Service worker phải lưu biểu tượng chuông thông báo.");
assert.match(worker, /"assets\/virtual-assistant\.png"/, "Service worker phải lưu hình nhân vật trợ lý.");
assert.doesNotMatch(worker, /virtual-assistant-(?:listening|thinking)\.png/, "Không tải trước ảnh trạng thái cũ không còn dùng.");
assert.doesNotMatch(worker, /"virtual-assistant-3d\.js"|"assets\/three\.module\.js"/, "Mô-đun 3D không được làm tăng tải khởi động PWA; sẽ được cache khi cần.");
assert.match(worker, /fetch\(event\.request\)[\s\S]*cache\.put\(event\.request, copy\)/, "Tài nguyên 3D tải theo nhu cầu phải được cache sau lần đầu.");
assert.match(worker, /"virtual-assistant\.css"/, "Service worker phải lưu giao diện trợ lý.");
assert.match(worker, /"virtual-assistant\.js"/, "Service worker phải lưu hành vi trợ lý.");
assert.match(worker, /precacheReleaseShell\(\)\.then\(\(\) => self\.skipWaiting\(\)\)/, "Service worker chỉ được kích hoạt sau khi tải đủ gói phát hành.");
assert.match(worker, /event\.request\.mode === "navigate"[\s\S]*cache: "no-store"/, "HTML online phải luôn tải mới từ máy chủ.");
assert.match(worker, /cache\.match\(NAVIGATION_FALLBACK\)/, "Khi mất mạng phải có trang phát hành hiện tại để dự phòng.");
assert.match(apacheConfig, /service-worker\\\.js/, "Máy chủ Apache phải cấm cache service worker.");
assert.match(apacheConfig, /no-store, no-cache, must-revalidate/, "HTML và cấu hình hệ thống phải không bị cache trung gian.");

console.log("pwa_release_consistency=passed");
