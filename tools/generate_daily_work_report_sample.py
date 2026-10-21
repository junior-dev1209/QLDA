from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Mau_bao_cao_cong_viec_hang_ngay.pdf"
FONT_REGULAR = r"C:\Windows\Fonts\arial.ttf"
FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
PAGE_WIDTH, PAGE_HEIGHT = landscape(A4)

INK = colors.HexColor("#13263A")
MUTED = colors.HexColor("#64748B")
LINE = colors.HexColor("#D8E2E8")
PANEL = colors.HexColor("#F8FAFC")
TEAL = colors.HexColor("#116B78")
TEAL_DARK = colors.HexColor("#0D4E5B")
TEAL_LIGHT = colors.HexColor("#E9F5F4")
BLUE = colors.HexColor("#2F7FA4")
BLUE_LIGHT = colors.HexColor("#EAF3F8")
GREEN = colors.HexColor("#16805F")
GREEN_LIGHT = colors.HexColor("#EAF7F0")
AMBER = colors.HexColor("#A56808")
AMBER_LIGHT = colors.HexColor("#FFF5DD")
RED = colors.HexColor("#B42318")
RED_LIGHT = colors.HexColor("#FCEDEC")


def register_fonts():
    pdfmetrics.registerFont(TTFont("ReportSans", FONT_REGULAR))
    pdfmetrics.registerFont(TTFont("ReportSansBold", FONT_BOLD))


def text(pdf, x, y, value, size=9, color=INK, bold=False, align="left"):
    pdf.setFillColor(color)
    pdf.setFont("ReportSansBold" if bold else "ReportSans", size)
    if align == "right":
        pdf.drawRightString(x, y, value)
    elif align == "center":
        pdf.drawCentredString(x, y, value)
    else:
        pdf.drawString(x, y, value)


def rounded_rect(pdf, x, y, width, height, fill, stroke=None, radius=7):
    pdf.setFillColor(fill)
    pdf.setStrokeColor(stroke or fill)
    pdf.roundRect(x, y, width, height, radius, stroke=bool(stroke), fill=1)


def paragraph(pdf, x, y_top, width, value, size=8.6, color=INK, leading=None, bold=False, max_lines=None):
    leading = leading or size * 1.35
    lines = simpleSplit(value, "ReportSansBold" if bold else "ReportSans", size, width)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        if len(lines[-1]) > 3:
            lines[-1] = lines[-1][:-3] + "..."
    for index, line in enumerate(lines):
        text(pdf, x, y_top - (index * leading), line, size, color, bold)
    return y_top - (len(lines) * leading)


def header(pdf, report_date, page_number):
    pdf.setFillColor(TEAL_DARK)
    pdf.rect(0, PAGE_HEIGHT - 58, PAGE_WIDTH, 58, fill=1, stroke=0)
    pdf.setFillColor(colors.white)
    pdf.circle(34, PAGE_HEIGHT - 29, 13, fill=0, stroke=1)
    pdf.setStrokeColor(colors.white)
    pdf.setLineWidth(1.2)
    pdf.line(29, PAGE_HEIGHT - 29, 39, PAGE_HEIGHT - 29)
    pdf.line(34, PAGE_HEIGHT - 34, 34, PAGE_HEIGHT - 24)
    text(pdf, 57, PAGE_HEIGHT - 23, "BAN QUẢN LÝ DỰ ÁN ĐẦU TƯ - HẠ TẦNG XÃ PHÚC THỊNH", 9, colors.white, True)
    text(pdf, 57, PAGE_HEIGHT - 39, "BÁO CÁO CÔNG VIỆC HÀNG NGÀY", 16, colors.white, True)
    text(pdf, PAGE_WIDTH - 28, PAGE_HEIGHT - 24, f"Ngày báo cáo: {report_date}", 8.5, colors.white, False, "right")
    text(pdf, PAGE_WIDTH - 28, PAGE_HEIGHT - 39, "MẪU MINH HỌA", 8.5, colors.HexColor("#BEE8E3"), True, "right")
    pdf.setStrokeColor(LINE)
    pdf.setLineWidth(0.5)
    pdf.line(28, 24, PAGE_WIDTH - 28, 24)
    text(pdf, 28, 12, "Dữ liệu minh họa - phục vụ duyệt mẫu bố cục báo cáo.", 7.4, MUTED)
    text(pdf, PAGE_WIDTH - 28, 12, f"Trang {page_number}/2", 7.4, MUTED, False, "right")


