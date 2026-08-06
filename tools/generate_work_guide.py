from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


# Keep generated artifacts in the workspace path selected by the user rather than
# resolving a Windows junction to another similarly named project directory.
ROOT = Path(__file__).parent.parent
OUTPUT = ROOT / "output" / "pdf" / "Huong_dan_su_dung_Cong_viec.pdf"
ASSET_DIR = ROOT / "tmp" / "pdfs" / "work_guide_assets"
FONT_REGULAR = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")

NAVY = "#123B6D"
BLUE = "#1E6EB8"
TEAL = "#0B8F87"
GREEN = "#218739"
RED = "#C43838"
AMBER = "#B86D00"
INK = "#16324F"
MUTED = "#5F7185"
LINE = "#D8E1EA"
PANEL = "#F6F9FC"
BG = "#EEF3F8"


def font(size, bold=False):
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REGULAR), size)


def text_size(draw, value, text_font):
    box = draw.textbbox((0, 0), value, font=text_font)
    return box[2] - box[0], box[3] - box[1]


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def fit_text(draw, value, max_width, size=24, bold=False, min_size=14):
    current = size
    while current > min_size:
        candidate = font(current, bold)
        if text_size(draw, value, candidate)[0] <= max_width:
            return candidate
        current -= 1
    return font(min_size, bold)


def draw_text(draw, xy, value, size=24, fill=INK, bold=False, anchor=None, max_width=None):
    text_font = fit_text(draw, value, max_width, size, bold) if max_width else font(size, bold)
    draw.text(xy, value, font=text_font, fill=fill, anchor=anchor)
    return text_font


def draw_field(draw, x, y, width, label, value, height=104, locked=False, accent=None):
    rounded(draw, (x, y, x + width, y + height), 14, "#FFFFFF", LINE, 2)
    draw_text(draw, (x + 18, y + 17), label, 18, MUTED)
    draw_text(draw, (x + 18, y + 50), value, 25, "#253B53", bold=False, max_width=width - 56)
    if locked:
        rounded(draw, (x + width - 45, y + 17, x + width - 19, y + 43), 7, "#E8EDF3")
        draw_text(draw, (x + width - 32, y + 30), "k", 15, MUTED, bold=True, anchor="mm")
    elif accent:
        rounded(draw, (x + width - 44, y + 17, x + width - 18, y + 43), 13, accent)
        draw_text(draw, (x + width - 31, y + 30), "+", 18, "#FFFFFF", bold=True, anchor="mm")
    else:
        draw_text(draw, (x + width - 29, y + 65), "v", 19, MUTED, bold=True, anchor="mm")


def draw_callout(draw, number, point, label, target):
    x, y = point
    tx, ty = target
    draw.line((x, y, tx, ty), fill=BLUE, width=4)
    rounded(draw, (x - 26, y - 26, x + 26, y + 26), 26, BLUE)
    draw_text(draw, (x, y + 1), str(number), 27, "#FFFFFF", bold=True, anchor="mm")
    if label:
        tw, _ = text_size(draw, label, font(20, True))
        lx = x - tw / 2 - 13
        rounded(draw, (lx, y + 37, lx + tw + 26, y + 73), 10, "#FFFFFF", BLUE, 2)
        draw_text(draw, (x, y + 55), label, 20, BLUE, bold=True, anchor="mm")


def shell(draw, title, subtitle):
    draw.rectangle((0, 0, 1600, 900), fill=BG)
    draw.rectangle((0, 0, 1600, 82), fill=NAVY)
    draw_text(draw, (50, 41), "QUAN TRI NHAN SU", 27, "#FFFFFF", bold=True, anchor="lm")
    draw_text(draw, (1515, 41), "Nguyen Van A", 21, "#DCEBFA", anchor="rm")
    draw.rectangle((0, 82, 262, 900), fill="#FFFFFF")
    menu = [("Tong quan", 136), ("Nhan su", 196), ("Cong viec", 256), ("KPI ca nhan", 316), ("KPI phong", 376), ("Lich su", 436)]
    for label, y in menu:
        active = label == "Cong viec"
        if active:
            rounded(draw, (18, y - 24, 242, y + 24), 12, "#E4F1FF")
        draw_text(draw, (54, y), label, 21, BLUE if active else MUTED, bold=active, anchor="lm")
    draw_text(draw, (302, 124), title, 34, INK, bold=True)
    draw_text(draw, (302, 164), subtitle, 20, MUTED)


