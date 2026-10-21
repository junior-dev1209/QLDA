from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Mau_bao_cao_cong_viec_hang_thang.pdf"
FONT_REGULAR = r"C:\Windows\Fonts\arial.ttf"
FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
PAGE_WIDTH, PAGE_HEIGHT = landscape(A4)

INK = colors.HexColor("#13263A")
MUTED = colors.HexColor("#64748B")
LINE = colors.HexColor("#D8E2E8")
PANEL = colors.HexColor("#F8FAFC")
TEAL = colors.HexColor("#176878")
TEAL_DARK = colors.HexColor("#0D4E5B")
TEAL_LIGHT = colors.HexColor("#E9F5F4")
GREEN = colors.HexColor("#16805F")
GREEN_LIGHT = colors.HexColor("#EAF7F0")
BLUE = colors.HexColor("#2F7FA4")
BLUE_LIGHT = colors.HexColor("#EAF3F8")
RED = colors.HexColor("#B42318")
RED_LIGHT = colors.HexColor("#FCEDEC")

DEPARTMENTS = [
    ("phòng GPMB", 316, 124, 79, 113, 60),
    ("Phòng Dự án 1", 105, 52, 33, 20, 21),
    ("Phòng Dự án 2", 86, 43, 29, 14, 16),
    ("phòng KHTH", 54, 28, 21, 5, 14),
    ("phòng QLHT", 47, 20, 17, 10, 7),
]

PEOPLE = [
    ("Nguyễn Thanh Hiếu", "phòng GPMB", 74, 28, 18, 28, 15),
    ("Phạm Thu Hằng", "phòng GPMB", 66, 29, 20, 17, 12),
    ("Đỗ Ngọc Dương", "phòng GPMB", 53, 25, 16, 12, 11),
    ("Bạch Vũ Khánh Linh", "phòng GPMB", 47, 18, 14, 15, 10),
    ("Chu Tiến Phát", "phòng GPMB", 76, 24, 11, 41, 12),
    ("Nguyễn Cẩm Trang", "Phòng Dự án 1", 39, 21, 11, 7, 7),
    ("Hà Văn Thịnh", "Phòng Dự án 1", 34, 17, 12, 5, 8),
    ("Tô Văn Hào", "Phòng Dự án 1", 32, 14, 10, 8, 6),
    ("Đinh Thị Uyên", "Phòng Dự án 2", 31, 17, 10, 4, 5),
    ("Nguyễn Thị Hồng Hạnh", "Phòng Dự án 2", 29, 12, 10, 7, 6),
    ("Nghiêm Thị Trà", "Phòng Dự án 2", 26, 14, 9, 3, 5),
    ("Ngô Thùy Linh", "phòng KHTH", 28, 16, 10, 2, 8),
    ("Lê Đức Tâm", "phòng KHTH", 26, 12, 11, 3, 6),
    ("Ngô Quang Vinh", "phòng QLHT", 25, 11, 8, 6, 4),
    ("Hoàng Đức Ngọc", "phòng QLHT", 22, 9, 9, 4, 3),
]


def register_fonts():
    pdfmetrics.registerFont(TTFont("ReportSans", FONT_REGULAR))
    pdfmetrics.registerFont(TTFont("ReportSansBold", FONT_BOLD))


def validate_sample_data():
    by_department = {}
    for _, department, total, completed, not_due, overdue, login_count in PEOPLE:
        aggregate = by_department.setdefault(department, [0, 0, 0, 0, 0])
        for index, value in enumerate((total, completed, not_due, overdue, login_count)):
            aggregate[index] += value
    for department, total, completed, not_due, overdue, login_count in DEPARTMENTS:
        if by_department.get(department) != [total, completed, not_due, overdue, login_count]:
            raise ValueError(f"Sample personnel totals do not match {department}.")
        if total != completed + not_due + overdue:
            raise ValueError(f"Sample task status totals do not match {department}.")


def draw_text(pdf, x, y, value, size=9, color=INK, bold=False, align="left"):
    pdf.setFillColor(color)
    pdf.setFont("ReportSansBold" if bold else "ReportSans", size)
    if align == "right":
        pdf.drawRightString(x, y, str(value))
    elif align == "center":
        pdf.drawCentredString(x, y, str(value))
    else:
        pdf.drawString(x, y, str(value))