def metric_card(pdf, x, y, width, label, value, detail, color, tint):
    rounded_rect(pdf, x, y, width, 58, colors.white, LINE, 7)
    pdf.setFillColor(color)
    pdf.roundRect(x, y + 54, width, 4, 7, stroke=0, fill=1)
    text(pdf, x + 12, y + 38, label, 8.2, MUTED, True)
    text(pdf, x + 12, y + 18, value, 21, color, True)
    rounded_rect(pdf, x + width - 59, y + 13, 47, 22, tint, None, 5)
    text(pdf, x + width - 35.5, y + 21, detail, 7.2, color, True, "center")


def section_title(pdf, x, y, title, note="", right=None):
    right = right or PAGE_WIDTH - 28
    text(pdf, x, y, title, 11, INK, True)
    if note:
        text(pdf, right, y + 1, note, 8, MUTED, False, "right")
    pdf.setStrokeColor(LINE)
    pdf.setLineWidth(0.55)
    pdf.line(x, y - 7, right, y - 7)


def status_badge(pdf, x, y, label):
    palettes = {
        "Hoàn thành": (GREEN, GREEN_LIGHT),
        "Đang thực hiện": (BLUE, BLUE_LIGHT),
        "Chờ phê duyệt": (AMBER, AMBER_LIGHT),
        "Quá hạn": (RED, RED_LIGHT),
    }
    foreground, background = palettes[label]
    width = {"Hoàn thành": 62, "Đang thực hiện": 75, "Chờ phê duyệt": 79, "Quá hạn": 45}[label]
    rounded_rect(pdf, x, y, width, 17, background, None, 5)
    text(pdf, x + width / 2, y + 5.2, label, 7.1, foreground, True, "center")
    return width


def department_table(pdf, y_top):
    rows = [
        ("phòng GPMB", 14, 5, 3, 2, 4),
        ("Phòng Dự án 1", 7, 3, 2, 1, 1),
        ("Phòng Dự án 2", 5, 2, 2, 1, 0),
        ("phòng KHTH", 4, 1, 2, 1, 0),
        ("phòng QLHT", 4, 0, 2, 2, 1),
    ]
    x = 28
    widths = [150, 58, 58, 58, 68, 43]
    headers = ["Phòng ban", "Thuộc ngày", "Hoàn thành", "Đang làm", "Chờ duyệt", "Quá hạn"]
    header_y = y_top - 22
    rounded_rect(pdf, x, header_y - 4, sum(widths), 24, colors.HexColor("#EDF4F6"), None, 5)
    current_x = x + 10
    for index, title in enumerate(headers):
        text(pdf, current_x if index == 0 else current_x + widths[index] - 10, header_y + 4, title, 7.6, MUTED, True, "left" if index == 0 else "right")
        current_x += widths[index]

    y = header_y - 27
    for row_index, row in enumerate(rows):
        if row_index % 2 == 0:
            pdf.setFillColor(PANEL)
            pdf.rect(x, y - 7, sum(widths), 25, fill=1, stroke=0)
        text(pdf, x + 10, y + 2, row[0], 8.5, INK, True)
        cells = [row[1], row[2], row[3], row[4], row[5]]
        cell_colors = [INK, GREEN, BLUE, AMBER, RED]
        cell_x = x + widths[0]
        for cell_index, value in enumerate(cells):
            text(pdf, cell_x + widths[cell_index + 1] - 10, y + 2, str(value), 9, cell_colors[cell_index], True, "right")
            cell_x += widths[cell_index + 1]
        pdf.setStrokeColor(LINE)
        pdf.line(x, y - 8, x + sum(widths), y - 8)
        y -= 25
    return y


