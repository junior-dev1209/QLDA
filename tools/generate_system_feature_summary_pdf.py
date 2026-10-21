from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Thong_ke_tom_tat_chuc_nang_he_thong.pdf"

PAGE_W, PAGE_H = A4
MARGIN = 36

COLORS = {
    "ink": HexColor("#16324F"),
    "muted": HexColor("#5C7186"),
    "line": HexColor("#D6E0E8"),
    "panel": HexColor("#F7FAFC"),
    "teal": HexColor("#0E5A68"),
    "blue": HexColor("#2E6FA3"),
    "green": HexColor("#168052"),
    "amber": HexColor("#B66D05"),
    "red": HexColor("#B62D27"),
    "purple": HexColor("#7656A7"),
    "light_teal": HexColor("#E5F2F2"),
    "light_blue": HexColor("#EAF3FA"),
    "light_green": HexColor("#E9F6EE"),
    "light_amber": HexColor("#FFF5DF"),
    "light_red": HexColor("#FCECEA"),
    "light_purple": HexColor("#F2EDF9"),
}


def register_fonts():
    font_dir = Path("C:/Windows/Fonts")
    pdfmetrics.registerFont(TTFont("Arial", str(font_dir / "arial.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(font_dir / "arialbd.ttf")))


def rect(pdf, x, y, width, height, fill, stroke=None, radius=0.0, line_width=0.75):
    pdf.setLineWidth(line_width)
    if fill:
        pdf.setFillColor(fill)
    if stroke:
        pdf.setStrokeColor(stroke)
    if radius:
        pdf.roundRect(x, y, width, height, radius, fill=1 if fill else 0, stroke=1 if stroke else 0)
    else:
        pdf.rect(x, y, width, height, fill=1 if fill else 0, stroke=1 if stroke else 0)


def draw_lines(pdf, x, top, width, text, font="Arial", size=9, color=None, leading=None, max_lines=None):
    leading = leading or size * 1.36
    lines = simpleSplit(text, font, size, width)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while stringWidth(last + "...", font, size) > width and last:
            last = last[:-1]
        lines[-1] = last.rstrip() + "..."
    if color:
        pdf.setFillColor(color)
    pdf.setFont(font, size)
    for index, line in enumerate(lines):
        pdf.drawString(x, top - index * leading - size, line)
    return len(lines) * leading


def draw_header(pdf, page, title, subtitle):
    header_h = 107
    rect(pdf, 0, PAGE_H - header_h, PAGE_W, header_h, COLORS["teal"])
    pdf.setFillColor(HexColor("#CDE5E8"))
    pdf.setFont("Arial-Bold", 7.5)
    pdf.drawString(MARGIN, PAGE_H - 27, "BAN QUẢN LÝ DỰ ÁN ĐẦU TƯ - HẠ TẦNG XÃ PHÚC THỊNH")
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 20)
    pdf.drawString(MARGIN, PAGE_H - 54, title)
    pdf.setFillColor(HexColor("#D7EFF1"))
    pdf.setFont("Arial", 9.5)
    pdf.drawString(MARGIN, PAGE_H - 73, subtitle)

    right = PAGE_W - MARGIN
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 8.5)
    pdf.drawRightString(right, PAGE_H - 38, "BẢN TÓM TẮT NĂNG LỰC VẬN HÀNH")
    pdf.setFillColor(HexColor("#D7EFF1"))
    pdf.setFont("Arial", 8)
    pdf.drawRightString(right, PAGE_H - 55, "Ngày lập: 28/09/2026")
    pdf.drawRightString(right, PAGE_H - 70, f"Trang {page}/2")


def draw_footer(pdf, page):
    y = 23
    pdf.setStrokeColor(COLORS["line"])
    pdf.setLineWidth(0.6)
    pdf.line(MARGIN, y + 11, PAGE_W - MARGIN, y + 11)
    pdf.setFillColor(COLORS["muted"])
    pdf.setFont("Arial", 7.2)
    pdf.drawString(MARGIN, y, "Tài liệu tóm tắt các nhóm chức năng đang có trong hệ thống.")
    pdf.drawRightString(PAGE_W - MARGIN, y, f"Quản lý hiệu quả công việc | {page}/2")


def draw_feature_card(pdf, x, y, width, height, number, title, body, accent, tint):
    rect(pdf, x, y, width, height, white, COLORS["line"], 5.5)
    rect(pdf, x, y, 5, height, accent, None, 5.5)
    rect(pdf, x + 17, y + height - 38, 25, 25, tint, None, 5)
    pdf.setFillColor(accent)
    pdf.setFont("Arial-Bold", 11)
    label = f"{number:02d}"
    pdf.drawCentredString(x + 29.5, y + height - 30.5, label)
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 11.2)
    pdf.drawString(x + 52, y + height - 28, title)
    draw_lines(pdf, x + 18, y + height - 53, width - 36, body, size=8.8, color=COLORS["muted"], leading=12.4, max_lines=4)


