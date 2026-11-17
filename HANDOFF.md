# HANDOFF

**Cập nhật:** 17/11/2026  
**Thư mục dự án:** `C:\Users\Hi\Documents\Quản Lý Hiệu Quả Công Việc_Ban QLDA`

## Cập nhật 17/11/2026 - Ổn định chuyển trạng thái Công việc online

- Đã xác định lỗi giao diện cụ thể với công việc được giao kiểu cũ: `script.js` vẫn điều hướng tới `assignmentTaskForm`/`taskInboxDialog` trong khi các phần tử này không còn trong `index.html`, làm nút Cập nhật không mở được biểu mẫu. Các đường mở từ thẻ công việc, chi tiết, lịch sử và Luna nay tự dùng biểu mẫu Công việc thống nhất; chỉ dùng giao diện cũ khi toàn bộ workspace cũ thực sự tồn tại.
- Chế độ tương thích giữ nguyên `kind=assigned`, phản hồi giao việc và nội dung cũ; cập nhật tiến độ không chuyển nhầm loại công việc hoặc xóa phản hồi lịch sử. Các hàm inbox cũ có chốt null để không phát sinh lỗi JavaScript nếu bị gọi từ dữ liệu/đường dẫn cũ.
- Khi đang online, mọi lần sửa công việc kiểm tra Edge Function tối thiểu `2026.11.17.2` trước khi thay đổi dữ liệu cục bộ, sau đó chủ động chờ kết quả đồng bộ. Nếu máy chủ từ chối đúng bản ghi hoặc có xung đột, biểu mẫu không báo hoàn tất và dữ liệu hợp lệ từ máy chủ được giữ lại; khi mất kết nối, hệ thống thông báo rõ thay đổi đang chờ đồng bộ.
- Edge Function chỉ nhận các trạng thái tiến độ hợp lệ (`Chuẩn bị thực hiện`, `Chưa bắt đầu` legacy, `Đang thực hiện`, `Hoàn thành`); `Quá hạn` tiếp tục là trạng thái dẫn xuất theo thời hạn và được chuẩn hóa về trạng thái làm việc trước khi lưu. Quyền người thực hiện, người phối hợp, quản lý đúng phòng, Ban giám đốc và quy tắc riêng GPMB vẫn được giữ nguyên.
- Thêm `tools/verify-task-status-online.js`; toàn bộ quality gate đạt **68 script xác minh** và **81 kiểm tra cú pháp JavaScript**. Phiên bản mã nguồn hiện tại: frontend/PWA `3.4.147`, Edge Function `2026.11.17.2`; không có migration SQL mới.
- Kiểm tra production lúc 17/11/2026: frontend `3.4.140`, Edge Function `2026.11.11.3`, revision trạng thái chính `2331`; projection revision `2221`, `synchronized=false`. Production chưa có bản sửa này. Đơn vị vận hành trung tâm phải phát hành Edge `2026.11.17.2` trước, frontend `3.4.147` sau, rồi xác nhận projection đồng bộ và kiểm thử bằng tài khoản thật.

## Cập nhật 17/11/2026 - Chặn từ chối đồng bộ nền và chẩn đoán đúng phân hệ

- Thông báo `Máy chủ không chấp nhận thay đổi ở Dữ liệu hệ thống` là kết quả Edge Function từ chối một patch không hợp lệ theo quyền, sau đó frontend khôi phục bản hợp lệ trên máy chủ. Nhãn chung xuất hiện do frontend thiếu tên cho GPMB, Hồ sơ GPMB, Dự án đầu tư công và Thông báo.
- Đã bổ sung tên hiển thị cho toàn bộ 17 collection và 12 scalar field đồng bộ. Edge Function trả lý do cụ thể theo collection; frontend phân biệt lỗi quyền Quy trình GPMB, Hồ sơ GPMB, Quản lý/Thẩm định dự án và xác nhận thông báo.
- Đã chặn các migration tương thích dữ liệu cũ tự động sửa snapshot khi trang online khởi động. Tài khoản không phải Admin khi chỉnh Nhân sự cũng không còn tự gửi kèm thay đổi collection Tài khoản vượt quyền.
- Thêm `tools/verify-online-sync-denials.js` để bảo đảm mọi scope/field có nhãn cụ thể, migration nền bị khóa online, và client/server dùng cùng mã lý do. Quality gate đạt **67 script xác minh** và **80 kiểm tra cú pháp JavaScript**.
- Phiên bản mã nguồn hiện tại: frontend/PWA `3.4.146`, Edge Function `2026.11.17.1`. Không có migration SQL mới trong bản sửa này.
- Kiểm tra chỉ-đọc production lúc 17/11/2026: frontend vẫn là `3.4.140`, Edge Function `2026.11.11.3`, revision trạng thái chính `2318`; record projection revision `2221` và `synchronized=false`. Vì máy người dùng không quản trị máy chủ, bản sửa chỉ có hiệu lực online sau khi đơn vị vận hành trung tâm phát hành Edge `2026.11.17.1` trước, frontend `3.4.146` sau, rồi xác nhận projection đã đồng bộ.

