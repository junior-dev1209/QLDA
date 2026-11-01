const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("script.js", "utf8");
const assistant = fs.readFileSync("virtual-assistant.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const appVersion = app.match(/const APP_VERSION = "([^"]+)"/)?.[1];
assert.ok(appVersion, "Không tìm thấy phiên bản ứng dụng.");

assert.match(assistant, /function createTaskDraft\(raw, createMatch\)/, "Luna phải phân tích bản nháp tạo việc từ văn bản/voice transcript.");
assert.match(assistant, /function showTaskDraftPreview\(draft\)/, "Tạo việc phải có bước xem trước.");
assert.match(assistant, /data-assistant-confirm-task/, "Bản nháp tạo việc cần xác nhận trước khi mở biểu mẫu.");
assert.match(assistant, /window\.virtualAssistantApplyTaskDraft\(preparedDraft\)/, "Luna phải dùng biểu mẫu và luồng lưu hiện có.");
assert.match(app, /window\.virtualAssistantApplyTaskDraft = \(draft = \{\}\) => \{[\s\S]*?canCreateRegularTasks\(\)[\s\S]*?canCreateRegularTaskForPerson/, "Phải kiểm tra lại quyền khi áp bản nháp.");
assert.match(app, /window\.virtualAssistantOpenProgressForm = \(draft = \{\}\) => \{[\s\S]*?canUpdateTaskProgress\(task\)[\s\S]*?reportButton\.click\(\)[\s\S]*?formId: assigned \? "assignmentTaskForm" : "taskForm"/, "Luna phải kiểm tra quyền và mở đúng biểu mẫu loại công việc tương ứng.");
assert.match(assistant, /new MutationObserver\(\(\) => \{\s*if \(!taskWizard\.active \|\| taskWizard\.mode !== "progress"\) return;[\s\S]*?taskDetailDialog\.contains\(taskWizard\.form\)[\s\S]*?exitTaskWizard\(/, "Đóng biểu mẫu giữa chừng phải kết thúc hướng dẫn cập nhật mà không lưu.");
assert.match(app, /window\.virtualAssistantOpenProgressForm = \(draft = \{\}\) => \{\s*if \(String\(currentAccount\(\)\?\.id \|\| ""\) !== String\(draft\.accountId \|\| ""\)\) return false;/, "Phiên cập nhật phải thuộc đúng tài khoản đã yêu cầu.");
assert.match(assistant, /function buildTaskProgressWizardSteps\(\)[\s\S]*?label: "Trạng thái"[\s\S]*?label: "Tiến độ"[\s\S]*?label: "Báo cáo tiến độ"/, "Luna phải hỏi đủ trạng thái, tiến độ và báo cáo tiến độ theo từng bước.");
assert.match(html, /id="taskNoteLabelText">Nội dung công việc \/ Báo cáo tiến độ/, "Công việc thường chỉ dùng một ô nội dung/báo cáo tiến độ.");
assert.doesNotMatch(html, /id="taskProgressReport(?:Field|Note)"/, "Không tách riêng ô báo cáo tiến độ khỏi nội dung công việc.");
assert.match(assistant, /progressReport: "taskNote"/, "Luna phải điền báo cáo tiến độ công việc thường vào ô Nội dung công việc / Báo cáo tiến độ.");
assert.match(assistant, /function startLunaProgressUpdateWizard\(taskQuery = "", suggestedProgress = null\)[\s\S]*?taskWizard\.steps = \[\{ key: "task"/, "Yêu cầu cập nhật phải mở hội thoại từng bước để xác định công việc.");
assert.match(assistant, /function resolveLunaProgressTask\(query\)[\s\S]*?startTaskProgressWizard\(task, taskWizard\.suggestedProgress\)/, "Luna chỉ mở cập nhật sau khi tìm đúng công việc trong phạm vi quyền.");
assert.match(assistant, /taskWizard\.form\.requestSubmit\(\)/, "Chỉ sau xác nhận Luna mới gửi biểu mẫu qua luồng lưu chuẩn.");
assert.match(assistant, /taskWizard\.mode === "progress"[\s\S]*?xác nhận có lưu cập nhật công việc này không/, "Luna phải xin xác nhận lưu riêng cho cập nhật tiến độ.");
assert.match(app, /progressReportOnly \|\| taskNote !== String\(existingTask\.note \|\| ""\)\.trim\(\)/, "Báo cáo nhập trong ô chung phải lưu thành diễn biến riêng.");
assert.match(app, /forceProgressReport = false[\s\S]*?forceProgressReport \|\| !canEditDetails/, "Cập nhật qua ô chung phải ghi nhận báo cáo ngay cả khi nội dung trùng ghi chú cũ.");
assert.match(app, /note: progressReportOnly && existingTask \? existingTask\.note \|\| "" : taskNote/, "Cập nhật tiến độ không được ghi đè nội dung mô tả gốc của công việc.");
assert.match(app, /currentProgress !== draft\.currentProgress|Number\(task\.progress \|\| 0\) !== Number\(draft\.currentProgress\)/, "Biểu mẫu phải bị từ chối nếu công việc thay đổi trong lúc xác nhận.");
assert.doesNotMatch(assistant, /data-assistant-confirm-update/, "Không còn dùng bước xem trước một lần thay cho hội thoại cập nhật.");
assert.match(assistant, /function progressUpdateTaskMatches\(query\)[\s\S]*?searchTasks\(currentTasks\(\), query\)/, "Tra cứu việc cần cập nhật phải giới hạn trong danh sách tài khoản được phép xem.");
assert.match(assistant, /const task = uniqueDraftMatch\(matches, query, \(item\) => item\.title\)[\s\S]*?canUpdateTaskProgress\(task\)/, "Luna phải phân giải đúng công việc được xem rồi mới kiểm tra quyền cập nhật.");
assert.match(app, /applyTaskRecordAudit\(mergedRecord, existingTask\)/, "Cập nhật qua Luna vẫn phải đi qua audit công việc.");
assert.match(assistant, /input\.form\?\.requestSubmit\(\)/, "Câu nhận dạng phải đi qua cùng luồng gửi hội thoại hiện có.");
assert.match(assistant, /window\.SpeechRecognition \|\| window\.webkitSpeechRecognition/, "Nhận dạng dùng API có sẵn của trình duyệt.");
assert.match(assistant, /new window\.SpeechSynthesisUtterance\(text\)/, "Đọc giọng dùng dịch vụ tích hợp trên thiết bị.");
assert.doesNotMatch(assistant, /MediaRecorder|luna-transcribe|luna-synthesize/);
assert.doesNotMatch(edge, /action === "luna-transcribe"|action === "luna-synthesize"/, "Edge Function không nhận hoặc phát âm thanh Luna.");
assert.match(app, /currentProgress !== draft\.currentProgress|Number\(task\.progress \|\| 0\) !== Number\(draft\.currentProgress\)/, "Lệnh thay đổi dữ liệu vẫn phải được kiểm tra lại trước khi xác nhận.");

const assistantNormalize = assistant.match(/function normalize\(value\) \{[\s\S]*?\n  \}/)?.[0];
const progressParserSource = assistant.match(/function parseProgressUpdateCommand\(raw\) \{[\s\S]*?\n  \}/)?.[0];
assert.ok(assistantNormalize && progressParserSource, "Không tìm thấy bộ phân tích lệnh cập nhật tiến độ.");
const parseProgressUpdateCommand = new Function(`${assistantNormalize}\n${progressParserSource}\nreturn parseProgressUpdateCommand;`)();
assert.deepEqual(parseProgressUpdateCommand("Luna ơi, cập nhật tiến độ công việc Giải phóng mặt bằng lên 65% giúp tôi"), { taskQuery: "giai phong mat bang", progress: 65 });
assert.deepEqual(parseProgressUpdateCommand("Giúp tôi điều chỉnh công việc Kiểm đếm lên 45%"), { taskQuery: "kiem dem", progress: 45 });
assert.deepEqual(parseProgressUpdateCommand("Cập nhật tiến độ công việc Hồ sơ dự án"), { taskQuery: "ho so du an", progress: null });
assert.deepEqual(parseProgressUpdateCommand("Cập nhật tiến độ giúp tôi"), { taskQuery: "", progress: null });
assert.equal(parseProgressUpdateCommand("Tình hình công việc"), null, "Yêu cầu xem tình hình không được nhận nhầm thành lệnh sửa tiến độ.");

assert.match(html, /id="lunaProactiveEnabled"/, "Người dùng cần bật/tắt popup chủ động.");
assert.match(html, /<details id="assistantSettings" class="assistant-settings"/, "Các tùy chọn Luna phải gom trong menu thiết lập bánh răng.");
assert.doesNotMatch(html, /id="assistantCreateTask"/, "Không để nút Tạo việc trong hộp thoại Luna.");
assert.match(html, /id="lunaQuietHoursEnabled"/, "Luna cần cài giờ yên lặng.");
assert.match(app, /function lunaQuietHoursActive\(preferences, date = new Date\(\)\)/, "Giờ yên lặng phải xử lý được khung giờ qua nửa đêm.");
assert.match(app, /function notificationIsScheduledAnnouncementInFuture/, "Thông báo phát theo lịch phải được giữ ẩn trước thời điểm.");
assert.match(app, /targetType === "luna-announcement"[\s\S]*?scheduledAt && new Date\(item\.scheduledAt\)\.getTime\(\) <= now/, "Thông báo hẹn giờ phải được phát khi đã tới thời điểm.");
assert.match(app, /function renderNotificationCenter\([\s\S]*?if \(present\) presentNewNotificationToasts\(items, \{ forceIds \}\);[\s\S]*?if \(!panel\) return;/, "Luna phải phát nhắc chủ động dù hộp thoại thông báo đang đóng.");
assert.match(app, /function scheduleLunaAnnouncementWake\(\)[\s\S]*?state\.notifications \|\| \[\][\s\S]*?scheduledItems[\s\S]*?window\.setTimeout/, "Bộ hẹn giờ phải quét thông báo đã lưu kể cả khi còn ẩn trước thời điểm phát.");
assert.match(app, /document\.addEventListener\("visibilitychange", \(\) => \{\s*if \(!document\.hidden && currentAccount\(\)\) renderNotificationCenter\(\);/, "Khi tab được mở lại, Luna phải hiển thị các thông báo đến hạn.");
assert.match(app, /\.filter\(\(item\) => !notificationIsScheduledAnnouncementInFuture\(item\)\)/, "Thông báo toàn Ban không được lộ nội dung trước giờ hẹn.");
assert.match(assistant, /window\.virtualAssistantShouldSuppressProactive\?\.\(\)/, "Thiết lập yên lặng phải áp dụng cả thông báo chủ động từ Luna.");
assert.match(app, /notificationMutableFields|readAt/, "Trạng thái đã xem vẫn được lưu qua cơ chế xác nhận thông báo.");

assert.match(edge, /departmentIds\.includes\(accountDepartmentId\(current\.state, account\)\)/, "API phải lọc người nhận theo phòng phía máy chủ.");
assert.match(edge, /roleIds\.includes\(accountRole\(account\)\)/, "API phải lọc người nhận theo nhóm tài khoản phía máy chủ.");
assert.match(edge, /scheduledTime > Date\.now\(\) \+ 90 \* 24 \* 60 \* 60 \* 1000/, "Lịch phát phải bị giới hạn trong 90 ngày.");
assert.match(edge, /action === "luna-announcement-receipts" && request\.method === "GET"[\s\S]*?if \(!isAdmin\(account\)\)/, "Chỉ Admin được tải báo cáo đã xem.");
assert.match(edge, /const realtimePublished = await sendLunaAnnouncementBroadcast\(body\.announcementId\)/, "Khi lên lịch phải phát tín hiệu đồng bộ ngay, không công bố nội dung trước thời hạn.");
assert.match(edge, /async function sendLunaAnnouncementBroadcast\(announcementId: string\)[\s\S]*?httpSend\("announcement", \{ announcementId \}/, "Realtime chỉ truyền ID để máy khách đồng bộ và tự ẩn nội dung đến giờ hẹn.");
assert.match(edge, /recipientCount: recipients\.length,[\s\S]*?audienceDepartmentIds[\s\S]*?scheduledAt/, "Thông báo phải lưu được phạm vi và thời gian để đối soát.");

assert.match(edge, /id: recordId\(task\),[\s\S]*?id: recordId\(person\),[\s\S]*?id: recordId\(post\)/, "Ngữ cảnh AI phải giữ định danh nguồn đã lọc quyền.");
assert.match(edge, /scope: context\.scope,[\s\S]*?sources: lunaAiSources\(context\),[\s\S]*?externalSources: lunaAiExternalSources\(output\)/, "AI phải trả phạm vi, mốc dữ liệu, nguồn nội bộ và nguồn bên ngoài.");
assert.match(edge, /tools: \[\{ type: "web_search", search_context_size: "low" \}\][\s\S]*?tool_choice: "auto"[\s\S]*?include: \["web_search_call\.action\.sources"\]/, "AI chỉ tìm web khi cần và lấy metadata URL để dẫn nguồn.");
assert.match(edge, /function lunaAiExternalSources\(output: JsonRecord\[\]\)[\s\S]*?url_citation[\s\S]*?https:/, "Nguồn AI bên ngoài phải lấy từ trích dẫn thật và chỉ chấp nhận URL HTTP(S).");
assert.match(assistant, /function aiSourceHtml\(payload\)/, "Luna phải trình bày nguồn dữ liệu sau câu trả lời AI.");
assert.match(assistant, /function aiReplyHtml\(reply, payload\)[\s\S]*?target="_blank" rel="noopener noreferrer"[\s\S]*?assistant-ai-inline-citations/, "Trích dẫn bên ngoài phải hiện thành liên kết ngay cạnh câu trả lời.");
assert.match(assistant, /assistantHistoryRetentionMs = 7 \* 24 \* 60 \* 60 \* 1000/, "Lịch sử Luna phải được lưu tối thiểu bảy ngày.");
assert.match(assistant, /function assistantHistoryStorageKey\(accountId\)[\s\S]*?phuc-thinh-luna-history-v1:\$\{accountId\}/, "Lịch sử phải tách riêng theo tài khoản.");
assert.match(assistant, /function restoreAssistantHistory\(accountId\)[\s\S]*?entry\.accessSignature === accessSignature[\s\S]*?message\.textContent = entry\.text/, "Lịch sử chỉ khôi phục cho cùng tài khoản/phạm vi quyền và luôn dựng bằng text an toàn.");
assert.match(assistant, /function assistantWorkReportKind\(text\)[\s\S]*?return "monthly"[\s\S]*?return "weekly"[\s\S]*?return "daily"/, "Luna nhận diện yêu cầu báo cáo tháng, tuần và ngày.");
assert.match(assistant, /function presentAssistantWorkReport\(kind, reportWindow = null\)[\s\S]*?canViewMonthlyWorkReport\(\)/, "Báo cáo tháng phải kiểm tra quyền trước khi tạo.");
assert.match(assistant, /dailyWorkReportData\(today\)/, "Báo cáo ngày phải dùng bộ tính chuẩn.");
assert.match(assistant, /weeklyWorkReportData\(today\)/, "Báo cáo tuần phải dùng bộ tính chuẩn.");
assert.match(assistant, /monthlyWorkReportData\(/, "Báo cáo tháng phải dùng bộ tính chuẩn.");
assert.match(assistant, /reserveAssistantWorkReportWindow\(kind\)[\s\S]*?window\.open\("", "_blank"\)/, "Luna phải giữ trước cửa sổ báo cáo trong thao tác gửi để tránh chặn popup.");
assert.match(assistant, /window\.openAssistantWorkReport\(kind, reportWindow, \{ quietOnBlocked: true \}\)/, "Luna phải tự mở báo cáo sau khi tổng hợp.");
assert.match(app, /function exportDailyWorkReportPdf\(existingWindow = null[\s\S]*?resolveWorkReportWindow\(existingWindow, quietOnBlocked\)/, "Báo cáo ngày phải dùng lại popup Luna đã mở trước.");
assert.match(app, /function exportWeeklyWorkReportPdf\(existingWindow = null[\s\S]*?resolveWorkReportWindow\(existingWindow, quietOnBlocked\)/, "Báo cáo tuần phải dùng lại popup Luna đã mở trước.");
assert.match(app, /async function exportMonthlyWorkReportPdf\(existingWindow = null[\s\S]*?resolveWorkReportWindow\(existingWindow, quietOnBlocked\)/, "Báo cáo tháng phải dùng lại popup Luna đã mở trước.");
assert.match(app, /window\.openAssistantWorkReport = async \(kind, existingWindow = null, options = \{\}\)/, "Ứng dụng phải cung cấp luồng xuất dùng chung cho Luna.");
assert.equal((html.match(/class="assistant-quick-icon"/g) || []).length, 6, "Các tác vụ nhanh trong ảnh phải dùng sáu icon gọn, gồm Mẫu văn bản.");
assert.match(html, /aria-label="Thông báo toàn Ban" title="Thông báo toàn Ban"[\s\S]*?icon-megaphone/, "Icon thông báo toàn Ban phải giữ nhãn truy cập và tooltip rõ nghĩa.");
assert.match(assistant, /data-assistant-open-task/, "Nguồn công việc phải mở lại được hồ sơ được phép xem.");

assert.match(worker, new RegExp(`const RELEASE_VERSION = "${appVersion}"`), "Service worker phải phát hành cache mới.");
assert.match(app, new RegExp(`const APP_VERSION = "${appVersion}"`), "Ứng dụng phải cùng phiên bản phát hành.");

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

const scheduledAt = Date.now() + 5000;
let scheduledDelay = 0;
let scheduledCallback = null;
let wakeRenderCount = 0;
const wakeRuntime = {
  lunaAnnouncementWakeTimer: 0,
  window: {
    clearTimeout() {},
    setTimeout(callback, delay) { scheduledCallback = callback; scheduledDelay = delay; return 1; },
  },
  currentAccount: () => ({ id: "account-1" }),
  document: { hidden: false },
  notificationCurrentAccountId: () => "account-1",
  state: { notifications: [{ recipientAccountId: "account-1", targetType: "luna-announcement", scheduledAt: new Date(scheduledAt).toISOString() }] },
  notificationCenter: { localItems: [] },
  Date,
  Math,
  renderNotificationCenter() { wakeRenderCount += 1; },
};
vm.createContext(wakeRuntime);
vm.runInContext(getFunction("scheduleLunaAnnouncementWake"), wakeRuntime);
wakeRuntime.scheduleLunaAnnouncementWake();
assert.ok(scheduledDelay >= 4500 && scheduledDelay <= 5300, "Máy khách phải đặt bộ hẹn giờ dựa trên thông báo đã lưu trong tài khoản.");
wakeRuntime.document.hidden = true;
scheduledCallback();
assert.equal(wakeRenderCount, 0, "Tab ẩn không được đánh dấu hoặc phát toast mà người dùng không nhìn thấy.");
assert.match(app, new RegExp(`const APP_VERSION = "${appVersion}"`));

console.log("luna_enhancements=passed");