def save(image, name):
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    path = ASSET_DIR / name
    image.save(path, quality=95)
    return path


def create_new_task_image():
    image = Image.new("RGB", (1600, 900), BG)
    draw = ImageDraw.Draw(image)
    shell(draw, "Danh muc cong viec", "Tao cong viec moi va luu thong tin de theo doi tien do.")
    rounded(draw, (302, 198, 1544, 842), 20, "#FFFFFF", LINE, 2)
    draw_text(draw, (336, 234), "Nhap cong viec", 27, INK, bold=True)
    draw_text(draw, (336, 271), "Cac truong co dau * la thong tin can co.", 18, MUTED)
    x = 336
    y = 306
    gap = 18
    widths = [430, 330, 370]
    draw_field(draw, x, y, widths[0], "Ten cong viec *", "Lap ke hoach GPMB dot 2", accent=BLUE)
    draw_field(draw, x + widths[0] + gap, y, widths[1], "Ten du an", "Duong truc xa", accent=BLUE)
    draw_field(draw, x + widths[0] + widths[1] + gap * 2, y, widths[2], "Danh muc KPI ca nhan *", "GPMB", accent=BLUE)
    y += 124
    widths = [350, 410, 370]
    draw_field(draw, x, y, widths[0], "Nguoi thuc hien *", "Le Thi B", accent=BLUE)
    draw_field(draw, x + widths[0] + gap, y, widths[1], "Nguoi phoi hop", "Chon nhan su", accent=BLUE)
    draw_field(draw, x + widths[0] + widths[1] + gap * 2, y, widths[2], "Loai cong viec", "Cong viec phat sinh", accent=BLUE)
    y += 124
    widths = [310, 360, 460]
    draw_field(draw, x, y, widths[0], "Dinh ky", "Khong dinh ky")
    draw_field(draw, x + widths[0] + gap, y, widths[1], "Ngay bat dau", "28/07/2026")
    draw_field(draw, x + widths[0] + widths[1] + gap * 2, y, widths[2], "Ngay hoan thanh *", "05/08/2026")
    y += 124
    draw_field(draw, x, y, 240, "Trang thai", "Chuan bi thuc hien")
    draw_field(draw, x + 258, y, 230, "Tien do", "0%")
    draw_field(draw, x + 506, y, 396, "Danh gia chat luong", "Chi mo sau phe duyet", locked=True)
    y += 124
    rounded(draw, (x, y, x + 360, y + 67), 12, "#F3F7FB", LINE, 2)
    draw_text(draw, (x + 20, y + 33), "+", 23, BLUE, bold=True, anchor="lm")
    draw_text(draw, (x + 52, y + 33), "Tai len ho so lien quan", 19, INK, anchor="lm")
    rounded(draw, (x + 918, y, x + 1110, y + 67), 12, BLUE)
    draw_text(draw, (x + 1014, y + 34), "Luu cong viec", 20, "#FFFFFF", bold=True, anchor="mm")
    draw_callout(draw, 1, (372, 247), "Thong tin co ban", (409, 309))
    draw_callout(draw, 2, (1104, 248), "KPI", (1257, 308))
    draw_callout(draw, 3, (1375, 504), "Thoi han", (1270, 570))
    draw_callout(draw, 4, (1438, 704), "Luu", (1350, 750))
    return save(image, "01_nhap_cong_viec.png")


