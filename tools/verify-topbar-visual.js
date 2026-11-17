const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const source = fs.readFileSync("script.js", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const localServer = fs.readFileSync("tools/local-static-server.cjs", "utf8");

function readJpegDimensions(path) {
  const image = fs.readFileSync(path);
  assert.equal(image.readUInt16BE(0), 0xffd8, `${path} phải là ảnh JPEG.`);
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;

  while (offset < image.length) {
    while (offset < image.length && image[offset] !== 0xff) offset += 1;
    while (offset < image.length && image[offset] === 0xff) offset += 1;
    const marker = image[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;

    const segmentLength = image.readUInt16BE(offset);
    if (startOfFrameMarkers.has(marker)) {
      return {
        height: image.readUInt16BE(offset + 3),
        width: image.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }

  throw new Error(`Không đọc được kích thước JPEG ${path}.`);
}

assert.ok(html.includes('class="topbar-brand"'), "Header phải giữ cụm nhận diện thương hiệu.");
assert.ok(html.includes('class="topbar-logo" src="app-icon-phuc-thinh.png'), "Logo hệ thống phải hiển thị trong cụm thương hiệu.");
assert.ok(html.includes('class="topbar-visual"'), "Ảnh chủ đề phải có vùng hiển thị riêng trong header.");
assert.ok(html.includes('id="topbarVisualScene" class="topbar-visual-scene"'), "Vùng ảnh phải hỗ trợ thay đổi ảnh theo chủ đề.");
assert.ok(localServer.includes('".jpg": "image/jpeg"'), "Máy chủ xem thử phải trả đúng MIME type cho ảnh JPEG.");
[
  "assets/topbar-wide-infrastructure-scene.jpg",
  "assets/topbar-wide-scene-tet.jpg",
  "assets/topbar-wide-scene-national-day.jpg",
  "assets/topbar-wide-scene-anniversary.jpg",
  "assets/topbar-wide-scene-women-day.jpg",
  "assets/topbar-wide-scene-new-year.jpg",
  "assets/topbar-wide-scene-hung-kings.jpg",
  "assets/topbar-wide-scene-reunification-day.jpg",
  "assets/topbar-wide-scene-children-day.jpg",
  "assets/topbar-wide-scene-martyrs-day.jpg",
  "assets/topbar-wide-scene-august-revolution.jpg",
  "assets/topbar-wide-scene-vietnamese-women-day.jpg",
  "assets/topbar-wide-scene-vietnamese-culture-day.jpg",
  "assets/topbar-wide-scene-christmas.jpg",
].forEach((asset) => {
  assert.ok(fs.existsSync(asset), `Tệp minh họa ${asset} phải được đóng gói cùng ứng dụng.`);
  assert.ok(fs.statSync(asset).size < 150_000, `Ảnh banner ${asset} phải được nén gọn để không làm nặng thanh đầu trang.`);
  assert.deepEqual(readJpegDimensions(asset), { width: 1920, height: 86 }, `Ảnh ${asset} phải khớp canvas header 1920x86.`);
  assert.ok(source.includes(asset), `Chủ đề phải trỏ đến bộ panorama lễ hội ${asset}.`);
});
assert.ok(!source.includes("topbar-v2-"), "Không dùng nhầm bộ panorama cầu cảnh tối giản.");
assert.ok(!source.includes("topbar-hanoi-"), "Chủ đề không được tham chiếu bộ ảnh Hà Nội mới thay cho bộ tranh lễ hội 3.4.118.");
assert.ok(!html.includes('class="topbar-decoration"'), "Không chồng lớp hoa cũ lên bộ ảnh chủ đề mới.");
assert.ok(!worker.includes("assets/topbar-festive-left.png"), "Không precache lớp hoa cũ không còn sử dụng.");
assert.ok(!worker.includes("assets/topbar-festive-right.png"), "Không precache lớp hoa cũ không còn sử dụng.");
assert.ok(styles.includes("position: absolute !important;\n  inset: 0;"), "Ảnh chủ đề phải khớp trọn canvas header 1920x86.");
assert.ok(styles.includes("height: 76px !important;\n  min-height: 76px !important;\n  max-height: 76px !important;"), "Thanh đầu trang desktop phải gọn ở 76px theo bố cục hiện hành.");
assert.ok(styles.includes("overflow: hidden !important;"), "Nội dung trang trí không được tràn khỏi thanh đầu trang.");
const themeImageRules = [...styles.matchAll(/\.topbar-visual-scene\s*\{([^}]*)\}/g)].map((match) => match[1]);
assert.ok(themeImageRules.length >= 2, "Ảnh chủ đề phải có quy tắc desktop và mobile riêng.");
assert.ok(themeImageRules.some((rule) => rule.includes("object-fit: cover;")), "Desktop phải để ảnh phủ kín toàn bộ thanh đầu trang.");
assert.ok(styles.includes("height: 72px !important;\n    min-height: 72px !important;\n    max-height: 72px !important;"), "Thanh đầu trang mobile phải đủ cao để ảnh chủ đề dễ nhận biết.");
assert.match(styles, /@media \(max-width: 768px\)[\s\S]*?\.topbar-visual-scene\s*\{[\s\S]*?object-fit:\s*cover;[\s\S]*?object-position:\s*50% 50%;/, "Mobile phải phủ kín ảnh theo tâm, không co panorama thành một dải nhỏ.");
assert.doesNotMatch(styles, /@media \(max-width: 768px\)[\s\S]*?\.topbar-visual-scene\s*\{[^}]*object-fit:\s*contain;/, "Không được co toàn bộ panorama 1920px trong chiều rộng mobile.");
assert.ok(styles.includes("filter: saturate(0.92) brightness(1.02);"), "Tông ảnh được làm dịu nhẹ mà không thay đổi nội dung.");
const overlayLayer = styles.match(/\.topbar::before\s*\{[^}]*z-index:\s*(\d+)/)?.[1];
assert.ok(overlayLayer, "Lớp phủ tương phản phải hiện diện phía trên ảnh chủ đề.");
assert.ok(styles.includes("rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.78) 25%"), "Nửa có nhận diện chữ phải được phủ sáng nhẹ để giữ tương phản.");
assert.ok(styles.includes("rgba(255, 255, 255, 0.02) 56%, transparent 100%"), "Nửa còn lại của ảnh chủ đề phải hiển thị rõ.");
assert.ok(styles.includes("@media (prefers-reduced-motion: reduce)"), "Chuyển ảnh chủ đề phải tôn trọng thiết lập giảm chuyển động.");
assert.ok(styles.includes("background: transparent !important;"), "Cụm tên đơn vị không được nằm trên thẻ nền trắng.");
assert.ok(styles.includes("color: var(--primary-dark) !important;"), "Chữ thương hiệu phải cập nhật theo màu đậm của chủ đề hiện hành.");
assert.ok(source.includes("const topbarThemeVisuals = {"), "Mỗi theme giao diện phải có ảnh thanh điều khiển tương ứng.");
assert.ok(source.includes("function renderTopbarThemeVisual(theme)"), "Hệ thống phải đổi ảnh thanh điều khiển khi đổi theme.");
assert.ok(source.includes("scene.src = source;"), "Ảnh cover phải đổi theo theme hệ thống.");
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