def draw_paragraph(pdf, x, top, width, value, size=8.2, color=INK, bold=False, leading=None, max_lines=None):
    font = "ReportSansBold" if bold else "ReportSans"
    leading = leading or size * 1.34
    lines = simpleSplit(str(value), font, size, width)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1][: max(0, len(lines[-1]) - 3)] + "..."
    for index, line in enumerate(lines):
        draw_text(pdf, x, top - index * leading, line, size, color, bold)
    return top - len(lines) * leading


def rounded_rect(pdf, x, y, width, height, fill, stroke=None, radius=6):
    pdf.setFillColor(fill)
    pdf.setStrokeColor(stroke or fill)
    pdf.roundRect(x, y, width, height, radius, fill=1, stroke=bool(stroke))


def draw_header(pdf, page, section):
    pdf.setFillColor(TEAL_DARK)
    pdf.rect(0, PAGE_HEIGHT - 62, PAGE_WIDTH, 62, fill=1, stroke=0)
    draw_text(pdf, 28, PAGE_HEIGHT - 25, "BAN QUẢN LÝ DỰ ÁN ĐẦU TƯ - HẠ TẦNG XÃ PHÚC THỊNH", 9, colors.white, True)
    draw_text(pdf, 28, PAGE_HEIGHT - 43, "BÁO CÁO TỔNG HỢP CÔNG VIỆC HÀNG THÁNG", 16, colors.white, True)
    draw_text(pdf, PAGE_WIDTH - 28, PAGE_HEIGHT - 25, "Kỳ báo cáo: 09/2026", 8.4, colors.white, True, "right")
    draw_text(pdf, PAGE_WIDTH - 28, PAGE_HEIGHT - 41, section, 8.1, colors.HexColor("#BEE8E3"), False, "right")
    pdf.setStrokeColor(LINE)
    pdf.setLineWidth(0.5)
    pdf.line(28, 24, PAGE_WIDTH - 28, 24)
    draw_text(pdf, 28, 12, "Mẫu minh họa - dữ liệu giả định, phục vụ duyệt bố cục và chỉ số báo cáo.", 7.2, MUTED)
    draw_text(pdf, PAGE_WIDTH - 28, 12, f"Trang {page}/2", 7.2, MUTED, False, "right")


def metric_card(pdf, x, y, width, label, value, note, color, tint):
    rounded_rect(pdf, x, y, width, 62, colors.white, LINE, 7)
    pdf.setFillColor(color)
    pdf.roundRect(x, y + 58, width, 4, 7, fill=1, stroke=0)
    draw_text(pdf, x + 11, y + 40, label, 8.1, MUTED, True)
    draw_text(pdf, x + 11, y + 18, f"{value:,}".replace(",", "."), 21, color, True)
    rounded_rect(pdf, x + width - 72, y + 14, 60, 22, tint, None, 5)
    draw_text(pdf, x + width - 42, y + 21.5, note, 7.0, color, True, "center")


def section_heading(pdf, x, y, title, note=""):
    draw_text(pdf, x, y, title, 11.4, INK, True)
    if note:
        draw_text(pdf, PAGE_WIDTH - 28, y + 1, note, 8.1, MUTED, False, "right")
    pdf.setStrokeColor(LINE)
    pdf.line(x, y - 7, PAGE_WIDTH - 28, y - 7)


def cell_text(pdf, x, y, width, value, size=8.3, color=INK, bold=False, align="right"):
    draw_text(pdf, x + (width - 8 if align == "right" else 8), y, value, size, color, bold, align)


