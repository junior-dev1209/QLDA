# HANDOFF

**Cập nhật:** 03/11/2026  
**Thư mục dự án:** `C:\Users\Hi\Documents\Quản Lý Hiệu Quả Công Việc_Ban QLDA`

## Mục tiêu dự án

Ứng dụng web quản lý nhân sự, công việc, KPI, lịch và quy trình GPMB cho Ban Quản lý Dự án đầu tư - hạ tầng xã Phúc Thịnh. Giao diện chính dùng HTML/CSS/JavaScript; dữ liệu dùng Supabase Postgres/Storage và Edge Function `kpi-sync`, với các quyền được kiểm tra ở máy chủ. Luna hỗ trợ tra cứu, báo cáo, nhắc việc và các luồng tạo/cập nhật có kiểm tra quyền, xác nhận trước khi lưu.

## Đã hoàn thành

- Hệ thống hiện có các mục Nhân sự, Công việc, KPI, Lịch, Bảng tin, Quy chế, GPMB, thông báo, báo cáo và PWA; luồng phân quyền và đồng bộ nằm trong giao diện cùng Edge Function.
- Luna có tra cứu AI theo dữ liệu tài khoản được phép xem, lịch sử hội thoại lưu cục bộ 7 ngày, nguồn cho tra cứu web, thông báo và các luồng hội thoại từng bước tạo/cập nhật công việc. Thay đổi công việc vẫn dùng luồng lưu hiện tại và phải xác nhận.
- Luna dùng lại nhận dạng `SpeechRecognition`/`webkitSpeechRecognition` và đọc `SpeechSynthesisUtterance` tích hợp của trình duyệt/thiết bị. Nhận dạng tiếng Việt chạy theo lượt khi người dùng bấm **Nói**, hiện bản nhận dạng tạm, tự dừng sau 20 giây và xử lý các lỗi quyền, micro, mạng, ngôn ngữ; không ghi/đẩy âm thanh qua Edge Function của ứng dụng.
- Đọc giọng dùng voice `vi-VN` có sẵn trên máy và ưu tiên giọng Việt có tên phù hợp nếu trình duyệt cung cấp. Không thể ép cùng một chất giọng/giới tính/ngữ điệu trên mọi máy; hỗ trợ nhận dạng tùy nền tảng, Siri/Đọc chính tả có thể cần bật trong Safari. Không nghe nền liên tục; nếu chỉ gọi “Luna ơi”, cần bấm **Nói** lại để gửi yêu cầu.
- Đã bỏ hai action audio `luna-transcribe`/`luna-synthesize` cùng cấu hình Azure; mã nguồn frontend/PWA hiện tại là `3.4.119`, Edge Function là `2026.11.03.1`.
- Đã bổ sung kiểm tra hồi quy quyền cập nhật tiến độ theo vai trò/phòng ban và sửa luồng duyệt gia hạn để không chuẩn hóa, làm biến đổi trạng thái legacy trước khi xác thực các trường được phép.
- Đã thêm endpoint `action=version` chỉ đọc phiên bản triển khai để frontend làm mới thông tin trước luồng đề nghị/duyệt gia hạn, tránh quyết định dựa trên phiên bản lưu đệm cũ.
- Lỗi từ chối cập nhật công việc hiện được phân biệt thành quyền mục Công việc chưa bật hoặc tài khoản ngoài phạm vi; giao diện hướng dẫn kiểm tra cấu hình quyền hay liên kết tài khoản-nhân sự/phòng ban.
- Xác minh local: 58/58 `tools/verify-*.js` đạt, 68 tệp JS qua `node --check`, `Deploy-KpiSync.ps1` qua parser PowerShell; smoke test localhost trả HTTP 200 và hiện frontend `3.4.119`.
- Đã bổ sung `Supabase-Login.cmd` để đăng nhập CLI trong cửa sổ riêng không tự đóng, `Deploy-KpiSync-Interactive.cmd` để triển khai có giữ kết quả, và chỉnh `Deploy-KpiSync.ps1 -Login` chỉ đăng nhập, không tự chạy migration/deploy.

## Đang làm dở / Chưa triển khai

