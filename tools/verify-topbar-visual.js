const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const source = fs.readFileSync("script.js", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

assert.ok(html.includes('class="topbar-visual"'), "Thanh điều khiển phải có vùng minh họa riêng.");
assert.ok(!html.includes('class="topbar-visual-mark"'), "Thanh điều khiển không được hiển thị logo tròn.");
assert.ok(html.includes('id="topbarVisualScene"'), "Vùng minh họa phải có một ảnh chủ đề được cập nhật động.");
[
  "assets/topbar-infrastructure-scene.png",
  "assets/topbar-scene-tet.png",
  "assets/topbar-scene-national-day.png",
  "assets/topbar-scene-anniversary.png",
  "assets/topbar-scene-women-day.png",
  "assets/topbar-scene-new-year.png",
  "assets/topbar-scene-hung-kings.png",
  "assets/topbar-scene-reunification-day.png",
  "assets/topbar-scene-children-day.png",
  "assets/topbar-scene-martyrs-day.png",
  "assets/topbar-scene-august-revolution.png",
  "assets/topbar-scene-vietnamese-women-day.png",
  "assets/topbar-scene-vietnamese-culture-day.png",
  "assets/topbar-scene-christmas.png",
].forEach((asset) => assert.ok(fs.existsSync(asset), `Tệp minh họa ${asset} phải được đóng gói cùng ứng dụng.`));
assert.ok(styles.includes(".topbar-visual {"), "Vùng minh họa phải có bố cục co giãn trên desktop.");
assert.ok(styles.includes("@media (max-width: 1080px) {\n  .topbar-visual {\n    display: none;"), "Vùng minh họa phải tự ẩn trên màn hình hẹp để bảo vệ điều khiển.");
assert.ok(styles.includes("@media (prefers-reduced-motion: reduce)"), "Hiệu ứng ảnh phải tôn trọng chế độ giảm chuyển động.");
assert.ok(source.includes("const topbarThemeVisuals = {"), "Mỗi theme giao diện phải có ảnh thanh điều khiển tương ứng.");
assert.ok(source.includes("function renderTopbarThemeVisual(theme)"), "Hệ thống phải đổi ảnh thanh điều khiển khi đổi theme.");
assert.ok(source.includes("renderTopbarThemeVisual(theme);"), "Ảnh thanh điều khiển phải được cập nhật cùng lúc với theme toàn hệ thống.");
[
  "Happy New Year",
  "Ngày Giỗ Tổ Hùng Vương",
  "Ngày lễ 30/4 - 1/5",
  "Ngày Quốc tế Thiếu nhi 1/6",
  "Ngày Thương binh Liệt sĩ 27/7",
  "Ngày Cách mạng Tháng Tám 19/8",
  "Ngày Phụ nữ Việt Nam 20/10",
  "Ngày Văn hóa Việt Nam 24/11",
  "Ngày Giáng sinh 25/12",
].forEach((label) => assert.ok(source.includes(label), `Theme ${label} phải có trong danh sách cấu hình.`));

console.log("topbar_theme_visual=passed");
