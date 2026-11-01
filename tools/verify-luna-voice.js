const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const assistant = fs.readFileSync("virtual-assistant.js", "utf8");
const app = fs.readFileSync("script.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const assistantCss = fs.readFileSync("virtual-assistant.css", "utf8");
const server = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");

assert.match(assistant, /window\.SpeechRecognition \|\| window\.webkitSpeechRecognition/, "Nhận dạng ưu tiên API có sẵn của Chrome, Edge và Safari.");
assert.match(assistant, /engine\.lang = "vi-VN"[\s\S]*?engine\.continuous = false[\s\S]*?engine\.interimResults = true[\s\S]*?engine\.onresult[\s\S]*?engine\.onerror[\s\S]*?engine\.onend/, "Nhận dạng phải theo từng lượt, có bản nháp, xử lý lỗi và dọn trạng thái kết thúc.");
assert.match(assistant, /new window\.SpeechSynthesisUtterance\(text\)[\s\S]*?window\.speechSynthesis\.speak\(utterance\)/, "Luna phải đọc bằng giọng có sẵn trên thiết bị.");
assert.match(assistant, /function finishVoiceCapture\(capture\)[\s\S]*?handleTaskWizardTranscript\(transcript, accountId\)[\s\S]*?submitVoiceTranscript\(transcript, accountId\)/, "Bản nhận dạng phải quay lại luồng trợ lý hoặc hướng dẫn theo bước hiện hữu.");
assert.doesNotMatch(assistant, /MediaRecorder|luna-transcribe|luna-synthesize|speechAudioObjectUrl/);
assert.match(assistant, /speechQueue\.push\(\{ text, kind, onEnd, announcementId \}\)/);
assert.match(assistant, /function stopLunaSpeech/);
assert.doesNotMatch(server, /action === "luna-transcribe"|action === "luna-synthesize"/, "Máy chủ không còn xử lý hoặc lưu chuyển âm thanh của Luna.");
assert.match(assistant, /"language-not-supported"[\s\S]*?"no-speech"/, "Lỗi nhận dạng tiếng Việt và trường hợp không nghe thấy phải có hướng dẫn nhập chữ.");
assert.match(assistant, /const isSafari = \/Safari\/i[\s\S]*?Siri\/Đọc chính tả/, "Safari phải nhận được hướng dẫn đúng khi thiếu dịch vụ nhận dạng.");
assert.match(html, /id="lunaSpeechEnabled" type="checkbox" checked/);
assert.match(html, /id="lunaAnnouncementSpeechEnabled" type="checkbox" checked/, "Đọc thông báo phải bật mặc định và có công tắc tắt riêng trong Luna.");
assert.match(html, /id="lunaWakeWordEnabled" type="checkbox" disabled/, "Chế độ nghe nền phải tắt để không giữ micro thường trực.");
const settingsStart = html.indexOf('<details id="assistantSettings"');
const settingsEnd = html.indexOf("</details>", settingsStart);
assert.ok(settingsStart >= 0 && settingsEnd > settingsStart, "Thiết lập Luna phải nằm trong menu bánh răng thu gọn.");
const settingsMarkup = html.slice(settingsStart, settingsEnd);
for (const controlId of ["lunaWakeWordEnabled", "lunaAnnouncementSpeechEnabled", "lunaProactiveEnabled", "lunaSpeechEnabled", "lunaQuietHoursEnabled", "lunaQuietHoursStart", "lunaQuietHoursEnd"]) {
  assert.ok(settingsMarkup.includes(`id="${controlId}"`), `${controlId} phải nằm trong Thiết lập Luna.`);
}
assert.match(html, /summary aria-label="Thiết lập Luna"[\s\S]*?assistant-settings-icon[\s\S]*?icon-settings/, "Nút thiết lập cần dùng biểu tượng bánh răng và tên truy cập rõ ràng.");
assert.doesNotMatch(html, /id="assistantCreateTask"|<button[^>]*>Tạo việc<\/button>/, "Lối tắt Tạo việc không còn xuất hiện trong hộp thoại Luna.");
assert.match(assistant, /function startTaskWizard\(\)[\s\S]*?canCreateRegularTasks\(\)/, "Luồng tạo việc qua yêu cầu hội thoại vẫn phải kiểm tra quyền.");
assert.match(assistant, /function syncWakePreference[\s\S]*?wakeListeningEnabled = false[\s\S]*?microphoneSecureContext\(\)/, "Chế độ nghe nền phải tắt; quyền micro chỉ dùng khi người dùng bấm Nói.");
assert.doesNotMatch(assistant, /activeRecognition\.continuous\s*=\s*true/, "Không giữ micro mở để nhận dạng nền liên tục.");
assert.match(assistant, /function respondToWakePhrase[\s\S]*?const greeting = "Dạ, có em đây ạ"[\s\S]*?Bấm Nói để tiếp tục trao đổi bằng giọng nói/, "Sau lời gọi Luna, người dùng được hướng dẫn bấm Nói để tiếp tục, không giữ micro nền.");
assert.match(assistant, /function wakePhraseRemainder[\s\S]*?Luna\(\?:\\s\+ơi\)\?/, "Wake phrase cần nhận dạng Luna ơi và giữ lại phần yêu cầu nói liền sau đó.");
assert.match(assistant, /function speakLunaText[\s\S]*?speechQueue\.push\(\{ text, kind, onEnd, announcementId \}\)[\s\S]*?playNextLunaSpeech\(\)/, "Thông báo đến khi tab nền phải được xếp hàng để đọc khi người dùng quay lại.");
assert.match(assistant, /if \(!queuedSpeech\) \{\s*if \(wakePausedForSpeech \|\| wakeListeningEnabled\) \{[\s\S]*?scheduleWakeListener\(180\)/, "Khi đọc xong hoặc dừng tiếng, Luna phải tự quay lại trạng thái chờ từ khóa.");
assert.match(assistant, /interruptedAnnouncements\.push\(\.\.\.speechQueue\.filter\(\(item\) => item\.kind === "announcement"\)\)[\s\S]*?speechQueue\.push\(item\)/, "Thông báo đang đọc dở phải được đọc tiếp khi tab hiện lại.");
assert.match(assistant, /document\.hidden\) \{[\s\S]*?stopWakeRecognition\(\)[\s\S]*?\}\s*else\s*\{[\s\S]*?playNextLunaSpeech\(\)[\s\S]*?scheduleWakeListener/, "Micro phải tạm dừng ở tab nền và khôi phục nghe/đọc ở tab đang mở.");
assert.match(html, /id="lunaSpeechStop"/);
const taskFormMarkup = html.match(/<form id="taskForm"[\s\S]*?<\/form>/)?.[0] || "";
assert.doesNotMatch(taskFormMarkup, /taskVoiceWizard/, "Khung Luna đồng hành không được nằm thành một thẻ riêng trong form công việc.");
assert.match(html, /<aside id="taskVoiceWizard" class="task-wizard-bubble is-hidden"/, "Luồng tạo việc phải dùng bong bóng hội thoại tích hợp cạnh nhân vật Luna.");
assert.doesNotMatch(html, /id="taskVoiceWizardTitle"|task-wizard-bubble-progress/, "Bong bóng không hiển thị dòng chỉ số bước theo yêu cầu.");
assert.match(html, /id="taskWizardConversation" class="task-wizard-conversation"/, "Luna cần hiển thị lịch sử hội thoại từng bước.");
assert.match(html, /id="taskWizardReplyForm" class="task-wizard-reply-form"/, "Người dùng cần trả lời bằng chữ ngay trong cuộc hội thoại với Luna.");
assert.match(html, /id="taskVoiceWizardSpeak"/, "Người dùng cần nút ghi nhận câu trả lời bằng giọng nói trong bong bóng Luna.");
assert.match(assistant, /function startTaskWizard\(\)[\s\S]*?canCreateRegularTasks\(\)[\s\S]*?trigger\.click\(\)[\s\S]*?buildTaskWizardSteps\(\)[\s\S]*?root\.classList\.add\("is-task-wizard"\)/, "Luna phải kiểm tra quyền, mở biểu mẫu thật rồi bắt đầu hội thoại tại nhân vật.");
assert.match(assistant, /function positionTaskWizardBubble\(\)/, "Bong bóng cần được neo và bố trí cạnh nhân vật Luna.");
assert.match(assistant, /container\.scrollIntoView\?\.\(\{ behavior: "smooth", block: "center" \}\)/, "Trường đang được Luna hỏi phải được căn trong vùng nhìn thấy để thao tác được.");
assert.match(assistant, /\.task-form-modal"\)\?\.addEventListener\("scroll"[\s\S]*?positionTaskWizardBubble/, "Vị trí bong bóng phải cập nhật khi popup biểu mẫu cuộn.");
assert.match(assistantCss, /\.virtual-assistant\.is-task-wizard \.assistant-launcher\s*\{\s*z-index:\s*10000012;/, "Khi popup tạo việc mở, Luna phải nổi trên lớp popup và vẫn nhìn thấy.");
assert.match(assistantCss, /\.task-wizard-bubble\s*\{[\s\S]*?pointer-events:\s*auto/, "Bong bóng hội thoại cần thao tác được dù vùng chứa Luna không nhận pointer.");
assert.match(assistantCss, /\.assistant-panel-heading\s*\{[\s\S]*?grid-template-columns:\s*32px minmax\(0, 1fr\)/, "Bánh răng thiết lập phải nằm gọn ở góc trên trái cạnh tiêu đề.");
assert.doesNotMatch(html, /assistantAccountContext|Tra cứu chỉ trong phạm vi dữ liệu tài khoản/, "Dòng mô tả dưới tên Luna đã được bỏ.");
assert.match(html, /<div class="assistant-panel-titleline">\s*<p class="assistant-eyebrow">TRỢ LÝ ẢO<\/p>\s*<div class="assistant-character-status" data-state="idle">[\s\S]*?id="assistantStateLabel"[\s\S]*?<\/div>\s*<h2 id="assistantTitle">Luna<\/h2>/, "Trạng thái Luna phải nằm bên phải nhãn trợ lý, cùng hàng tiêu đề.");
assert.match(assistant, /const status = root\.querySelector\("\.assistant-character-status"\);\s*if \(status\) status\.dataset\.state = visualState;/, "Các trạng thái động phải tiếp tục cập nhật trên dòng trạng thái mới.");
assert.match(assistantCss, /\.assistant-character-status\[data-state="thinking"\][\s\S]*?\.assistant-character-status\[data-state="speaking"\][\s\S]*?\.assistant-character-status\[data-state="listening"\][\s\S]*?\.assistant-character-status\[data-state="speaking"\]/, "Màu trạng thái và sóng âm phải hoạt động tại vị trí mới.");
assert.match(assistantCss, /\.assistant-settings-popover\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?max-height:[\s\S]*?overflow:\s*auto;/, "Thiết lập xổ ra thành bảng gọn, cuộn được trên màn hình thấp.");
assert.match(assistantCss, /\.assistant-panel-titleline\s*\{[\s\S]*?justify-content:\s*space-between;[\s\S]*?min-width:\s*0;/, "Tiêu đề và trạng thái phải căn hai phía, co giãn an toàn.");
assert.match(assistantCss, /\.assistant-voice-controls label\s*\{[\s\S]*?background:\s*#fff;[\s\S]*?border:\s*1px solid/, "Công tắc Luna phải có vùng bấm rõ ràng, thống nhất với giao diện.");
assert.match(assistantCss, /\.assistant-message\.is-assistant\.is-rich\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*100%;/, "Kết quả dạng danh sách cần sử dụng toàn bộ chiều ngang hộp thoại.");
assert.match(assistantCss, /@media \(max-width: 520px\)\s*\{[\s\S]*?\.assistant-quick-actions\s*\{\s*grid-template-columns:\s*repeat\(6, minmax\(36px, 40px\)\);/, "Các icon tác vụ mobile phải giữ kích thước chạm ổn định và không tràn hàng.");
assert.match(assistant, /function openModuleFromCommand\(raw\)[\s\S]*?canAccessView\(module\.id\)[\s\S]*?navigationButton\.click\(\)/, "Luna phải kiểm tra quyền hiện hành trước khi chuyển sang một mục.");
assert.match(assistant, /if \(openModuleFromCommand\(raw\)\) return;/, "Lệnh mở mục phải được xử lý trước truy vấn tìm kiếm chung.");
assert.match(assistant, /if \(pendingSpeechItem\?\.kind === kind\) pendingSpeechItem = null;/, "Tắt đọc thông báo phải hủy cả lời đọc đang chờ nhận dạng kết thúc.");
assert.match(assistant, /event\.error === "not-allowed"[\s\S]*?finish\(\{ retry: true \}\)/, "Giọng đọc bị trình duyệt chặn phải được thử lại sau thao tác người dùng.");
assert.match(assistant, /taskWizardReplyForm\.addEventListener\("submit", submitTaskWizardReply\)/, "Luna cần nhận câu trả lời nhập bằng bàn phím.");
assert.match(assistant, /if \(taskWizard\.active\) mode = "task-wizard"/, "Nút nói chung phải chuyển câu trả lời vào bước Luna đang hỏi.");
assert.match(assistant, /const manual = taskWizard\.index === 0[\s\S]*?step\.question\.includes\("\{manual\}"\)/, "Cách trả lời bằng giọng nói hoặc biểu mẫu chỉ được nhắc lúc bắt đầu.");
assert.match(assistant, /confirmsCurrentChoice[\s\S]*?taskOwnerChoice[\s\S]*?taskStatusChoice[\s\S]*?advanceTaskWizardStep\(\)/, "Click lại lựa chọn radio mặc định vẫn phải được ghi nhận và chuyển bước.");
assert.match(assistant, /function presentQuickNotice\(notice\)[\s\S]*?quickNotice\.classList\.remove\("is-hidden"\)[\s\S]*?speakLunaText\(quickNoticeText\?\.textContent/, "Thông báo chủ động phải hiện hội thoại đồng thời được đọc thành tiếng.");
assert.match(app, /const taskStatuses = \[TASK_STATUS_PREPARING, "Đang thực hiện", "Hoàn thành", "Quá hạn"\]/, "Không hiển thị trạng thái Đã ngừng thành một cột riêng trên bảng mặc định.");
assert.match(app, /filter === TASK_STATUS_RECURRENCE_STOPPED \? \[TASK_STATUS_RECURRENCE_STOPPED\] : taskStatuses/, "Vẫn có thể tra cứu các việc đã ngừng qua bộ lọc chủ động.");
assert.match(assistant, /function buildTaskWizardSteps\(\)[\s\S]*?key: "title"[\s\S]*?key: "project"[\s\S]*?key: "owner"[\s\S]*?key: "category"[\s\S]*?key: "collaborators"[\s\S]*?key: "workType"[\s\S]*?key: "priority"[\s\S]*?key: "recurrence"[\s\S]*?key: "startDate"[\s\S]*?key: "due"[\s\S]*?key: "status"[\s\S]*?key: "progress"[\s\S]*?key: "attachments"[\s\S]*?key: "note"[\s\S]*?key: "followUp"[\s\S]*?key: "blockerStatus"[\s\S]*?key: "dependencies"[\s\S]*?key: "blockerNote"/, "Luna phải hỏi tuần tự các trường công việc và thông tin điều hành.");
assert.match(assistant, /engine\.onend = \(\) => finishVoiceCapture\(capture\)/);
assert.match(assistant, /else if \(mode === "task-wizard"\) handleTaskWizardTranscript\(transcript, accountId\)/, "Câu trả lời ở bước hướng dẫn phải đi vào đúng trường hiện tại, không gửi như lệnh tìm kiếm.");
assert.match(assistant, /taskWizard\.awaitingConfirmation\) return;[\s\S]*?event\.preventDefault\(\)[\s\S]*?prepareTaskWizardConfirmation\(\)/, "Không được lưu sớm khi người dùng chưa tới bước xác nhận cuối.");
assert.match(assistant, /if \(confirmation === "yes"\)[\s\S]*?taskWizard\.form\.requestSubmit\(\)/, "Chỉ câu trả lời khẳng định ở bước cuối mới gửi biểu mẫu hiện hành qua luồng lưu chuẩn.");
assert.match(assistant, /keepTaskWizardDraftUnsaved\([\s\S]*?Dạ, em chưa lưu/, "Từ chối lưu phải giữ nguyên biểu mẫu dưới dạng bản nháp chưa lưu.");
assert.match(assistant, /data-assistant-confirm-task/);
assert.doesNotMatch(assistant + server, /MediaRecorder|luna-transcribe|luna-synthesize|AZURE_SPEECH_KEY/);
assert.doesNotMatch(assistant + app, /virtualAssistantTranscribeAudio/);

for (const [start, next] of [
  ["function draftDate(value)", "function uniqueDraftMatch(items, query, getName)"],
  ["function uniqueDraftMatch(items, query, getName)", "function takeTaskClause(source, labelPattern)"],
  ["function takeTaskClause(source, labelPattern)", "function createTaskDraft(raw, createMatch)"],
  ["function createTaskDraft(raw, createMatch)", "function showTaskDraftPreview(draft)"],
]) {
  assert.ok(assistant.includes(start), `Missing ${start}`);
  assert.ok(assistant.indexOf(next, assistant.indexOf(start)) > assistant.indexOf(start), `Missing boundary ${next}`);
}

const extract = (start, next) => assistant.slice(assistant.indexOf(start), assistant.indexOf(next, assistant.indexOf(start))).trim();
let gestureSpeechPlayCount = 0;
const gestureRuntime = {
  speechWaitingForGesture: true,
  speechRetryItem: { text: "Em chào anh ạ", kind: "announcement", gestureRetryCount: 1 },
  speechQueue: [],
  currentAccount: () => ({ id: "account-1" }),
  voiceNotice: { textContent: "" },
  playNextLunaSpeech: () => { gestureSpeechPlayCount += 1; },
};
vm.createContext(gestureRuntime);
vm.runInContext(extract("function retrySpeechAfterUserGesture(event)", "function playNextLunaSpeech()"), gestureRuntime);
gestureRuntime.retrySpeechAfterUserGesture({ type: "pointerdown", isTrusted: false });
assert.equal(gestureRuntime.speechWaitingForGesture, true, "Sự kiện giả lập không được mở khóa phát âm thanh.");
gestureRuntime.retrySpeechAfterUserGesture({ type: "keydown", key: "a", isTrusted: true });
assert.equal(gestureRuntime.speechWaitingForGesture, true, "Gõ phím thường không tự kích hoạt lời đọc bị chặn.");
gestureRuntime.retrySpeechAfterUserGesture({ type: "pointerdown", isTrusted: true });
assert.equal(gestureRuntime.speechWaitingForGesture, false);
assert.equal(gestureRuntime.speechQueue[0].text, "Em chào anh ạ");
assert.equal(gestureSpeechPlayCount, 1);
const promptRuntime = { taskWizard: { index: 0 }, taskWizardAddress: () => "anh" };
vm.createContext(promptRuntime);
vm.runInContext(extract("function taskWizardPromptFor(step)", "function askTaskWizardStep()"), promptRuntime);
const initialPrompt = promptRuntime.taskWizardPromptFor({ question: "Tên công việc mình cần tạo là gì ạ?" });
assert.match(initialPrompt, /giọng nói hoặc thao tác trực tiếp trên biểu mẫu/);
promptRuntime.taskWizard.index = 1;
assert.doesNotMatch(promptRuntime.taskWizardPromptFor({ question: "Mời {address} chọn dự án ạ. {manual}" }), /giọng nói hoặc thao tác trực tiếp/);
const parserRuntime = {
  Date,
  normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/\s+/g, " ").trim();
  },
  window: { crypto: { randomUUID: () => "draft-voice-test" } },
  state: { people: [
    { id: "owner-1", name: "Nguyễn An" },
    { id: "person-2", name: "Trần Bình" },
    { id: "person-3", name: "Lê Hoa" },
  ] },
  canCreateRegularTaskForPerson: (id) => ["owner-1", "person-2", "person-3"].includes(String(id)),
  currentPerson: () => ({ id: "owner-1", name: "Nguyễn An" }),
  taskCategoryOptionsForPerson: () => ["Quản lý hạ tầng"],
  visiblePeopleForTasks: () => parserRuntime.state.people,
  currentTasks: () => [],
  searchProjects: (query) => query === "Tuyến đường Phúc Thịnh" ? [{ id: "project-1", name: query }] : [],
};
vm.createContext(parserRuntime);
vm.runInContext([
  extract("function draftDate(value)", "function uniqueDraftMatch(items, query, getName)"),
  extract("function uniqueDraftMatch(items, query, getName)", "function takeTaskClause(source, labelPattern)"),
  extract("function takeTaskClause(source, labelPattern)", "function createTaskDraft(raw, createMatch)"),
  extract("function createTaskDraft(raw, createMatch)", "function showTaskDraftPreview(draft)"),
].join("\n"), parserRuntime);

const transcript = "Tạo công việc: Chuẩn bị hồ sơ nghiệm thu, dự án Tuyến đường Phúc Thịnh, giao cho Nguyễn An, phối hợp Trần Bình và Lê Hoa, danh mục nhiệm vụ Quản lý hạ tầng, loại công việc phát sinh, ưu tiên cao, định kỳ hàng tuần, bắt đầu ngày mai, hạn 30/10/2026, nội dung Tổng hợp hồ sơ và biên bản";
const createMatch = transcript.match(/(?:hãy\s+)?(?:tạo|thêm)\s+(?:một\s+)?(?:công việc|việc)\s*(?::|là|-)?\s*(.*)/i);
const draft = parserRuntime.createTaskDraft(transcript, createMatch);
assert.equal(draft.title, "Chuẩn bị hồ sơ nghiệm thu");
assert.equal(draft.projectId, "project-1");
assert.equal(draft.ownerId, "owner-1");
assert.deepEqual(Array.from(draft.collaboratorIds), ["person-2", "person-3"]);
assert.equal(draft.category, "Quản lý hạ tầng", JSON.stringify(draft));
assert.equal(draft.workType, "arising");
assert.equal(draft.priority, "high");
assert.equal(draft.recurrence, "weekly");
assert.equal(draft.due, "2026-10-30");
assert.equal(draft.note, "Tổng hợp hồ sơ và biên bản");

const dateDraft = parserRuntime.draftDate("ngày 8 tháng 11 năm 2026");
assert.equal(dateDraft, "2026-11-08");

const intentRuntime = { normalize: parserRuntime.normalize };
vm.createContext(intentRuntime);
vm.runInContext(extract("function isGenericTaskCreationIntent(text)", "function uniqueDraftMatch(items, query, getName)"), intentRuntime);
for (const phrase of ["Luna ơi, tạo công việc mới giúp tôi", "giúp tôi tạo công việc mới", "tôi muốn tạo công việc mới", "tạo công việc", "tạo việc giúp tôi"]) {
  assert.equal(intentRuntime.isGenericTaskCreationIntent(phrase), true, `Câu yêu cầu chung phải mở phiên tạo việc: ${phrase}`);
}
assert.equal(intentRuntime.isGenericTaskCreationIntent("Tạo công việc: Kiểm tra hồ sơ, hạn 30/10/2026"), false, "Yêu cầu có dữ liệu chi tiết vẫn phải giữ luồng xem trước hiện có.");

function extractAssistantFunction(name, nextName) {
  const start = assistant.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, `Thiếu hàm ${name}`);
  const end = assistant.indexOf(`\n  function ${nextName}(`, start + 1);
  assert.ok(end > start, `Thiếu ranh giới hàm ${nextName}`);
  return assistant.slice(start, end);
}

let browserRecognition;
class MockSpeechRecognition {
  constructor() { browserRecognition = this; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
  abort() { this.aborted = true; }
}
const recognitionRuntime = {
  activeAccountId: "account-1",
  currentAccount: () => ({ id: "account-1" }),
  taskWizard: { active: false },
  currentMood: { label: "Sẵn sàng hỗ trợ" },
  window: {
    isSecureContext: true,
    location: { hostname: "example.test" },
    SpeechRecognition: MockSpeechRecognition,
    setTimeout: () => 7,
    clearTimeout() {},
  },
  navigator: { userAgent: "Chrome" },
  stopWakeRecognition() {},
  stopLunaSpeech() {},
  setVoiceButtonMode(mode) { recognitionRuntime.buttonMode = mode; },
  setState(name) { recognitionRuntime.state = name; },
  taskVoiceWizardSpeak: { textContent: "" },
  voiceNotice: { textContent: "" },
  taskVoiceWizardStatus: { textContent: "" },
  voiceRecognitionTimer: 0,
  recognition: null,
  voiceCaptureMode: "assistant",
  submitVoiceTranscript(transcript) { recognitionRuntime.submitted = transcript; },
  handleTaskWizardTranscript(transcript) { recognitionRuntime.wizardTranscript = transcript; },
  wakePhraseRemainder: () => null,
  flushPendingSpeech() {},
  speechActive: false,
  setAssistantExpression() {},
};
vm.createContext(recognitionRuntime);
const voiceFunctionsStart = assistant.indexOf("  function startVoiceCapture(");
const voiceFunctionsEnd = assistant.indexOf("  taskWizardReplyForm.addEventListener", voiceFunctionsStart);
assert.ok(voiceFunctionsStart >= 0 && voiceFunctionsEnd > voiceFunctionsStart);
vm.runInContext(assistant.slice(voiceFunctionsStart, voiceFunctionsEnd), recognitionRuntime);
recognitionRuntime.startVoiceCapture("assistant");
assert.equal(browserRecognition.started, true, "Nhận dạng native phải chỉ bắt đầu sau thao tác Nói.");
assert.equal(browserRecognition.lang, "vi-VN");
assert.equal(browserRecognition.continuous, false, "Mỗi lượt nói cần tự kết thúc, không giữ micro nền.");
browserRecognition.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "mở mục công việc" } }] });
browserRecognition.onend();
assert.equal(recognitionRuntime.submitted, "mở mục công việc", "Kết quả nhận dạng phải vào đúng luồng xử lý lệnh hiện hữu.");
assert.equal(recognitionRuntime.buttonMode, "idle");
recognitionRuntime.startVoiceCapture("assistant");
browserRecognition.onresult({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: "cập nhật" } }] });
recognitionRuntime.recognition.error = "network";
browserRecognition.onend();
assert.equal(recognitionRuntime.submitted, "mở mục công việc", "Không gửi mảnh nhận dạng tạm khi dịch vụ báo lỗi.");
assert.match(recognitionRuntime.voiceNotice.textContent, /không kết nối được/);
recognitionRuntime.taskWizard.active = true;
recognitionRuntime.startVoiceCapture("assistant");
browserRecognition.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "Hoàn thành" } }] });
browserRecognition.onend();
assert.equal(recognitionRuntime.wizardTranscript, "Hoàn thành", "Trong hướng dẫn, câu nói phải đi vào trường đang được Luna hỏi.");