## Cập nhật 13/11/2026 - Quản lý dự án đầu tư công

- Đã gộp **Thẩm định dự án đầu tư công** vào phân hệ **Dự án đầu tư công** dưới hai tab nội bộ `Quản lý dự án` và `Thẩm định dự án`. Desktop và mobile chỉ còn một mục điều hướng; đường dẫn/trạng thái cũ của mục Thẩm định được tự chuyển sang đúng tab để không làm gián đoạn người dùng.
- Quyền cấu hình của hai mục cũ được hợp nhất an toàn vào một module `public-investment-projects` theo nguyên tắc giữ quyền nếu tài khoản đã có quyền ở một trong hai mục. Dữ liệu thẩm định và dữ liệu quản lý dự án vẫn giữ nguyên các collection/bảng hiện có, không cần di chuyển hay xóa bản ghi.
- Đã thêm phân hệ **Quản lý dự án đầu tư công** dùng chung Danh mục dự án, không tạo danh mục độc lập. Một dự án có một hồ sơ số xuyên suốt 6 giai đoạn: chuẩn bị đầu tư, thẩm định/quyết định đầu tư, chuẩn bị thực hiện, thực hiện, nghiệm thu/bàn giao và quyết toán/kết thúc.
- Hồ sơ có tổng quan, cổng kiểm soát giai đoạn, checklist pháp lý, mốc tiến độ, vướng mắc/rủi ro, liên kết Công việc - Thẩm định - GPMB - Lưu trữ và lịch sử thay đổi. Giai đoạn sau chỉ được mở khi giai đoạn trước hoàn thành và các điều kiện pháp lý bắt buộc đã Đạt/Không áp dụng.
- Quyền tạo/quản lý áp dụng cho Admin, Ban giám đốc, Trưởng/Phó phòng và Trưởng bộ phận/nhóm trong phạm vi phòng; nhân sự được phân công chỉ xem/cập nhật phần nghiệp vụ được phép. Edge Function kiểm tra lại toàn bộ quyền, phạm vi phòng, người phụ trách, liên kết hồ sơ và cổng giai đoạn trước khi lưu.
- Đã thêm bảng projection `public.public_investment_projects` qua migration `supabase/migrations/20261113000000_public_investment_projects.sql`; dữ liệu gốc vẫn nằm trong trạng thái đồng bộ trung tâm và bảng projection phục vụ tra cứu/báo cáo.
- Phiên bản hiện tại: frontend/PWA `3.4.143`, Edge Function `2026.11.13.2`, module settings version `6`.
- Đã kiểm thử giao diện bằng chế độ cục bộ `http://127.0.0.1:4175/?offline=1` trên desktop/mobile; biểu mẫu thẩm định mở đầy đủ, menu mobile chỉ còn một mục Dự án đầu tư công và không có lỗi console. Toàn bộ quality gate đạt: **66 script xác minh** và **79 kiểm tra cú pháp JavaScript/TypeScript**.
- Chưa triển khai production trong phiên làm việc này. Khi phát hành phải triển khai migration, Edge Function và frontend cùng một đợt; sau đó xác nhận endpoint version/status trước khi cho người dùng thao tác.

## Mục tiêu dự án

Ứng dụng web quản lý nhân sự, công việc, KPI, lịch và quy trình GPMB cho Ban Quản lý Dự án đầu tư - hạ tầng xã Phúc Thịnh. Giao diện chính dùng HTML/CSS/JavaScript; dữ liệu dùng Supabase Postgres/Storage và Edge Function `kpi-sync`, với các quyền được kiểm tra ở máy chủ. Luna hỗ trợ tra cứu, báo cáo, nhắc việc và các luồng tạo/cập nhật có kiểm tra quyền, xác nhận trước khi lưu.