def project_progress(pdf, x, y_top, width):
    projects = [
        ("Dự án đường Vành đai 3", "phòng GPMB", 72, 9, 5, "Đúng kế hoạch"),
        ("GPMB xã Tiên Dương 2", "phòng GPMB", 48, 7, 3, "Cần theo dõi"),
        ("Cải tạo hạ tầng khu trung tâm", "phòng QLHT", 84, 6, 4, "Đúng kế hoạch"),
    ]
    row_height = 54
    for index, (name, department, progress, today, completed, note) in enumerate(projects):
        row_y = y_top - (index * row_height) - row_height
        rounded_rect(pdf, x, row_y, width, row_height - 6, colors.white, LINE, 6)
        paragraph(pdf, x + 11, row_y + 35, 122, name, 8.2, INK, True, max_lines=1)
        text(pdf, x + 11, row_y + 20, department, 7.1, MUTED)
        track_x = x + 140
        track_width = width - 151
        text(pdf, track_x, row_y + 34, f"{today} việc thuộc ngày", 7.2, TEAL, True)
        text(pdf, x + width - 11, row_y + 34, f"{completed} đạt", 7.2, GREEN, True, "right")
        rounded_rect(pdf, track_x, row_y + 18, track_width, 8, colors.HexColor("#E5EDF1"), None, 4)
        rounded_rect(pdf, track_x, row_y + 18, track_width * progress / 100, 8, GREEN if progress >= 70 else AMBER, None, 4)
        text(pdf, track_x, row_y + 7, note, 6.9, MUTED)
        text(pdf, x + width - 11, row_y + 7, f"Tiến độ {progress}%", 6.9, GREEN if progress >= 70 else AMBER, True, "right")


def daily_curve(pdf, x, y, width, height):
    labels = ["08h", "10h", "12h", "14h", "16h", "18h"]
    values = [3, 9, 13, 21, 28, 34]
    max_value = 36
    left = x + 28
    bottom = y + 25
    chart_width = width - 42
    chart_height = height - 43
    for tick in [0, 12, 24, 36]:
        tick_y = bottom + chart_height * tick / max_value
        pdf.setStrokeColor(colors.HexColor("#E7EEF1"))
        pdf.line(left, tick_y, left + chart_width, tick_y)
        text(pdf, left - 7, tick_y - 3, str(tick), 6.8, MUTED, False, "right")
    points = []
    for index, value in enumerate(values):
        point_x = left + chart_width * index / (len(values) - 1)
        point_y = bottom + chart_height * value / max_value
        points.append((point_x, point_y))
        text(pdf, point_x, bottom - 13, labels[index], 6.8, MUTED, False, "center")
    pdf.setStrokeColor(TEAL)
    pdf.setLineWidth(2)
    for index in range(len(points) - 1):
        pdf.line(points[index][0], points[index][1], points[index + 1][0], points[index + 1][1])
    for point_x, point_y in points:
        pdf.setFillColor(colors.white)
        pdf.setStrokeColor(TEAL)
        pdf.circle(point_x, point_y, 3, fill=1, stroke=1)
    text(pdf, left + chart_width, bottom + chart_height + 5, "34 việc thuộc ngày", 7.3, TEAL, True, "right")


