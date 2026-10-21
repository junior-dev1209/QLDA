from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Ho_so_nang_luc_he_thong_quan_ly_cong_viec_cap_nhat_2.pdf"
ASSETS = ROOT / "tmp"
USER_TEMP = Path("C:/Users/Hi/AppData/Local/Temp")
PAGE_W, PAGE_H = landscape(A4)
MARGIN = 36

COLORS = {
    "ink": HexColor("#18324E"),
    "muted": HexColor("#60758C"),
    "line": HexColor("#D4E0E8"),
    "surface": HexColor("#F6F9FB"),
    "teal": HexColor("#0D5B69"),
    "teal_dark": HexColor("#07424E"),
    "blue": HexColor("#287AAE"),
    "blue_tint": HexColor("#E8F3FA"),
    "green": HexColor("#16855A"),
    "green_tint": HexColor("#E7F5ED"),
    "amber": HexColor("#B36B06"),
    "amber_tint": HexColor("#FFF3DC"),
    "red": HexColor("#B92E28"),
    "red_tint": HexColor("#FBEAE8"),
    "purple": HexColor("#7553A8"),
    "purple_tint": HexColor("#F1ECF9"),
}

IMAGES = {
    "overview": USER_TEMP / "codex-clipboard-51b52c4e-c42f-4043-b94d-05ea4bf9bb19.png",
    "task_form": USER_TEMP / "codex-clipboard-cb1859be-2d40-4e68-a153-f04b0bb8503b.png",
    "calendar_form": ASSETS / "calendar-qa" / "calendar-form-desktop.png",
    "daily_report": ASSETS / "daily-work-report-print-qa" / "page-1.png",
    "monthly_report": ASSETS / "pdfs" / "monthly-work-report-runtime-render" / "page-1.png",
}


