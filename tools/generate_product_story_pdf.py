from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Ho_so_gioi_thieu_he_thong_quan_ly_cong_viec.pdf"
TASK_FORM_IMAGE = Path("C:/Users/Hi/AppData/Local/Temp/codex-clipboard-cb1859be-2d40-4e68-a153-f04b0bb8503b.png")
PAGE_W, PAGE_H = landscape(A4)
M = 35
TOTAL_PAGES = 9

COLORS = {
    "ink": HexColor("#102A43"),
    "muted": HexColor("#5C7187"),
    "line": HexColor("#D8E3E9"),
    "paper": HexColor("#F6F9FB"),
    "teal": HexColor("#0E6072"),
    "teal_dark": HexColor("#083E4A"),
    "blue": HexColor("#1976B7"),
    "blue_tint": HexColor("#EAF4FA"),
    "green": HexColor("#11845B"),
    "green_tint": HexColor("#E8F6EF"),
    "amber": HexColor("#A96B08"),
    "amber_tint": HexColor("#FFF3DE"),
    "red": HexColor("#B82A26"),
    "red_tint": HexColor("#FCEBE9"),
    "navy_tint": HexColor("#E9F0F5"),
}


def register_fonts():
    fonts = Path("C:/Windows/Fonts")
    pdfmetrics.registerFont(TTFont("Arial", str(fonts / "arial.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(fonts / "arialbd.ttf")))


def rounded(pdf, x, y, w, h, fill=white, stroke=None, r=6, lw=0.7):
    if fill:
        pdf.setFillColor(fill)
    if stroke:
        pdf.setStrokeColor(stroke)
    pdf.setLineWidth(lw)
    pdf.roundRect(x, y, w, h, r, fill=1 if fill else 0, stroke=1 if stroke else 0)


def text(pdf, x, top, width, value, font="Arial", size=9, color=None, leading=None, max_lines=None):
    leading = leading or size * 1.36
    lines = simpleSplit(value, font, size, width)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        while lines[-1] and stringWidth(f"{lines[-1]}...", font, size) > width:
            lines[-1] = lines[-1][:-1]
        lines[-1] = f"{lines[-1].rstrip()}..."
    if color:
        pdf.setFillColor(color)
    pdf.setFont(font, size)
    for index, line in enumerate(lines):
        pdf.drawString(x, top - size - leading * index, line)
    return len(lines) * leading


def pill(pdf, x, y, label, accent, fill, width=None):
    width = width or max(46, stringWidth(label, "Arial-Bold", 7.3) + 20)
    rounded(pdf, x, y, width, 18, fill, None, 9, 0)
    pdf.setFillColor(accent)
    pdf.setFont("Arial-Bold", 7.3)
    pdf.drawCentredString(x + width / 2, y + 5.6, label)
    return width


def page_header(pdf, number, eyebrow, title, subtitle):
    pdf.setFillColor(COLORS["teal_dark"])
    pdf.rect(0, PAGE_H - 57, PAGE_W, 57, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#BFDEE5"))
    pdf.setFont("Arial-Bold", 7.1)
    pdf.drawString(M, PAGE_H - 16, "BAN QUẢN LÝ DỰ ÁN ĐẦU TƯ - HẠ TẦNG XÃ PHÚC THỊNH")
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 16)
    pdf.drawString(M, PAGE_H - 39, title)
    pdf.setFillColor(HexColor("#D5E8EC"))
    pdf.setFont("Arial", 7.7)
    pdf.drawRightString(PAGE_W - M, PAGE_H - 17, eyebrow.upper())
    pdf.drawRightString(PAGE_W - M, PAGE_H - 38, f"Hồ sơ trải nghiệm hệ thống | {number}/{TOTAL_PAGES}")
    text(pdf, M, PAGE_H - 65, PAGE_W - 2 * M, subtitle, size=8.4, color=COLORS["muted"], leading=10.8, max_lines=2)


def footer(pdf, number):
    pdf.setStrokeColor(COLORS["line"])
    pdf.setLineWidth(0.55)
    pdf.line(M, 25, PAGE_W - M, 25)
    pdf.setFillColor(COLORS["muted"])
    pdf.setFont("Arial", 7)
    pdf.drawString(M, 13, "Quản lý hiệu quả công việc | Phiên bản giao diện 3.1.4")
    pdf.drawRightString(PAGE_W - M, 13, f"28/09/2026 | {number}/{TOTAL_PAGES}")


def section_title(pdf, x, top, kicker, title, body, width=520):
    pdf.setFillColor(COLORS["blue"])
    pdf.setFont("Arial-Bold", 7.9)
    pdf.drawString(x, top, kicker.upper())
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 17)
    pdf.drawString(x, top - 24, title)
    text(pdf, x, top - 34, width, body, size=8.8, color=COLORS["muted"], leading=11.5, max_lines=2)


def feature_card(pdf, x, y, w, h, index, title, body, accent, tint):
    rounded(pdf, x, y, w, h, white, COLORS["line"], 7)
    pdf.setFillColor(accent)
    pdf.roundRect(x, y, 5, h, 3, fill=1, stroke=0)
    rounded(pdf, x + 15, y + h - 32, 26, 20, tint, None, 5)
    pdf.setFillColor(accent)
    pdf.setFont("Arial-Bold", 8)
    pdf.drawCentredString(x + 28, y + h - 25, index)
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 9.6)
    pdf.drawString(x + 50, y + h - 25, title)
    text(pdf, x + 15, y + h - 43, w - 28, body, size=7.7, color=COLORS["muted"], leading=9.9, max_lines=4)


def connector(pdf, x1, y1, x2, y2, color=COLORS["line"]):
    pdf.setStrokeColor(color)
    pdf.setLineWidth(1.25)
    pdf.line(x1, y1, x2, y2)
    pdf.setFillColor(color)
    pdf.circle(x2, y2, 2.4, fill=1, stroke=0)


def draw_step(pdf, x, y, w, h, number, title, body, accent, tint):
    rounded(pdf, x, y, w, h, white, COLORS["line"], 7)
    pdf.setFillColor(tint)
    pdf.circle(x + 26, y + h - 26, 15, fill=1, stroke=0)
    pdf.setFillColor(accent)
    pdf.setFont("Arial-Bold", 10)
    pdf.drawCentredString(x + 26, y + h - 29.5, str(number))
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 10)
    pdf.drawString(x + 49, y + h - 29, title)
    text(pdf, x + 16, y + h - 50, w - 30, body, size=7.6, color=COLORS["muted"], leading=9.8, max_lines=3)