const navigationRuntime = {
  normalize: parserRuntime.normalize,
  systemModules: [
    { id: "dashboard", label: "Tổng quan" },
    { id: "bulletin", label: "Bảng tin" },
    { id: "people", label: "Nhân sự" },
    { id: "tasks", label: "Công việc" },
    { id: "calendar", label: "Lịch công việc" },
    { id: "accounts", label: "Tài khoản" },
    { id: "system-settings", label: "Cấu hình hệ thống" },
  ],
  allowedModules: new Set(["people", "calendar"]),
  messages: [],
  navClicks: [],
  canAccessView: (id) => navigationRuntime.allowedModules.has(id),
  appendMessage: (_kind, message) => navigationRuntime.messages.push(message),
  document: {
    querySelectorAll() {
      return navigationRuntime.systemModules.map((module) => ({
        dataset: { view: module.id },
        disabled: false,
        classList: { contains: () => false },
        click() { navigationRuntime.navClicks.push(module.id); },
      }));
    },
  },
};
vm.createContext(navigationRuntime);
vm.runInContext([
  extractAssistantFunction("parseModuleNavigationCommand", "openModuleFromCommand"),
  extractAssistantFunction("openModuleFromCommand", "searchBulletins"),
].join("\n"), navigationRuntime);
assert.equal(navigationRuntime.openModuleFromCommand("Luna ơi, mở mục Nhân sự giúp tôi"), true);
assert.deepEqual(Array.from(navigationRuntime.navClicks), ["people"]);
assert.equal(navigationRuntime.openModuleFromCommand("vào lịch làm việc nhé"), true);
assert.deepEqual(Array.from(navigationRuntime.navClicks), ["people", "calendar"]);
assert.equal(navigationRuntime.openModuleFromCommand("chuyển sang mục Tài khoản"), true);
assert.deepEqual(Array.from(navigationRuntime.navClicks), ["people", "calendar"], "Mục không có quyền phải không được mở.");
assert.match(navigationRuntime.messages.at(-1), /chưa được cấp quyền truy cập mục Tài khoản/);
assert.equal(navigationRuntime.openModuleFromCommand("mở Cấu hình hệ thống"), true);
assert.deepEqual(Array.from(navigationRuntime.navClicks), ["people", "calendar"], "Cấu hình hệ thống phải tiếp tục bị chặn với tài khoản không phải admin.");
navigationRuntime.allowedModules.add("system-settings");
assert.equal(navigationRuntime.openModuleFromCommand("cho tôi vào mục Cấu hình hệ thống"), true);
assert.deepEqual(Array.from(navigationRuntime.navClicks), ["people", "calendar", "system-settings"]);
assert.equal(navigationRuntime.openModuleFromCommand("mở thông báo"), false, "Lệnh thông báo hiện hữu không được hiểu nhầm thành điều hướng module.");