def register_fonts():
    font_dir = Path("C:/Windows/Fonts")
    pdfmetrics.registerFont(TTFont("Arial", str(font_dir / "arial.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(font_dir / "arialbd.ttf")))


def panel(pdf, x, y, width, height, fill=white, stroke=None, radius=6, line_width=0.75):
    pdf.setLineWidth(line_width)
    if fill:
        pdf.setFillColor(fill)
    if stroke:
        pdf.setStrokeColor(stroke)
    pdf.roundRect(x, y, width, height, radius, fill=1 if fill else 0, stroke=1 if stroke else 0)


def text_lines(pdf, x, top, width, text, font="Arial", size=9, color=None, leading=None, max_lines=None):
    leading = leading or size * 1.35
    lines = simpleSplit(text, font, size, width)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while last and stringWidth(last + "...", font, size) > width:
            last = last[:-1]
        lines[-1] = last.rstrip() + "..."
    if color:
        pdf.setFillColor(color)
    pdf.setFont(font, size)
    for index, line in enumerate(lines):
        pdf.drawString(x, top - size - index * leading, line)
    return len(lines) * leading


def header(pdf, page, section, title, subtitle):
    h = 75
    pdf.setFillColor(COLORS["teal"])
    pdf.rect(0, PAGE_H - h, PAGE_W, h, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#CDE8EB"))
    pdf.setFont("Arial-Bold", 7.2)
    pdf.drawString(MARGIN, PAGE_H - 19, "BAN QUẢN LÝ DỰ ÁN ĐẦU TƯ - HẠ TẦNG XÃ PHÚC THỊNH")
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 18)
    pdf.drawString(MARGIN, PAGE_H - 43, title)
    pdf.setFillColor(HexColor("#D9F0F1"))
    pdf.setFont("Arial", 8.4)
    pdf.drawString(MARGIN, PAGE_H - 60, subtitle)
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 8.5)
    pdf.drawRightString(PAGE_W - MARGIN, PAGE_H - 24, section.upper())
    pdf.setFillColor(HexColor("#D9F0F1"))
    pdf.setFont("Arial", 8)
    pdf.drawRightString(PAGE_W - MARGIN, PAGE_H - 43, "Tài liệu giới thiệu chức năng")
    pdf.drawRightString(PAGE_W - MARGIN, PAGE_H - 60, f"Trang {page}/6")


def footer(pdf, page):
    pdf.setStrokeColor(COLORS["line"])
    pdf.setLineWidth(0.55)
    pdf.line(MARGIN, 25, PAGE_W - MARGIN, 25)
    pdf.setFillColor(COLORS["muted"])
    pdf.setFont("Arial", 7)
    pdf.drawString(MARGIN, 13, "Hệ thống Quản lý hiệu quả công việc | Tóm tắt năng lực vận hành")
    pdf.drawRightString(PAGE_W - MARGIN, 13, f"28/09/2026 | {page}/6")


def image_box(pdf, path, x, y, width, height, caption, accent=COLORS["teal"], cover=False):
    panel(pdf, x, y, width, height, white, COLORS["line"], 6)
    image_x, image_y = x + 7, y + 24
    image_w, image_h = width - 14, height - 32
    pdf.setFillColor(HexColor("#EEF4F6"))
    pdf.roundRect(image_x, image_y, image_w, image_h, 3, fill=1, stroke=0)
    reader = ImageReader(str(path))
    source_w, source_h = reader.getSize()
    if cover:
        scale = max(image_w / source_w, image_h / source_h)
        draw_w, draw_h = source_w * scale, source_h * scale
        draw_x = image_x - (draw_w - image_w) / 2
        draw_y = image_y - (draw_h - image_h) / 2
        pdf.saveState()
        clip = pdf.beginPath()
        clip.rect(image_x, image_y, image_w, image_h)
        pdf.clipPath(clip, stroke=0, fill=0)
        pdf.drawImage(reader, draw_x, draw_y, draw_w, draw_h, mask="auto")
        pdf.restoreState()
    else:
        scale = min(image_w / source_w, image_h / source_h)
        draw_w, draw_h = source_w * scale, source_h * scale
        draw_x = image_x + (image_w - draw_w) / 2
        draw_y = image_y + (image_h - draw_h) / 2
        pdf.drawImage(reader, draw_x, draw_y, draw_w, draw_h, mask="auto")
    pdf.setFillColor(accent)
    pdf.setFont("Arial-Bold", 7.4)
    pdf.drawString(x + 9, y + 8, caption)


def small_card(pdf, x, y, width, height, marker, title, body, accent, tint):
    panel(pdf, x, y, width, height, white, COLORS["line"], 5)
    pdf.setFillColor(accent)
    pdf.roundRect(x, y, 4, height, 3, fill=1, stroke=0)
    pdf.setFillColor(tint)
    pdf.roundRect(x + 14, y + height - 28, 22, 18, 4, fill=1, stroke=0)
    pdf.setFillColor(accent)
    pdf.setFont("Arial-Bold", 8.8)
    pdf.drawCentredString(x + 25, y + height - 22.5, marker)
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 8.9)
    pdf.drawString(x + 45, y + height - 22, title)
    text_lines(pdf, x + 14, y + height - 37, width - 25, body, size=7.55, color=COLORS["muted"], leading=9.4, max_lines=3)


def bullet(pdf, x, y, title, body, accent=COLORS["teal"], width=280):
    pdf.setFillColor(accent)
    pdf.circle(x + 4, y + 3.5, 3.4, fill=1, stroke=0)
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 9)
    pdf.drawString(x + 16, y, title)
    text_lines(pdf, x + 16, y - 5, width - 16, body, size=7.9, color=COLORS["muted"], leading=10.4, max_lines=3)


def section_label(pdf, x, y, label, title, description):
    pdf.setFillColor(COLORS["blue"])
    pdf.setFont("Arial-Bold", 8)
    pdf.drawString(x, y, label.upper())
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 15)
    pdf.drawString(x, y - 22, title)
    text_lines(pdf, x, y - 31, PAGE_W - 2 * MARGIN, description, size=8.8, color=COLORS["muted"], leading=11.2, max_lines=2)