def crop_image(pdf, path, x, y, w, h):
    reader = ImageReader(str(path))
    source_w, source_h = reader.getSize()
    scale = max(w / source_w, h / source_h)
    draw_w, draw_h = source_w * scale, source_h * scale
    draw_x = x - (draw_w - w) / 2
    draw_y = y - (draw_h - h) / 2
    pdf.saveState()
    path_clip = pdf.beginPath()
    path_clip.rect(x, y, w, h)
    pdf.clipPath(path_clip, stroke=0, fill=0)
    pdf.drawImage(reader, draw_x, draw_y, draw_w, draw_h, mask="auto")
    pdf.restoreState()


def cover(pdf):
    pdf.setFillColor(COLORS["teal_dark"])
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#0F7284"))
    pdf.circle(PAGE_W - 75, PAGE_H - 70, 180, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#0A5361"))
    pdf.circle(PAGE_W - 15, 78, 160, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#B9E3E8"))
    pdf.setFont("Arial-Bold", 8)
    pdf.drawString(M, PAGE_H - 38, "BAN QUẢN LÝ DỰ ÁN ĐẦU TƯ - HẠ TẦNG XÃ PHÚC THỊNH")
    pill(pdf, M, PAGE_H - 76, "HỒ SƠ TRẢI NGHIỆM HỆ THỐNG", COLORS["teal_dark"], HexColor("#D9F0F1"), 171)
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 27)
    pdf.drawString(M, PAGE_H - 121, "Điều hành công việc,")
    pdf.drawString(M, PAGE_H - 153, "không chỉ ghi nhận công việc")
    text(
        pdf, M, PAGE_H - 172, 436,
        "Một hệ thống thống nhất để giao đúng việc, nhìn đúng tình hình và đưa quyết định đúng thời điểm.",
        size=11.2, color=HexColor("#D8EFF2"), leading=14.5, max_lines=3,
    )

    x, y, w, h = 500, 84, 282, 430
    rounded(pdf, x, y, w, h, white, None, 10)
    pdf.setFillColor(COLORS["teal"])
    pdf.roundRect(x, y + h - 58, w, 58, 10, fill=1, stroke=0)
    pdf.rect(x, y + h - 58, w, 12, fill=1, stroke=0)
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 12)
    pdf.drawString(x + 18, y + h - 34, "Một ngày điều hành")
    pdf.setFillColor(HexColor("#D8EFF2"))
    pdf.setFont("Arial", 7.8)
    pdf.drawString(x + 18, y + h - 49, "Nhìn từ công việc đến kết quả")
    signals = [
        ("Giao việc rõ trách nhiệm", "Người thực hiện, phối hợp, dự án, hạn hoàn thành", COLORS["blue"], COLORS["blue_tint"]),
        ("Theo dõi sớm, không chờ báo cáo", "Mốc cập nhật, trở ngại, phụ thuộc và cảnh báo", COLORS["amber"], COLORS["amber_tint"]),
        ("Kết quả có căn cứ", "KPI, đánh giá hoàn thành, lịch sử thay đổi", COLORS["green"], COLORS["green_tint"]),
        ("Báo cáo sẵn sàng ra quyết định", "Tổng quan, báo cáo ngày/tháng, PDF và Excel", COLORS["teal"], COLORS["navy_tint"]),
    ]
    sy = y + h - 96
    for title, body, accent, tint in signals:
        rounded(pdf, x + 15, sy - 58, w - 30, 50, tint, None, 6)
        pdf.setFillColor(accent)
        pdf.circle(x + 32, sy - 33, 6, fill=1, stroke=0)
        pdf.setFillColor(COLORS["ink"])
        pdf.setFont("Arial-Bold", 8.4)
        pdf.drawString(x + 47, sy - 27, title)
        text(pdf, x + 47, sy - 34, w - 63, body, size=6.8, color=COLORS["muted"], leading=8.7, max_lines=2)
        sy -= 69

    highlights = [
        ("Giao", "đúng người"),
        ("Theo dõi", "đúng mốc"),
        ("Ra quyết định", "đúng lúc"),
    ]
    start_x = M
    for index, (top, bottom) in enumerate(highlights):
        cx = start_x + index * 150
        pdf.setFillColor(HexColor("#D9F0F1"))
        pdf.circle(cx + 10, 95, 5, fill=1, stroke=0)
        pdf.setFillColor(white)
        pdf.setFont("Arial-Bold", 9.1)
        pdf.drawString(cx + 23, 99, top)
        pdf.setFillColor(HexColor("#C6E7EB"))
        pdf.setFont("Arial", 8.4)
        pdf.drawString(cx + 23, 84, bottom)
    pdf.setFillColor(HexColor("#B9E3E8"))
    pdf.setFont("Arial", 7.2)
    pdf.drawString(M, 39, "Tài liệu giới thiệu các chức năng đang có của hệ thống")
    pdf.drawRightString(PAGE_W - M, 39, "28/09/2026 | Phiên bản 3.1.4")