## Đã hoàn thành

- Hệ thống hiện có các mục Nhân sự, Công việc, KPI, Lịch, Bảng tin, Quy chế, GPMB, thông báo, báo cáo và PWA; luồng phân quyền và đồng bộ nằm trong giao diện cùng Edge Function.
- Luna có tra cứu AI theo dữ liệu tài khoản được phép xem, lịch sử hội thoại lưu cục bộ 7 ngày, nguồn cho tra cứu web, thông báo và các luồng hội thoại từng bước tạo/cập nhật công việc. Thay đổi công việc vẫn dùng luồng lưu hiện tại và phải xác nhận.
- Luna dùng lại nhận dạng `SpeechRecognition`/`webkitSpeechRecognition` và đọc `SpeechSynthesisUtterance` tích hợp của trình duyệt/thiết bị. Nhận dạng tiếng Việt chạy theo lượt khi người dùng bấm **Nói**, hiện bản nhận dạng tạm, tự dừng sau 20 giây và xử lý các lỗi quyền, micro, mạng, ngôn ngữ; không ghi/đẩy âm thanh qua Edge Function của ứng dụng.
- Đọc giọng dùng voice `vi-VN` có sẵn trên máy và ưu tiên giọng Việt có tên phù hợp nếu trình duyệt cung cấp. Không thể ép cùng một chất giọng/giới tính/ngữ điệu trên mọi máy; hỗ trợ nhận dạng tùy nền tảng, Siri/Đọc chính tả có thể cần bật trong Safari. Không nghe nền liên tục; nếu chỉ gọi “Luna ơi”, cần bấm **Nói** lại để gửi yêu cầu.
- Đã bỏ hai action audio `luna-transcribe`/`luna-synthesize` cùng cấu hình Azure; mã nguồn frontend/PWA hiện tại là `3.4.147`, Edge Function là `2026.11.17.2`.
- Đã bổ sung kiểm tra hồi quy quyền cập nhật tiến độ theo vai trò/phòng ban và sửa luồng duyệt gia hạn để không chuẩn hóa, làm biến đổi trạng thái legacy trước khi xác thực các trường được phép.
- Đã thêm endpoint `action=version` chỉ đọc phiên bản triển khai để frontend làm mới thông tin trước luồng đề nghị/duyệt gia hạn, tránh quyết định dựa trên phiên bản lưu đệm cũ.
- Lỗi từ chối cập nhật công việc hiện được phân biệt thành quyền mục Công việc chưa bật hoặc tài khoản ngoài phạm vi; giao diện hướng dẫn kiểm tra cấu hình quyền hay liên kết tài khoản-nhân sự/phòng ban.
- Xác minh local: 68 `tools/verify-*.js` đạt, 81 kiểm tra cú pháp đạt. Kiểm thử Playwright ở viewport 455×842 xác nhận thanh đầu trang mobile cao 72px, ảnh 1920×86 phủ đủ vùng 455×71 theo tâm và không còn bị co thành dải nhỏ.
- Đã bổ sung `Supabase-Login.cmd` để đăng nhập CLI trong cửa sổ riêng không tự đóng, `Deploy-KpiSync-Interactive.cmd` để triển khai có giữ kết quả, và chỉnh `Deploy-KpiSync.ps1 -Login` chỉ đăng nhập, không tự chạy migration/deploy.

## Đang làm dở / Chưa triển khai