def create_progress_image():
    image = Image.new("RGB", (1600, 900), BG)
    draw = ImageDraw.Draw(image)
    shell(draw, "Danh sach cong viec", "Mo cong viec de cap nhat trang thai va bao cao tien do.")
    rounded(draw, (302, 200, 875, 820), 18, "#FFFFFF", LINE, 2)
    draw_text(draw, (334, 238), "Cong viec cua toi", 27, INK, bold=True)
    rounded(draw, (334, 286, 836, 465), 14, "#F8FBFE", "#C8D9E9", 2)
    draw_text(draw, (360, 322), "Lap ke hoach GPMB dot 2", 25, INK, bold=True)
    draw_text(draw, (360, 357), "Duong truc xa  |  Le Thi B", 18, MUTED)
    rounded(draw, (360, 388, 515, 423), 16, "#DDF4EE")
    draw_text(draw, (437, 406), "Dang thuc hien", 17, GREEN, bold=True, anchor="mm")
    draw_text(draw, (656, 405), "60%", 25, BLUE, bold=True, anchor="mm")
    draw.rounded_rectangle((360, 435, 795, 447), 6, fill="#DDE6EF")
    draw.rounded_rectangle((360, 435, 621, 447), 6, fill=TEAL)
    rounded(draw, (360, 485, 545, 534), 10, "#E8F1FA")
    draw_text(draw, (453, 510), "Mo cong viec", 19, BLUE, bold=True, anchor="mm")
    draw_text(draw, (334, 570), "Luu y: cap nhat tien do truoc ngay hoan thanh.", 18, MUTED)
    rounded(draw, (906, 200, 1544, 820), 18, "#FFFFFF", LINE, 2)
    draw_text(draw, (940, 238), "Chi tiet cong viec", 27, INK, bold=True)
    draw_field(draw, 940, 285, 270, "Trang thai", "Dang thuc hien", height=88)
    draw_field(draw, 1230, 285, 270, "Tien do", "60%", height=88)
    draw_text(draw, (940, 403), "Noi dung cong viec / Bao cao tien do", 19, MUTED)
    rounded(draw, (940, 434, 1500, 612), 13, "#FFFFFF", LINE, 2)
    draw_text(draw, (965, 465), "28/07/2026 09:10 - Da nhan ho so va lien he cac ho dan.", 18, INK)
    draw.line((965, 498, 1474, 498), fill=LINE, width=2)
    draw_text(draw, (965, 528), "29/07/2026 16:20 - Hoan thanh 60% danh sach kiem dem.", 18, INK)
    rounded(draw, (940, 642, 1500, 708), 12, "#F8FBFE", LINE, 2)
    draw_text(draw, (964, 675), "Nhap cap nhat moi de luu thanh mot dong lich su.", 18, MUTED)
    rounded(draw, (1318, 738, 1500, 798), 12, BLUE)
    draw_text(draw, (1409, 768), "Cap nhat", 20, "#FFFFFF", bold=True, anchor="mm")
    draw_callout(draw, 1, (816, 246), "Mo cong viec", (472, 509))
    draw_callout(draw, 2, (1270, 246), "Trang thai", (1075, 285))
    draw_callout(draw, 3, (1519, 575), "Bao cao", (1495, 555))
    draw_callout(draw, 4, (1518, 733), "Luu cap nhat", (1498, 766))
    return save(image, "02_cap_nhat_tien_do.png")