def lifecycle(pdf):
    page_header(pdf, 2, "Cách hệ thống tạo giá trị", "Một công việc được theo dõi đến cùng", "Thông tin không dừng ở bước giao việc. Mỗi cập nhật tiếp tục nuôi dữ liệu điều hành, KPI và báo cáo.")
    section_title(pdf, M, 466, "01. Vòng đời công việc", "Từ việc được giao đến kết quả được xác nhận", "Mỗi bước đều có trường dữ liệu, quyền thao tác và dấu vết lịch sử phù hợp với trách nhiệm thực tế.")
    steps = [
        (1, "Lập công việc", "Tên việc, dự án, KPI, người thực hiện, phối hợp, ưu tiên, kỳ hạn.", COLORS["blue"], COLORS["blue_tint"]),
        (2, "Triển khai", "Trạng thái tác nghiệp, tiến độ, nội dung thực hiện và hồ sơ liên quan.", COLORS["teal"], COLORS["navy_tint"]),
        (3, "Theo dõi điều hành", "Mốc tiếp theo, trở ngại, đề nghị hỗ trợ và công việc phụ thuộc.", COLORS["amber"], COLORS["amber_tint"]),
        (4, "Hoàn thành", "Người thực hiện xác nhận kết quả; quá hạn được hệ thống tự nhận diện.", COLORS["green"], COLORS["green_tint"]),
        (5, "Đánh giá", "Luồng chờ phê duyệt, đạt/không đạt và dữ liệu phục vụ tính KPI.", COLORS["red"], COLORS["red_tint"]),
    ]
    card_w, card_h, gap = 145, 128, 11
    y = 275
    for index, item in enumerate(steps):
        x = M + index * (card_w + gap)
        draw_step(pdf, x, y, card_w, card_h, *item)
        if index < len(steps) - 1:
            connector(pdf, x + card_w, y + card_h / 2, x + card_w + gap - 5, y + card_h / 2, COLORS["teal"])
    rounded(pdf, M, 105, PAGE_W - 2 * M, 125, COLORS["paper"], COLORS["line"], 8)
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 11)
    pdf.drawString(M + 20, 201, "Điểm khác biệt: trạng thái là phần nhìn thấy, dữ liệu điều hành mới là phần tạo giá trị")
    statements = [
        ("Không chỉ biết việc đang ở đâu", "Còn biết việc nào thiếu mốc cập nhật, đang có trở ngại hoặc phụ thuộc vào việc khác."),
        ("Không chỉ đếm việc hoàn thành", "Còn gắn kết quả với quy trình đánh giá và danh mục KPI của người thực hiện."),
        ("Không chỉ báo cáo cuối kỳ", "Còn tổng hợp được theo ngày, tháng, phòng ban, dự án và nhân sự.")
    ]
    col_w = (PAGE_W - 2 * M - 52) / 3
    for index, (title, body) in enumerate(statements):
        x = M + 20 + index * (col_w + 16)
        pdf.setFillColor(COLORS["teal"])
        pdf.circle(x + 5, 157, 4, fill=1, stroke=0)
        pdf.setFillColor(COLORS["ink"])
        pdf.setFont("Arial-Bold", 8.8)
        text(pdf, x + 16, 166, col_w - 16, title, font="Arial-Bold", size=8.8, color=COLORS["ink"], leading=10.5, max_lines=2)
        text(pdf, x + 16, 138, col_w - 16, body, size=7.5, color=COLORS["muted"], leading=9.6, max_lines=4)
    footer(pdf, 2)


