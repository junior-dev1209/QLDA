const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");
const iconIds = new Set([...html.matchAll(/<symbol id="(icon-[^"]+)"/g)].map((match) => match[1]));

function useId(markup) {
  return markup.match(/<use href="#(icon-[^"]+)"/i)?.[1] || "";
}

const desktopItems = new Map(
  [...html.matchAll(/<button class="nav-item[^>]*data-view="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)]
    .map((match) => [match[1], useId(match[2])]),
);
const mobileItems = new Map(
  [...html.matchAll(/<button type="button" class="bottom-nav-item[^>]*data-view="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)]
    .map((match) => [match[1], useId(match[2])]),
);

for (const view of ["dashboard", "bulletin", "tasks", "people"]) {
  assert.ok(desktopItems.get(view), `Desktop phải có biểu tượng SVG cho ${view}.`);
  assert.equal(mobileItems.get(view), desktopItems.get(view), `Thanh mobile phải dùng cùng biểu tượng với desktop cho ${view}.`);
}

const menuItems = [...html.matchAll(/<button type="button" class="mobile-menu-item" data-view="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
assert.equal(menuItems.length, 9, "Menu mobile phải giữ đủ chín mục điều hướng hiện có.");
menuItems.forEach((match) => {
  const icon = useId(match[2]);
  assert.ok(iconIds.has(icon), `Mục ${match[1]} phải tham chiếu một biểu tượng SVG dùng chung.`);
  assert.equal(icon, desktopItems.get(match[1]), `Popup mobile phải dùng đúng biểu tượng desktop cho ${match[1]}.`);
  assert.ok(match[2].includes("mobile-menu-icon"), `Mục ${match[1]} phải dùng kiểu biểu tượng mobile thống nhất.`);
});

assert.ok(iconIds.has("icon-menu"), "Nút Menu cần biểu tượng ba gạch SVG thay ký tự Unicode.");
assert.match(styles, /\.mobile-menu-icon\s*\{[\s\S]*?width: 28px !important;[\s\S]*?border-color: #d5e1ea !important;/);
assert.match(styles, /\.mobile-bottom-nav \.bottom-nav-item \.nav-icon\s*\{[\s\S]*?width: 22px !important;[\s\S]*?height: 22px !important;/);
assert.doesNotMatch(html, /<span class="nav-icon">[▦▤☑◉☰]/, "Thanh điều hướng đáy không được dùng ký tự thay biểu tượng giao diện.");
assert.doesNotMatch(html, /<div class="mobile-icon-box">/, "Popup menu không được dùng glyph Unicode cho icon mục.");

console.log("mobile_navigation_icons=passed");