- Kiểm tra production ngày 03/11/2026: trang đăng nhập đang phục vụ frontend `3.4.118`; Edge Function `action=status` báo `2026.11.02.1`, revision `2036`, `recordProjection.synchronized=true`. Ảnh GitHub/Supabase cũng cho thấy mã nguồn được triển khai là `2026.11.02.1`; các ảnh xác nhận mã đã lên kho và function, không phải bản vá `2026.11.03.1` hiện tại.
- Đã tìm được lỗi cụ thể của duyệt gia hạn: server chuẩn hóa trạng thái legacy `Quá hạn` thành trạng thái làm việc trước khi kiểm tra chuyển tiếp duyệt chỉ-đổi-các-trường-duyệt. Việc đổi trường ngoài danh sách cho phép khiến backend từ chối và khôi phục. Đã sửa ở mã nguồn local, có regression test.
- Quy tắc backend hiện cho phép người thực hiện/người phối hợp cập nhật tiến độ, quản lý trong phạm vi phòng và Ban giám đốc; người ngoài phạm vi bị từ chối. Ma trận này đã được kiểm thử. Đã tách lý do từ chối giữa mục Công việc chưa được bật và tài khoản ngoài phạm vi để khoanh vùng cấu hình/liên kết sau phát hành.
- Đã thử triển khai Edge Function bằng `-SkipDatabaseMigrations`; CLI dừng trước deploy với `Access token not provided`. Không có migration hay thay đổi production nào được thực hiện. Cần đăng nhập CLI trên máy có quyền Supabase (không gửi token qua chat), sau đó triển khai Edge Function và phát hành frontend. Deno không có nên chưa chạy được compile/type-check; không thể kiểm thử cập nhật bằng tài khoản thật tại đây. Không được coi production đã khắc phục cho tới khi Edge Function `2026.11.03.1` và frontend `3.4.119` được phát hành, rồi kiểm thử bằng tài khoản thật.
- Chưa kiểm thử trực tiếp trên đủ máy Chrome, Edge, Safari và thiết bị mobile. API nhận dạng Web Speech không đồng nhất/không được bảo đảm trên mọi cấu hình, và dịch vụ nhận dạng của trình duyệt có thể cần mạng hoặc cấu hình hệ điều hành.
- Giải pháp miễn phí theo lượt dùng chưa được tích hợp. Hướng đang cân nhắc là tự host PhoWhisper/Whisper.cpp cho nhận dạng và KorvaTTS cho đọc tiếng Việt; cần thử mẫu âm thanh, tải máy chủ và giấy phép trước khi quyết định thay dịch vụ cloud.
- Chưa đánh giá thực tế độ chính xác với tên riêng/số liệu, độ trễ, giọng đọc theo từng thiết bị và tải đồng thời trên mạng của đơn vị.

## Lỗi và rủi ro còn tồn tại

- Không có Deno trong môi trường làm việc nên chưa chạy được type-check/compile cho Edge Function. Bài kiểm tra Node hiện xác minh cấu trúc/luồng mã, không thay thế biên dịch Deno hay kiểm thử API thật.
- Trong mã nguồn, `action=status` tự sửa các bảng projection từ trạng thái trung tâm khi phát hiện lệch; `-CheckOnly` gọi endpoint này nên có thể ghi lại các bảng dẫn xuất, dù không sửa dữ liệu công việc gốc. Cần hiểu đây là health check có khả năng tự phục hồi, không phải lệnh chỉ đọc tuyệt đối.
- Chưa gọi thử dịch vụ OpenAI/Azure từ production; `Deploy-KpiSync.cmd -CheckOnly` chỉ xác nhận phiên bản và cấu hình secret, không kiểm tra provider có nhận yêu cầu thành công hay không.
- Nhận dạng Web Speech có thể do nhà cung cấp trình duyệt xử lý từ xa tùy nền tảng; ứng dụng không gửi audio đến Edge Function. Cần tuân thủ chính sách dữ liệu của đơn vị và thông báo người dùng về xử lý theo trình duyệt.
- Không thể tự động cấp quyền micro hoặc giữ nghe nền ổn định giữa các trình duyệt. Cần HTTPS, quyền micro và thao tác **Nói**; Safari có thể cần Siri/Đọc chính tả. Giọng Việt/giọng nữ khác nhau tùy voice cài trên thiết bị.
- `README.txt` còn mô tả phiên online 12 giờ, cần đối chiếu với cấu hình máy chủ hiện tại trước khi dùng làm tài liệu vận hành.
- Thư mục `.git` hiện không phải repository Git hợp lệ; không thể dùng `git status` hoặc diff để xác định đầy đủ các thay đổi chưa commit.

## Cách chạy và kiểm tra

### Chạy giao diện

