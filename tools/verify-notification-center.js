const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const calendar = fs.readFileSync("work-calendar.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261002000000_kpi_notifications.sql", "utf8");

function extract(text, name) {
  const start = text.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Thiếu hàm ${name}.`);
  const next = text.indexOf("\nfunction ", start + 1);
  return text.slice(start, next < 0 ? text.length : next);
}

[
  'id="notificationBell"',
  'id="notificationUnreadCount"',
  'id="notificationCenter"',
  'id="notificationCenterList"',
  'id="notificationQuickToasts"',
  'data-notification-toggle',
  'class="notification-bell-shape"',
  'src="assets/notification-bell-glass.png?v=3.4.14"',
].forEach((marker) => assert.ok(html.includes(marker), `Thiếu thành phần giao diện: ${marker}`));
assert.equal((html.match(/src="assets\/notification-bell-glass\.png\?v=3\.4\.14"/g) || []).length, 2, "Chuông desktop và mobile phải dùng cùng bản asset.");

assert.match(css, /\.notification-quick-toasts \{[\s\S]*?bottom: 20px;[\s\S]*?left: 20px;/, "Popup nhanh phải hiển thị ở góc dưới bên trái.");
assert.match(css, /\.notification-bell \{[\s\S]*?width: 38px;[\s\S]*?height: 36px;[\s\S]*?color: #b42318;/, "Chuông phải gọn trong ô tài khoản.");
assert.match(css, /\.notification-bell-shape \{[\s\S]*?width: 28px;[\s\S]*?height: 28px;[\s\S]*?object-fit: contain;[\s\S]*?transform: translate\(-50%, -50%\);/, "Chuông kính phải nằm gọn ở chính giữa nút.");
assert.match(css, /\.notification-bell-count \{[\s\S]*?top: 50%;[\s\S]*?min-width: 12px;[\s\S]*?color: #075d73 !important;[\s\S]*?font-size: 0\.52rem;[\s\S]*?transform: translate\(-50%, -50%\);/, "Số chưa đọc phải nằm giữa thân chuông và có màu xanh ngọc dễ nhìn.");
assert.match(css, /\.notification-center\.is-hidden \{[\s\S]*?display: none;/, "Trung tâm thông báo phải đóng hoàn toàn khi không dùng.");

[
  'function notificationItemsForCurrentAccount',
  'function saveNotificationAcknowledgement',
  'function ingestCalendarReminderNotifications',
  'function presentNewNotificationToasts',
  'function notificationServerWriteAvailable',
  'setupNotificationCenterEvents();',
  '"notifications"',
].forEach((marker) => assert.ok(client.includes(marker), `Thiếu bảo vệ trung tâm thông báo: ${marker}`));
assert.match(client, /notificationCenter\.localItems\.forEach\(\(item\) => \{\s*itemsById\.set\(item\.id, item\);/, "Trạng thái cục bộ khi mạng gián đoạn phải ghi đè được trạng thái suy diễn cũ.");
assert.match(client, /item\.derived && !notificationServerWriteAvailable\(\)/, "Máy chủ cũ không được nhận mutation thông báo mà nó chưa hỗ trợ.");
assert.match(client, /notificationsSupported: false/, "Khách phải theo dõi rõ năng lực thông báo của máy chủ.");
assert.match(client, /sharedSync\.notificationsSupported = sharedSync\.available && payload\?\.notifications === true;/, "Khách chỉ xác nhận thông báo khi máy chủ công bố hỗ trợ.");
assert.match(client, /sharedSync\.notificationsSupported === true[\s\S]*?2026\.10\.14\.1/, "Máy chủ cũ phải dùng trạng thái cục bộ an toàn.");
assert.match(client, /item\.localOnly \|\| \(item\.derived && !notificationServerWriteAvailable\(\)\)/, "Đánh dấu tất cả cũng không được gửi xác nhận tới máy chủ cũ.");
assert.match(client, /unread > 9 \? "9\+" : String\(unread\)/, "Số lượng lớn phải rút gọn để luôn nằm vừa trong thân chuông.");
assert.match(client, /event\.target\.closest\("#notificationCenter, #notificationBell, \[data-notification-toggle\]"\)/, "Click nút chuông mobile không được bị listener click ngoài đóng panel ngay lập tức.");
assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.notification-center[\s\S]*?max-height: calc\(100dvh - 20px\)/, "Trung tâm thông báo mobile phải vừa với chiều cao viewport động.");
const mobileClickHandlers = new Map();
const notificationRuntimeState = { isOpen: false };
const mobileButton = {
  addEventListener: (name, handler) => mobileClickHandlers.set(name, handler),
  closest: (selector) => selector.includes("[data-notification-toggle]") ? mobileButton : null,
};
const documentHandlers = new Map();
const eventContext = {
  notificationCenter: notificationRuntimeState,
  byId: () => ({ addEventListener() {} }),
  markAllNotificationsRead() {},
  toggleNotificationCenter(forceOpen) { notificationRuntimeState.isOpen = forceOpen; },
  document: {
    querySelectorAll: (selector) => selector === "[data-notification-toggle]" ? [mobileButton] : [],
    getElementById: () => ({ classList: { remove() {} } }),
    addEventListener: (name, handler) => documentHandlers.set(name, handler),
  },
  window: { addEventListener() {} },
};
vm.createContext(eventContext);
vm.runInContext(extract(client, "setupNotificationCenterEvents"), eventContext);
eventContext.setupNotificationCenterEvents();
mobileClickHandlers.get("click")({ stopPropagation() {} });
documentHandlers.get("click")({ target: mobileButton });
assert.equal(notificationRuntimeState.isOpen, true, "Bấm chuông trong menu mobile phải giữ trung tâm thông báo đang mở.");
assert.match(calendar, /ingestCalendarReminderNotifications\(newEvents\)/, "Nhắc lịch phải đi qua trung tâm thông báo chung.");
assert.match(calendar, /calendarReminderToast"\)\?\.classList\.add\("is-hidden"\)/, "Toast lịch cũ phải được tắt để không thông báo trùng.");

[
  'const deploymentVersion = "2026.10.21.1"',
  'notifications: true,',
  'function notificationFeedForAccount',
  'function notificationAcknowledgementIsValid',
  'function appendTaskChangeNotifications',
  'if (collection === "notifications") return notificationAcknowledgementIsValid',
  'if (collection === "notifications") return false;',
  'output.notifications = notificationFeedForAccount(state, account);',
  'for (const collection of ["people", "tasks", "gpmbWorkflows", "evaluations", "notifications", "activityLog"]',
].forEach((marker) => assert.ok(edge.includes(marker), `Thiếu kiểm soát máy chủ: ${marker}`));
assert.match(edge, /String\(next\.recipientAccountId \|\| ""\) !== actorId/, "Máy chủ phải bắt buộc người đọc là người nhận thông báo.");
assert.match(edge, /sameJson\(withoutKeys\(previous, notificationMutableFields\), withoutKeys\(next, notificationMutableFields\)\)/, "Người nhận chỉ được đổi trạng thái đọc/ẩn, không được sửa nội dung.");
assert.match(edge, /notificationSourceIsKnownForAccount\(state, actor, sourceId\)/, "Xác nhận thông báo suy diễn phải gắn đúng công việc của người nhận.");
assert.match(edge, /const acknowledgements = records\(state, "notifications"\)[\s\S]*?notificationType \|\| ""\) === "acknowledgement"[\s\S]*?recipientAccountId \|\| ""\) === accountId[\s\S]*?return \[\.\.\.stored, \.\.\.acknowledgements, \.\.\.deadlines\]/, "Máy chủ phải trả lại trạng thái đã đọc/ẩn của nhắc việc suy diễn sau khi tải lại.");

[
  "create table if not exists public.notifications",
  "notifications_recipient_idx",
  "alter table public.notifications enable row level security",
  "revoke all on table public.notifications from anon, authenticated",
].forEach((marker) => assert.ok(migration.includes(marker), `Migration thông báo thiếu: ${marker}`));

const normalizerContext = {};
vm.createContext(normalizerContext);
vm.runInContext(extract(client, "normalizeNotificationItem"), normalizerContext);
const normalized = normalizerContext.normalizeNotificationItem({
  id: "notice-1", recipientAccountId: "account-1", category: "task", priority: "danger", title: "Quá hạn", message: "Việc A",
});
assert.equal(normalized.id, "notice-1");
assert.equal(normalized.category, "task");
assert.equal(normalized.priority, "danger");
assert.equal(normalizerContext.normalizeNotificationItem({ id: "missing-recipient" }), null, "Thông báo máy chủ không được thiếu người nhận.");
const local = normalizerContext.normalizeNotificationItem({ id: "local-calendar", title: "Nhắc lịch" }, { localOnly: true });
assert.equal(local.localOnly, true);

console.log("notification_center=passed");