def page_one(pdf):
    header(pdf, 1, "Hồ sơ năng lực", "Quản lý, giám sát và điều hành công việc", "Một nền tảng thống nhất cho phòng ban, dự án, cán bộ và kỳ đánh giá")
    pdf.setFillColor(COLORS["blue"])
    pdf.setFont("Arial-Bold", 8)
    pdf.drawString(40, 493, "GIAO DIỆN TỔNG QUAN THỰC TẾ")
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 15.5)
    pdf.drawString(40, 470, "Một điểm điều hành cho toàn bộ công việc theo dự án và nhân sự")
    text_lines(
        pdf, 40, 457, 762,
        "Ảnh chụp hiển thị dữ liệu thực tế theo dự án, bao gồm số việc trong ngày, cả tuần, số cán bộ tham gia và khối lượng quá hạn.",
        size=8.6, color=COLORS["muted"], leading=11.5, max_lines=2,
    )
    image_box(pdf, IMAGES["overview"], 40, 235, 762, 204, "Bảng Thống kê công việc: chế độ Dự án, bộ lọc phòng và số liệu thực tế", COLORS["teal"], cover=True)

    cards = [
        ("01", "Công việc", "Giao việc, phụ trách, phối hợp, thời hạn, ưu tiên và phụ thuộc.", COLORS["blue"], COLORS["blue_tint"]),
        ("02", "Điều hành", "Cảnh báo quá hạn, trở ngại, mốc cập nhật và phê duyệt hoàn thành.", COLORS["red"], COLORS["red_tint"]),
        ("03", "Lịch công việc", "Lịch tổng, lịch cá nhân, cuộc họp, thành phần tham dự và nhắc lịch.", COLORS["purple"], COLORS["purple_tint"]),
        ("04", "KPI", "Danh mục tiêu chí, KPI phòng, KPI cá nhân và tổng hợp điểm theo kỳ.", COLORS["green"], COLORS["green_tint"]),
        ("05", "Phân tích", "Bảng điều hành, biểu đồ, thống kê theo phòng, nhân sự và dự án.", COLORS["amber"], COLORS["amber_tint"]),
        ("06", "Báo cáo", "Báo cáo ngày/tháng, xuất PDF, Excel và lưu vết lịch sử hoạt động.", COLORS["teal"], COLORS["blue_tint"]),
    ]
    card_w, card_h = 246, 59
    for index, data in enumerate(cards):
        col, row = index % 3, index // 3
        small_card(pdf, 40 + col * (card_w + 12), 96 - row * 69, card_w, card_h, *data)
    footer(pdf, 1)


def page_two(pdf):
    header(pdf, 2, "Nhóm chức năng 01", "Quản lý vòng đời công việc", "Từ giao việc, triển khai, cập nhật tiến độ đến đánh giá hoàn thành")
    section_label(pdf, 40, 490, "01. Công việc", "Mỗi công việc có đủ thông tin để giao đúng và theo dõi đến cùng", "Biểu mẫu tập trung các thông tin thực hiện và theo dõi điều hành, tránh phải quản lý bằng nhiều bảng rời rạc.")
    image_box(pdf, IMAGES["task_form"], 40, 118, 470, 330, "Màn hình tạo công việc: trách nhiệm, trạng thái, tiến độ, hồ sơ và theo dõi điều hành", COLORS["blue"])

    x, width = 538, 264
    panel(pdf, x, 385, width, 63, COLORS["blue_tint"], None, 5)
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 10.2)
    pdf.drawString(x + 15, 425, "Giao việc có cấu trúc")
    text_lines(pdf, x + 15, 413, width - 30, "Gắn người thực hiện, phối hợp, dự án, danh mục KPI, ưu tiên, thời hạn và công việc định kỳ.", size=8, color=COLORS["muted"], leading=10.4, max_lines=3)
    bullet(pdf, x, 349, "1. Lập và phân công", "Thiết lập thông tin đầu vào, trách nhiệm và kết quả cần đạt.", COLORS["blue"], width)
    bullet(pdf, x, 282, "2. Cập nhật thực hiện", "Người liên quan báo tiến độ, nội dung, mốc tiếp theo và trở ngại.", COLORS["green"], width)
    bullet(pdf, x, 215, "3. Theo dõi điều hành", "Hệ thống nhận diện quá hạn, sắp đến hạn và trễ mốc cập nhật.", COLORS["amber"], width)
    bullet(pdf, x, 148, "4. Đánh giá hoàn thành", "Kết quả chuyển qua luồng chờ đánh giá, đạt hoặc không đạt khi áp dụng.", COLORS["red"], width)

    panel(pdf, 40, 53, 762, 42, COLORS["surface"], COLORS["line"], 5)
    pdf.setFillColor(COLORS["teal"])
    pdf.setFont("Arial-Bold", 8.8)
    pdf.drawString(56, 76, "Trạng thái vận hành")
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 8.2)
    pdf.drawString(170, 76, "Chuẩn bị thực hiện")
    pdf.drawString(338, 76, "Đang thực hiện")
    pdf.drawString(493, 76, "Hoàn thành")
    pdf.drawString(632, 76, "Chờ đánh giá / đạt")
    pdf.setFillColor(COLORS["muted"])
    pdf.setFont("Arial", 7.2)
    pdf.drawString(170, 62, "Trạng thái tác nghiệp")
    pdf.drawString(338, 62, "Tiến độ và cập nhật")
    pdf.drawString(493, 62, "Người thực hiện xác nhận")
    pdf.drawString(632, 62, "Theo quy trình phê duyệt")
    footer(pdf, 2)