- Kiểm thử offline hiện có: chạy `QTNS_v1.bat` hoặc mở `index.html`. Chế độ `file://` dùng dữ liệu cục bộ, không đồng bộ production và không kiểm thử được các dịch vụ giọng nói online.
- Chạy qua localhost từ PowerShell tại thư mục gốc:

```powershell
node tools/local-static-server.cjs
```

Mở `http://localhost:4173`. Để chọn cổng khác, đặt `$env:PORT` trước khi chạy. Dùng tài khoản Supabase hợp lệ và cấu hình `supabase-config.js` phù hợp nếu cần kiểm thử online; không chép secret máy chủ vào file này.

### Kiểm tra mã hiện tại

```powershell
node --check virtual-assistant.js
node --check script.js
node tools/verify-luna-voice.js
node tools/verify-luna-enhancements.js
node tools/verify-luna-ai.js
node tools/verify-luna-announcements.js
node tools/verify-luna-system-settings.js
node tools/verify-pwa-release-consistency.js
```

Khi có Deno, bổ sung `deno check supabase/functions/kpi-sync/index.ts` và kiểm thử endpoint với các trường hợp 401, 413, 429, lỗi provider, timeout và phiên bị thu hồi.

### Triển khai online

1. Dùng tài khoản có quyền Developer/Owner trên đúng dự án Supabase; không đưa access token hoặc secret vào tài liệu, chat hay mã nguồn.
2. Chạy `.\Supabase-Login.cmd`, liên kết dự án, rồi chạy `.\Deploy-KpiSync-Interactive.cmd`. Sau đó chạy `.\Deploy-KpiSync.cmd -CheckOnly`.
3. Với bản sửa này không có migration mới. Trên máy có phiên CLI được xác thực, chạy từ thư mục dự án `powershell -NoProfile -ExecutionPolicy Bypass -File Deploy-KpiSync.ps1 -SkipDatabaseMigrations` để chỉ triển khai Edge Function; xác nhận `action=version` trả `2026.11.03.1` và `action=status` trả `recordProjection.available=true`, `recordProjection.synchronized=true`, `notifications=true`, `gpmbWorkflows=true`, `originRestricted=true`.
4. Xuất bản frontend `3.4.119` lên hosting theo quy trình hiện hành; triển khai asset trước, HTML/service worker sau để hạn chế trộn phiên bản.
5. Sau khi deploy, kiểm thử trên Chrome, Edge, Safari qua HTTPS: quyền micro, nhận dạng tiếng Việt, dừng/hủy/đổi tài khoản, giọng đọc native, tắt đọc, và xác nhận lưu tạo/cập nhật công việc. Khi API nhận dạng không khả dụng, xác nhận người dùng vẫn có thể nhập chữ.

Hướng dẫn chi tiết về Luna: `LUNA-AI-DEPLOYMENT.md`. Hướng dẫn Supabase tổng quát: `SUPABASE_DEPLOYMENT.md`.

## Các bước tiếp theo

1. Người có quyền Supabase triển khai Edge Function `2026.11.03.1` (không cần migration mới cho bản sửa này), xác nhận version/status và đồng bộ projection.
2. Xuất bản frontend `3.4.119` lên hosting; kiểm tra cache/service worker và endpoint `action=version`.
3. Kiểm thử bằng tài khoản thật: nhân viên cập nhật tiến độ công việc mình/phối hợp; quản lý duyệt đề nghị gia hạn cùng phòng; người đề nghị không tự duyệt; phòng khác bị chặn; hồ sơ legacy đang `Quá hạn` vẫn duyệt được. Ghi lại denied reason nếu trường hợp hợp lệ còn bị từ chối.
4. Thực hiện kiểm thử người dùng trên Chrome/Edge/Safari và hệ điều hành thực tế; ghi nhận hỗ trợ `vi-VN`, giọng hệ thống, quyền micro và fallback chữ.
5. Cân nhắc phương án tự host chỉ khi đơn vị cần kiểm soát dịch vụ nhận dạng/giọng đọc đồng nhất hơn; đánh giá vận hành, bảo mật, chi phí phần cứng và tải trước khi thay Web Speech.
6. Bổ sung kiểm thử trình duyệt tự động với giả lập SpeechRecognition/SpeechSynthesis và kiểm tra biên dịch Edge Function khi có Deno.
7. Khởi tạo hoặc khôi phục Git repository hợp lệ trước khi phát hành để có thể review diff, lưu mốc và rollback an toàn.