def task_form(pdf):
    page_header(pdf, 3, "Trải nghiệm tạo công việc", "Giao việc đủ rõ để không phải hỏi lại", "Ảnh chụp dưới đây là giao diện biểu mẫu công việc hiện hành. Các nhóm thông tin được đặt cùng một nơi để giảm bỏ sót khi phân công.")
    section_title(pdf, M, 466, "02. Giao việc", "Một biểu mẫu, đầy đủ bối cảnh thực hiện", "Khi thông tin đầu vào đủ ngay từ đầu, người thực hiện và người điều hành cùng nhìn một cách hiểu về công việc.")
    x, y, w, h = M, 91, 498, 324
    rounded(pdf, x, y, w, h, white, COLORS["line"], 8)
    crop_image(pdf, TASK_FORM_IMAGE, x + 8, y + 8, w - 16, h - 34)
    rounded(pdf, x + 8, y + 8, w - 16, 20, HexColor("#F2F7F9"), None, 3)
    pdf.setFillColor(COLORS["teal"])
    pdf.setFont("Arial-Bold", 7.3)
    pdf.drawString(x + 17, y + 14.5, "GIAO DIỆN HIỆN HÀNH - THÊM CÔNG VIỆC")

    right_x = 560
    feature_card(pdf, right_x, 347, 242, 69, "A", "Bối cảnh công việc", "Tên việc, danh mục dự án và KPI cá nhân được đặt ngay hàng đầu để nhận diện mục tiêu trước khi thao tác.", COLORS["blue"], COLORS["blue_tint"])
    feature_card(pdf, right_x, 263, 242, 69, "B", "Trách nhiệm rõ ràng", "Người được giao và người phối hợp được chọn trực tiếp; loại việc, ưu tiên và định kỳ nằm cùng nhóm.", COLORS["teal"], COLORS["navy_tint"])
    feature_card(pdf, right_x, 179, 242, 69, "C", "Tiến độ có căn cứ", "Trạng thái, tiến độ, chất lượng, hồ sơ và nội dung báo cáo được ghi nhận trong một bản việc.", COLORS["green"], COLORS["green_tint"])
    feature_card(pdf, right_x, 95, 242, 69, "D", "Điều hành không bị tách rời", "Mốc cập nhật, trở ngại và công việc phụ thuộc giúp cảnh báo đi trước vấn đề.", COLORS["amber"], COLORS["amber_tint"])
    footer(pdf, 3)


def overview(pdf):
    page_header(pdf, 4, "Không gian điều hành", "Lãnh đạo nhìn được gì trong một màn hình?", "Tổng quan đưa chỉ số, cảnh báo, thống kê công việc và phân tích về một điểm truy cập có thể lọc sâu theo phạm vi cần xem.")
    section_title(pdf, M, 466, "03. Tổng quan", "Đủ gọn để quét nhanh, đủ sâu để đi đến chi tiết", "Các lựa chọn phạm vi và góc nhìn nằm cùng nhịp với số liệu, tránh phải đi nhiều màn hình để nắm tình hình.")
    x, y, w, h = M, 102, 490, 307
    rounded(pdf, x, y, w, h, white, COLORS["line"], 8)
    pdf.setFillColor(COLORS["teal_dark"])
    pdf.roundRect(x, y + h - 45, w, 45, 8, fill=1, stroke=0)
    pdf.rect(x, y + h - 45, w, 10, fill=1, stroke=0)
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 12)
    pdf.drawString(x + 15, y + h - 28, "Tổng quan tháng")
    pdf.setFillColor(HexColor("#D5E8EC"))
    pdf.setFont("Arial", 7)
    pdf.drawRightString(x + w - 15, y + h - 28, "Theo kỳ đánh giá")
    filter_y = y + h - 78
    for label, field, field_w in [("Hiển thị", "Theo kỳ đánh giá", 132), ("Góc nhìn", "Dự án / Nhân sự", 132), ("Phòng", "Tất cả phòng", 103)]:
        pdf.setFillColor(COLORS["muted"])
        pdf.setFont("Arial-Bold", 6.7)
        pdf.drawString(x + 16, filter_y + 10, label)
        rounded(pdf, x + 16, filter_y - 10, field_w, 22, COLORS["paper"], COLORS["line"], 4)
        pdf.setFillColor(COLORS["ink"])
        pdf.setFont("Arial-Bold", 7.2)
        pdf.drawString(x + 24, filter_y - 1, field)
        x += field_w + 13
    x = M
    labels = [("Tổng số công việc", COLORS["blue"]), ("KPI bình quân", COLORS["amber"]), ("Hoàn thành", COLORS["green"]), ("Cảnh báo xử lý", COLORS["red"])]
    for index, (label, accent) in enumerate(labels):
        cx = x + 15 + index * 116
        rounded(pdf, cx, y + h - 144, 105, 48, COLORS["paper"], COLORS["line"], 5)
        pdf.setFillColor(accent)
        pdf.roundRect(cx, y + h - 99, 105, 3, 2, fill=1, stroke=0)
        pdf.setFillColor(COLORS["ink"])
        pdf.setFont("Arial-Bold", 7.2)
        text(pdf, cx + 9, y + h - 110, 87, label, font="Arial-Bold", size=7.2, color=COLORS["ink"], leading=8.6, max_lines=2)
        pdf.setFillColor(COLORS["muted"])
        pdf.setFont("Arial", 6.4)
        pdf.drawString(cx + 9, y + h - 134, "Mở xem chi tiết")
    sections = [
        ("Thông kê công việc", "Dự án | Nhân sự | bộ lọc phòng", COLORS["blue"]),
        ("Phân tích khối lượng và hiệu quả", "Điều hành | Nhân sự | Dự án | Phòng ban", COLORS["teal"]),
        ("Tình hình các phòng", "Mở chi tiết theo từng phòng", COLORS["green"]),
    ]
    sy = y + h - 172
    for title, body, accent in sections:
        rounded(pdf, x + 15, sy - 44, w - 30, 37, white, COLORS["line"], 4)
        pdf.setFillColor(accent)
        pdf.circle(x + 28, sy - 25, 4, fill=1, stroke=0)
        pdf.setFillColor(COLORS["ink"])
        pdf.setFont("Arial-Bold", 7.8)
        pdf.drawString(x + 40, sy - 20, title)
        pdf.setFillColor(COLORS["muted"])
        pdf.setFont("Arial", 6.8)
        pdf.drawRightString(x + w - 27, sy - 20, body)
        sy -= 48

    right_x = 555
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 11)
    pdf.drawString(right_x, 397, "Từ một chỉ số đến quyết định")
    insight = [
        ("1", "Bắt đầu bằng phạm vi", "Theo kỳ đánh giá hoặc toàn bộ dữ liệu, sau đó lọc theo phòng.", COLORS["blue"], COLORS["blue_tint"]),
        ("2", "Chọn góc nhìn", "Chuyển giữa dự án và nhân sự, không thay đổi cách hiểu số liệu.", COLORS["teal"], COLORS["navy_tint"]),
        ("3", "Mở chi tiết khi cần", "Các ô thống kê và dòng dữ liệu dẫn vào bảng hoặc popup liên quan.", COLORS["green"], COLORS["green_tint"]),
        ("4", "Xuất khi cần báo cáo", "Popup tổng quan hỗ trợ xuất Excel; báo cáo ngày/tháng xuất PDF.", COLORS["amber"], COLORS["amber_tint"]),
    ]
    yy = 357
    for item in insight:
        feature_card(pdf, right_x, yy - 58, 247, 57, *item)
        yy -= 70
    footer(pdf, 4)


