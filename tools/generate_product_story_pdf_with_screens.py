from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

import generate_product_story_pdf as base


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Ho_so_gioi_thieu_he_thong_quan_ly_cong_viec_anh_giao_dien_thuc_te.pdf"
SCREENS = ROOT / "tmp" / "current-ui-reference"
IMAGES = {
    "dashboard": SCREENS / "dashboard.png",
    "tasks": SCREENS / "tasks.png",
    "task_form": SCREENS / "task-form.png",
    "calendar": SCREENS / "calendar.png",
    "kpi": SCREENS / "kpi.png",
    "daily": SCREENS / "daily-report.png",
    "monthly": SCREENS / "monthly-report.png",
    "task_detail": SCREENS / "task-detail.png",
}
PAGE_W, PAGE_H, M = base.PAGE_W, base.PAGE_H, base.M
COLORS = base.COLORS


def draw_screen(pdf, image_path, x, y, width, height, caption, accent=COLORS["teal"], crop=None, fit=False):
    base.rounded(pdf, x, y, width, height, white, COLORS["line"], 8)
    inner_x, inner_y = x + 7, y + 26
    inner_w, inner_h = width - 14, height - 34
    pdf.setFillColor(HexColor("#EEF4F6"))
    pdf.roundRect(inner_x, inner_y, inner_w, inner_h, 4, fill=1, stroke=0)
    reader = ImageReader(str(image_path))
    image_w, image_h = reader.getSize()
    if crop:
        crop_x, crop_top, crop_w, crop_h = crop
        scale = min(inner_w / crop_w, inner_h / crop_h) if fit else max(inner_w / crop_w, inner_h / crop_h)
        draw_x = inner_x - crop_x * scale
        draw_y = inner_y - (image_h - crop_top - crop_h) * scale
        draw_w, draw_h = image_w * scale, image_h * scale
    else:
        scale = min(inner_w / image_w, inner_h / image_h) if fit else max(inner_w / image_w, inner_h / image_h)
        draw_w, draw_h = image_w * scale, image_h * scale
        draw_x = inner_x + (inner_w - draw_w) / 2
        draw_y = inner_y + (inner_h - draw_h) / 2
    pdf.saveState()
    clip = pdf.beginPath()
    clip.rect(inner_x, inner_y, inner_w, inner_h)
    pdf.clipPath(clip, stroke=0, fill=0)
    pdf.drawImage(reader, draw_x, draw_y, draw_w, draw_h, mask="auto")
    pdf.restoreState()
    pdf.setFillColor(accent)
    pdf.setFont("Arial-Bold", 7.1)
    pdf.drawString(x + 10, y + 8, caption)


def note_card(pdf, x, y, w, h, marker, title, body, accent, tint):
    base.feature_card(pdf, x, y, w, h, marker, title, body, accent, tint)


def compact_note(pdf, x, y, w, h, marker, title, body, accent, tint):
    base.rounded(pdf, x, y, w, h, white, COLORS["line"], 5)
    pdf.setFillColor(accent)
    pdf.roundRect(x, y, 4, h, 2, fill=1, stroke=0)
    base.pill(pdf, x + 13, y + h - 20, marker, accent, tint, 28)
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 7.8)
    pdf.drawString(x + 49, y + h - 14, title)
    base.text(pdf, x + 13, y + h - 25, w - 24, body, size=6.25, color=COLORS["muted"], leading=7.6, max_lines=2)


def screen_note(pdf, y):
    base.rounded(pdf, M, y, PAGE_W - 2 * M, 28, COLORS["paper"], COLORS["line"], 5)
    pdf.setFillColor(COLORS["teal"])
    pdf.setFont("Arial-Bold", 7.1)
    pdf.drawString(M + 12, y + 10.5, "ẢNH GIAO DIỆN HIỆN HÀNH")
    pdf.setFillColor(COLORS["muted"])
    pdf.setFont("Arial", 7.1)
    pdf.drawString(M + 158, y + 10.5, "Chụp từ mã giao diện phiên bản 3.1.4 trong phiên cục bộ tách biệt; dữ liệu được nạp tạm chỉ để làm rõ bố cục và luồng sử dụng.")


