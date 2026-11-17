const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const assistant = fs.readFileSync("virtual-assistant.js", "utf8");
const calendar = fs.readFileSync("work-calendar.js", "utf8");
const assistantCss = fs.readFileSync("virtual-assistant.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");

assert.match(assistant, /function isCalendarCreationIntent\(text\)[\s\S]*?startCalendarWizard\(\)/, "Lệnh tạo lịch phải được nhận diện và mở wizard trước khi xử lý lệnh mở mục.");
assert.match(assistant, /function startCalendarWizard\(\)[\s\S]*?virtualAssistantCanManageCalendar\(accountId\)[\s\S]*?virtualAssistantOpenCalendarForm\?\.\(accountId\)[\s\S]*?buildCalendarWizardSteps\(\)/, "Wizard phải kiểm tra quyền, mở form lịch thật và dùng các trường trên form đó.");
assert.match(assistant, /function taskWizardCanSave\(\)[\s\S]*?mode === "calendar"\) return window\.virtualAssistantCanManageCalendar/, "Quyền lịch cần được kiểm tra lại ở mỗi bước và trước khi gửi lưu.");
assert.match(assistant, /function buildCalendarWizardSteps\(\)[\s\S]*?key: "title"[\s\S]*?key: "date"[\s\S]*?key: "startTime"[\s\S]*?key: "endTime"[\s\S]*?key: "location"[\s\S]*?key: "recurrence"[\s\S]*?key: "reminder"[\s\S]*?key: "leaders"[\s\S]*?key: "departments"[\s\S]*?key: "allHands"[\s\S]*?key: "participants"[\s\S]*?key: "note"[\s\S]*?key: "conclusion"/, "Wizard lịch phải hỏi lần lượt các trường có trong form hiện tại.");
assert.match(assistant, /function applyCalendarWizardAnswer\(step, transcript\)[\s\S]*?dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/, "Câu trả lời phải điền vào biểu mẫu và phát sự kiện change để các listener hiện có hoạt động.");
assert.match(assistant, /if \(taskWizard\.mode === "calendar"\) return applyCalendarWizardAnswer\(step, transcript\)/, "Luồng trả lời bằng chữ và micro phải dùng cùng bộ điền lịch.");
assert.match(assistant, /const calendarForm = document\.getElementById\("calendarForm"\);\s*const personForm = document\.getElementById\("personForm"\);\s*const wizardForms = \[taskForm, document\.getElementById\("assignmentTaskForm"\), calendarForm, personForm\]/, "Form lịch phải tiếp tục hỗ trợ thao tác tay và bước xác nhận cuối khi Luna có thêm luồng Nhân sự.");
assert.match(assistant, /window\.virtualAssistantCalendarWizardSaved = \(eventId\)[\s\S]*?mode !== "calendar"[\s\S]*?lịch công việc đã được lưu/, "Luna chỉ kết thúc wizard lịch sau khi luồng lưu hiện tại báo đã lưu.");
assert.match(calendar, /window\.virtualAssistantCanManageCalendar = \(accountId\)[\s\S]*?canManageCalendarEvent\(\)/, "Cầu nối Luna phải dùng nguyên quyền ghi lịch hiện có.");
assert.match(calendar, /window\.virtualAssistantOpenCalendarForm = \(accountId\)[\s\S]*?openCalendarDialog\(\)[\s\S]*?return !dialog\.classList\.contains\("is-hidden"\)/, "Luna phải mở chính popup lịch chuẩn, không tự tạo bản ghi.");
assert.match(calendar, /saveState\(\);[\s\S]*?window\.virtualAssistantCalendarWizardSaved\?\.\(record\.id\)/, "Phản hồi lưu của Luna phải đi sau luồng lưu lịch hiện có.");
assert.match(html, /id="assistantQuickNoticeCategory"[\s\S]*?id="assistantQuickNoticeBody"/, "Thông báo chủ động cần có nhãn nhóm tách biệt với nội dung.");
assert.match(assistant, /item\.targetType === "luna-announcement"[\s\S]*?displayCategory: category/, "Thông báo toàn ban, lịch và nhắc chủ động khác phải được phân nhóm trước khi hiển thị.");
assert.match(assistant, /category === "system"[\s\S]*?THÔNG BÁO HỆ THỐNG[\s\S]*?NHẮC LỊCH CÔNG VIỆC[\s\S]*?LUNA NHẮC VIỆC/, "Mỗi loại thông báo cần có nhãn dễ nhận biết.");
assert.match(assistantCss, /data-category="system"[\s\S]*?data-category="calendar"[\s\S]*?data-category="proactive"/, "Ba nhóm thông báo phải có bộ màu riêng.");
assert.match(assistantCss, /\.assistant-quick-notice-message\s*\{[\s\S]*?font-size: 1rem;[\s\S]*?font-weight: 550/);
assert.match(assistantCss, /\.assistant-quick-notice-message \{[^}]*font-size: \.94rem;/, "Thông báo trên mobile vẫn phải đủ lớn để đọc.");

const extractFunction = (name, nextName) => {
  const start = assistant.indexOf(`function ${name}(`);
  const end = assistant.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `Không tìm thấy ranh giới hàm ${name}.`);
  return assistant.slice(start, end);
};
const normalization = `function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/\\s+/g, " ").trim();
}`;
const timeRuntime = {};
vm.createContext(timeRuntime);
vm.runInContext(`${normalization}\n${extractFunction("parseCalendarTime", "applyCalendarWizardAnswer")}`, timeRuntime);
assert.equal(timeRuntime.parseCalendarTime("8 giờ 30"), "08:30");
assert.equal(timeRuntime.parseCalendarTime("8 giờ rưỡi tối"), "20:30");
assert.equal(timeRuntime.parseCalendarTime("tám giờ 30"), "08:30");
assert.equal(timeRuntime.parseCalendarTime("26 giờ"), "");

const intentRuntime = {};
vm.createContext(intentRuntime);
vm.runInContext(`${normalization}\n${extractFunction("isCalendarCreationIntent", "uniqueDraftMatch")}`, intentRuntime);
assert.equal(intentRuntime.isCalendarCreationIntent("Luna ơi, giúp tôi tạo lịch công việc"), true);
assert.equal(intentRuntime.isCalendarCreationIntent("Thêm lịch họp tuần sau"), true);
assert.equal(intentRuntime.isCalendarCreationIntent("Mở Lịch công việc"), false);

const voiceRuntime = {};
vm.createContext(voiceRuntime);
vm.runInContext(extractFunction("selectLunaVietnameseVoice", "playNextLunaSpeech"), voiceRuntime);
const male = { lang: "vi-VN", name: "vi-VN-Neural2-D", default: true };
const female = { lang: "vi-VN", name: "vi-VN-Neural2-A", default: false };
assert.equal(voiceRuntime.selectLunaVietnameseVoice([male, female]), female, "Ưu tiên voice tiếng Việt nữ đã nhận diện thay vì voice mặc định nam.");
assert.equal(voiceRuntime.selectLunaVietnameseVoice([{ lang: "en-US", name: "Female voice" }]), null, "Không chọn voice không phải tiếng Việt.");

console.log("luna_calendar_wizard=passed");