def alerts(pdf):
    page_header(pdf, 5, "Theo dõi chủ động", "Biến tín hiệu thành hành động", "Các chỉ báo được tổ chức quanh việc cần xử lý: quá hạn, sắp đến hạn, trở ngại và trễ mốc cập nhật.")
    section_title(pdf, M, 466, "04. Điều hành", "Không chờ đến cuối kỳ mới thấy vấn đề", "Theo dõi điều hành đưa mốc cập nhật, trở ngại và quan hệ phụ thuộc vào ngay từng công việc.")
    signals = [
        ("Quá hạn", "Hệ thống tự xác định theo thời hạn; không phải là trạng thái để người dùng tự chọn.", COLORS["red"], COLORS["red_tint"]),
        ("Sắp đến hạn", "Tập trung công việc sắp chạm mốc hoàn thành để chủ động phối hợp.", COLORS["amber"], COLORS["amber_tint"]),
        ("Có trở ngại", "Ghi nhận nội dung vướng mắc, đơn vị phối hợp và đề nghị hỗ trợ.", COLORS["blue"], COLORS["blue_tint"]),
        ("Trễ mốc cập nhật", "Nhận diện công việc không cập nhật theo mốc đã cam kết.", COLORS["teal"], COLORS["navy_tint"]),
    ]
    card_w = 182
    for index, item in enumerate(signals):
        x = M + index * (card_w + 13)
        feature_card(pdf, x, 295, card_w, 106, str(index + 1), *item)
    rounded(pdf, M, 118, PAGE_W - 2 * M, 138, COLORS["paper"], COLORS["line"], 8)
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 11)
    pdf.drawString(M + 20, 229, "Mỗi tín hiệu dẫn về một điểm xử lý rõ ràng")
    actions = [
        ("Xem công việc", "Mở chi tiết để biết người thực hiện, dự án, hạn và diễn biến.", COLORS["blue"]),
        ("Cập nhật tiến độ", "Người được giao, phối hợp hoặc quản lý theo quyền có thể báo cáo kết quả.", COLORS["teal"]),
        ("Yêu cầu hỗ trợ", "Ghi trở ngại, mốc tiếp theo và đơn vị cần phối hợp trong cùng bản việc.", COLORS["amber"]),
        ("Đánh giá hoàn thành", "Kết quả hoàn thành đi vào luồng chờ phê duyệt khi áp dụng.", COLORS["green"]),
    ]
    for index, (title, body, accent) in enumerate(actions):
        x = M + 20 + index * 188
        pdf.setFillColor(accent)
        pdf.circle(x + 7, 177, 7, fill=1, stroke=0)
        pdf.setFillColor(white)
        pdf.setFont("Arial-Bold", 7)
        pdf.drawCentredString(x + 7, 174.5, str(index + 1))
        pdf.setFillColor(COLORS["ink"])
        pdf.setFont("Arial-Bold", 8.8)
        pdf.drawString(x + 22, 181, title)
        text(pdf, x + 22, 168, 156, body, size=7.3, color=COLORS["muted"], leading=9.5, max_lines=3)
    footer(pdf, 5)