def create_approval_image():
    image = Image.new("RGB", (1600, 900), BG)
    draw = ImageDraw.Draw(image)
    shell(draw, "Danh sach cong viec", "Cong viec hoan thanh can duoc cap quan ly phe duyet.")
    rounded(draw, (302, 204, 754, 760), 18, "#FFFFFF", LINE, 2)
    draw_text(draw, (334, 244), "Cong viec cho phe duyet", 26, INK, bold=True)
    rounded(draw, (334, 286, 722, 516), 14, "#F8FBFE", "#C8D9E9", 2)
    draw_text(draw, (358, 324), "Lap ke hoach GPMB dot 2", 23, INK, bold=True)
    rounded(draw, (358, 357, 509, 392), 16, "#FFF2D7")
    draw_text(draw, (434, 374), "Cho danh gia", 17, AMBER, bold=True, anchor="mm")
    draw_text(draw, (358, 428), "Nguoi thuc hien da bao cao 100% tien do.", 17, MUTED)
    rounded(draw, (358, 459, 550, 505), 10, "#E8F1FA")
    draw_text(draw, (454, 482), "Danh gia hoan thanh", 18, BLUE, bold=True, anchor="mm")
    draw_text(draw, (334, 563), "Chi truong phong, pho phong, ban giam doc", 17, MUTED)
    draw_text(draw, (334, 589), "hoac admin co quyen phe duyet theo phan quyen.", 17, MUTED)
    rounded(draw, (800, 150, 1515, 804), 22, "#FFFFFF", "#AFC4D9", 3)
    draw_text(draw, (842, 207), "Danh gia hoan thanh", 31, INK, bold=True)
    draw_text(draw, (842, 246), "Lap ke hoach GPMB dot 2", 20, MUTED)
    draw_text(draw, (842, 304), "Ket qua danh gia", 19, MUTED)
    rounded(draw, (842, 336, 1105, 402), 12, "#DDF4EE", GREEN, 2)
    draw_text(draw, (974, 370), "Dat", 24, GREEN, bold=True, anchor="mm")
    rounded(draw, (1125, 336, 1405, 402), 12, "#FFFFFF", LINE, 2)
    draw_text(draw, (1265, 370), "Khong dat", 24, MUTED, bold=True, anchor="mm")
    draw_field(draw, 842, 438, 300, "Danh gia chat luong", "95%", height=92)
    draw_text(draw, (842, 566), "Ket qua tien do", 19, MUTED)
    rounded(draw, (842, 598, 1123, 650), 18, "#E0F6EA")
    draw_text(draw, (982, 624), "VUOT TIEN DO", 20, GREEN, bold=True, anchor="mm")
    draw_text(draw, (842, 685), "Nguoi danh gia: Tran Van C - 30/07/2026 14:20", 18, MUTED)
    rounded(draw, (1210, 710, 1468, 770), 12, GREEN)
    draw_text(draw, (1339, 741), "Xac nhan Dat", 21, "#FFFFFF", bold=True, anchor="mm")
    draw_callout(draw, 1, (742, 270), "Cho danh gia", (490, 374))
    draw_callout(draw, 2, (1467, 300), "Chon ket qua", (1405, 369))
    draw_callout(draw, 3, (1467, 568), "Tien do", (1124, 623))
    draw_callout(draw, 4, (1470, 718), "Phe duyet", (1468, 740))
    return save(image, "03_phe_duyet_hoan_thanh.png")


def footer(pdf, page_number):
    pdf.setStrokeColor(HexColor("#D8E1EA"))
    pdf.line(18 * mm, 14 * mm, 192 * mm, 14 * mm)
    pdf.setFillColor(HexColor("#5F7185"))
    pdf.setFont("Arial", 8.5)
    pdf.drawString(18 * mm, 8.5 * mm, "Quản Trị Nhân Sự - Ban QLDA Đầu Tư - Hạ Tầng xã Phúc Thịnh")
    pdf.drawRightString(192 * mm, 8.5 * mm, f"Trang {page_number}")


def wrap(pdf, text, width, font_name, font_size):
    words = text.split()
    lines = []
    line = ""
    for word in words:
        candidate = word if not line else f"{line} {word}"
        if pdf.stringWidth(candidate, font_name, font_size) <= width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def paragraph(pdf, text, x, y, width, font_name="Arial", font_size=10.5, leading=15, color="#16324F"):
    pdf.setFillColor(HexColor(color))
    pdf.setFont(font_name, font_size)
    for line in wrap(pdf, text, width, font_name, font_size):
        pdf.drawString(x, y, line)
        y -= leading
    return y


def image_fit(pdf, path, x, y_top, width, height):
    image = Image.open(path)
    iw, ih = image.size
    scale = min(width / iw, height / ih)
    dw, dh = iw * scale, ih * scale
    pdf.drawImage(ImageReader(image), x + (width - dw) / 2, y_top - dh, width=dw, height=dh, mask="auto")
    return y_top - dh