def task_detail_table(pdf, y_top):
    x = 28
    columns = [76, 214, 100, 86, 65, 55, 140]
    headers = ["Phòng", "Nội dung công việc", "Người thực hiện", "Trạng thái", "Hạn", "Tiến độ", "Cập nhật gần nhất"]
    tasks = [
        ("phòng GPMB", "Rà soát phương án bồi thường khu vực Bắc Cổ Loa", "Nguyễn Thanh Hiếu", "Đang thực hiện", "17:00", "65%", "Đã tổng hợp 18/26 hồ sơ."),
        ("phòng GPMB", "Xác minh nguồn gốc đất các hộ tại thôn Mỹ Nội", "Phạm Thu Hằng", "Quá hạn", "15:00", "40%", "Chờ ý kiến xác nhận của địa phương."),
        ("Phòng Dự án 1", "Hoàn thiện hồ sơ chuẩn bị đầu tư dự án số 1", "Đỗ Ngọc Dương", "Hoàn thành", "16:30", "100%", "Đã nộp hồ sơ và chờ đánh giá."),
        ("Phòng Dự án 2", "Kiểm tra hiện trạng hạ tầng khu vực Đông Anh", "Bạch Vũ Khánh Linh", "Chờ phê duyệt", "16:00", "100%", "Đã gửi kết quả để Trưởng phòng duyệt."),
        ("phòng KHTH", "Tổng hợp báo cáo tiến độ đầu tư tháng 09", "Hà Văn Thịnh", "Đang thực hiện", "17:30", "55%", "Đã nhận số liệu 4/5 phòng."),
        ("phòng QLHT", "Kiểm tra khối lượng cải tạo hạ tầng trung tâm", "Tô Văn Hào", "Hoàn thành", "15:30", "100%", "Nghiệm thu khối lượng tại hiện trường."),
        ("phòng GPMB", "Chuẩn bị nội dung họp tháo gỡ vướng mắc", "Chu Tiến Phát", "Đang thực hiện", "17:00", "70%", "Đã dự thảo nội dung và tài liệu kèm theo."),
        ("phòng QLHT", "Cập nhật kế hoạch điều chuyển vật tư", "Đinh Thị Uyên", "Chờ phê duyệt", "16:45", "100%", "Đã cập nhật kế hoạch điều chỉnh."),
    ]
    header_y = y_top - 20
    rounded_rect(pdf, x, header_y - 4, sum(columns), 24, colors.HexColor("#EDF4F6"), None, 5)
    current_x = x + 8
    for index, title in enumerate(headers):
        text(pdf, current_x, header_y + 4, title, 7.2, MUTED, True)
        current_x += columns[index]

    y = header_y - 28
    for index, task in enumerate(tasks):
        row_height = 43
        if index % 2 == 0:
            pdf.setFillColor(PANEL)
            pdf.rect(x, y - 10, sum(columns), row_height, fill=1, stroke=0)
        cell_x = x + 8
        paragraph(pdf, cell_x, y + 20, columns[0] - 12, task[0], 7.2, INK, True, max_lines=2)
        cell_x += columns[0]
        paragraph(pdf, cell_x, y + 20, columns[1] - 12, task[1], 7.4, INK, True, max_lines=2)
        cell_x += columns[1]
        paragraph(pdf, cell_x, y + 20, columns[2] - 12, task[2], 7.3, INK, False, max_lines=2)
        cell_x += columns[2]
        status_badge(pdf, cell_x, y + 7, task[3])
        cell_x += columns[3]
        text(pdf, cell_x, y + 15, task[4], 7.8, INK, True)
        cell_x += columns[4]
        text(pdf, cell_x, y + 15, task[5], 7.8, TEAL, True)
        cell_x += columns[5]
        paragraph(pdf, cell_x, y + 20, columns[6] - 12, task[6], 7.2, MUTED, False, max_lines=2)
        pdf.setStrokeColor(LINE)
        pdf.line(x, y - 10, x + sum(columns), y - 10)
        y -= row_height
    return y


