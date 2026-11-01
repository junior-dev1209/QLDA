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
  assert.ok(fs.statSync(asset).size < 200_000, `Ảnh banner ${asset} phải được nén gọn để không làm nặng thanh đầu trang.`);
  assert.deepEqual(readJpegDimensions(asset), { width: 1920, height: 86 }, `Ảnh ${asset} phải khớp canvas thanh đầu trang 1920x86.`);
  assert.ok(source.includes(asset), `Chủ đề phải trỏ đến ảnh mới ${asset}.`);
});
[
  "assets/topbar-festive-left.png",
  "assets/topbar-festive-right.png",
].forEach((asset) => {
  assert.ok(fs.existsSync(asset), `Trang trí trong suốt ${asset} phải có trong ứng dụng.`);
  assert.ok(fs.statSync(asset).size < 500_000, `Trang trí ${asset} phải được tối ưu dung lượng.`);
  assert.ok(fs.readFileSync(asset).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${asset} phải là PNG có hỗ trợ alpha.`);
  assert.ok(html.includes(asset), `Header phải dùng lớp trang trí ${asset}.`);
  assert.ok(worker.includes(`"${asset}"`), `PWA phải cache lớp trang trí ${asset}.`);
});
assert.ok(styles.includes("position: absolute !important;\n  inset: 0;"), "Ảnh chủ đề phải phủ toàn chiều rộng và chiều cao thanh đầu trang.");
assert.ok(styles.includes("min-height: 76px !important;"), "Thanh đầu trang desktop phải trở lại chiều cao gọn.");
assert.ok(styles.includes("width: 100%;\n  height: 100%;\n  object-fit: fill;"), "Ảnh chủ đề desktop phải lấp canvas đúng tỷ lệ mà không xén nội dung.");
assert.ok(styles.includes("overflow: visible !important;"), "Viền trang trí phải được phép tràn nhẹ khỏi header.");
assert.ok(styles.includes("inset: -3px 0;"), "Lớp hoa/lụa chỉ được tràn nhẹ khỏi khung header.");
assert.ok(styles.includes("opacity: 0.48;"), "Viền hoa/lụa phải nhẹ, không lấn át ảnh chủ đề.");
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
