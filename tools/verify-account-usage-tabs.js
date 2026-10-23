const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const panelStart = html.indexOf('<section id="accountPresencePanel"');
const panelEnd = html.indexOf('<div id="accountPasswordFallback"', panelStart);
assert.ok(panelStart >= 0 && panelEnd > panelStart, "Không tìm thấy khu vực giám sát sử dụng trong mục Tài khoản.");
const markup = html.slice(panelStart, panelEnd);

[
  'role="tablist" aria-label="Các chế độ giám sát sử dụng"',
  'data-account-usage-tab="accountPresenceOnlinePanel"',
  'data-account-usage-tab="accountPresenceUsagePanel"',
  'id="accountPresenceOnlinePanel" class="account-presence-tab-panel" role="tabpanel"',
  'id="accountPresenceUsagePanel" class="account-presence-tab-panel is-hidden" role="tabpanel"',
  'id="accountPresenceOnlineCount"',
  'id="accountPresenceList"',
  'class="account-usage-monitor-grid"',
  'id="accountUsageDailyVisitHistory"',
  'id="accountUsageMonthlyHistory"',
].forEach((marker) => assert.ok(markup.includes(marker), `Thiếu thành phần tab giám sát: ${marker}`));

assert.ok(markup.indexOf("accountPresenceOnlineTab") < markup.indexOf("accountPresenceUsageTab"), "Hai tab giám sát phải nằm cạnh nhau theo thứ tự trực tuyến, thống kê.");
assert.ok(markup.indexOf("accountPresenceUsagePanel") < markup.indexOf("account-task-stats-tabs"), "Tab thống kê sử dụng phải độc lập với nhóm tab thống kê công việc.");
assert.match(client, /function bindAccessibleTablist\(tablist, tabAttribute\)/, "Tab dùng chung phải có bộ điều khiển truy cập bàn phím.");
assert.match(client, /bindAccessibleTablist\(document\.querySelector\("\.account-task-stats-tablist"\), "data-account-task-tab"\)/, "Nhóm tab Công việc/Quá hạn phải tiếp tục hoạt động.");
assert.match(client, /bindAccessibleTablist\(document\.querySelector\("\.account-usage-tablist"\), "data-account-usage-tab"\)/, "Nhóm tab giám sát trực tuyến/thống kê phải hoạt động.");
assert.match(css, /\.account-presence-tabs,[\s\S]*?\.account-presence-tab-panel\s*\{[\s\S]*?display: grid;/, "Tab và vùng nội dung phải giữ bố cục dạng lưới ổn định.");
assert.match(css, /\.account-task-stats-tablist,[\s\S]*?\.account-usage-tablist\s*\{[\s\S]*?display: flex;/, "Hai nhóm tab phải dùng chung kiểu trình bày.");

console.log("account_usage_tabs=passed");
