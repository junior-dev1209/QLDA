// 
<!-- ================================================================= -->
<!-- 🛠️ BẬT/TẮT CHẾ ĐỘ BẢO TRÌ (Đổi true thành false để mở lại web) -->
<!-- ================================================================= -->
<script>
  const DANG_BAO_TRI = true; // 👈 Đổi thành false khi muốn mở lại trang web

  if (DANG_BAO_TRI) {
    document.addEventListener("DOMContentLoaded", () => {
      // Dừng tất cả các tiến trình kết nối và đè giao diện bảo trì lên toàn bộ màn hình
      document.body.innerHTML = `
        <div style="
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background-color: #0f172a; color: #ffffff; display: flex; flex-direction: column;
          align-items: center; justify-content: center; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          z-index: 9999999; text-align: center; padding: 20px; box-sizing: border-box;
        ">
          <div style="font-size: 72px; margin-bottom: 20px; animation: pulse 2s infinite;">🛠️</div>
          <h1 style="font-size: 28px; margin: 0 0 12px 0; color: #38bdf8; font-weight: 700;">
            HỆ THỐNG ĐANG BẢO TRÌ BẢO DƯỠNG
          </h1>
          <p style="font-size: 16px; color: #94a3b8; max-width: 520px; line-height: 1.6; margin: 0 0 24px 0;">
            Hệ thống Quản lý Ban QLDA đang được cập nhật và nâng cấp dữ liệu. 
            Vui lòng quay lại sau ít phút!
          </p>
          <div style="
            display: inline-block; padding: 8px 16px; background-color: #1e293b; 
            border: 1px solid #334155; border-radius: 20px; font-size: 13px; color: #cbd5e1;
          ">
            ⏱️ Dự kiến hoàn thành trong thời gian ngắn
          </div>
        </div>
      `;
    });
  }
</script>
<!-- ================================================================= --> 

Đảm bảo dòng khai báo là:

JavaScript
const DANG_BAO_TRI = true;

Khi mọi thứ đã hoàn hảo, mở lại file index.html:

Đổi dòng khai báo thành:

JavaScript
const DANG_BAO_TRI = false;