def department_table(pdf, top):
    x = 28
    widths = [185, 90, 100, 110, 85, 110, 105]
    headers = ["Phòng ban", "Kế hoạch", "Hoàn thành", "Chưa đến hạn", "Quá hạn", "Lượt đăng nhập", "Tỷ lệ HT"]
    total_width = sum(widths)
    rounded_rect(pdf, x, top - 24, total_width, 25, colors.HexColor("#EDF4F6"), None, 6)
    running_x = x
    for index, header in enumerate(headers):
        cell_text(pdf, running_x, top - 16, widths[index], header, 7.5, MUTED, True, "left" if index == 0 else "right")
        running_x += widths[index]
    y = top - 48
    for index, row in enumerate(DEPARTMENTS):
        name, total, completed, on_time, overdue, login_count = row
        if index % 2 == 0:
            pdf.setFillColor(PANEL)
            pdf.rect(x, y - 11, total_width, 29, fill=1, stroke=0)
        values = [name, total, completed, on_time, overdue, login_count, f"{completed / total * 100:.0f}%"]
        tones = [INK, TEAL, GREEN, BLUE, RED, TEAL, GREEN]
        running_x = x
        for cell_index, value in enumerate(values):
            cell_text(pdf, running_x, y, widths[cell_index], value, 8.5, tones[cell_index], cell_index == 0 or cell_index > 1, "left" if cell_index == 0 else "right")
            running_x += widths[cell_index]
        pdf.setStrokeColor(LINE)
        pdf.line(x, y - 12, x + total_width, y - 12)
        y -= 29
    return y


def department_distribution(pdf, top):
    x = 28
    width = PAGE_WIDTH - 56
    max_total = max(row[1] for row in DEPARTMENTS)
    row_height = 23
    for index, (name, total, completed, on_time, overdue, _login_count) in enumerate(DEPARTMENTS):
        y = top - index * row_height
        draw_text(pdf, x, y, name, 8.2, INK, True)
        draw_text(pdf, x + 162, y, f"{total} việc", 8.0, MUTED, False, "right")
        track_x = x + 176
        track_width = 375
        rounded_rect(pdf, track_x, y - 4, track_width, 9, colors.HexColor("#E5EDF1"), None, 4)
        completed_width = track_width * completed / max_total
        on_time_width = track_width * on_time / max_total
        overdue_width = track_width * overdue / max_total
        rounded_rect(pdf, track_x, y - 4, completed_width, 9, GREEN, None, 4)
        rounded_rect(pdf, track_x + completed_width, y - 4, on_time_width, 9, BLUE, None, 0)
        rounded_rect(pdf, track_x + completed_width + on_time_width, y - 4, overdue_width, 9, RED, None, 0)
        draw_text(pdf, track_x + track_width + 11, y, f"{completed} hoàn thành  |  {overdue} quá hạn", 7.8, MUTED)


def people_table(pdf, top):
    x = 28
    widths = [30, 150, 120, 72, 82, 90, 72, 95, 75]
    headers = ["STT", "Nhân sự", "Phòng", "Kế hoạch", "Hoàn thành", "Chưa đến hạn", "Quá hạn", "Lượt đăng nhập", "Tỷ lệ HT"]
    total_width = sum(widths)
    rounded_rect(pdf, x, top - 24, total_width, 25, colors.HexColor("#EDF4F6"), None, 6)
    running_x = x
    for index, header in enumerate(headers):
        cell_text(pdf, running_x, top - 16, widths[index], header, 7.2, MUTED, True, "left" if index in (1, 2) else "right")
        running_x += widths[index]
    y = top - 47
    for index, row in enumerate(PEOPLE, start=1):
        name, department, total, completed, on_time, overdue, login_count = row
        if index % 2:
            pdf.setFillColor(PANEL)
            pdf.rect(x, y - 9, total_width, 24, fill=1, stroke=0)
        values = [index, name, department, total, completed, on_time, overdue, login_count, f"{completed / total * 100:.0f}%"]
        tones = [MUTED, INK, MUTED, TEAL, GREEN, BLUE, RED, TEAL, GREEN]
        running_x = x
        for cell_index, value in enumerate(values):
            cell_text(pdf, running_x, y, widths[cell_index], value, 7.8, tones[cell_index], cell_index in (1, 4, 6, 8), "left" if cell_index in (1, 2) else "right")
            running_x += widths[cell_index]
        pdf.setStrokeColor(LINE)
        pdf.line(x, y - 10, x + total_width, y - 10)
        y -= 24
    return y