const speechRuntime = {
  speechToggle: { checked: true },
  announcementSpeechToggle: { checked: true },
  pendingSpeechItem: { kind: "announcement", text: "Thông báo đang chờ" },
  speechQueue: [{ kind: "announcement", text: "Thông báo trong hàng đợi" }, { kind: "assistant", text: "Câu trả lời" }],
  speechRetryItem: { kind: "announcement", text: "Thông báo cần thao tác" },
  speechWaitingForGesture: true,
  speechActive: true,
  speechActiveKind: "announcement",
  speechPlaybackSequence: 1,
  wakePausedForSpeech: false,
  activeSpeechUtterance: {},
  speechPlaybackWatchdog: 12,
  speechStopButton: { classList: { add() {} } },
  window: { setTimeout() {}, clearTimeout() {}, speechSynthesis: { cancel() { speechRuntime.cancelCount += 1; } } },
  cancelCount: 0,
  playNextLunaSpeech() {},
  scheduleWakeListener() {},
};
vm.createContext(speechRuntime);
vm.runInContext([
  extractAssistantFunction("speechChannelEnabled", "speakLunaText"),
  extractAssistantFunction("removeQueuedSpeechKind", "retrySpeechAfterUserGesture"),
].join("\n"), speechRuntime);
assert.equal(speechRuntime.speechChannelEnabled("announcement"), true);
speechRuntime.announcementSpeechToggle.checked = false;
assert.equal(speechRuntime.speechChannelEnabled("announcement"), false, "Khi bỏ tích, Luna không được đọc thông báo.");
assert.equal(speechRuntime.speechChannelEnabled("assistant"), true, "Cài đặt đọc câu trả lời vẫn độc lập.");
speechRuntime.cancelSpeechKind("announcement");
assert.equal(speechRuntime.pendingSpeechItem, null);
assert.deepEqual(Array.from(speechRuntime.speechQueue, (item) => item.kind), ["assistant"]);
assert.equal(speechRuntime.speechRetryItem, null);
assert.equal(speechRuntime.speechWaitingForGesture, false);
assert.equal(speechRuntime.speechActive, false);
assert.equal(speechRuntime.cancelCount, 1, "Giọng đọc native đang phát phải dừng ngay khi tắt công tắc.");