- Kiểm tra production ngày 17/11/2026: trang đang phục vụ frontend `3.4.140`; Edge Function `action=status` báo `2026.11.11.3`, revision `2331`, `gpmbWorkflows=true`, `recordProjection.available=true` nhưng `recordProjection.synchronized=false` và projection mới ở revision `2221`. Production chưa có bản sửa `3.4.147` / `2026.11.17.2`.
- Đã tìm được lỗi cụ thể của duyệt gia hạn: server chuẩn hóa trạng thái legacy `Quá hạn` thành trạng thái làm việc trước khi kiểm tra chuyển tiếp duyệt chỉ-đổi-các-trường-duyệt. Việc đổi trường ngoài danh sách cho phép khiến backend từ chối và khôi phục. Đã sửa ở mã nguồn local, có regression test.
- Quy tắc backend hiện cho phép người thực hiện/người phối hợp cập nhật tiến độ, quản lý trong phạm vi phòng và Ban giám đốc; người ngoài phạm vi bị từ chối. Ma trận này đã được kiểm thử. Đã tách lý do từ chối giữa mục Công việc chưa được bật và tài khoản ngoài phạm vi để khoanh vùng cấu hình/liên kết sau phát hành.
- Chưa triển khai bản hiện tại lên production. Máy người dùng không quản trị máy chủ và không được giữ access token/secret production. Đơn vị vận hành kho nguồn/CI trung tâm phải phát hành Edge Function `2026.11.17.2` trước, sau đó frontend `3.4.147`, xác nhận projection đã đồng bộ rồi kiểm thử bằng tài khoản thật theo ma trận quyền. Bản sửa không có migration mới.
- Edge Function đã bổ sung hòa giải cập nhật tiến độ công việc GPMB: giữ nguyên metadata quy trình mới nhất trên máy chủ, chỉ nhận các trường tiến độ hợp lệ từ thiết bị cũ; người ngoài phạm vi và yêu cầu đổi mã quy trình/bước vẫn bị từ chối. Có kiểm thử hồi quy cho người thực hiện, người phối hợp, quản lý phòng và tài khoản ngoài phạm vi.
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

Mở `http://localhost:4173`. Để kiểm thử tách biệt hoàn toàn khỏi máy chủ, mở `http://localhost:4173/?offline=1`; chế độ này chỉ được chấp nhận trên `localhost`, `127.0.0.1` hoặc `::1`. Để chọn cổng khác, đặt `$env:PORT` trước khi chạy. Dùng tài khoản Supabase hợp lệ và cấu hình `supabase-config.js` phù hợp nếu cần kiểm thử online; không chép secret máy chủ vào file này.

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
2. Không có migration SQL mới cho bản này. Đơn vị vận hành dùng quy trình CI/kho nguồn trung tâm để triển khai Edge Function `2026.11.17.2`.
3. Kiểm tra endpoint `action=version` trả `2026.11.17.2` và `action=status` báo projection đồng bộ trước khi phát hành giao diện.
4. Xuất bản frontend `3.4.147` lên hosting theo quy trình hiện hành; triển khai asset trước, HTML/service worker sau để hạn chế trộn phiên bản.
5. Sau khi deploy, kiểm thử trên Chrome, Edge, Safari qua HTTPS: quyền micro, nhận dạng tiếng Việt, dừng/hủy/đổi tài khoản, giọng đọc native, tắt đọc, và xác nhận lưu tạo/cập nhật công việc. Khi API nhận dạng không khả dụng, xác nhận người dùng vẫn có thể nhập chữ.

Hướng dẫn chi tiết về Luna: `LUNA-AI-DEPLOYMENT.md`. Hướng dẫn Supabase tổng quát: `SUPABASE_DEPLOYMENT.md`.

## Các bước tiếp theo

1. Đơn vị vận hành trung tâm triển khai Edge Function `2026.11.17.2`; xác nhận version/status và đồng bộ projection.
2. Xuất bản frontend `3.4.147` lên hosting; kiểm tra cache/service worker và endpoint `action=version`.
3. Kiểm thử bằng tài khoản thật: nhân viên cập nhật tiến độ công việc mình/phối hợp; quản lý duyệt đề nghị gia hạn cùng phòng; người đề nghị không tự duyệt; phòng khác bị chặn; hồ sơ legacy đang `Quá hạn` vẫn duyệt được. Ghi lại denied reason nếu trường hợp hợp lệ còn bị từ chối.
4. Thực hiện kiểm thử người dùng trên Chrome/Edge/Safari và hệ điều hành thực tế; ghi nhận hỗ trợ `vi-VN`, giọng hệ thống, quyền micro và fallback chữ.
5. Cân nhắc phương án tự host chỉ khi đơn vị cần kiểm soát dịch vụ nhận dạng/giọng đọc đồng nhất hơn; đánh giá vận hành, bảo mật, chi phí phần cứng và tải trước khi thay Web Speech.
6. Bổ sung kiểm thử trình duyệt tự động với giả lập SpeechRecognition/SpeechSynthesis và kiểm tra biên dịch Edge Function khi có Deno.
7. Khởi tạo hoặc khôi phục Git repository hợp lệ trước khi phát hành để có thể review diff, lưu mốc và rollback an toàn.