def methodology_box(pdf, y):
    x = 28
    width = PAGE_WIDTH - 56
    rounded_rect(pdf, x, y - 80, width, 80, colors.HexColor("#F7FAFB"), LINE, 6)
    draw_text(pdf, x + 12, y - 17, "Nguyên tắc tính số liệu mẫu", 9, INK, True)
    notes = [
        "Kế hoạch: công việc có hạn hoàn thành trong kỳ; hoặc phát sinh trong kỳ nhưng chưa hoàn thành; hoặc hoàn thành/duyệt hoàn thành trong kỳ.",
        "Hoàn thành: công việc được chuyển sang Hoàn thành trong kỳ; Chưa đến hạn và Quá hạn là trạng thái công việc chưa hoàn thành tại cuối kỳ.",
        "Lượt đăng nhập: số lần xác thực thành công của tài khoản còn hiệu lực, đã liên kết với nhân sự trong kỳ báo cáo.",
    ]
    cursor = y - 31
    for note in notes:
        pdf.setFillColor(TEAL)
        pdf.circle(x + 16, cursor + 2, 2, fill=1, stroke=0)
        draw_paragraph(pdf, x + 25, cursor + 4, width - 36, note, 7.5, MUTED, False, 9.5, max_lines=1)
        cursor -= 14


def make_report():
    validate_sample_data()
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=landscape(A4), pageCompression=1)
    pdf.setTitle("Mẫu báo cáo tổng hợp công việc hàng tháng")
    pdf.setAuthor("Ban Quản lý Dự án Đầu tư - Hạ tầng xã Phúc Thịnh")

    draw_header(pdf, 1, "TỔNG HỢP THEO PHÒNG BAN")
    draw_text(pdf, 28, PAGE_HEIGHT - 82, "Tổng quan kỳ 09/2026", 12, INK, True)
    draw_text(pdf, 28, PAGE_HEIGHT - 96, "Mẫu hiển thị số liệu công việc theo phòng ban trong kỳ đánh giá.", 8.2, MUTED)
    card_y = PAGE_HEIGHT - 166
    gap = 10
    card_width = (PAGE_WIDTH - 56 - gap * 4) / 5
    metric_card(pdf, 28, card_y, card_width, "Công việc kế hoạch", 608, "Trong tháng", TEAL, TEAL_LIGHT)
    metric_card(pdf, 28 + (card_width + gap), card_y, card_width, "Đã hoàn thành", 267, "44%", GREEN, GREEN_LIGHT)
    metric_card(pdf, 28 + 2 * (card_width + gap), card_y, card_width, "Chưa đến hạn", 179, "29%", BLUE, BLUE_LIGHT)
    metric_card(pdf, 28 + 3 * (card_width + gap), card_y, card_width, "Việc quá hạn", 162, "27%", RED, RED_LIGHT)
    metric_card(pdf, 28 + 4 * (card_width + gap), card_y, card_width, "Lượt đăng nhập", 118, "Thành công", TEAL, TEAL_LIGHT)

    table_title = card_y - 27
    section_heading(pdf, 28, table_title, "Kết quả theo phòng ban", "5 phòng có số liệu trong kỳ")
    table_bottom = department_table(pdf, table_title - 18)
    chart_title = table_bottom - 22
    section_heading(pdf, 28, chart_title, "Cơ cấu khối lượng và trạng thái", "Xanh lá: hoàn thành  |  Xanh dương: chưa đến hạn  |  Đỏ: quá hạn")
    department_distribution(pdf, chart_title - 28)
    pdf.showPage()

    draw_header(pdf, 2, "CHI TIẾT THEO NHÂN SỰ")
    draw_text(pdf, 28, PAGE_HEIGHT - 82, "Khối lượng công việc theo nhân viên", 12, INK, True)
    draw_text(pdf, 28, PAGE_HEIGHT - 96, "Sắp xếp theo tổng số công việc kế hoạch. Bảng có thể mở rộng sang nhiều trang khi triển khai thực tế.", 8.2, MUTED)
    section_heading(pdf, 28, PAGE_HEIGHT - 122, "Danh sách nhân sự", f"{len(PEOPLE)} nhân sự minh họa")
    people_table(pdf, PAGE_HEIGHT - 140)
    pdf.save()
    print("Created monthly work report sample PDF")


if __name__ == "__main__":
    make_report()