def calendar(pdf):
    page_header(pdf, 6, "Lịch công việc", "Một lịch chung, một lịch theo trách nhiệm", "Lịch công việc đặt các cuộc họp, nhiệm vụ và nhắc lịch vào cùng một bức tranh tuần để tránh bỏ lỡ hoạt động cần phối hợp.")
    section_title(pdf, M, 466, "05. Lịch công việc", "Tổ chức thời gian làm việc có kiểm soát", "Lịch tổng cho phép theo dõi hoạt động chung; Lịch của tôi tập trung các lịch liên quan trực tiếp đến người đang đăng nhập.")
    x, y, w, h = M, 115, 470, 288
    rounded(pdf, x, y, w, h, white, COLORS["line"], 8)
    tabs = [("Lịch tổng", True), ("Lịch của tôi", False), ("Việc từ kết luận", False)]
    tx = x + 16
    for label, active in tabs:
        tab_w = 105 if label != "Việc từ kết luận" else 132
        rounded(pdf, tx, y + h - 37, tab_w, 23, COLORS["teal"] if active else COLORS["paper"], COLORS["line"], 4)
        pdf.setFillColor(white if active else COLORS["muted"])
        pdf.setFont("Arial-Bold", 7.4)
        pdf.drawCentredString(tx + tab_w / 2, y + h - 28.7, label)
        tx += tab_w + 8
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 9)
    pdf.drawString(x + 16, y + h - 66, "Tuần làm việc")
    pdf.setFillColor(COLORS["muted"])
    pdf.setFont("Arial", 7.2)
    pdf.drawString(x + 16, y + h - 80, "Điều hướng tuần, lọc lãnh đạo, phòng và tìm kiếm nội dung")
    headers = ["Thứ / Ngày", "Thời gian", "Nội dung công việc", "Địa điểm", "Lãnh đạo", "Phòng chuẩn bị", "Thành phần tham dự"]
    widths = [58, 47, 129, 62, 56, 62, 104]
    current_x = x + 11
    head_y = y + h - 112
    pdf.setFillColor(COLORS["navy_tint"])
    pdf.roundRect(x + 10, head_y - 15, w - 20, 20, 3, fill=1, stroke=0)
    for header_text, width in zip(headers, widths):
        pdf.setFillColor(COLORS["teal_dark"])
        pdf.setFont("Arial-Bold", 5.9)
        pdf.drawString(current_x + 3, head_y - 8, header_text)
        current_x += width
    sample_rows = [
        ("Thứ Hai", "08:00", "Họp rà soát tiến độ dự án", "Phòng họp", "Lãnh đạo", "Phòng GPMB"),
        ("Thứ Ba", "14:00", "Kiểm tra hiện trường", "Dự án", "Lãnh đạo", "Phòng Dự án"),
        ("Thứ Tư", "08:30", "Làm việc với đơn vị phối hợp", "Trụ sở", "Lãnh đạo", "Văn phòng"),
    ]
    row_y = head_y - 25
    for day, hour, subject, place, leader, department in sample_rows:
        pdf.setStrokeColor(COLORS["line"])
        pdf.line(x + 11, row_y - 21, x + w - 11, row_y - 21)
        cells = [day, hour, subject, place, leader, department, "Theo danh sách"]
        current_x = x + 11
        for cell, width in zip(cells, widths):
            pdf.setFillColor(COLORS["ink"] if current_x < x + 250 else COLORS["muted"])
            pdf.setFont("Arial-Bold" if current_x == x + 11 else "Arial", 6.2)
            text(pdf, current_x + 3, row_y, width - 5, cell, font="Arial-Bold" if current_x == x + 11 else "Arial", size=6.2, color=COLORS["ink"] if current_x < x + 250 else COLORS["muted"], leading=7.5, max_lines=2)
            current_x += width
        row_y -= 31
    pdf.setFillColor(COLORS["muted"])
    pdf.setFont("Arial", 6.3)
    pdf.drawString(x + 16, y + 15, "Minh họa cấu trúc hiển thị; nội dung thực tế lấy từ lịch công việc của hệ thống.")

    right_x = 535
    feature_card(pdf, right_x, 337, 267, 66, "A", "Lịch tổng", "Nhìn lịch chung của đơn vị trong tuần, lọc theo lãnh đạo, phòng và nội dung.", COLORS["blue"], COLORS["blue_tint"])
    feature_card(pdf, right_x, 256, 267, 66, "B", "Lịch của tôi", "Tập trung lịch mà người dùng là lãnh đạo, thành phần tham dự hoặc phòng chuẩn bị.", COLORS["teal"], COLORS["navy_tint"])
    feature_card(pdf, right_x, 175, 267, 66, "C", "Nhắc lịch có lựa chọn", "Từng công việc/cuộc họp có thể bật hoặc tắt nhắc; thiết lập nhắc trước 5, 15, 30, 60 phút.", COLORS["green"], COLORS["green_tint"])
    feature_card(pdf, right_x, 94, 267, 66, "D", "Đúng quyền, đúng thao tác", "Admin, Ban giám đốc hoặc tài khoản được phân quyền có thể thêm, sửa, xóa; các tài khoản khác xem Lịch tổng.", COLORS["amber"], COLORS["amber_tint"])
    footer(pdf, 6)


