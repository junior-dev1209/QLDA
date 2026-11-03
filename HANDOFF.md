# HANDOFF

**Cập nhật:** 02/11/2026  
**Thư mục dự án:** `C:\Users\Hi\Documents\Quản Lý Hiệu Quả Công Việc_Ban QLDA`

## Mục tiêu dự án

Ứng dụng web quản lý nhân sự, công việc, KPI, lịch và quy trình GPMB cho Ban Quản lý Dự án đầu tư - hạ tầng xã Phúc Thịnh. Giao diện chính dùng HTML/CSS/JavaScript; dữ liệu dùng Supabase Postgres/Storage và Edge Function `kpi-sync`, với các quyền được kiểm tra ở máy chủ. Luna hỗ trợ tra cứu, báo cáo, nhắc việc và các luồng tạo/cập nhật có kiểm tra quyền, xác nhận trước khi lưu.

## Đã hoàn thành

- Hệ thống hiện có các mục Nhân sự, Công việc, KPI, Lịch, Bảng tin, Quy chế, GPMB, thông báo, báo cáo và PWA; luồng phân quyền và đồng bộ nằm trong giao diện cùng Edge Function.
- Luna có tra cứu AI theo dữ liệu tài khoản được phép xem, lịch sử hội thoại lưu cục bộ 7 ngày, nguồn cho tra cứu web, thông báo và các luồng hội thoại từng bước tạo/cập nhật công việc. Thay đổi công việc vẫn dùng luồng lưu hiện tại và phải xác nhận.
- Luna dùng lại nhận dạng `SpeechRecognition`/`webkitSpeechRecognition` và đọc `SpeechSynthesisUtterance` tích hợp của trình duyệt/thiết bị. Nhận dạng tiếng Việt chạy theo lượt khi người dùng bấm **Nói**, hiện bản nhận dạng tạm, tự dừng sau 20 giây và xử lý các lỗi quyền, micro, mạng, ngôn ngữ; không ghi/đẩy âm thanh qua Edge Function của ứng dụng.
- Đọc giọng dùng voice `vi-VN` có sẵn trên máy và ưu tiên giọng Việt có tên phù hợp nếu trình duyệt cung cấp. Không thể ép cùng một chất giọng/giới tính/ngữ điệu trên mọi máy; hỗ trợ nhận dạng tùy nền tảng, Siri/Đọc chính tả có thể cần bật trong Safari. Không nghe nền liên tục; nếu chỉ gọi “Luna ơi”, cần bấm **Nói** lại để gửi yêu cầu.
- Đã bỏ hai action audio `luna-transcribe`/`luna-synthesize` cùng cấu hình Azure; phiên bản frontend/PWA hiện tại là `3.4.118`, Edge Function mã nguồn là `2026.11.02.1`.
- Đã chạy toàn bộ `tools/verify-*.js` (53 bộ kiểm tra đều đạt) và `node --check` cho `virtual-assistant.js`, `script.js` cùng các test đã sửa. Chưa chạy được kiểm tra biên dịch Edge Function do môi trường không có Deno.
- Đã bổ sung `Supabase-Login.cmd` để đăng nhập CLI trong cửa sổ riêng không tự đóng, `Deploy-KpiSync-Interactive.cmd` để triển khai có giữ kết quả, và chỉnh `Deploy-KpiSync.ps1 -Login` chỉ đăng nhập, không tự chạy migration/deploy.

## Đang làm dở / Chưa triển khai

- Mã nguồn hiện tại là frontend `3.4.118` và Edge Function `2026.11.02.1`, nhưng production chưa được cập nhật. Kiểm tra read-only ngày 02/11/2026 cho thấy domain đang phục vụ frontend `3.4.115`, Edge Function đang chạy `2026.10.23.1`, và `recordProjection.synchronized=false`.
- Chưa thể deploy online vì Supabase CLI trên máy chưa có phiên xác thực hợp lệ và máy hiện không có quyền điều khiển dự án server. Không gửi access token qua cuộc trò chuyện; cần người có quyền Developer/Owner chạy bộ lệnh deploy trên máy có quyền.
- Chưa kiểm thử trực tiếp trên đủ máy Chrome, Edge, Safari và thiết bị mobile. API nhận dạng Web Speech không đồng nhất/không được bảo đảm trên mọi cấu hình, và dịch vụ nhận dạng của trình duyệt có thể cần mạng hoặc cấu hình hệ điều hành.
- Giải pháp miễn phí theo lượt dùng chưa được tích hợp. Hướng đang cân nhắc là tự host PhoWhisper/Whisper.cpp cho nhận dạng và KorvaTTS cho đọc tiếng Việt; cần thử mẫu âm thanh, tải máy chủ và giấy phép trước khi quyết định thay dịch vụ cloud.
- Chưa đánh giá thực tế độ chính xác với tên riêng/số liệu, độ trễ, giọng đọc theo từng thiết bị và tải đồng thời trên mạng của đơn vị.

## Lỗi và rủi ro còn tồn tại

- Không có Deno trong môi trường làm việc nên chưa chạy được type-check/compile cho Edge Function. Bài kiểm tra Node hiện xác minh cấu trúc/luồng mã, không thay thế biên dịch Deno hay kiểm thử API thật.
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
3. Xác nhận endpoint `action=status` trả `deploymentVersion=2026.11.02.1`, `recordProjection.available=true`, `recordProjection.synchronized=true`, `notifications=true`, `gpmbWorkflows=true`, `originRestricted=true`.
4. Xuất bản frontend `3.4.118` lên hosting theo quy trình hiện hành; triển khai asset trước, HTML/service worker sau để hạn chế trộn phiên bản.
5. Sau khi deploy, kiểm thử trên Chrome, Edge, Safari qua HTTPS: quyền micro, nhận dạng tiếng Việt, dừng/hủy/đổi tài khoản, giọng đọc native, tắt đọc, và xác nhận lưu tạo/cập nhật công việc. Khi API nhận dạng không khả dụng, xác nhận người dùng vẫn có thể nhập chữ.

Hướng dẫn chi tiết về Luna: `LUNA-AI-DEPLOYMENT.md`. Hướng dẫn Supabase tổng quát: `SUPABASE_DEPLOYMENT.md`.

## Các bước tiếp theo

1. Người có quyền Supabase triển khai `kpi-sync` và migration, sau đó nghiệm thu trạng thái projection như trên.
2. Xuất bản frontend `3.4.118` lên hosting và kiểm tra cache/service worker.
3. Thực hiện kiểm thử người dùng trên các phiên bản Chrome/Edge/Safari và hệ điều hành thực tế; ghi nhận hỗ trợ `vi-VN`, giọng hệ thống, quyền micro và fallback chữ.
4. Cân nhắc phương án tự host chỉ khi đơn vị cần kiểm soát dịch vụ nhận dạng/giọng đọc đồng nhất hơn; đánh giá vận hành, bảo mật, chi phí phần cứng và tải trước khi thay Web Speech.
5. Bổ sung kiểm thử trình duyệt tự động với giả lập SpeechRecognition/SpeechSynthesis và kiểm tra biên dịch Edge Function khi có Deno.
6. Khởi tạo hoặc khôi phục Git repository hợp lệ trước khi phát hành để có thể review diff, lưu mốc và rollback an toàn.
