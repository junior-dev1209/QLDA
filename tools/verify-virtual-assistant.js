const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("virtual-assistant.js", "utf8");
const styles = fs.readFileSync("virtual-assistant.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const apache = fs.readFileSync(".htaccess", "utf8");

assert.match(html, /id="virtualAssistant"/, "Giao diện phải có widget trợ lý.");
assert.match(html, /id="assistantQuickNotice"/, "Trợ lý cần có popup nhanh cho thông báo chủ động.");
assert.match(html, /aria-label="Lời thoại từ Luna"/, "Popup phải được nhận diện là lời thoại của Luna.");
assert.match(html, /<button id="assistantQuickNoticeText" class="assistant-quick-notice-message"/, "Phần chữ của bong bóng phải là vùng xác nhận đã xem.");
assert.doesNotMatch(html, /assistantQuickNotice(?:Target|Chat|Close)|<header><strong>Luna<\/strong>/, "Popup không còn tiêu đề Luna hoặc các nút thao tác riêng.");
assert.match(html, /class="assistant-launcher-pose assistant-launcher-pose--idle" src="assets\/luna-outfit-field\.png\?v=3\.4\.64"/, "Nhân vật 2D theo chủ đề công tác phải hiển thị trực tiếp làm tư thế nghỉ.");
assert.equal((html.match(/data-assistant-enabled-toggle/g) || []).length, 0, "Không đặt công tắc bật/tắt trợ lý trong hồ sơ tài khoản.");
assert.match(html, /id="assistantMinimize"/, "Widget phải có nút thu nhỏ ngay cạnh nhân vật.");
assert.match(html, /id="assistantRestore"/, "Icon góc phải phải khôi phục nhân vật.");
assert.equal((html.match(/class="assistant-launcher-pose assistant-launcher-pose--(?:listening|thinking)" data-src=/g) || []).length, 2, "Ảnh trạng thái 2D chỉ tải khi cần dùng.");
assert.match(html, /id="assistantComposer"/, "Trợ lý phải có kênh nhập câu hỏi.");
assert.match(html, /<span class="assistant-speech-tail" aria-hidden="true">▼<\/span>/, "Đuôi hội thoại phải có phần tử giao diện riêng.");
assert.match(client, /canViewTaskRecord\(task\)/, "Danh sách trợ lý phải lọc từng công việc theo quyền xem.");
assert.match(client, /canCreateRegularTasks\(\)/, "Mở biểu mẫu tạo việc phải kiểm tra quyền.");
assert.match(client, /trigger\.click\(\)/, "Trợ lý phải mở luồng tạo công việc hiện có thay vì ghi dữ liệu riêng.");
assert.doesNotMatch(client, /state\.tasks\.(?:push|splice)|state\.tasks\s*=/, "Trợ lý không được tự ghi hoặc xóa công việc ở client.");
assert.match(client, /recognition\.onresult[\s\S]*input\.value\s*=\s*transcript/, "Giọng nói chỉ điền vào ô để người dùng kiểm tra.");
assert.match(client, /recognition\.start\(\)/, "Nút giọng nói phải khởi chạy nhận dạng sau thao tác người dùng.");
assert.match(html, /title="Trên màn hình lớn, kéo hoặc dùng phím mũi tên để di chuyển"/, "Tooltip phải mô tả đúng cách di chuyển trên màn hình lớn.");
assert.match(client, /setPointerCapture/, "Kéo trợ lý phải tiếp tục ổn định ngoài vùng nút.");
assert.match(client, /if \(!event\.isPrimary \|\| event\.button !== 0 \|\| isMobileAssistantViewport\(\)\) return/, "Vị trí trợ lý trên mobile phải cố định như bố cục đã chọn.");
assert.match(client, /placeLauncher\(pointerDrag\.startLeft \+ deltaX, pointerDrag\.startTop \+ deltaY\)/, "Tọa độ trợ lý phải theo thao tác kéo.");
assert.match(client, /phuc-thinh-assistant-position-v1:/, "Vị trí trợ lý cần được lưu riêng cho từng tài khoản.");
assert.match(client, /suppressLauncherClickUntil/, "Thả kéo không được kích hoạt mở bong bóng ngoài ý muốn.");
assert.match(client, /panel\.setAttribute\("data-placement", chosen\.placement\)/, "Bong bóng phải tự chọn cạnh sát nhân vật.");
assert.match(client, /window\.virtualAssistantNotify = \(item, options\) => notify\(item, options\)/, "Trợ lý cần nhận thông báo từ các luồng hệ thống.");
assert.match(client, /function openAssistantNotifications\(\)/, "Chuông phải mở danh sách thông báo ngay trong hội thoại trợ lý.");
assert.match(client, /function assistantUserProfile\(account\)[\s\S]*?currentPerson\(\)[\s\S]*?person\?\.gender[\s\S]*?"anh"[\s\S]*?"chị"[\s\S]*?return \{ honorific, addressee, pronoun \}/, "Lời chào phải phân biệt giới tính hồ sơ và đại từ xưng hô.");
assert.match(client, /function loginGreetingMessage\(account\)[\s\S]*?getHours\(\)[\s\S]*?buổi sáng[\s\S]*?buổi chiều[\s\S]*?buổi tối[\s\S]*?Em luôn sẵn sàng hỗ trợ ạ/, "Lời chào phải đổi theo buổi và Luna xưng em.");
assert.match(client, /function showLoginGreeting\(account\)[\s\S]*?loginGreetingMessage\(account\)[\s\S]*?messageOnly: true/, "Luna phải phát lời chào khi tài khoản đăng nhập.");
assert.match(client, /phuc-thinh-luna-greeted-account-v1/, "Lời chào đăng nhập phải được chống lặp khi tải lại cùng phiên.");
assert.match(client, /quickNoticeText\?\.addEventListener\("click", acknowledgeQuickNotice\)/, "Thông báo phải đóng khi người dùng bấm phần lời thoại.");
assert.match(client, /launcher\.addEventListener\("click",[\s\S]*?acknowledgeQuickNotice\(\{ showNext: false \}\)[\s\S]*?setPanelOpen\(true\)/, "Bấm Luna phải xác nhận và ẩn lời thoại đang hiện trước khi mở hội thoại.");
assert.match(client, /function loginGreetingMessage\(account\)[\s\S]*?window\.canViewTasks\(\)[\s\S]*?dailyStatusSummary\(currentSummaryTasks\(\), todayKey\)/, "Lời chào phải kèm tổng hợp theo đúng phạm vi công việc được xem.");
assert.match(client, /function currentTasks\(\)[\s\S]*?canViewTaskRecord\(task\)/, "Nguồn công việc của Luna phải lọc từng bản ghi theo quyền xem.");
assert.match(client, /function currentSummaryTasks\(\)[\s\S]*?taskMatchesDisplayScope\(task\)[\s\S]*?isRecurrenceStoppedTask\(task\)/, "Tổng hợp phải khớp kỳ hiển thị và loại mẫu định kỳ đã dừng.");
assert.match(client, /async function handleCommand\(rawText, sequence = requestSequence\)[\s\S]*?taskSummaryHtml\(currentSummaryTasks\(\)\)/, "Mục Tình hình phải dùng cùng tập công việc với lời chào nhanh.");
assert.doesNotMatch(client, /Đang yêu cầu trình duyệt bật micro|Âm thanh được xử lý theo dịch vụ nhận dạng/, "Không hiển thị diễn giải dài về micro.");
assert.doesNotMatch(html, /AI dùng khi online|assistant-ai-privacy/, "Không hiển thị đoạn diễn giải dài về xử lý AI.");
const dailySummarySource = client.match(/function dailyStatusSummary\(tasks, todayKey\) \{[\s\S]*?\n  \}/)?.[0];
assert.ok(dailySummarySource, "Không tìm thấy hàm tổng hợp số liệu trong ngày.");
const summaryMetricsSource = client.match(/function taskSummaryMetrics\(tasks, todayKey\) \{[\s\S]*?\n  \}/)?.[0];
assert.ok(summaryMetricsSource, "Không tìm thấy bộ đếm dùng chung cho các loại thông báo của Luna.");
const summaries = new Function(`const taskStatus = (task) => task.status; const taskCompletionNeedsReview = (task) => task.status === "Hoàn thành" && task.completionReviewStatus === "pending"; ${summaryMetricsSource}; ${dailySummarySource}; return { dailyStatusSummary, taskSummaryMetrics };`)();
const dailyTasks = [
  { status: "Đang thực hiện", due: "2026-10-23" },
  { status: "Quá hạn", due: "2026-10-23" },
  { status: "Quá hạn", due: "2026-10-20" },
  { status: "Hoàn thành", completedAt: "2026-10-23T10:00:00+07:00" },
  { status: "Hoàn thành", completionReviewStatus: "pending" },
];
assert.equal(summaries.dailyStatusSummary(dailyTasks, "2026-10-23"), "1 việc đến hạn, 2 việc quá hạn, 1 việc gửi hoàn thành hôm nay và 1 việc chờ đánh giá", "Việc quá hạn trong ngày chỉ được tính vào nhóm quá hạn, không bị đếm trùng.");
assert.equal(summaries.taskSummaryMetrics(dailyTasks, "2026-10-23").dueToday.length, 1, "Lời chào và hội thoại phải chia nhóm hạn thống nhất.");

const summaryScopeSandbox = {
  activeRole: "employee",
  selectedPeriod: "2026-10",
  state: { tasks: [
    { id: "own", period: "2026-10", allowedRoles: ["employee", "section_head", "manager", "director", "admin"] },
    { id: "department", period: "2026-10", allowedRoles: ["section_head", "manager", "deputy_manager", "director", "admin"] },
    { id: "other-department", period: "2026-10", allowedRoles: ["director", "admin"] },
    { id: "previous-period", period: "2026-09", allowedRoles: ["employee", "section_head", "manager", "deputy_manager", "director", "admin"] },
    { id: "stopped", period: "2026-10", stopped: true, allowedRoles: ["employee", "section_head", "manager", "deputy_manager", "director", "admin"] },
  ] },
};
vm.createContext(summaryScopeSandbox);
vm.runInContext(`
  function canViewTasks() { return activeRole !== "no-task-access"; }
  function canViewTaskRecord(task) { return task.allowedRoles.includes(activeRole); }
  function taskMatchesDisplayScope(task) { return task.period === selectedPeriod; }
  function isRecurrenceStoppedTask(task) { return task.stopped === true; }
`, summaryScopeSandbox);
vm.runInContext(client.match(/function currentTasks\(\) \{[\s\S]*?\n  \}/)[0], summaryScopeSandbox);
vm.runInContext(client.match(/function currentSummaryTasks\(\) \{[\s\S]*?\n  \}/)[0], summaryScopeSandbox);
for (const [role, expectedCount] of Object.entries({ employee: 1, section_head: 2, manager: 2, deputy_manager: 1, director: 3, admin: 3 })) {
  summaryScopeSandbox.activeRole = role;
  assert.equal(summaryScopeSandbox.currentSummaryTasks().length, expectedCount, `Tổng hợp phải theo phạm vi xem của vai trò ${role}.`);
}
summaryScopeSandbox.activeRole = "no-task-access";
assert.equal(summaryScopeSandbox.currentSummaryTasks().length, 0, "Tài khoản không có quyền công việc không nhận số liệu tổng hợp.");
assert.match(client, /function showWelcome\(\)[\s\S]*?Em chào \$\{addressee\}[\s\S]*?Em cũng sẽ nhắc/, "Luna cần tiếp tục xưng em khi mở hội thoại chủ động.");
assert.match(client, /const quickNoticeQueue = \[\]/, "Các thông báo kế tiếp phải được xếp hàng khi đang có lời thoại.");
assert.match(client, /const nextNotice = showNext \? quickNoticeQueue\.shift\(\) : null;[\s\S]*?presentQuickNotice\(nextNotice\)/, "Xác nhận một lời thoại phải hiện thông báo kế tiếp nếu có.");
assert.match(client, /const panelWidth = Math\.min\(mobile \? 480 : 500/, "Hội thoại desktop phải có chiều rộng đọc thoải mái.");
assert.match(client, /30 \* 60 \* 1000/, "Biểu cảm ngẫu nhiên cần đổi theo chu kỳ 30 phút.");
assert.match(client, /Math\.random\(\) \* choices\.length/, "Biểu cảm trạng thái phải được chọn ngẫu nhiên.");
assert.match(client, /root\.dataset\.mood = currentMood\.key/, "Trạng thái biểu cảm phải được phản ánh trên nhân vật.");
assert.match(client, /--assistant-tail-x/);
assert.match(client, /--assistant-tail-y/);
assert.match(client, /root\.querySelector\("\.assistant-speech-tail"\)/, "Đuôi đặt cạnh popup phải được truy vấn từ widget trợ lý.");
assert.match(client, /speechTail\.style\.display = shouldOpen \? "block" : "none"/, "Đuôi phải đồng bộ hiển thị khi popup mở/đóng.");
assert.match(styles, /prefers-reduced-motion/, "Phải tôn trọng cài đặt giảm chuyển động.");
assert.match(styles, /assistant-idle-float/, "Nhân vật phải có chuyển động trạng thái nghỉ.");
assert.match(styles, /assistant-listening-motion/, "Nhân vật cần có chuyển động khi nghe.");
assert.match(styles, /assistant-thinking-motion/, "Nhân vật cần có chuyển động khi xử lý.");
assert.match(styles, /assistant-speaking-motion/, "Nhân vật cần có chuyển động khi phản hồi.");
assert.match(styles, /\.assistant-launcher-pose \{[^}]*inset: 0 2px 24px;/, "Ảnh Luna phải chừa khoảng riêng để nhãn không che chân.");
assert.match(styles, /\.assistant-launcher-name \{[^}]*bottom: 0;[^}]*transform: translateX\(-50%\)/, "Nhãn Luna phải nằm tách dưới vùng chân nhân vật.");
assert.match(styles, /\.assistant-message\.is-assistant \{[^}]*align-self: flex-start/);
assert.match(styles, /\.assistant-message\.is-user \{[^}]*align-self: flex-end/);
assert.match(styles, /assistant-mood-friendly/, "Trợ lý cần có chuyển động biểu cảm bổ sung ngoài trạng thái nghe và suy nghĩ.");
assert.match(styles, /\.assistant-quick-notice \{[\s\S]*?z-index: 1000004/, "Popup nhanh của trợ lý phải hiển thị trên các lớp giao diện khác.");
assert.match(styles, /\.assistant-launcher:hover,\s*\.assistant-launcher:active\s*\{[^}]*background:\s*transparent;[^}]*transform:\s*none;/, "Hover và nhấn không được kế thừa mảng nền/hiệu ứng của nút chung.");
assert.match(styles, /\.assistant-launcher:hover\s*\{\s*opacity:\s*\.99;/, "Hover chỉ thay đổi độ trong suốt rất nhẹ.");
assert.doesNotMatch(styles, /assistant-launcher:hover[^\n]*animation-duration/, "Hover không được làm nhân vật chuyển động gấp, đậm.");
assert.doesNotMatch(styles, /\.assistant-launcher-pose\s*\{[^}]*filter:/, "Ảnh nhân vật không được phủ bóng đổ đậm.");
assert.match(styles, /\.assistant-launcher:focus-visible\s*\{[^}]*outline:\s*2px solid rgba\(13, 101, 121, \.45\)/, "Vòng focus của trợ lý cần nhẹ và đồng điệu với hệ thống.");
assert.match(styles, /\.assistant-panel\s*\{[^}]*height:\s*auto;[^}]*max-height:/, "Bong bóng cần co theo nội dung và giới hạn theo màn hình.");
assert.match(styles, /width:\s*min\(600px, calc\(100vw - 32px\)\)/, "Bong bóng desktop đủ rộng để đọc và thao tác thoải mái.");
assert.match(styles, /min-height:\s*min\(560px, calc\(100dvh - 36px\)\)/, "Bong bóng desktop phải có chiều cao thao tác thoải mái và thích ứng viewport.");
assert.match(styles, /\.assistant-quick-notice \{[\s\S]*?width: min\(430px, calc\(100vw - 40px\)\)[\s\S]*?--assistant-notice-border:/, "Khung nhắc chủ động phải đủ rộng và có giao diện bong bóng.");
assert.match(styles, /\.assistant-quick-notice::before[\s\S]*?border-top: 11px solid var\(--assistant-notice-border\)/, "Bong bóng phải có đuôi hướng về Luna.");
assert.match(client, /const headX = anchorRect\.left \+ anchorRect\.width \/ 2;[\s\S]*?const headY = anchorRect\.top \+ anchorRect\.height \* \(assistantMinimized \? 0\.18 : 0\.08\)/, "Đuôi bong bóng phải được căn theo vùng đầu nhân vật.");
assert.match(styles, /\.assistant-panel\s*\{[^}]*z-index:\s*1000001;/, "Đuôi bong bóng phải nằm phía trên nút nhân vật.");
assert.match(client, /speechTail\.textContent = \{ above: "▼", below: "▲", left: "▶", right: "◀" \}/, "Đuôi phải đổi hướng theo vị trí popup.");
assert.match(styles, /\.assistant-speech-tail::before,[\s\S]*?border-top: 13px solid #bad2d9;[\s\S]*?border-top: 12px solid #fff;/, "Đuôi hội thoại phải là mũi tam giác mảnh, đồng màu với bong bóng.");
assert.match(styles, /\.assistant-launcher \{ left: 10px; right: auto; bottom: calc\(82px \+ env\(safe-area-inset-bottom\)\)/, "Trợ lý trên mobile luôn neo góc dưới trái phía trên thanh điều hướng.");
assert.match(client, /quickNotice\.style\.setProperty\("--assistant-notice-tail-x"/, "Đuôi bong bóng phải trỏ đúng vị trí đầu Luna.");
assert.match(client, /const headY = anchor\.top \+ anchor\.height \* 0\.08/, "Đuôi bong bóng phải căn theo vùng đầu nhân vật.");
assert.match(client, /roomAbove|roomBelow/, "Popup phải được đặt trong vùng trống quanh nhân vật.");
assert.match(client, /panel\.style\.height = `\$\{height\}px`/, "Kích thước popup phải ổn định khi nội dung hội thoại tăng.");
assert.match(client, /if \(isMobileAssistantViewport\(\)\) restoreLauncherPosition\(activeAccountId\)/, "Mỗi lần mở trợ lý trên mobile phải đưa avatar về vị trí chuẩn.");
assert.match(client, /if \(!isMobileAssistantViewport\(\)\) input\.focus/, "Không tự mở bàn phím điện thoại che khuất trợ lý khi mở popup.");
assert.match(client, /visiblePeopleForPeopleView\(\)/, "Tra cứu nhân sự phải dùng bộ lọc quyền hiện có.");
assert.match(client, /canViewProjectCatalog\(\)/, "Tra cứu danh mục dự án phải kiểm tra quyền.");
assert.match(client, /canAccessView\(module\.id\)/, "Kết quả mục hệ thống phải giới hạn theo quyền truy cập.");
assert.match(client, /canAccessView\("bulletin"\)[\s\S]*visibleBulletins\(\)/, "Tra cứu thông tin nội bộ phải giới hạn theo bảng tin được phép xem.");
assert.match(client, /function searchMatchScore\(value, terms\)/, "Tra cứu phải dùng bộ so khớp từ khóa chung.");
assert.match(client, /tokens\.includes\(term\)/, "Từ khóa phải khớp nguyên từ để tránh kết quả dính chuỗi con.");
assert.match(client, /tokens\.some\(\(token\) => token\.startsWith\(term\)\)/, "Chỉ cho phép khớp tiền tố để hỗ trợ nhập dở từ.");
assert.doesNotMatch(client, /searchable\.includes\(term\)/, "Không dùng khớp chuỗi con lỏng lẻo cho kết quả tìm kiếm.");
assert.match(client, /function personSearchScore\(name, context, query\)/, "Tìm nhân sự phải tách tên khỏi trường phòng ban/chức vụ.");
assert.match(client, /const projectQuery = \/du an\//, "Truy vấn dự án phải được phân luồng riêng khỏi tìm nhân sự.");
assert.match(client, /const taskMatches = taskAccess && !peopleQuery && \(!projectQuery \|\| taskQuery\)/, "Tìm nhân sự/dự án không được trộn kết quả công việc không liên quan.");
assert.match(client, /task\.title, task\.description, task\.content, task\.note, task\.category, projectName, ownerName, collaboratorNames/, "Tra cứu công việc gồm nội dung, dự án và người liên quan.");
const peoplePresentation = client.slice(client.indexOf("function makePeopleListHtml"), client.indexOf("function makeProjectListHtml"));
assert.doesNotMatch(peoplePresentation, /person\.(?:salary|phone|address|contract|email)/i, "Kết quả nhân sự chỉ hiển thị thông tin cơ bản.");
const normalizeSource = client.match(/function normalize\(value\) \{[\s\S]*?\n  \}/)?.[0];
const searchSource = client.match(/const searchStopWords = new Set\([\s\S]*?function searchMatchScore\(value, terms\) \{[\s\S]*?\n  \}/)?.[0];
const personSearchSource = client.match(/function personSearchScore\(name, context, query\) \{[\s\S]*?\n  \}/)?.[0];
assert.ok(normalizeSource && searchSource && personSearchSource, "Không tìm thấy bộ xử lý tìm kiếm để kiểm thử hành vi.");
const search = new Function(`${normalizeSource}\n${searchSource}\n${personSearchSource}\nreturn { searchTerms, searchMatchScore, personSearchScore };`)();
assert.deepEqual(search.searchTerms("Tìm dự án Đường Vành đai"), ["duong", "vanh", "dai"]);
assert.deepEqual(search.searchTerms("Tìm nhân sự An"), ["an"], "Tên ngắn như An không được loại nhầm thành từ dừng.");
assert.equal(search.searchMatchScore("Ban giám đốc", ["an"]), 0, "Tìm An không được khớp nhầm vào bên trong Ban.");
assert.equal(search.searchMatchScore("Đường Vành đai", ["duong", "dai", "duan"]), 0, "Mọi từ khóa còn lại phải cùng khớp.");
assert.equal(search.searchMatchScore("Nguyễn Thanh", ["nguy"]), 1, "Cho phép tìm bằng tiền tố đã nhập dở.");
assert.equal(search.personSearchScore("Hà Thế Hoàn", "Phòng Dự án 1", "Tìm nhân sự An"), 0, "Tên An không được khớp vào từ An trong tên phòng ban.");
assert.ok(search.personSearchScore("Nguyễn Văn An", "Phòng GPMB", "Tìm nhân sự An") > 0, "Tên nhân sự An phải tìm được theo tên.");
assert.ok(search.personSearchScore("Hà Thế Hoàn", "Phòng Dự án 1", "Tìm nhân sự phòng Dự án 1") > 0, "Truy vấn ghi rõ phòng ban vẫn tìm được theo ngữ cảnh.");
assert.match(worker, /"virtual-assistant\.js"/, "Service worker phải lưu mã trợ lý.");
assert.match(worker, /"virtual-assistant\.css"/, "Service worker phải lưu kiểu trợ lý.");
assert.match(worker, /"assets\/virtual-assistant\.png"/, "Service worker phải lưu ảnh nhân vật.");
assert.match(client, /phuc-thinh-assistant-minimized-v1:/, "Trạng thái thu nhỏ cần được lưu riêng theo tài khoản.");
assert.doesNotMatch(client, /virtual-assistant-3d|assistant3d|assistantEnabled/, "Ứng dụng không được tải renderer 3D hoặc có trạng thái bật/tắt cũ.");
assert.doesNotMatch(worker, /three\.module|three\.core|virtual-assistant-3d/, "Gói ứng dụng không được tham chiếu tài nguyên 3D.");
assert.match(apache, /microphone=\(self\)/, "Chính sách micro chỉ cho phép trong cùng website.");
assert.match(apache, /camera=\(\)/, "Không mở quyền camera cho tính năng trợ lý.");

console.log("virtual_assistant=passed");