def draw_step(pdf, x, y, width, height, number, title, body, accent, tint):
    rect(pdf, x, y, width, height, white, COLORS["line"], 4.5)
    rect(pdf, x, y, 4, height, accent, None, 4.5)
    rect(pdf, x + 14, y + 9, 24, 24, tint, None, 12)
    pdf.setFillColor(accent)
    pdf.setFont("Arial-Bold", 10)
    pdf.drawCentredString(x + 26, y + 16.5, str(number))
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 8.8)
    pdf.drawString(x + 51, y + 22, title)
    draw_lines(pdf, x + 177, y + 24, width - 191, body, size=7.5, color=COLORS["muted"], leading=9, max_lines=1)


def draw_reliability_panel(pdf, x, y, width, height, title, body, accent, tint):
    rect(pdf, x, y, width, height, tint, None, 5.5)
    rect(pdf, x, y, 4, height, accent, None, 5.5)
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 9.4)
    pdf.drawString(x + 16, y + height - 21, title)
    draw_lines(pdf, x + 16, y + height - 33, width - 30, body, size=7.7, color=COLORS["muted"], leading=10.2, max_lines=4)


def page_one(pdf):
    draw_header(
        pdf,
        1,
        "Thống kê tóm tắt chức năng hệ thống",
        "Quản lý, giám sát và điều hành công việc theo phòng, dự án và nhân sự",
    )
    intro_y = PAGE_H - 130
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 12.2)
    pdf.drawString(MARGIN, intro_y, "Các năng lực quản lý chính")
    draw_lines(
        pdf,
        MARGIN,
        intro_y - 12,
        PAGE_W - 2 * MARGIN,
        "Hệ thống hỗ trợ xuyên suốt từ giao việc, cập nhật tiến độ, phê duyệt, đánh giá KPI đến báo cáo và lưu vết hoạt động.",
        size=9.2,
        color=COLORS["muted"],
        leading=12,
    )

    cards = [
        ("Điều hành công việc", "Giao việc theo phòng, dự án và nhân sự; quản lý trạng thái, ưu tiên, hạn hoàn thành, phụ thuộc và công việc định kỳ.", COLORS["blue"], COLORS["light_blue"]),
        ("Theo dõi tiến độ", "Ghi nhận tiến độ, mốc cập nhật tiếp theo, trở ngại, nhu cầu phối hợp và diễn biến thực hiện của từng công việc.", COLORS["green"], COLORS["light_green"]),
        ("Phê duyệt và cảnh báo", "Theo dõi luồng hoàn thành, chờ đánh giá, đạt/không đạt; tự nhận diện quá hạn, sắp đến hạn và trễ mốc cập nhật.", COLORS["amber"], COLORS["light_amber"]),
        ("Lịch công việc", "Tổ chức lịch tổng và lịch cá nhân; quản lý cuộc họp, thành phần tham dự, lặp lại và tùy chọn nhắc lịch.", COLORS["purple"], COLORS["light_purple"]),
        ("KPI và nhân sự", "Quản lý danh mục tiêu chí, KPI cá nhân và KPI phòng; tổng hợp điểm, xếp loại và theo dõi theo kỳ đánh giá.", COLORS["red"], COLORS["light_red"]),
        ("Tổng quan và phân tích", "Hiển thị chỉ số điều hành theo phòng, nhân sự, dự án; biểu đồ khối lượng - hiệu quả và bộ lọc kỳ báo cáo.", COLORS["teal"], COLORS["light_teal"]),
    ]
    gap = 14
    card_w = (PAGE_W - 2 * MARGIN - gap) / 2
    card_h = 122
    start_y = 474
    for index, (title, body, accent, tint) in enumerate(cards):
        col = index % 2
        row = index // 2
        x = MARGIN + col * (card_w + gap)
        y = start_y - row * (card_h + 14)
        draw_feature_card(pdf, x, y, card_w, card_h, index + 1, title, body, accent, tint)

    band_y = 56
    rect(pdf, MARGIN, band_y, PAGE_W - 2 * MARGIN, 50, COLORS["panel"], COLORS["line"], 5.5)
    pdf.setFillColor(COLORS["teal"])
    pdf.setFont("Arial-Bold", 9.5)
    pdf.drawString(MARGIN + 17, band_y + 31, "Phạm vi quản lý")
    draw_lines(
        pdf,
        MARGIN + 17,
        band_y + 20,
        PAGE_W - 2 * MARGIN - 34,
        "Công việc phát sinh, kế hoạch định kỳ, dự án, phòng ban, cán bộ thực hiện, lịch điều hành, KPI và kết quả phê duyệt.",
        size=8.2,
        color=COLORS["muted"],
        leading=10.5,
        max_lines=2,
    )
    draw_footer(pdf, 1)