def page_three(pdf):
    header(pdf, 3, "Nhóm chức năng 02", "Tổng quan và phân tích điều hành", "Theo dõi khối lượng, hiệu quả và các điểm cần xử lý theo nhiều góc nhìn")
    section_label(pdf, 40, 490, "02. Tổng quan", "Từ chỉ số tổng hợp đến chi tiết dự án và nhân sự", "Màn hình Tổng quan là nơi điều hành viên lọc theo kỳ đánh giá, chọn phòng/dự án/nhân sự và mở sâu vào từng nhóm số liệu.")
    image_box(pdf, IMAGES["overview"], 40, 258, 465, 178, "Tổng quan thực tế: khối lượng công việc theo dự án trong ngày và trong tuần", COLORS["teal"], cover=True)

    x = 531
    panel(pdf, x, 258, 271, 178, white, COLORS["line"], 6)
    pdf.setFillColor(COLORS["teal"])
    pdf.setFont("Arial-Bold", 10.6)
    pdf.drawString(x + 18, 410, "Các lớp thông tin phục vụ điều hành")
    bullet(pdf, x + 18, 376, "Chỉ số tức thời", "Tổng việc, hoàn thành, KPI và khối lượng cần xử lý.", COLORS["blue"], 235)
    bullet(pdf, x + 18, 338, "Theo phạm vi", "Lọc theo kỳ, phòng, dự án và nhân sự.", COLORS["green"], 235)
    bullet(pdf, x + 18, 300, "Phân tích trực quan", "Xu hướng, tiến độ, tải việc và cơ cấu trạng thái.", COLORS["purple"], 235)

    panel(pdf, 40, 103, 762, 125, COLORS["surface"], COLORS["line"], 6)
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 10.2)
    pdf.drawString(58, 202, "Bốn góc nhìn phân tích chính")
    labels = [
        ("Điều hành", "Quá hạn, sắp đến hạn, trở ngại, trễ mốc", COLORS["red"]),
        ("Nhân sự", "Khối lượng, tiến độ, hiệu quả thực hiện", COLORS["blue"]),
        ("Dự án", "Sức khỏe, xu hướng, mốc và nguồn lực", COLORS["green"]),
        ("Phòng ban", "Tổng hợp kết quả và hiệu quả theo đơn vị", COLORS["purple"]),
    ]
    for index, (title, body, accent) in enumerate(labels):
        col, row = index % 2, index // 2
        cx = 58 + col * 374
        cy = 172 - row * 42
        pdf.setFillColor(accent)
        pdf.roundRect(cx, cy - 3, 5, 17, 2.5, fill=1, stroke=0)
        pdf.setFillColor(COLORS["ink"])
        pdf.setFont("Arial-Bold", 8.4)
        pdf.drawString(cx + 13, cy + 5, title)
        pdf.setFillColor(COLORS["muted"])
        pdf.setFont("Arial", 7.2)
        pdf.drawString(cx + 68, cy + 5, body)
    footer(pdf, 3)