def reports(pdf):
    page_header(pdf, 7, "KPI và báo cáo", "Dữ liệu vận hành phải tạo được quyết định", "KPI và báo cáo không đứng riêng lẻ: chúng dùng cùng nguồn công việc, theo phạm vi người dùng được xem và có quy tắc thống kê rõ ràng.")
    section_title(pdf, M, 466, "06. KPI và báo cáo", "Từ kết quả công việc đến bức tranh quản trị", "Hệ thống hỗ trợ KPI cá nhân, KPI phòng, báo cáo công việc hàng ngày và báo cáo hàng tháng có thể xuất PDF hoặc Excel theo từng màn hình.")
    blocks = [
        ("KPI cá nhân", "Danh mục KPI, điểm thực hiện, đánh giá hoàn thành và tổng hợp điểm toàn Ban.", COLORS["blue"], COLORS["blue_tint"]),
        ("KPI phòng", "Đánh giá theo phòng, điểm tổng hợp và hiệu quả theo đơn vị trong kỳ.", COLORS["green"], COLORS["green_tint"]),
        ("Báo cáo ngày", "Một công việc được tính một lần khi phát sinh, có diễn biến, đến hạn, hoàn thành hoặc được phê duyệt trong ngày.", COLORS["amber"], COLORS["amber_tint"]),
        ("Báo cáo tháng", "Tổng hợp công việc theo quy tắc phát sinh trong tháng và phân tích theo phòng, nhân viên.", COLORS["teal"], COLORS["navy_tint"]),
    ]
    for index, item in enumerate(blocks):
        x = M + (index % 2) * 389
        y = 311 - (index // 2) * 108
        feature_card(pdf, x, y, 374, 91, str(index + 1), *item)
    rounded(pdf, M, 72, PAGE_W - 2 * M, 100, COLORS["paper"], COLORS["line"], 8)
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 10.5)
    pdf.drawString(M + 19, 145, "Nguyên tắc số liệu giúp báo cáo có thể đối chiếu")
    rules = [
        ("Không nhân bản", "Một công việc chỉ được tính một lần, kể cả khi có nhiều người phối hợp."),
        ("Đúng phạm vi", "Số liệu theo kỳ đánh giá, ngày báo cáo hoặc tháng báo cáo đã chọn."),
        ("Đủ các dấu mốc", "Bao gồm tạo mới, cập nhật, đến hạn, hoàn thành và phê duyệt theo từng báo cáo."),
        ("Có đường đi đến chi tiết", "Từ chỉ số hoặc dòng thống kê có thể mở bảng chi tiết và xuất dữ liệu."),
    ]
    for index, (title, body) in enumerate(rules):
        x = M + 18 + index * 190
        pdf.setFillColor(COLORS["teal"])
        pdf.circle(x + 5, 110, 4.2, fill=1, stroke=0)
        pdf.setFillColor(COLORS["ink"])
        pdf.setFont("Arial-Bold", 8)
        pdf.drawString(x + 16, 114, title)
        text(pdf, x + 16, 103, 165, body, size=6.9, color=COLORS["muted"], leading=8.6, max_lines=3)
    footer(pdf, 7)