def make_report():
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=landscape(A4), pageCompression=1)
    pdf.setTitle("Mẫu báo cáo công việc hàng ngày")
    pdf.setAuthor("Ban Quản lý Dự án Đầu tư - Hạ tầng xã Phúc Thịnh")
    report_date = "18/09/2026"

    header(pdf, report_date, 1)
    text(pdf, 28, PAGE_HEIGHT - 77, "Tổng quan điều hành", 12, INK, True)
    text(pdf, 28, PAGE_HEIGHT - 91, "Phạm vi: đến hạn; phát sinh nhưng chưa hoàn thành; hoặc hoàn thành/duyệt hoàn thành trong ngày", 8.2, MUTED)
    card_y = PAGE_HEIGHT - 160
    card_gap = 11
    card_width = (PAGE_WIDTH - 56 - card_gap * 3) / 4
    metric_card(pdf, 28, card_y, card_width, "Công việc thuộc ngày", "34", "Trong ngày", TEAL, TEAL_LIGHT)
    metric_card(pdf, 28 + (card_width + card_gap), card_y, card_width, "Hoàn thành đạt", "11", "32%", GREEN, GREEN_LIGHT)
    metric_card(pdf, 28 + 2 * (card_width + card_gap), card_y, card_width, "Chờ phê duyệt", "7", "21%", AMBER, AMBER_LIGHT)
    metric_card(pdf, 28 + 3 * (card_width + card_gap), card_y, card_width, "Cần xử lý", "6", "Quá hạn", RED, RED_LIGHT)

    section_y = card_y - 25
    left_right = 470
    section_title(pdf, 28, section_y, "Khối lượng công việc theo phòng ban", "Tổng 34 công việc thuộc ngày", left_right)
    bottom_of_departments = department_table(pdf, section_y - 12)

    right_x = 490
    section_title(pdf, right_x, section_y, "Tiến độ dự án", "3 dự án có công việc thuộc báo cáo", PAGE_WIDTH - 28)
    project_progress(pdf, right_x, section_y - 15, PAGE_WIDTH - 28 - right_x)

    curve_y = 38
    rounded_rect(pdf, right_x, curve_y, PAGE_WIDTH - 28 - right_x, 78, colors.white, LINE, 7)
    text(pdf, right_x + 11, curve_y + 61, "Nhịp cập nhật trong ngày", 8.8, INK, True)
    text(pdf, PAGE_WIDTH - 39, curve_y + 62, "Lũy kế công việc", 7.2, MUTED, False, "right")
    daily_curve(pdf, right_x + 4, curve_y + 2, PAGE_WIDTH - 36 - right_x, 58)
    text(pdf, 28, 42, "Điểm cần lưu ý", 9.2, INK, True)
    paragraph(pdf, 28, 29, 425, "4 việc của phòng GPMB quá hạn cần cập nhật phương án xử lý trước 17:00. 7 việc đã hoàn thành đang chờ cấp có thẩm quyền đánh giá.", 8.1, MUTED, leading=11)
    pdf.showPage()

    text(pdf, 28, PAGE_HEIGHT - 78, "Danh sách công việc thuộc báo cáo ngày", 12, INK, True)
    text(pdf, 28, PAGE_HEIGHT - 92, "Các dòng hiển thị là dữ liệu minh họa; báo cáo thực tế sẽ lấy trực tiếp theo ngày báo cáo và quyền xem dữ liệu.", 8.2, MUTED)
    end_y = task_detail_table(pdf, PAGE_HEIGHT - 110)
    section_title(pdf, 28, end_y - 10, "Nguyên tắc tổng hợp", "Giúp đối chiếu số liệu trước khi ký duyệt")
    principles = [
        ("01", "Công việc trong ngày", "Gồm việc đến hạn; tạo trong ngày nhưng chưa hoàn thành; hoặc hoàn thành/duyệt hoàn thành trong ngày."),
        ("02", "Tiến độ dự án", "Tỷ lệ hoàn thành đạt trên tổng khối lượng của từng dự án có công việc thuộc báo cáo ngày."),
        ("03", "Cảnh báo", "Ưu tiên công việc quá hạn, có trở ngại và công việc đã hoàn thành nhưng đang chờ đánh giá."),
    ]
    principle_y = end_y - 65
    principle_width = (PAGE_WIDTH - 56 - 18) / 3
    for index, (number, title, body) in enumerate(principles):
        x = 28 + index * (principle_width + 9)
        rounded_rect(pdf, x, principle_y, principle_width, 48, PANEL, LINE, 6)
        rounded_rect(pdf, x + 10, principle_y + 14, 24, 22, TEAL_LIGHT, None, 5)
        text(pdf, x + 22, principle_y + 21, number, 8, TEAL, True, "center")
        text(pdf, x + 43, principle_y + 31, title, 8.2, INK, True)
        paragraph(pdf, x + 43, principle_y + 20, principle_width - 54, body, 7.2, MUTED, leading=9, max_lines=2)
    header(pdf, report_date, 2)
    pdf.save()
    return OUTPUT


if __name__ == "__main__":
    make_report()
    print("daily_work_report_sample=created")