def page_four(pdf):
    header(pdf, 4, "Nhóm chức năng 03", "Lịch công việc và điều hành phối hợp", "Tổ chức lịch tổng, lịch cá nhân, cuộc họp và việc phát sinh từ kết luận")
    section_label(pdf, 40, 490, "03. Lịch công việc", "Kết nối thời gian, con người và nội dung triển khai", "Lịch không chỉ ghi nhận cuộc họp mà còn liên kết nội dung kết luận với công việc cần thực hiện sau đó.")
    image_box(pdf, IMAGES["calendar_form"], 40, 82, 472, 360, "Màn hình thêm cuộc họp: thời gian, lãnh đạo, phòng chuẩn bị, thành phần và nhắc lịch", COLORS["purple"])

    x, width = 540, 262
    cards = [
        ("Lịch tổng và lịch của tôi", "Phân tách lịch điều hành chung và lịch liên quan đến từng tài khoản để theo dõi rõ phạm vi.", COLORS["blue"], COLORS["blue_tint"]),
        ("Cuộc họp có đầy đủ thành phần", "Ghi nội dung, địa điểm, lãnh đạo, phòng chuẩn bị, người tham dự và ghi chú chuẩn bị.", COLORS["green"], COLORS["green_tint"]),
        ("Lặp lại và nhắc lịch", "Thiết lập lịch lặp theo ngày hoặc tuần; mỗi lịch có thể bật hoặc tắt nhắc việc độc lập.", COLORS["amber"], COLORS["amber_tint"]),
        ("Theo dõi sau cuộc họp", "Lưu kết luận và tạo việc từ kết luận để bảo đảm nội dung đã thống nhất được triển khai.", COLORS["purple"], COLORS["purple_tint"]),
    ]
    for index, (title, body, accent, tint) in enumerate(cards):
        small_card(pdf, x, 365 - index * 76, width, 64, f"0{index + 1}", title, body, accent, tint)
    panel(pdf, x, 55, width, 76, COLORS["surface"], COLORS["line"], 5)
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 9)
    pdf.drawString(x + 14, 109, "Quyền thao tác")
    text_lines(pdf, x + 14, 97, width - 28, "Quản trị viên, Ban giám đốc và tài khoản được cấp quyền có thể thêm/sửa/xóa lịch; các tài khoản khác xem Lịch tổng theo phạm vi được phép.", size=7.7, color=COLORS["muted"], leading=10, max_lines=3)
    footer(pdf, 4)


def page_five(pdf):
    header(pdf, 5, "Nhóm chức năng 04", "KPI, báo cáo và xuất dữ liệu", "Biến dữ liệu công việc thành chỉ số theo dõi và tài liệu phục vụ điều hành")
    section_label(pdf, 40, 490, "04. KPI và báo cáo", "Đánh giá theo kỳ, tổng hợp trực quan và xuất tệp phục vụ họp giao ban", "Các báo cáo kế thừa dữ liệu nghiệp vụ từ công việc, phòng ban, nhân sự và dự án; người dùng chọn kỳ hoặc ngày cần xem trước khi xuất.")
    image_box(pdf, IMAGES["daily_report"], 40, 195, 365, 245, "Báo cáo công việc hằng ngày: khối lượng, trạng thái, phòng ban và tiến độ dự án", COLORS["teal"])
    image_box(pdf, IMAGES["monthly_report"], 437, 195, 365, 245, "Báo cáo tổng hợp tháng: kết quả theo phòng và chi tiết theo nhân sự", COLORS["blue"])

    cards = [
        ("KPI phòng và KPI cá nhân", "Danh mục KPI, trọng số, thực hiện, điểm kết quả và xếp loại được theo dõi theo kỳ đánh giá.", COLORS["green"], COLORS["green_tint"]),
        ("Báo cáo theo thời gian", "Báo cáo ngày tập trung việc phát sinh/cập nhật/đến hạn; báo cáo tháng tổng hợp theo kỳ kế hoạch.", COLORS["blue"], COLORS["blue_tint"]),
        ("Xuất dữ liệu phục vụ họp", "Các màn hình tổng quan và chi tiết hỗ trợ xuất PDF, Excel hoặc dữ liệu theo quyền và phạm vi lọc.", COLORS["amber"], COLORS["amber_tint"]),
    ]
    cw = (762 - 24) / 3
    for index, data in enumerate(cards):
        small_card(pdf, 40 + index * (cw + 12), 80, cw, 86, f"0{index + 1}", *data)
    footer(pdf, 5)


