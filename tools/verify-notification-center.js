const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const assistantCss = fs.readFileSync("virtual-assistant.css", "utf8");
const assistantClient = fs.readFileSync("virtual-assistant.js", "utf8");
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
  'src="assets/notification-bell-glass.png?v=3.4.64"',
].forEach((marker) => assert.ok(html.includes(marker), `Thiếu thành phần giao diện: ${marker}`));
assert.equal((html.match(/src="assets\/notification-bell-glass\.png\?v=3\.4\.64"/g) || []).length, 2, "Chuông desktop và mobile phải dùng cùng bản asset.");
assert.ok(html.indexOf('virtual-assistant.js?v=3.4.64') < html.indexOf('script.js?v=3.4.64'), "Cầu nối trợ lý phải sẵn sàng trước lần quét thông báo đầu tiên, kể cả offline.");
assert.match(client, /window\.virtualAssistantSyncAccount\?\.\(\);\s*renderNotificationCenter\(\);/, "Phải đồng bộ tài khoản trợ lý trước khi phát nhắc việc lúc khởi động.");

assert.match(css, /\.notification-quick-toasts \{[\s\S]*?bottom: 20px;[\s\S]*?left: 20px;/, "Popup nhanh phải hiển thị ở góc dưới bên trái.");
assert.match(assistantCss, /\.assistant-quick-notice \{[\s\S]*?top: 12px;[\s\S]*?left: 12px;/, "Thông báo nhanh phải đặt cạnh Luna theo vị trí đầu nhân vật.");
assert.match(css, /\.notification-center,\s*\.notification-quick-toasts \{ display: none !important; \}/, "Không được hiển thị song song giao diện thông báo cũ.");
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
assert.match(client, /window\.virtualAssistantOpenNotifications\?\.\(\)/, "Chuông phải mở hộp thoại thông báo của trợ lý.");
assert.match(client, /window\.virtualAssistantNotify\(item\)/, "Thông báo mới phải được chuyển vào trợ lý.");
assert.match(assistantClient, /function acknowledgeQuickNotice\(\{ showNext = true \} = \{\}\)[\s\S]*?dismissNotification\(item\)[\s\S]*?quickNotice\?\.classList\.add\("is-hidden"\)/, "Bấm popup Luna phải xác nhận đã xem và đóng thông báo.");
assert.match(assistantClient, /quickNoticeText\?\.addEventListener\("click", acknowledgeQuickNotice\)/, "Chỉ lời thoại trong popup phải là vùng xác nhận thông báo.");
assert.doesNotMatch(assistantClient, /setTimeout\(hideQuickNotice/, "Thông báo chủ động không được tự ẩn theo thời gian.");
assert.match(client, /function ingestDailyTaskReminderNotifications/, "Phải nhắc công việc cần làm hôm nay và sắp đến hạn.");
assert.match(client, /function ingestBulletinUpdateNotifications/, "Tin Bảng tin mới phải được nhắc qua trợ lý.");
assert.match(client, /function recoverActiveAssistantReminderIds/, "Khi nâng cấp offline phải khôi phục các nhắc việc còn hiệu lực chưa được trợ lý hiển thị.");
assert.match(client, /phuc-thinh-notification-presented-v2/, "Dùng sổ đã-hiển-thị mới để khôi phục nhắc việc bị bỏ lỡ ở phiên bản trước.");
assert.match(client, /if \(notificationCenter\.presentedIds\.has\(item\.id\)\) return;/, "Không lặp lại popup chủ động khi người dùng tải lại hoặc đang mở hệ thống.");
assert.match(client, /phuc-thinh-assistant-birthday-v1/, "Lời chúc sinh nhật cần được chống lặp giữa các phiên.");
assert.doesNotMatch(client, /new Notification\(/, "Không được gửi thông báo thiết bị song song với trợ lý.");
assert.match(client, /event\.target\.closest\("#notificationCenter, #notificationBell, \[data-notification-toggle\]"\)/, "Click nút chuông mobile không được bị listener click ngoài đóng panel ngay lập tức.");
assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.notification-center[\s\S]*?max-height: calc\(100dvh - 20px\)/, "Trung tâm thông báo mobile phải vừa với chiều cao viewport động.");
const mobileClickHandlers = new Map();
const notificationRuntimeState = { isOpen: false };
let assistantOpenCount = 0;
const directClickHandlers = new Map();
const mobileButton = {
  addEventListener: (name, handler) => mobileClickHandlers.set(name, handler),
  closest: (selector) => selector.includes("[data-notification-toggle]") ? mobileButton : null,
};
const documentHandlers = new Map();
const eventContext = {
  notificationCenter: notificationRuntimeState,
  byId: (id) => ({ addEventListener: (name, handler) => directClickHandlers.set(id, handler) }),
  markAllNotificationsRead() {},
  toggleNotificationCenter(forceOpen) { notificationRuntimeState.isOpen = forceOpen; },
  document: {
    querySelectorAll: (selector) => selector === "[data-notification-toggle]" ? [mobileButton] : [],
    getElementById: () => ({ classList: { remove() {} } }),
    addEventListener: (name, handler) => documentHandlers.set(name, handler),
  },
  window: { addEventListener() {}, setInterval() {}, virtualAssistantOpenNotifications() { assistantOpenCount += 1; } },
};
vm.createContext(eventContext);
vm.runInContext(extract(client, "setupNotificationCenterEvents"), eventContext);
eventContext.setupNotificationCenterEvents();
mobileClickHandlers.get("click")({ stopPropagation() {} });
documentHandlers.get("click")({ target: mobileButton });
assert.equal(assistantOpenCount, 1, "Bấm chuông mobile phải mở trợ lý đúng một lần.");
assert.equal(notificationRuntimeState.isOpen, false, "Bảng thông báo cũ không được mở song song.");
directClickHandlers.get("notificationBell")();
assert.equal(assistantOpenCount, 2, "Bấm chuông desktop phải mở trợ lý.");
assert.match(calendar, /ingestCalendarReminderNotifications\(newEvents\)/, "Nhắc lịch phải đi qua trung tâm thông báo chung.");
assert.match(calendar, /calendarReminderToast"\)\?\.classList\.add\("is-hidden"\)/, "Toast lịch cũ phải được tắt để không thông báo trùng.");
assert.doesNotMatch(calendar, /Notification\.requestPermission|new Notification\(/, "Lịch không được yêu cầu thông báo trình duyệt riêng.");

[
  'const deploymentVersion = "2026.10.23.1"',
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