def title(pdf, kicker, heading, detail):
    pdf.setFillColor(HexColor(BLUE))
    pdf.setFont("Arial-Bold", 10)
    pdf.drawString(18 * mm, 277 * mm, kicker.upper())
    pdf.setFillColor(HexColor(INK))
    pdf.setFont("Arial-Bold", 24)
    pdf.drawString(18 * mm, 264 * mm, heading)
    pdf.setFillColor(HexColor(MUTED))
    pdf.setFont("Arial", 10.5)
    paragraph(pdf, detail, 18 * mm, 254 * mm, 174 * mm, font_size=10.5, leading=14, color=MUTED)


def create_pdf(images):
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdfmetrics.registerFont(TTFont("Arial", str(FONT_REGULAR)))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(FONT_BOLD)))
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4)
    page_width, page_height = A4

    # Cover
    pdf.setFillColor(HexColor("#F0F5FA"))
    pdf.rect(0, 0, page_width, page_height, fill=1, stroke=0)
    pdf.setFillColor(HexColor(NAVY))
    pdf.rect(0, page_height - 70 * mm, page_width, 70 * mm, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#FFFFFF"))
    pdf.setFont("Arial-Bold", 15)
    pdf.drawString(18 * mm, page_height - 25 * mm, "QUẢN TRỊ NHÂN SỰ")
    pdf.setFillColor(HexColor("#DCEBFA"))
    pdf.setFont("Arial", 10.5)
    pdf.drawString(18 * mm, page_height - 35 * mm, "Ban QLDA Đầu Tư - Hạ Tầng xã Phúc Thịnh")
    pdf.setFillColor(HexColor(INK))
    pdf.setFont("Arial-Bold", 28)
    pdf.drawString(18 * mm, page_height - 101 * mm, "Hướng dẫn sử dụng")
    pdf.setFillColor(HexColor(BLUE))
    pdf.setFont("Arial-Bold", 30)
    pdf.drawString(18 * mm, page_height - 117 * mm, "Mục Công việc")
    pdf.setFillColor(HexColor(MUTED))
    pdf.setFont("Arial", 12)
    pdf.drawString(18 * mm, page_height - 130 * mm, "Nhập công việc mới, cập nhật tiến độ và phê duyệt hoàn thành.")
    image_fit(pdf, images[0], 18 * mm, page_height - 145 * mm, 174 * mm, 99 * mm)
    pdf.setFillColor(HexColor("#FFFFFF"))
    pdf.roundRect(18 * mm, 26 * mm, 174 * mm, 31 * mm, 5 * mm, fill=1, stroke=0)
    pdf.setFillColor(HexColor(INK))
    pdf.setFont("Arial-Bold", 11)
    pdf.drawString(26 * mm, 47 * mm, "Phạm vi hướng dẫn")
    pdf.setFont("Arial", 10.2)
    pdf.setFillColor(HexColor(MUTED))
    pdf.drawString(26 * mm, 39 * mm, "1. Tạo công việc  2. Báo cáo tiến độ  3. Đánh giá và xác nhận hoàn thành")
    footer(pdf, 1)
    pdf.showPage()

    # New task
    title(pdf, "Bước 1", "Nhập công việc mới", "Tạo công việc tại Danh mục công việc để theo dõi tiến độ, KPI và hồ sơ liên quan.")
    image_fit(pdf, images[0], 18 * mm, 238 * mm, 174 * mm, 98 * mm)
    y = 126 * mm
    items = [
        "Nhập Tên công việc, Tên dự án và chọn Danh mục KPI cá nhân phù hợp.",
        "Chọn Người thực hiện, Người phối hợp (nếu có), Loại công việc và Định kỳ.",
        "Thiết lập Ngày bắt đầu, Ngày hoàn thành, sau đó bổ sung nội dung công việc hoặc tệp hồ sơ liên quan.",
        "Chọn Lưu công việc. Công việc mới được ghi nhận ở trạng thái Chuẩn bị thực hiện.",
    ]
    for index, item in enumerate(items, 1):
        pdf.setFillColor(HexColor(BLUE))
        pdf.circle(23 * mm, y + 1.5 * mm, 3.4 * mm, fill=1, stroke=0)
        pdf.setFillColor(white)
        pdf.setFont("Arial-Bold", 9)
        pdf.drawCentredString(23 * mm, y - 1.4 * mm, str(index))
        y = paragraph(pdf, item, 30 * mm, y, 159 * mm, font_size=10.5, leading=14)
        y -= 3 * mm
    footer(pdf, 2)
    pdf.showPage()

    # Status updates
    title(pdf, "Bước 2", "Chuyển trạng thái và cập nhật tiến độ", "Mở đúng công việc trong danh sách để cập nhật trạng thái, tiến độ và các lần báo cáo công việc.")
    image_fit(pdf, images[1], 18 * mm, 238 * mm, 174 * mm, 98 * mm)
    y = 126 * mm
    items = [
        "Chọn Mở công việc để vào màn hình chi tiết thay vì tìm kiếm lại trong danh sách.",
        "Chọn Trạng thái phù hợp: Chuẩn bị thực hiện, Đang thực hiện hoặc Hoàn thành. Cập nhật Tiến độ theo tỷ lệ thực tế.",
        "Nhập mỗi lần báo cáo vào ô Nội dung công việc / Báo cáo tiến độ và chọn Cập nhật. Mỗi lần lưu được tạo thành một dòng lịch sử có thời gian.",
        "Nếu quá Ngày hoàn thành mà chưa được đánh giá Đạt, công việc được ghi nhận Quá hạn và tiếp tục yêu cầu báo cáo tiến độ.",
    ]
    for index, item in enumerate(items, 1):
        pdf.setFillColor(HexColor(TEAL))
        pdf.circle(23 * mm, y + 1.5 * mm, 3.4 * mm, fill=1, stroke=0)
        pdf.setFillColor(white)
        pdf.setFont("Arial-Bold", 9)
        pdf.drawCentredString(23 * mm, y - 1.4 * mm, str(index))
        y = paragraph(pdf, item, 30 * mm, y, 159 * mm, font_size=10.5, leading=14)
        y -= 3 * mm
    footer(pdf, 3)
    pdf.showPage()

    # Completion approval
    title(pdf, "Bước 3", "Phê duyệt hoàn thành công việc", "Công việc hoàn thành chuyển sang Chờ đánh giá. Người có quyền phê duyệt xác nhận kết quả tại màn hình Đánh giá hoàn thành.")
    image_fit(pdf, images[2], 18 * mm, 238 * mm, 174 * mm, 98 * mm)
    y = 126 * mm
    items = [
        "Từ công việc ở trạng thái Chờ đánh giá, chọn Đánh giá hoàn thành.",
        "Chọn Đạt hoặc Không đạt. Khi chọn Đạt, nhập Đánh giá chất lượng ngay trên màn hình này và xác nhận.",
        "Không đạt: công việc được trả về Đang thực hiện; nếu đã quá hạn thì hệ thống ghi nhận Quá hạn.",
        "Đạt trước Ngày hoàn thành được đánh dấu Vượt tiến độ. Đạt sau thời hạn được đánh dấu Chậm tiến độ. Mọi lần đánh giá và chuyển trạng thái đều lưu vào lịch sử báo cáo tiến độ.",
    ]
    for index, item in enumerate(items, 1):
        pdf.setFillColor(HexColor(GREEN))
        pdf.circle(23 * mm, y + 1.5 * mm, 3.4 * mm, fill=1, stroke=0)
        pdf.setFillColor(white)
        pdf.setFont("Arial-Bold", 9)
        pdf.drawCentredString(23 * mm, y - 1.4 * mm, str(index))
        y = paragraph(pdf, item, 30 * mm, y, 159 * mm, font_size=10.5, leading=14)
        y -= 3 * mm
    footer(pdf, 4)
    pdf.save()


def main():
    images = [create_new_task_image(), create_progress_image(), create_approval_image()]
    create_pdf(images)
    print(str(OUTPUT).encode("ascii", "backslashreplace").decode("ascii"))


if __name__ == "__main__":
    main()