def page_six(pdf):
    header(pdf, 6, "Nhóm chức năng 05", "Quản trị, phân quyền và vận hành ổn định", "Kiểm soát phạm vi thao tác, dữ liệu đồng bộ và lịch sử hoạt động")
    section_label(pdf, 40, 490, "05. Quản trị hệ thống", "Nền tảng để vận hành có kiểm soát và có thể truy vết", "Các chức năng quản trị bảo đảm người dùng được thấy đúng dữ liệu, thực hiện đúng vai trò và có cơ sở kiểm tra khi phát sinh vấn đề.")
    x = 40
    panel(pdf, x, 309, 762, 131, white, COLORS["line"], 6)
    pdf.setFillColor(COLORS["teal"])
    pdf.setFont("Arial-Bold", 10.5)
    pdf.drawString(x + 18, 416, "Phân quyền theo vai trò và nghiệp vụ")
    roles = [
        ("Quản trị viên", "Cấu hình hệ thống, quản lý tài khoản và phân quyền mở rộng."),
        ("Ban giám đốc", "Theo dõi điều hành tổng thể và khai thác thông tin theo phạm vi quản lý."),
        ("Quản lý đơn vị", "Phân công, phối hợp, theo dõi và đánh giá công việc trong phạm vi được giao."),
        ("Nhân viên", "Thực hiện, cập nhật tiến độ và báo cáo các công việc liên quan."),
    ]
    for index, (role, body) in enumerate(roles):
        col, row = index % 2, index // 2
        rx, ry = x + 18 + col * 368, 380 - row * 47
        pdf.setFillColor(COLORS["blue"] if index < 2 else COLORS["green"])
        pdf.circle(rx + 4, ry + 2, 3.5, fill=1, stroke=0)
        pdf.setFillColor(COLORS["ink"])
        pdf.setFont("Arial-Bold", 8.5)
        pdf.drawString(rx + 15, ry, role)
        text_lines(pdf, rx + 15, ry - 4, 230, body, size=7.3, color=COLORS["muted"], leading=9.2, max_lines=2)

    stability = [
        ("Phiên làm việc", "Mỗi tài khoản được kiểm soát phiên trên một thiết bị; máy chủ xác thực và gia hạn trong quá trình sử dụng.", COLORS["amber"], COLORS["amber_tint"]),
        ("Đồng bộ có kiểm soát", "Các thay đổi nghiệp vụ được xử lý qua máy chủ với kiểm tra quyền, phiên bản và phản hồi trạng thái.", COLORS["blue"], COLORS["blue_tint"]),
        ("Lịch sử hoạt động", "Các thao tác chính được lưu vết để hỗ trợ tra cứu, kiểm tra và xử lý khi có khác biệt dữ liệu.", COLORS["green"], COLORS["green_tint"]),
    ]
    pw = (762 - 24) / 3
    for index, data in enumerate(stability):
        small_card(pdf, x + index * (pw + 12), 182, pw, 101, f"0{index + 1}", *data)

    panel(pdf, x, 70, 762, 88, COLORS["surface"], COLORS["line"], 6)
    pdf.setFillColor(COLORS["teal"])
    pdf.setFont("Arial-Bold", 9.6)
    pdf.drawString(x + 18, 133, "Các nhóm dữ liệu nghiệp vụ trọng tâm")
    data_groups = ["Công việc", "Báo cáo tiến độ", "Nhân sự", "Đánh giá", "Danh mục KPI", "Lịch sử hoạt động"]
    for index, label in enumerate(data_groups):
        col, row = index % 3, index // 3
        bx, by = x + 18 + col * 240, 109 - row * 26
        pdf.setFillColor(COLORS["teal"])
        pdf.roundRect(bx, by, 219, 18, 4, fill=1, stroke=0)
        pdf.setFillColor(white)
        pdf.setFont("Arial-Bold", 7.6)
        pdf.drawCentredString(bx + 109.5, by + 5.6, label)
    footer(pdf, 6)


def build_pdf():
    for name, path in IMAGES.items():
        if not path.exists():
            raise FileNotFoundError(f"Missing image asset {name}: {path}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    register_fonts()
    pdf = canvas.Canvas(str(OUTPUT), pagesize=landscape(A4), pageCompression=1)
    pdf.setTitle("Hồ sơ năng lực hệ thống Quản lý hiệu quả công việc")
    pdf.setAuthor("Ban Quản lý Dự án Đầu tư - Hạ tầng xã Phúc Thịnh")
    pdf.setSubject("Tổng hợp các tính năng quản lý, giám sát và điều hành công việc")
    for render in (page_one, page_two, page_three, page_four, page_five, page_six):
        render(pdf)
        if render is not page_six:
            pdf.showPage()
    pdf.save()
    print(OUTPUT.name)


if __name__ == "__main__":
    build_pdf()