def controls(pdf):
    page_header(pdf, 8, "Vận hành tin cậy", "Kiểm soát dữ liệu để người dùng làm việc liên tục", "Hệ thống có cơ chế phiên sử dụng, phân quyền theo vai trò, kiểm tra phiên bản dữ liệu và lịch sử hoạt động để giảm rủi ro khi nhiều người cùng thao tác.")
    section_title(pdf, M, 466, "07. Nền tảng vận hành", "Ổn định không phải chỉ là không có lỗi", "Đó là khả năng giữ đúng dữ liệu, đúng quyền và đúng phiên làm việc khi điều kiện mạng hoặc số người dùng thay đổi.")
    controls = [
        ("Một tài khoản, một phiên", "Thiết bị đăng nhập mới thay phiên cũ; hệ thống kiểm tra phiên để bảo vệ tài khoản.", COLORS["blue"], COLORS["blue_tint"]),
        ("Kiểm tra phiên bản trước khi lưu", "Máy chủ đối chiếu phiên bản dữ liệu để tránh ghi đè thay đổi mới hơn.", COLORS["teal"], COLORS["navy_tint"]),
        ("Mạng gián đoạn không đồng nghĩa mất việc", "Khi kết nối tạm thời chập chờn, phiên cục bộ và dữ liệu đã lưu được duy trì để xác minh lại.", COLORS["amber"], COLORS["amber_tint"]),
        ("Phân quyền theo vai trò", "Quyền xem, giao, cập nhật, phê duyệt và quản trị được quyết định theo tài khoản và công việc liên quan.", COLORS["green"], COLORS["green_tint"]),
        ("Lịch sử hoạt động có thể tra cứu", "Các hành động trên công việc, nhân sự, KPI và cấu hình được ghi thành dòng thời gian.", COLORS["red"], COLORS["red_tint"]),
        ("Dữ liệu theo phạm vi", "Người dùng chỉ nhìn và xuất phần dữ liệu phù hợp với quyền đã được cấp.", COLORS["blue"], COLORS["blue_tint"]),
    ]
    for index, item in enumerate(controls):
        x = M + (index % 3) * 258
        y = 266 - (index // 3) * 128
        feature_card(pdf, x, y, 244, 109, str(index + 1), *item)
    footer(pdf, 8)


def roles(pdf):
    page_header(pdf, 9, "Giá trị theo vai trò", "Mỗi người dùng nhìn thấy phần việc cần thiết", "Một hệ thống hiệu quả là hệ thống hỗ trợ đúng việc cho từng vai trò, nhưng vẫn tạo được một nguồn dữ liệu chung cho toàn Ban.")
    section_title(pdf, M, 466, "08. Trải nghiệm sử dụng", "Một nguồn dữ liệu, bốn cách sử dụng", "Từ người thực hiện đến lãnh đạo, hệ thống đưa từng người đến đúng điểm bắt đầu và cho phép họ đi sâu khi cần.")
    role_rows = [
        ("Cán bộ thực hiện", "Mở mục Công việc khi đăng nhập; cập nhật tiến độ, báo cáo nội dung, hồ sơ, trở ngại và mốc tiếp theo.", "Công việc cần làm rõ ràng, lịch cá nhân và nhắc lịch để không bỏ sót.", COLORS["blue"], COLORS["blue_tint"]),
        ("Trưởng/phó phòng", "Theo dõi đội ngũ, phân công và điều phối các việc trong phạm vi đơn vị/quyền được giao.", "Nắm tải việc, công việc quá hạn và các điểm cần phối hợp ngay trong luồng xử lý.", COLORS["teal"], COLORS["navy_tint"]),
        ("Ban giám đốc", "Mở Tổng quan để xem theo kỳ, phòng, dự án và nhân sự; đi đến chi tiết khi có tín hiệu cần xử lý.", "Có bức tranh toàn Ban, lịch tổng và báo cáo phục vụ điều hành.", COLORS["green"], COLORS["green_tint"]),
        ("Admin", "Quản trị tài khoản, phân quyền, danh mục, dữ liệu nền và cấu hình vận hành.", "Kiểm soát nhất quán cách sử dụng hệ thống và hỗ trợ các vai trò khác.", COLORS["amber"], COLORS["amber_tint"]),
    ]
    y = 351
    for title, doing, outcome, accent, tint in role_rows:
        rounded(pdf, M, y, PAGE_W - 2 * M, 66, white, COLORS["line"], 6)
        pdf.setFillColor(tint)
        pdf.roundRect(M + 12, y + 12, 150, 42, 5, fill=1, stroke=0)
        pdf.setFillColor(accent)
        pdf.setFont("Arial-Bold", 9.3)
        pdf.drawString(M + 23, y + 35, title)
        pdf.setFillColor(COLORS["ink"])
        pdf.setFont("Arial-Bold", 7.6)
        pdf.drawString(M + 184, y + 43, "Thao tác chính")
        text(pdf, M + 184, y + 35, 322, doing, size=7.1, color=COLORS["muted"], leading=8.8, max_lines=2)
        pdf.setFillColor(COLORS["ink"])
        pdf.setFont("Arial-Bold", 7.6)
        pdf.drawString(M + 530, y + 43, "Giá trị nhận được")
        text(pdf, M + 530, y + 35, 235, outcome, size=7.1, color=COLORS["muted"], leading=8.8, max_lines=2)
        y -= 79
    rounded(pdf, M, 58, PAGE_W - 2 * M, 44, COLORS["teal_dark"], None, 6)
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 11.3)
    pdf.drawString(M + 18, 80, "Mục tiêu cuối cùng: mọi công việc đều có người chịu trách nhiệm, diễn biến để theo dõi và kết quả để ra quyết định.")
    footer(pdf, 9)


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    register_fonts()
    pdf = canvas.Canvas(str(OUTPUT), pagesize=landscape(A4), pageCompression=1)
    pdf.setTitle("Hồ sơ giới thiệu Hệ thống Quản lý hiệu quả công việc")
    pdf.setAuthor("Ban Quản lý Dự án Đầu tư - Hạ tầng xã Phúc Thịnh")
    cover(pdf)
    pdf.showPage()
    lifecycle(pdf)
    pdf.showPage()
    task_form(pdf)
    pdf.showPage()
    overview(pdf)
    pdf.showPage()
    alerts(pdf)
    pdf.showPage()
    calendar(pdf)
    pdf.showPage()
    reports(pdf)
    pdf.showPage()
    controls(pdf)
    pdf.showPage()
    roles(pdf)
    pdf.save()


if __name__ == "__main__":
    main()