def cover(pdf):
    pdf.setFillColor(COLORS["teal_dark"])
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#10788A"))
    pdf.circle(PAGE_W - 56, PAGE_H - 46, 164, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#0A5361"))
    pdf.circle(PAGE_W - 12, 60, 145, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#B9E3E8"))
    pdf.setFont("Arial-Bold", 8)
    pdf.drawString(M, PAGE_H - 38, "BAN QUẢN LÝ DỰ ÁN ĐẦU TƯ - HẠ TẦNG XÃ PHÚC THỊNH")
    base.pill(pdf, M, PAGE_H - 76, "HỒ SƠ TRẢI NGHIỆM HỆ THỐNG", COLORS["teal_dark"], HexColor("#D9F0F1"), 171)
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 26)
    pdf.drawString(M, PAGE_H - 122, "Một hệ thống để điều hành")
    pdf.drawString(M, PAGE_H - 153, "công việc đến cùng")
    base.text(pdf, M, PAGE_H - 173, 406, "Giao đúng việc. Theo dõi đúng mốc. Nhìn đúng tình hình để ra quyết định đúng lúc.", size=11, color=HexColor("#D8EFF2"), leading=14, max_lines=3)
    draw_screen(pdf, IMAGES["dashboard"], 507, 80, 280, 438, "TỔNG QUAN HIỆN HÀNH - THỐNG KÊ, BIỂU ĐỒ VÀ CẢNH BÁO", HexColor("#D9F0F1"), crop=(0, 0, 1062, 1510))
    statements = [
        ("Giao", "đúng người"),
        ("Theo dõi", "đúng mốc"),
        ("Ra quyết định", "đúng lúc"),
    ]
    for index, (top, bottom) in enumerate(statements):
        x = M + index * 145
        pdf.setFillColor(HexColor("#D9F0F1"))
        pdf.circle(x + 9, 94, 5, fill=1, stroke=0)
        pdf.setFillColor(white)
        pdf.setFont("Arial-Bold", 9)
        pdf.drawString(x + 22, 98, top)
        pdf.setFillColor(HexColor("#C6E7EB"))
        pdf.setFont("Arial", 8.2)
        pdf.drawString(x + 22, 83, bottom)
    pdf.setFillColor(HexColor("#B9E3E8"))
    pdf.setFont("Arial", 7)
    pdf.drawString(M, 39, "Tài liệu giới thiệu các chức năng đang có của hệ thống")
    pdf.drawRightString(PAGE_W - M, 39, "28/09/2026 | Phiên bản 3.1.4")


def task_form(pdf):
    base.page_header(pdf, 2, "Giao việc", "Giao việc đầy đủ bối cảnh ngay từ đầu", "Ảnh giao diện thực tế cho thấy các trường về trách nhiệm, thời hạn, trạng thái, tiến độ và theo dõi điều hành được đặt trong cùng một luồng.")
    base.section_title(pdf, M, 466, "01. Biểu mẫu công việc", "Một bản việc có đủ thông tin để triển khai", "Người thực hiện và người điều hành cùng nhìn một cách hiểu về mục tiêu, thời hạn, kết quả và nội dung cần phối hợp.")
    draw_screen(pdf, IMAGES["task_form"], M, 75, PAGE_W - 2 * M, 329, "THÊM CÔNG VIỆC - GIAO DIỆN HIỆN HÀNH", COLORS["blue"], fit=True)
    notes = [
        ("A", "Bối cảnh", "Tên việc, dự án, danh mục KPI, người thực hiện và người phối hợp.", COLORS["blue"], COLORS["blue_tint"]),
        ("B", "Tiến độ", "Ba trạng thái tác nghiệp, tiến độ, đánh giá chất lượng, hồ sơ và nội dung báo cáo.", COLORS["green"], COLORS["green_tint"]),
        ("C", "Điều hành", "Mốc cập nhật, trở ngại, đề nghị hỗ trợ và công việc phụ thuộc ngay trong bản việc.", COLORS["amber"], COLORS["amber_tint"]),
    ]
    for index, item in enumerate(notes):
        compact_note(pdf, M + index * 258, 32, 245, 40, *item)
    base.footer(pdf, 2)


def work_board(pdf):
    base.page_header(pdf, 3, "Theo dõi công việc", "Công việc được tổ chức theo trạng thái và luồng phê duyệt", "Màn hình Công việc kết hợp hàng chờ phê duyệt, bộ lọc, nhóm trạng thái và các thẻ công việc để người dùng hành động ngay trên phần việc có trách nhiệm.")
    base.section_title(pdf, M, 466, "02. Bảng điều hành công việc", "Từ hàng chờ phê duyệt đến việc quá hạn", "Đây là giao diện vận hành hằng ngày cho phân công, theo dõi, mở chi tiết, cập nhật và đánh giá hoàn thành.")
    draw_screen(pdf, IMAGES["task_detail"], M, 109, PAGE_W - 2 * M, 292, "DANH MỤC CÔNG VIỆC - HÀNG CHỜ PHÊ DUYỆT, BỘ LỌC VÀ THẺ CÔNG VIỆC", COLORS["teal"], crop=(0, 0, 1440, 760))
    info = [
        ("1", "Chờ phê duyệt", "Các việc đã hoàn thành được tập trung để người có thẩm quyền đánh giá.", COLORS["amber"], COLORS["amber_tint"]),
        ("2", "Lọc đúng phạm vi", "Tìm kiếm, dự án, trạng thái và khoảng thời gian giúp đưa đúng việc cần xử lý lên trước.", COLORS["blue"], COLORS["blue_tint"]),
        ("3", "Quá hạn do hệ thống nhận diện", "Người dùng cập nhật tiến độ và hoàn thành; hệ thống tính tín hiệu quá hạn theo mốc thời hạn.", COLORS["red"], COLORS["red_tint"]),
    ]
    for index, item in enumerate(info):
        compact_note(pdf, M + index * 258, 37, 245, 48, *item)
    base.footer(pdf, 3)


def overview(pdf):
    base.page_header(pdf, 4, "Tổng quan điều hành", "Một màn hình để nhìn khối lượng, hiệu quả và cảnh báo", "Ảnh Tổng quan thể hiện các chỉ số, thống kê theo dự án/nhân sự, biểu đồ phân tích, KPI phòng và danh sách cảnh báo trong cùng một không gian.")
    base.section_title(pdf, M, 466, "03. Tổng quan", "Quét nhanh tình hình, mở sâu khi cần", "Phạm vi hiển thị được lựa chọn theo kỳ đánh giá hoặc toàn bộ; các bảng mở được chi tiết theo phòng, dự án và nhân sự.")
    draw_screen(pdf, IMAGES["dashboard"], M, 75, 516, 330, "TỔNG QUAN HIỆN HÀNH - CHỈ SỐ, THỐNG KÊ DỰ ÁN VÀ BIỂU ĐỒ", COLORS["teal"], crop=(0, 0, 1062, 700))
    right_x = 570
    note_card(pdf, right_x, 331, 232, 74, "A", "Bộ lọc dẫn dắt cách đọc số liệu", "Theo kỳ đánh giá, toàn bộ dữ liệu, phòng, dự án hoặc nhân sự đều nằm sát chỉ số cần xem.", COLORS["blue"], COLORS["blue_tint"])
    note_card(pdf, right_x, 244, 232, 74, "B", "Chỉ số mở được chi tiết", "Các ô thống kê và dòng bảng dẫn tới popup/bảng chi tiết, có thể xuất Excel theo phạm vi được xem.", COLORS["green"], COLORS["green_tint"])
    note_card(pdf, right_x, 157, 232, 74, "C", "Biểu đồ và cảnh báo cùng nguồn dữ liệu", "Phân tích hiệu quả, tải việc, phân loại KPI và cảnh báo xử lý sử dụng chung dữ liệu công việc.", COLORS["amber"], COLORS["amber_tint"])
    base.footer(pdf, 4)


def calendar(pdf):
    base.page_header(pdf, 5, "Lịch công việc", "Lịch tổng và lịch của tôi trong cùng một màn hình", "Ảnh Lịch công việc cho thấy điều hướng tuần, bộ lọc lãnh đạo/phòng, nhắc trước và bảng lịch có thành phần tham dự rõ ràng.")
    base.section_title(pdf, M, 466, "04. Điều phối thời gian", "Nhìn lịch chung, theo dõi phần việc của mình", "Lịch tổng giúp điều hành viên rà soát hoạt động toàn đơn vị; Lịch của tôi tập trung lịch mà người dùng là lãnh đạo, thành phần tham dự hoặc phòng chuẩn bị.")
    draw_screen(pdf, IMAGES["calendar"], M, 84, 493, 328, "LỊCH CÔNG VIỆC HIỆN HÀNH - TUẦN, BỘ LỌC, NHẮC LỊCH VÀ THÀNH PHẦN THAM DỰ", COLORS["teal"], fit=True)
    right_x = 550
    note_card(pdf, right_x, 338, 252, 74, "A", "Từng lịch có lựa chọn nhắc", "Có thể bật hoặc tắt nhắc cho từng công việc/cuộc họp; cấu hình nhắc trước 5, 15, 30, 60 phút.", COLORS["green"], COLORS["green_tint"])
    note_card(pdf, right_x, 251, 252, 74, "B", "Đúng thông tin cần phối hợp", "Nội dung, thời gian, địa điểm, lãnh đạo, phòng chuẩn bị và thành phần tham dự nằm cùng một dòng lịch.", COLORS["blue"], COLORS["blue_tint"])
    note_card(pdf, right_x, 164, 252, 74, "C", "Đúng quyền thao tác", "Admin, Ban giám đốc hoặc tài khoản được cấp quyền có thể quản lý lịch; các tài khoản còn lại xem Lịch tổng.", COLORS["amber"], COLORS["amber_tint"])
    base.footer(pdf, 5)


def kpi(pdf):
    base.page_header(pdf, 6, "KPI và đánh giá", "KPI có biểu mẫu, quy tắc và lịch sử kết quả", "Giao diện KPI cá nhân dưới đây thể hiện trường kỳ đánh giá, nhân sự, KPI phòng, điểm cộng/trừ, xếp loại và bảng kết quả có thể tra cứu.")
    base.section_title(pdf, M, 466, "05. KPI", "Từ công việc đến đánh giá có căn cứ", "Danh mục KPI cá nhân và KPI phòng cùng sử dụng dữ liệu công việc, quy trình đánh giá hoàn thành và điều chỉnh theo quy chế.")
    draw_screen(pdf, IMAGES["kpi"], M, 78, 490, 333, "KPI CÁ NHÂN HIỆN HÀNH - KỲ, ĐIỀU CHỈNH ĐIỂM, XẾP LOẠI VÀ BẢNG KẾT QUẢ", COLORS["green"], crop=(0, 0, 1062, 955))
    right_x = 548
    note_card(pdf, right_x, 337, 254, 74, "A", "Kỳ đánh giá là phạm vi gốc", "Người dùng chọn kỳ và nhân sự để xem hoặc đánh giá; KPI phòng được liên kết theo đơn vị.", COLORS["blue"], COLORS["blue_tint"])
    note_card(pdf, right_x, 250, 254, 74, "B", "Điểm cộng/trừ có quy chế", "Các tiêu chí thưởng, kỷ luật và tác phong có mức điểm rõ ràng và mở được phần chi tiết.", COLORS["amber"], COLORS["amber_tint"])
    note_card(pdf, right_x, 163, 254, 74, "C", "Kết quả có thể tổng hợp", "Điểm KPI, xếp loại, dữ liệu phòng và nhân sự được đưa vào Tổng quan và báo cáo theo phạm vi quyền xem.", COLORS["teal"], COLORS["navy_tint"])
    base.footer(pdf, 6)


def reports(pdf):
    base.page_header(pdf, 7, "Báo cáo công việc", "Báo cáo ngày và tháng lấy từ cùng nguồn dữ liệu", "Hai ảnh dưới đây là bố cục báo cáo hiện hành. Số liệu được tổng hợp theo quy tắc phát sinh, đến hạn, hoàn thành và phê duyệt đã cấu hình trong hệ thống.")
    base.section_title(pdf, M, 466, "06. Báo cáo", "Từ số liệu vận hành đến tài liệu sẵn sàng sử dụng", "Báo cáo được xuất PDF; các popup Tổng quan có thể xuất Excel. Một công việc chỉ được tính một lần, dù có nhiều người phối hợp.")
    draw_screen(pdf, IMAGES["daily"], M, 141, 370, 245, "BÁO CÁO CÔNG VIỆC HÀNG NGÀY - CHỈ SỐ, PHÒNG, DỰ ÁN VÀ DANH SÁCH VIỆC", COLORS["blue"], crop=(0, 0, 900, 570))
    draw_screen(pdf, IMAGES["monthly"], 427, 141, 375, 245, "BÁO CÁO CÔNG VIỆC HÀNG THÁNG - TỔNG HỢP PHÒNG VÀ NHÂN VIÊN", COLORS["teal"], crop=(0, 0, 900, 570))
    rules = [
        ("Không nhân bản", "Một công việc chỉ được tính một lần, kể cả có nhiều người phối hợp."),
        ("Đúng phạm vi", "Theo ngày/tháng/kỳ báo cáo đã chọn và quyền của người xuất."),
        ("Đủ dấu mốc", "Bao gồm phát sinh, cập nhật, đến hạn, hoàn thành và phê duyệt theo quy tắc báo cáo."),
        ("Mở được chi tiết", "Dòng thống kê dẫn về bảng chi tiết; popup Tổng quan hỗ trợ xuất Excel."),
    ]
    base.rounded(pdf, M, 60, PAGE_W - 2 * M, 57, COLORS["paper"], COLORS["line"], 7)
    for index, (title, body) in enumerate(rules):
        x = M + 15 + index * 191
        pdf.setFillColor(COLORS["teal"])
        pdf.circle(x + 5, 87, 4, fill=1, stroke=0)
        pdf.setFillColor(COLORS["ink"])
        pdf.setFont("Arial-Bold", 7.7)
        pdf.drawString(x + 15, 91, title)
        base.text(pdf, x + 15, 80, 169, body, size=6.7, color=COLORS["muted"], leading=8.1, max_lines=3)
    base.footer(pdf, 7)


def controls(pdf):
    base.page_header(pdf, 8, "Vận hành tin cậy", "Giao diện được bảo vệ bởi quyền, phiên và lịch sử hoạt động", "Khung ứng dụng hiện hành cho thấy các nhóm chức năng được tổ chức theo vai trò; phía sau đó là kiểm tra phiên, kiểm soát phiên bản dữ liệu và phân quyền thao tác.")
    base.section_title(pdf, M, 466, "07. Kiểm soát vận hành", "Ổn định là giữ đúng dữ liệu và đúng quyền", "Hệ thống hạn chế xung đột khi nhiều người cùng thao tác và duy trì trải nghiệm khi kết nối tạm thời không ổn định.")
    draw_screen(pdf, IMAGES["task_detail"], M, 100, 425, 298, "KHUNG ỨNG DỤNG HIỆN HÀNH - MENU, QUYỀN, LỌC VÀ THAO TÁC", COLORS["teal"], crop=(0, 0, 1440, 760))
    controls = [
        ("1", "Một tài khoản, một phiên", "Thiết bị đăng nhập mới thay phiên cũ để bảo vệ tài khoản.", COLORS["blue"], COLORS["blue_tint"]),
        ("2", "Kiểm tra trước khi lưu", "Máy chủ đối chiếu phiên bản dữ liệu để hạn chế ghi đè thay đổi mới hơn.", COLORS["teal"], COLORS["navy_tint"]),
        ("3", "Mạng gián đoạn vẫn làm việc", "Phiên cục bộ và dữ liệu đã lưu được duy trì để xác minh lại khi kết nối khôi phục.", COLORS["amber"], COLORS["amber_tint"]),
        ("4", "Lịch sử để tra cứu", "Các hành động chính được ghi thành dòng thời gian phục vụ kiểm tra và đối chiếu.", COLORS["green"], COLORS["green_tint"]),
    ]
    for index, item in enumerate(controls):
        compact_note(pdf, 490, 334 - index * 71, 312, 61, *item)
    base.footer(pdf, 8)


def roles(pdf):
    base.page_header(pdf, 9, "Giá trị theo vai trò", "Một nguồn dữ liệu, các điểm bắt đầu phù hợp", "Hệ thống đưa từng nhóm người dùng đến đúng phần việc cần làm, nhưng vẫn tạo được dữ liệu thống nhất cho điều hành toàn Ban.")
    base.section_title(pdf, M, 466, "08. Trải nghiệm sử dụng", "Người dùng hiểu ngay cần làm gì khi đăng nhập", "Cán bộ đi vào Công việc; Trưởng/phó phòng theo dõi và điều phối; Ban giám đốc mở Tổng quan; Admin quản trị cấu hình và phân quyền.")
    draw_screen(pdf, IMAGES["dashboard"], M, 83, 380, 325, "TỔNG QUAN HIỆN HÀNH - GÓC NHÌN ĐIỀU HÀNH", COLORS["teal"], crop=(0, 0, 1062, 735))
    role_rows = [
        ("Cán bộ thực hiện", "Mở Công việc, cập nhật tiến độ, báo cáo nội dung, hồ sơ, trở ngại và mốc tiếp theo.", COLORS["blue"], COLORS["blue_tint"]),
        ("Trưởng/phó phòng", "Theo dõi đội ngũ, phân công và điều phối phần việc trong phạm vi quyền được giao.", COLORS["teal"], COLORS["navy_tint"]),
        ("Ban giám đốc", "Xem Tổng quan theo kỳ/phòng/dự án/nhân sự, mở chi tiết khi có tín hiệu cần xử lý.", COLORS["green"], COLORS["green_tint"]),
        ("Admin", "Quản trị tài khoản, phân quyền, danh mục, dữ liệu nền và cấu hình vận hành.", COLORS["amber"], COLORS["amber_tint"]),
    ]
    y = 334
    for index, (title, body, accent, tint) in enumerate(role_rows):
        note_card(pdf, 445, y - 58, 357, 58, str(index + 1), title, body, accent, tint)
        y -= 75
    base.footer(pdf, 9)


def main():
    missing = [path for path in IMAGES.values() if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing current UI screenshots: " + ", ".join(str(item) for item in missing))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    base.register_fonts()
    pdf = canvas.Canvas(str(OUTPUT), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    pdf.setTitle("Hồ sơ giới thiệu Hệ thống Quản lý hiệu quả công việc")
    pdf.setAuthor("Ban Quản lý Dự án Đầu tư - Hạ tầng xã Phúc Thịnh")
    cover(pdf)
    pdf.showPage()
    task_form(pdf)
    pdf.showPage()
    work_board(pdf)
    pdf.showPage()
    overview(pdf)
    pdf.showPage()
    calendar(pdf)
    pdf.showPage()
    kpi(pdf)
    pdf.showPage()
    reports(pdf)
    pdf.showPage()
    controls(pdf)
    pdf.showPage()
    roles(pdf)
    pdf.save()


if __name__ == "__main__":
    main()
