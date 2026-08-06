from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(r"C:\Users\Hi\Documents\New project")
TMP = ROOT / "tmp" / "pdfs"
OUTPUT = ROOT / "output" / "pdf" / "huong-dan-dang-nhap-va-doi-mat-khau.pdf"
LOGIN_SOURCE = TMP / "login-screen.png"
LOGIN_ANNOTATED = TMP / "login-screen-annotated.png"
ACCOUNT_MOCK = TMP / "account-password-guide.png"

ARIAL = Path(r"C:\Windows\Fonts\arial.ttf")
ARIAL_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")

TEAL = "#0E6178"
TEAL_DARK = "#073C4A"
GOLD = "#D69A2D"
INK = "#152238"
MUTED = "#53657A"
PALE = "#EFF6F7"
LINE = "#D7E2E7"


def font(size, bold=False):
    return ImageFont.truetype(str(ARIAL_BOLD if bold else ARIAL), size)


def pill(draw, box, text, fill, text_fill, size=26):
    draw.rounded_rectangle(box, radius=(box[3] - box[1]) // 2, fill=fill)
    bbox = draw.textbbox((0, 0), text, font=font(size, True))
    x = (box[0] + box[2] - (bbox[2] - bbox[0])) / 2
    y = (box[1] + box[3] - (bbox[3] - bbox[1])) / 2 - 2
    draw.text((x, y), text, font=font(size, True), fill=text_fill)


def number_badge(draw, x, y, number):
    draw.ellipse((x - 24, y - 24, x + 24, y + 24), fill=GOLD, outline="#FFFFFF", width=3)
    label = str(number)
    bbox = draw.textbbox((0, 0), label, font=font(26, True))
    draw.text((x - (bbox[2] - bbox[0]) / 2, y - (bbox[3] - bbox[1]) / 2 - 2), label, font=font(26, True), fill="#FFFFFF")


def annotate_login_screen():
    image = Image.open(LOGIN_SOURCE).convert("RGB")
    draw = ImageDraw.Draw(image)
    accents = [
        ((351, 320, 928, 367), (336, 319), 1),
        ((351, 400, 928, 447), (336, 399), 2),
        ((351, 485, 928, 535), (336, 485), 3),
    ]
    for box, badge, number in accents:
        draw.rounded_rectangle(box, radius=9, outline=GOLD, width=4)
        number_badge(draw, badge[0], badge[1], number)
    image.save(LOGIN_ANNOTATED, quality=95)


def draw_mock_input(draw, x, y, width, label, value, disabled=False):
    draw.text((x, y), label, font=font(24, True), fill=INK if not disabled else "#708091")
    top = y + 34
    fill = "#F1F4F6" if disabled else "#FFFFFF"
    border = "#D8E1E6" if disabled else "#B7CBD2"
    draw.rounded_rectangle((x, top, x + width, top + 66), radius=9, fill=fill, outline=border, width=2)
    draw.text((x + 18, top + 19), value, font=font(24), fill="#738092" if disabled else "#5A6878")
    return (x, top, x + width, top + 66)


def make_account_mock():
    width, height = 1600, 920
    image = Image.new("RGB", (width, height), "#F4F7FB")
    draw = ImageDraw.Draw(image)

    draw.rectangle((0, 0, width, 72), fill=TEAL_DARK)
    draw.text((42, 20), "QUẢN TRỊ NHÂN SỰ", font=font(27, True), fill="#FFFFFF")
    draw.text((1290, 23), "Tài khoản của tôi", font=font(22), fill="#D6EDF0")

    draw.rectangle((0, 72, 275, height), fill="#FFFFFF")
    draw.line((275, 72, 275, height), fill="#D8E3E8", width=2)
    menu = ["Tổng quan", "Nhân sự", "Công việc", "KPI cá nhân", "Bảng tin", "Lưu trữ", "Tài khoản"]
    y = 140
    for item in menu:
        selected = item == "Tài khoản"
        if selected:
            draw.rounded_rectangle((22, y - 12, 250, y + 40), radius=8, fill="#DFF1F4")
            draw.rectangle((22, y - 12, 28, y + 40), fill=TEAL)
        draw.text((52, y), item, font=font(23, selected), fill=TEAL_DARK if selected else "#53657A")
        y += 76

    left = 335
    draw.text((left, 128), "Tài khoản", font=font(42, True), fill=INK)
    draw.text((left, 188), "Cập nhật mật khẩu cho tài khoản đang đăng nhập.", font=font(24), fill=MUTED)
    draw.rounded_rectangle((left, 245, 1515, 800), radius=14, fill="#FFFFFF", outline="#DCE7EB", width=2)
    draw.text((left + 38, 285), "Thông tin tài khoản", font=font(30, True), fill=TEAL_DARK)
    draw.text((left + 38, 330), "Tên hiển thị và tên đăng nhập được hệ thống khóa đối với tài khoản cá nhân.", font=font(21), fill=MUTED)

    draw_mock_input(draw, left + 38, 400, 500, "Tên hiển thị", "Nguyễn Văn A", disabled=True)
    draw_mock_input(draw, left + 610, 400, 500, "Tên đăng nhập", "nguyenvana", disabled=True)
    password_box = draw_mock_input(draw, left + 38, 555, 650, "Mật khẩu", "Nhập mật khẩu mới")
    save_box = (left + 750, 589, left + 1085, 655)
    draw.rounded_rectangle(save_box, radius=9, fill=TEAL)
    draw.text((left + 815, 609), "Lưu tài khoản", font=font(24, True), fill="#FFFFFF")

    number_badge(draw, 38, 612, 1)
    draw.line((63, 612, 246, 612), fill=GOLD, width=4)
    number_badge(draw, password_box[0] - 24, password_box[1] + 33, 2)
    number_badge(draw, save_box[0] - 26, save_box[1] + 33, 3)

    image.save(ACCOUNT_MOCK, quality=96)


def draw_header(pdf, title, subtitle, page):
    page_width, page_height = A4
    pdf.setFillColor(HexColor(TEAL_DARK))
    pdf.rect(0, page_height - 66, page_width, 66, stroke=0, fill=1)
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 15)
    pdf.drawString(42, page_height - 40, "QUẢN TRỊ NHÂN SỰ")
    pdf.setFillColor(HexColor("#CDE8EC"))
    pdf.setFont("Arial", 9.5)
    pdf.drawRightString(page_width - 42, page_height - 39, "Ban QLDA Đầu Tư - Hạ Tầng xã Phúc Thịnh")
    pdf.setFillColor(HexColor(INK))
    pdf.setFont("Arial-Bold", 20)
    pdf.drawString(42, page_height - 106, title)
    pdf.setFont("Arial", 10.5)
    pdf.setFillColor(HexColor(MUTED))
    pdf.drawString(42, page_height - 126, subtitle)
    pdf.setStrokeColor(HexColor(LINE))
    pdf.line(42, 42, page_width - 42, 42)
    pdf.setFillColor(HexColor(MUTED))
    pdf.setFont("Arial", 8.5)
    pdf.drawString(42, 26, "Hướng dẫn sử dụng nội bộ")
    pdf.drawRightString(page_width - 42, 26, f"Trang {page}")