def page_two(pdf):
    draw_header(
        pdf,
        2,
        "Chu trình điều hành công việc",
        "Từ lập kế hoạch đến đánh giá kết quả, báo cáo và truy vết",
    )
    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 12.2)
    pdf.drawString(MARGIN, PAGE_H - 130, "Chu trình quản lý công việc")
    pdf.setFillColor(COLORS["muted"])
    pdf.setFont("Arial", 8.8)
    pdf.drawString(MARGIN, PAGE_H - 145, "Dữ liệu được tổ chức theo từng công việc, gắn với người thực hiện, dự án, phòng ban và kỳ đánh giá.")

    steps = [
        ("Lập kế hoạch", "Thiết lập kỳ KPI, danh mục, lịch công việc và dự án liên quan.", COLORS["blue"], COLORS["light_blue"]),
        ("Phân công", "Xác định người thực hiện, phối hợp, mức ưu tiên, hạn hoàn thành.", COLORS["purple"], COLORS["light_purple"]),
        ("Thực hiện", "Cập nhật tiến độ, mốc tiếp theo, trở ngại và công việc phụ thuộc.", COLORS["amber"], COLORS["light_amber"]),
        ("Kiểm tra", "Theo dõi cảnh báo, lịch sử thay đổi và luồng phê duyệt hoàn thành.", COLORS["red"], COLORS["light_red"]),
        ("Đánh giá và báo cáo", "Tổng hợp KPI, bảng điều hành, biểu đồ và các báo cáo xuất dữ liệu.", COLORS["green"], COLORS["light_green"]),
    ]
    step_h = 42
    step_y = 620
    for index, (title, body, accent, tint) in enumerate(steps):
        y = step_y - index * (step_h + 5)
        draw_step(pdf, MARGIN, y, PAGE_W - 2 * MARGIN, step_h, index + 1, title, body, accent, tint)

    pdf.setFillColor(COLORS["ink"])
    pdf.setFont("Arial-Bold", 12.2)
    pdf.drawString(MARGIN, 386, "Nền tảng kiểm soát và ổn định")
    reliability = [
        ("Phân quyền vận hành", "Phân vai trò theo tài khoản và có quyền mở rộng cho các nghiệp vụ như quản lý lịch, nhân sự và danh mục.", COLORS["blue"], COLORS["light_blue"]),
        ("Dữ liệu và truy vết", "Đồng bộ dữ liệu tập trung; lưu lịch sử hoạt động để theo dõi thao tác và phục vụ kiểm tra khi cần.", COLORS["green"], COLORS["light_green"]),
        ("Phiên làm việc", "Thiết kế một thiết bị cho mỗi tài khoản; máy chủ xác thực phiên và gia hạn khi người dùng đang hoạt động.", COLORS["amber"], COLORS["light_amber"]),
    ]
    panel_gap = 11
    panel_w = (PAGE_W - 2 * MARGIN - 2 * panel_gap) / 3
    for index, (title, body, accent, tint) in enumerate(reliability):
        draw_reliability_panel(pdf, MARGIN + index * (panel_w + panel_gap), 272, panel_w, 89, title, body, accent, tint)

    rect(pdf, MARGIN, 126, PAGE_W - 2 * MARGIN, 118, white, COLORS["line"], 5.5)
    pdf.setFillColor(COLORS["teal"])
    pdf.setFont("Arial-Bold", 12)
    pdf.drawString(MARGIN + 18, 218, "Đầu ra phục vụ điều hành")
    outputs = [
        ("Tổng quan điều hành", "Chỉ số tổng hợp, theo dõi phòng ban, nhân sự, dự án và các điểm cần xử lý."),
        ("Báo cáo và xuất dữ liệu", "Báo cáo công việc theo ngày/tháng, tệp PDF, Excel và danh sách chi tiết theo phạm vi lọc."),
        ("Lịch sử và hỗ trợ", "Lưu vết các hoạt động chính, theo dõi phê duyệt và cơ sở tra cứu khi điều hành công việc."),
    ]
    output_col_w = (PAGE_W - 2 * MARGIN - 36) / 3
    for index, (title, body) in enumerate(outputs):
        x = MARGIN + 18 + index * output_col_w
        if index:
            pdf.setStrokeColor(COLORS["line"])
            pdf.setLineWidth(0.7)
            pdf.line(x - 12, 145, x - 12, 195)
        pdf.setFillColor(COLORS["ink"])
        pdf.setFont("Arial-Bold", 9.3)
        pdf.drawString(x, 190, title)
        draw_lines(pdf, x, 177, output_col_w - 18, body, size=7.7, color=COLORS["muted"], leading=10, max_lines=4)
    draw_footer(pdf, 2)


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    register_fonts()
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    pdf.setTitle("Thống kê tóm tắt chức năng hệ thống")
    pdf.setAuthor("Ban Quản lý Dự án Đầu tư - Hạ tầng xã Phúc Thịnh")
    pdf.setSubject("Tóm tắt các tính năng quản lý, giám sát và điều hành công việc")
    page_one(pdf)
    pdf.showPage()
    page_two(pdf)
    pdf.save()
    print(OUTPUT.name)


if __name__ == "__main__":
    build_pdf()
