const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261022000000_luna_system_announcements.sql", "utf8");
const apache = fs.readFileSync(".htaccess", "utf8");

assert.match(html, /id="accountDirectoryDepartmentFilter"/, "Danh mục tài khoản phải có bộ lọc phòng.");
assert.match(client, /function renderAccountDepartmentFilterOptions\(accounts\)/, "Danh sách phòng phải lấy từ danh mục hiện hành.");
assert.match(client, /accountDepartmentIdForStatistics\(account\) !== selectedDepartment/, "Bộ lọc phòng phải lọc chính xác từng tài khoản.");
assert.match(client, /accountDirectoryDepartmentFilter"\)\.addEventListener\("change", renderAccountTable\)/, "Thay đổi phòng phải cập nhật danh sách ngay.");
assert.match(html, /class="account-directory-toolbar"[\s\S]*?id="accountAdminQuickTools"[\s\S]*?id="accountDirectoryFilters"/, "Tìm kiếm và lọc phòng phải nằm cạnh nhau trong cùng thanh công cụ.");
assert.match(html, /role="tablist" aria-label="Thống kê công việc theo tài khoản"[\s\S]*?data-account-task-tab="accountTaskCreationPanel"[\s\S]*?data-account-task-tab="accountTaskOverduePanel"/, "Hai thống kê tài khoản phải được gom thành các tab.");
assert.match(client, /function bindAccessibleTablist\(tablist, tabAttribute\)[\s\S]*?panel\.inert = !active/, "Chuyển tab phải cập nhật vùng nội dung và trạng thái hỗ trợ truy cập.");
assert.match(client, /bindAccessibleTablist\(document\.querySelector\("\.account-task-stats-tablist"\), "data-account-task-tab"\)/, "Tab Công việc/Quá hạn phải tiếp tục được khởi tạo.");
assert.match(client, /bindAccessibleTablist\(document\.querySelector\("\.account-usage-tablist"\), "data-account-usage-tab"\)/, "Tab giám sát sử dụng phải được khởi tạo.");
assert.match(client, /tablist\.addEventListener\("keydown"[\s\S]*?ArrowLeft[\s\S]*?ArrowRight/, "Tab phải hỗ trợ điều hướng bàn phím.");

assert.doesNotMatch(html, /id="lunaAnnouncementPanel"/, "Không còn bảng thông báo riêng trong mục Tài khoản.");
assert.match(html, /id="assistantAnnouncementToggle" class="admin-only-action"/, "Chỉ Admin mới được hiển thị nút thông báo trong Luna.");
assert.match(html, /id="assistantAnnouncementComposer" class="assistant-announcement-composer is-hidden"[\s\S]*?id="lunaAnnouncementForm"/, "Form thông báo phải nằm trong Luna và chỉ mở khi được gọi.");
assert.match(html, /id="lunaAnnouncementDepartments" multiple/, "Admin phải chọn được phòng nhận.");
assert.match(html, /id="lunaAnnouncementRoles" multiple/, "Admin phải chọn được nhóm tài khoản nhận.");
assert.match(html, /id="lunaAnnouncementSchedule" type="datetime-local"/, "Thông báo phải hỗ trợ lên lịch.");
assert.match(html, /id="lunaAnnouncementReceipts"/, "Admin phải tra cứu được trạng thái đã xem.");
assert.match(html, /id="assistantTitle">Luna</, "Tên trợ lý trên popup phải là Luna.");
assert.match(html, /assistant-launcher-name">Luna</, "Tên Luna phải hiển thị cạnh nhân vật trợ lý.");
assert.match(client, /byId\("assistantAnnouncementToggle"\)\.addEventListener\("click",[\s\S]*?if \(!isAdmin\(\)\) return;[\s\S]*?assistantAnnouncementComposer/, "Client phải chặn mở form gửi thông điệp cho tài khoản không phải Admin.");
assert.match(client, /if \(!isAdmin\(\)\)[\s\S]*?Chỉ admin mới có quyền gửi thông điệp toàn Ban/, "Client phải chặn người không phải Admin.");
assert.match(edge, /if \(!isAdmin\(account\)\) return json\(request, \{ error: "Only an administrator can send a system-wide announcement\." \}, 403\)/, "Edge Function phải xác thực quyền Admin phía máy chủ.");
assert.match(edge, /function validLunaAnnouncementRequest[\s\S]*?message\.length <= 1200[\s\S]*?departmentIds\.every[\s\S]*?roleIds\.every[\s\S]*?scheduledAt/, "Máy chủ phải kiểm tra nội dung, phòng, vai trò và thời điểm phát.");
assert.match(edge, /recipientAccountId: recordId\(recipient\)[\s\S]*?title: "Thông điệp toàn Ban"[\s\S]*?senderName: "Luna"/, "Thông báo phải được lưu riêng cho từng người nhận và gắn tên Luna.");
assert.match(edge, /records\(current\.state, "accounts"\)[\s\S]*?filter\(\(account\) => !Boolean\(account\.disabled\)\)[\s\S]*?departmentIds\.includes\(accountDepartmentId[\s\S]*?roleIds\.includes\(accountRole/, "Không gửi cho tài khoản bị khóa và phải áp dụng đúng bộ lọc người nhận.");
assert.match(edge, /scheduledAt \? false : await sendLunaAnnouncementBroadcast/, "Thông báo hẹn giờ không được phát Realtime trước thời hạn.");
assert.match(edge, /action === "luna-announcement-receipts"[\s\S]*?if \(!isAdmin\(account\)\)[\s\S]*?lunaAnnouncementReceiptDetails/, "Biên nhận đã xem chỉ được trả cho Admin.");
assert.match(edge, /channel\.httpSend\("announcement", \{ announcementId \}[\s\S]*?result\?\.success === true/, "Edge Function phải phát tín hiệu Realtime sau khi lưu và xác nhận kết quả đúng API.");
assert.match(edge, /lunaBroadcast: true/, "Máy chủ phải công bố hỗ trợ Realtime.");

assert.match(client, /config: \{ private: true, broadcast: \{ self: false \} \}/, "Trình duyệt phải nhận qua kênh Realtime riêng tư.");
assert.match(client, /await refreshSharedState\(\{ force: true \}\)/, "Thông báo phải buộc đồng bộ ngay kể cả khi người dùng đang nhập liệu.");
assert.match(client, /if \(force\) renderNotificationCenter\(\)/, "Sau đồng bộ, Luna phải hiện popup thông báo mới.");
assert.match(migration, /for select\s+to anon\s+using \([\s\S]*extension = 'broadcast'[\s\S]*realtime\.topic\(\) = 'luna-system-announcements'/, "RLS chỉ cho phép nhận Broadcast ở đúng topic.");
assert.doesNotMatch(migration, /for insert/i, "Không cấp quyền phát Broadcast cho trình duyệt.");
assert.match(apache, /script-src 'self' https:\/\/esm\.sh https:\/\/cdn\.esm\.sh/, "CSP phải cho phép tải thư viện Realtime đã pin phiên bản.");
assert.match(apache, /wss:\/\/hqquobfaccxnydeyvioe\.supabase\.co/, "CSP phải cho phép WebSocket Supabase Realtime.");

console.log("luna_announcements=passed");