def draw_step(pdf, x, y, number, title, description, width=495):
    pdf.setFillColor(HexColor(GOLD))
    pdf.circle(x + 13, y + 13, 13, stroke=0, fill=1)
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 11)
    pdf.drawCentredString(x + 13, y + 9, str(number))
    pdf.setFillColor(HexColor(INK))
    pdf.setFont("Arial-Bold", 11.5)
    pdf.drawString(x + 36, y + 16, title)
    pdf.setFont("Arial", 9.7)
    pdf.setFillColor(HexColor(MUTED))
    words = description.split()
    line, lines = "", []
    max_chars = max(38, int(width / 5.25))
    for word in words:
        candidate = f"{line} {word}".strip()
        if len(candidate) > max_chars:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    for index, text in enumerate(lines[:2]):
        pdf.drawString(x + 36, y - index * 13, text)
    return y - max(31, len(lines) * 13 + 12)


def draw_note(pdf, x, y, title, text):
    pdf.setFillColor(HexColor(PALE))
    pdf.roundRect(x, y, 511, 66, 9, stroke=0, fill=1)
    pdf.setFillColor(HexColor(TEAL_DARK))
    pdf.setFont("Arial-Bold", 10.5)
    pdf.drawString(x + 16, y + 43, title)
    pdf.setFillColor(HexColor(MUTED))
    pdf.setFont("Arial", 9.5)
    pdf.drawString(x + 16, y + 24, text)