const confirmationRuntime = { normalize: parserRuntime.normalize };
vm.createContext(confirmationRuntime);
vm.runInContext(extract("function taskWizardConfirmationIntent(value)", "function uniqueDraftMatch(items, query, getName)"), confirmationRuntime);
assert.equal(confirmationRuntime.taskWizardConfirmationIntent("Vâng ạ, em lưu giúp tôi"), "yes");
assert.equal(confirmationRuntime.taskWizardConfirmationIntent("Có, lưu giúp tôi"), "yes");
assert.equal(confirmationRuntime.taskWizardConfirmationIntent("Không, để tôi sửa lại"), "no");
assert.equal(confirmationRuntime.taskWizardConfirmationIntent("Đồng ý"), "yes");
assert.equal(confirmationRuntime.taskWizardConfirmationIntent("Tôi đang kiểm tra"), "");

const makeField = (value = "", options = []) => ({ value, options, disabled: false, dispatchEvent() {} });
const wizardBoxes = [
  { value: "person-2", checked: false, closest: () => ({ textContent: "Trần Bình" }) },
  { value: "person-3", checked: false, closest: () => ({ textContent: "Lê Hoa" }) },
];
const wizardFields = {
  taskTitle: makeField(),
  taskOwner: makeField("", [{ value: "owner-1", textContent: "Nguyễn An", disabled: false }]),
  taskProjectId: makeField("", [
    { value: "", textContent: "Chưa chọn", disabled: false },
    { value: "project-1", textContent: "Tuyến đường Phúc Thịnh", disabled: false },
    { value: "project-2", textContent: "Dự án trường học", disabled: false },
    { value: "project-3", textContent: "Tuyến đường Phúc Thịnh giai đoạn 2", disabled: false },
  ]),
  taskWorkType: makeField("", [
    { value: "routine", textContent: "Công việc thường xuyên", disabled: false },
    { value: "arising", textContent: "Công việc phát sinh", disabled: false },
  ]),
  taskPriority: makeField("", [
    { value: "normal", textContent: "Bình thường", disabled: false },
    { value: "high", textContent: "Cao", disabled: false },
    { value: "urgent", textContent: "Khẩn", disabled: false },
  ]),
  taskDue: makeField(),
  taskCollaborators: { dispatchEvent() {} },
};
const wizardRuntime = {
  Date,
  Event: class Event {},
  taskWizard: { mode: "create", kind: "regular" },
  normalize: parserRuntime.normalize,
  currentPerson: () => ({ id: "owner-1", name: "Nguyễn An" }),
  canCreateRegularTaskForPerson: (id) => String(id) === "owner-1",
  document: {
    getElementById: (id) => wizardFields[id],
    querySelectorAll: (selector) => selector === "#taskCollaborators input[type=\"checkbox\"]" ? wizardBoxes : [],
  },
};
vm.createContext(wizardRuntime);
vm.runInContext([
  extract("function draftDate(value)", "function taskWizardAddress()"),
  extract("function taskWizardField(step)", "function buildTaskWizardSteps()"),
  extract("function uniqueDraftMatch(items, query, getName)", "function takeTaskClause(source, labelPattern)"),
  extract("function taskWizardSelectOption(select, answer)", "function applyTaskWizardAnswer(step, transcript)"),
  extract("function applyTaskWizardAnswer(step, transcript)", "function handleTaskWizardTranscript(transcript, accountId)"),
].join("\n"), wizardRuntime);
assert.equal(wizardRuntime.applyTaskWizardAnswer({ key: "title" }, "Kiểm tra hồ sơ"), true);
assert.equal(wizardFields.taskTitle.value, "Kiểm tra hồ sơ");
assert.equal(wizardRuntime.applyTaskWizardAnswer({ key: "project" }, "Tuyến đường Phúc Thịnh"), true);
assert.equal(wizardFields.taskProjectId.value, "project-1");
assert.equal(wizardRuntime.applyTaskWizardAnswer({ key: "workType" }, "Công việc phát sinh"), true);
assert.equal(wizardFields.taskWorkType.value, "arising");
assert.equal(wizardRuntime.applyTaskWizardAnswer({ key: "priority" }, "Cao"), true);
assert.equal(wizardFields.taskPriority.value, "high");
assert.equal(wizardRuntime.applyTaskWizardAnswer({ key: "due" }, "ngày 30 tháng 10 năm 2026"), true);
assert.equal(wizardFields.taskDue.value, "2026-10-30");
assert.equal(wizardRuntime.applyTaskWizardAnswer({ key: "collaborators" }, "chị Trần Bình và anh Lê Hoa"), true);
assert.deepEqual(wizardBoxes.map((box) => box.checked), [true, true]);
assert.equal(wizardRuntime.applyTaskWizardAnswer({ key: "collaborators" }, "Không có người phối hợp ạ"), true);
assert.deepEqual(wizardBoxes.map((box) => box.checked), [false, false]);
assert.equal(wizardRuntime.applyTaskWizardAnswer({ key: "owner" }, "tôi"), true);
assert.equal(wizardFields.taskOwner.value, "owner-1");
assert.equal(wizardRuntime.applyTaskWizardAnswer({ key: "project" }, "Tuyến đường"), false, "Lựa chọn mơ hồ không được tự áp vào biểu mẫu.");

assert.match(app, /window\.virtualAssistantApplyTaskDraft = \(draft = \{\}\) => \{[\s\S]*?taskCollaborators\.querySelectorAll[\s\S]*?taskNote/);
console.log("luna_voice=passed");
