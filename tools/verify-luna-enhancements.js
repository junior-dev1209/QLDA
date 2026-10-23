const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("script.js", "utf8");
const assistant = fs.readFileSync("virtual-assistant.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

assert.match(assistant, /function createTaskDraft\(raw, createMatch\)/, "Luna phải phân tích bản nháp tạo việc từ văn bản/voice transcript.");
assert.match(assistant, /function showTaskDraftPreview\(draft\)/, "Tạo việc phải có bước xem trước.");
assert.match(assistant, /data-assistant-confirm-task/, "Bản nháp tạo việc cần xác nhận trước khi mở biểu mẫu.");
assert.match(assistant, /window\.virtualAssistantApplyTaskDraft\(preparedDraft\)/, "Luna phải dùng biểu mẫu và luồng lưu hiện có.");
assert.match(app, /window\.virtualAssistantApplyTaskDraft = \(draft = \{\}\) => \{[\s\S]*?canCreateRegularTasks\(\)[\s\S]*?canCreateRegularTaskForPerson/, "Phải kiểm tra lại quyền khi áp bản nháp.");
assert.match(app, /window\.virtualAssistantApplyProgressDraft = \(draft = \{\}\) => \{[\s\S]*?canUpdateTaskProgress\(task\)[\s\S]*?reportButton\.click\(\)/, "Cập nhật tiến độ hội thoại phải kiểm tra quyền và mở luồng cập nhật hiện có.");
assert.match(assistant, /currentProgress !== draft\.currentProgress/, "Bản cập nhật cũ phải bị hủy nếu tiến độ đã đổi sau lúc xem trước.");
assert.match(app, /applyTaskRecordAudit\(mergedRecord, existingTask\)/, "Cập nhật qua Luna vẫn phải đi qua audit công việc.");
assert.match(assistant, /recognition\.onresult[\s\S]*input\.value\s*=\s*transcript[\s\S]*Hãy kiểm tra nội dung rồi bấm Gửi/, "Voice vẫn phải yêu cầu người dùng kiểm tra và gửi thủ công.");

assert.match(html, /id="lunaProactiveEnabled"/, "Người dùng cần bật/tắt popup chủ động.");
assert.match(html, /id="lunaQuietHoursEnabled"/, "Luna cần cài giờ yên lặng.");
assert.match(app, /function lunaQuietHoursActive\(preferences, date = new Date\(\)\)/, "Giờ yên lặng phải xử lý được khung giờ qua nửa đêm.");
assert.match(app, /function notificationIsScheduledAnnouncementInFuture/, "Thông báo phát theo lịch phải được giữ ẩn trước thời điểm.");
assert.match(app, /targetType === "luna-announcement"[\s\S]*?scheduledAt && new Date\(item\.scheduledAt\)\.getTime\(\) <= now/, "Thông báo hẹn giờ phải được phát khi đã tới thời điểm.");
assert.match(assistant, /window\.virtualAssistantShouldSuppressProactive\?\.\(\)/, "Thiết lập yên lặng phải áp dụng cả thông báo chủ động từ Luna.");
assert.match(app, /notificationMutableFields|readAt/, "Trạng thái đã xem vẫn được lưu qua cơ chế xác nhận thông báo.");

assert.match(edge, /departmentIds\.includes\(accountDepartmentId\(current\.state, account\)\)/, "API phải lọc người nhận theo phòng phía máy chủ.");
assert.match(edge, /roleIds\.includes\(accountRole\(account\)\)/, "API phải lọc người nhận theo nhóm tài khoản phía máy chủ.");
assert.match(edge, /scheduledTime > Date\.now\(\) \+ 90 \* 24 \* 60 \* 60 \* 1000/, "Lịch phát phải bị giới hạn trong 90 ngày.");
assert.match(edge, /action === "luna-announcement-receipts" && request\.method === "GET"[\s\S]*?if \(!isAdmin\(account\)\)/, "Chỉ Admin được tải báo cáo đã xem.");
assert.match(edge, /scheduledAt \? false : await sendLunaAnnouncementBroadcast/, "Không được phát Realtime thông báo trước lịch.");
assert.match(edge, /recipientCount: recipients\.length,[\s\S]*?audienceDepartmentIds[\s\S]*?scheduledAt/, "Thông báo phải lưu được phạm vi và thời gian để đối soát.");

assert.match(edge, /id: recordId\(task\),[\s\S]*?id: recordId\(person\),[\s\S]*?id: recordId\(post\)/, "Ngữ cảnh AI phải giữ định danh nguồn đã lọc quyền.");
assert.match(edge, /scope: context\.scope, updatedAt: current\.updatedAt, sources: lunaAiSources\(context\)/, "AI phải trả phạm vi, mốc dữ liệu và nguồn.");
assert.match(assistant, /function aiSourceHtml\(payload\)/, "Luna phải trình bày nguồn dữ liệu sau câu trả lời AI.");
assert.match(assistant, /data-assistant-open-task/, "Nguồn công việc phải mở lại được hồ sơ được phép xem.");

assert.match(worker, /const RELEASE_VERSION = "3\.4\.64"/, "Service worker phải phát hành cache mới.");
assert.match(app, /const APP_VERSION = "3\.4\.64"/, "Ứng dụng phải cùng phiên bản phát hành.");

const getFunction = (name) => {
  const start = app.indexOf("function " + name + "(");
  assert.ok(start >= 0, "Không tìm thấy " + name);
  const end = app.indexOf("\nfunction ", start + 1);
  return app.slice(start, end < 0 ? app.length : end);
};
const prefRuntime = {
  LUNA_NOTIFICATION_PREFERENCES_PREFIX: "luna-pref",
  notificationCurrentAccountId: () => "account-1",
  localStorage: { getItem: () => JSON.stringify({ quietHoursEnabled: true, quietHoursStart: "22:00", quietHoursEnd: "07:00" }) },
  Date,
  JSON,
};
vm.createContext(prefRuntime);
vm.runInContext(getFunction("lunaNotificationPreferences"), prefRuntime);
vm.runInContext(getFunction("lunaQuietHoursActive"), prefRuntime);
const preferences = prefRuntime.lunaNotificationPreferences();
assert.equal(prefRuntime.lunaQuietHoursActive(preferences, new Date("2026-10-23T22:30:00")), true);
assert.equal(prefRuntime.lunaQuietHoursActive(preferences, new Date("2026-10-23T06:59:00")), true);
assert.equal(prefRuntime.lunaQuietHoursActive(preferences, new Date("2026-10-23T07:00:00")), false);

console.log("luna_enhancements=passed");