def build_pdf():
    TMP.mkdir(parents=True, exist_ok=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    annotate_login_screen()
    make_account_mock()

    pdfmetrics.registerFont(TTFont("Arial", str(ARIAL)))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(ARIAL_BOLD)))
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4)
    page_width, page_height = A4

    # Cover
    pdf.setFillColor(HexColor(TEAL_DARK))
    pdf.rect(0, 0, page_width, page_height, stroke=0, fill=1)
    pdf.setFillColor(HexColor("#0B5265"))
    pdf.circle(page_width + 80, page_height - 70, 220, stroke=0, fill=1)
    pdf.setFillColor(HexColor("#176F84"))
    pdf.circle(-45, 60, 150, stroke=0, fill=1)
    pdf.setFillColor(HexColor("#CDE8EC"))
    pdf.setFont("Arial-Bold", 12)
    pdf.drawString(52, page_height - 90, "HƯỚNG DẪN SỬ DỤNG")
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 28)
    pdf.drawString(52, page_height - 145, "Đăng nhập và đổi mật khẩu")
    pdf.setFont("Arial", 14)
    pdf.setFillColor(HexColor("#D9EFF1"))
    pdf.drawString(52, page_height - 177, "Hệ thống Quản Trị Nhân Sự")
    pdf.drawString(52, page_height - 200, "Ban QLDA Đầu Tư - Hạ Tầng xã Phúc Thịnh")
    pdf.setFillColor(white)
    pdf.roundRect(52, 102, page_width - 104, 98, 12, stroke=0, fill=1)
    pdf.setFillColor(HexColor(TEAL_DARK))
    pdf.setFont("Arial-Bold", 13)
    pdf.drawString(76, 166, "Nội dung")
    pdf.setFillColor(HexColor(MUTED))
    pdf.setFont("Arial", 11)
    pdf.drawString(76, 142, "1. Cách đăng nhập vào hệ thống")
    pdf.drawString(76, 120, "2. Cách đổi mật khẩu của tài khoản cá nhân")
    pdf.setFillColor(HexColor("#CDE8EC"))
    pdf.setFont("Arial", 9)
    pdf.drawString(52, 53, "Tài liệu hướng dẫn nội bộ - không ghi nhận hoặc cung cấp mật khẩu mẫu.")
    pdf.showPage()

    # Login page
    draw_header(pdf, "1. Đăng nhập", "Thực hiện tại màn hình đăng nhập khi mở hệ thống.", 2)
    current_y = page_height - 164
    current_y = draw_step(pdf, 42, current_y, 1, "Nhập tên đăng nhập", "Điền tên đăng nhập được quản trị viên cấp vào ô Tài khoản.")
    current_y = draw_step(pdf, 42, current_y - 8, 2, "Nhập mật khẩu", "Điền mật khẩu của bạn vào ô Mật khẩu. Không chia sẻ mật khẩu với người khác.")
    current_y = draw_step(pdf, 42, current_y - 8, 3, "Vào hệ thống", "Chọn Đăng nhập. Nếu thông tin chính xác, hệ thống mở theo đúng quyền của tài khoản.")
    pdf.setStrokeColor(HexColor(LINE))
    pdf.roundRect(42, 155, page_width - 84, 268, 10, stroke=1, fill=0)
    pdf.drawImage(ImageReader(str(LOGIN_ANNOTATED)), 50, 163, width=page_width - 100, height=253, preserveAspectRatio=True, anchor="c")
    pdf.setFont("Arial", 8.8)
    pdf.setFillColor(HexColor(MUTED))
    pdf.drawCentredString(page_width / 2, 141, "Ảnh minh họa màn hình đăng nhập và các vị trí cần thao tác")
    pdf.showPage()

    # Password page
    draw_header(pdf, "2. Đổi mật khẩu", "Thay đổi trực tiếp trong mục Tài khoản sau khi đã đăng nhập.", 3)
    current_y = page_height - 164
    current_y = draw_step(pdf, 42, current_y, 1, "Mở mục Tài khoản", "Chọn Tài khoản ở thanh điều hướng bên trái. Màn hình hiển thị thông tin của tài khoản đang đăng nhập.")
    current_y = draw_step(pdf, 42, current_y - 8, 2, "Nhập mật khẩu mới", "Tại trường Mật khẩu, xóa nội dung cũ và nhập mật khẩu mới mà chỉ bạn biết.")
    current_y = draw_step(pdf, 42, current_y - 8, 3, "Lưu thay đổi", "Chọn Lưu tài khoản. Khi cần, đăng xuất rồi đăng nhập lại bằng mật khẩu mới để kiểm tra.")
    pdf.setStrokeColor(HexColor(LINE))
    pdf.roundRect(42, 143, page_width - 84, 297, 10, stroke=1, fill=0)
    pdf.drawImage(ImageReader(str(ACCOUNT_MOCK)), 50, 151, width=page_width - 100, height=282, preserveAspectRatio=True, anchor="c")
    pdf.setFont("Arial", 8.8)
    pdf.setFillColor(HexColor(MUTED))
    pdf.drawCentredString(page_width / 2, 128, "Minh họa mục Tài khoản: 1 - mở mục; 2 - nhập mật khẩu mới; 3 - lưu tài khoản")
    pdf.showPage()

    # Security page
    draw_header(pdf, "3. Lưu ý bảo mật", "Giữ an toàn cho tài khoản và hỗ trợ xử lý khi không thể đăng nhập.", 4)
    draw_note(pdf, 42, page_height - 205, "Mật khẩu nên khó đoán", "Nên dùng ít nhất 8 ký tự và kết hợp chữ, số hoặc ký tự đặc biệt.")
    draw_note(pdf, 42, page_height - 286, "Không dùng chung tài khoản", "Mỗi cá nhân sử dụng đúng tài khoản được cấp và không cung cấp mật khẩu cho người khác.")
    draw_note(pdf, 42, page_height - 367, "Nếu quên mật khẩu", "Liên hệ quản trị viên hệ thống để được hỗ trợ cấp lại hoặc cập nhật mật khẩu.")
    pdf.setFillColor(HexColor("#FFF7E7"))
    pdf.roundRect(42, 205, page_width - 84, 112, 10, stroke=0, fill=1)
    pdf.setFillColor(HexColor("#8A5A0B"))
    pdf.setFont("Arial-Bold", 12)
    pdf.drawString(60, 278, "Kiểm tra sau khi đổi mật khẩu")
    pdf.setFont("Arial", 10)
    pdf.drawString(60, 253, "Đăng xuất khỏi hệ thống, sau đó đăng nhập lại bằng mật khẩu mới.")
    pdf.drawString(60, 233, "Không lưu mật khẩu trên thiết bị công cộng hoặc thiết bị dùng chung.")
    pdf.setFillColor(HexColor(TEAL_DARK))
    pdf.setFont("Arial-Bold", 15)
    pdf.drawCentredString(page_width / 2, 145, "Sử dụng tài khoản đúng quyền để bảo đảm dữ liệu được quản lý an toàn.")
    pdf.save()


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT)
