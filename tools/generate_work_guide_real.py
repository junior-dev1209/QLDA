from pathlib import Path

from PIL import Image
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).parent.parent
OUTPUT = ROOT / "output" / "pdf" / "Huong_dan_su_dung_Cong_viec_anh_thuc_te.pdf"
ASSET_DIR = ROOT / "tmp" / "pdfs" / "work_guide_real_assets"
FONT_REGULAR = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")

NAVY = "#143D6D"
BLUE = "#176CB7"
TEAL = "#0D8F87"
GREEN = "#218739"
MUTED = "#5E7187"
INK = "#183651"
LINE = "#D7E1EA"
PALE = "#F0F5FA"


def wrap(pdf, value, width, font_name, font_size):
    words = value.split()
    lines, current = [], ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if pdf.stringWidth(candidate, font_name, font_size) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def paragraph(pdf, value, x, y, width, font_name="Arial", font_size=10.5, leading=14, color=INK):
    pdf.setFillColor(HexColor(color))
    pdf.setFont(font_name, font_size)
    for line in wrap(pdf, value, width, font_name, font_size):
        pdf.drawString(x, y, line)
        y -= leading
    return y


def footer(pdf, page_number):
    pdf.setStrokeColor(HexColor(LINE))
    pdf.line(18 * mm, 14 * mm, 192 * mm, 14 * mm)
    pdf.setFillColor(HexColor(MUTED))
    pdf.setFont("Arial", 8.5)
    pdf.drawString(18 * mm, 8.5 * mm, "Quản Trị Nhân Sự - Ban QLDA Đầu Tư - Hạ Tầng xã Phúc Thịnh")
    pdf.drawRightString(192 * mm, 8.5 * mm, f"Trang {page_number}")


def title(pdf, step, heading, detail):
    pdf.setFillColor(HexColor(BLUE))
    pdf.setFont("Arial-Bold", 10)
    pdf.drawString(18 * mm, 277 * mm, step.upper())
    pdf.setFillColor(HexColor(INK))
    pdf.setFont("Arial-Bold", 23)
    pdf.drawString(18 * mm, 264 * mm, heading)
    paragraph(pdf, detail, 18 * mm, 253 * mm, 174 * mm, font_size=10.5, leading=14, color=MUTED)


def draw_image_fit(pdf, path, x, y_top, width, height):
    image = Image.open(path)
    original_width, original_height = image.size
    scale = min(width / original_width, height / original_height)
    draw_width = original_width * scale
    draw_height = original_height * scale
    pdf.drawImage(
        ImageReader(image),
        x + (width - draw_width) / 2,
        y_top - draw_height,
        width=draw_width,
        height=draw_height,
        mask="auto",
    )
    return y_top - draw_height


def image_frame(pdf, path, x, y_top, width, height, caption):
    pdf.setFillColor(HexColor("#FFFFFF"))
    pdf.setStrokeColor(HexColor(LINE))
    pdf.roundRect(x, y_top - height, width, height, 3 * mm, fill=1, stroke=1)
    draw_image_fit(pdf, path, x + 2.5 * mm, y_top - 2.5 * mm, width - 5 * mm, height - 10 * mm)
    pdf.setFillColor(HexColor(MUTED))
    pdf.setFont("Arial", 8.5)
    pdf.drawString(x + 3 * mm, y_top - height + 3.5 * mm, caption)


def number_item(pdf, number, value, x, y, width, color):
    pdf.setFillColor(HexColor(color))
    pdf.circle(x + 3.5 * mm, y + 1.3 * mm, 3.5 * mm, fill=1, stroke=0)
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 8.7)
    pdf.drawCentredString(x + 3.5 * mm, y - 1.5 * mm, str(number))
    return paragraph(pdf, value, x + 11 * mm, y, width - 11 * mm, font_size=10.1, leading=13.4)


def create_pdf():
    images = {
        "create": ASSET_DIR / "01_nhap_cong_viec_thuc_te.png",
        "detail": ASSET_DIR / "02_chi_tiet_trang_thai_thuc_te.png",
        "status": ASSET_DIR / "03_cap_nhat_trang_thai_thuc_te.png",
        "review": ASSET_DIR / "04_phe_duyet_hoan_thanh_thuc_te.png",
    }
    missing = [str(path) for path in images.values() if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing screenshot assets: " + ", ".join(missing))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdfmetrics.registerFont(TTFont("Arial", str(FONT_REGULAR)))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(FONT_BOLD)))
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4)
    page_width, page_height = A4

    # Cover
    pdf.setFillColor(HexColor(PALE))
    pdf.rect(0, 0, page_width, page_height, fill=1, stroke=0)
    pdf.setFillColor(HexColor(NAVY))
    pdf.rect(0, page_height - 74 * mm, page_width, 74 * mm, fill=1, stroke=0)
    pdf.setFillColor(white)
    pdf.setFont("Arial-Bold", 15)
    pdf.drawString(18 * mm, page_height - 25 * mm, "QUẢN TRỊ NHÂN SỰ")
    pdf.setFillColor(HexColor("#DCEBFA"))
    pdf.setFont("Arial", 10.5)
    pdf.drawString(18 * mm, page_height - 35 * mm, "Ban QLDA Đầu Tư - Hạ Tầng xã Phúc Thịnh")
    pdf.setFillColor(HexColor(INK))
    pdf.setFont("Arial-Bold", 26)
    pdf.drawString(18 * mm, page_height - 106 * mm, "Hướng dẫn Mục Công việc")
    pdf.setFillColor(HexColor(BLUE))
    pdf.setFont("Arial-Bold", 18)
    pdf.drawString(18 * mm, page_height - 119 * mm, "Ảnh chụp trực tiếp từ hệ thống")
    paragraph(
        pdf,
        "Nhập công việc mới, cập nhật trạng thái và phê duyệt hoàn thành theo đúng luồng sử dụng hiện tại.",
        18 * mm,
        page_height - 132 * mm,
        174 * mm,
        font_size=11.5,
        leading=15,
        color=MUTED,
    )
    image_frame(pdf, images["review"], 18 * mm, page_height - 146 * mm, 174 * mm, 97 * mm, "Ảnh chụp cửa sổ Đánh giá hoàn thành")
    pdf.setFillColor(white)
    pdf.roundRect(18 * mm, 24 * mm, 174 * mm, 31 * mm, 4 * mm, fill=1, stroke=0)
    pdf.setFillColor(HexColor(INK))
    pdf.setFont("Arial-Bold", 11)
    pdf.drawString(26 * mm, 45 * mm, "Nội dung hướng dẫn")
    pdf.setFont("Arial", 10.2)
    pdf.setFillColor(HexColor(MUTED))
    pdf.drawString(26 * mm, 36.5 * mm, "1. Nhập công việc  2. Chuyển trạng thái và tiến độ  3. Phê duyệt hoàn thành")
    footer(pdf, 1)
    pdf.showPage()

    # Step 1
    title(pdf, "Bước 1", "Nhập công việc mới", "Mở Công việc, nhập đầy đủ thông tin ở phần Danh mục công việc, sau đó chọn Lưu công việc.")
    image_frame(pdf, images["create"], 18 * mm, 238 * mm, 174 * mm, 112 * mm, "Ảnh chụp trực tiếp biểu mẫu Danh mục công việc")
    y = 119 * mm
    items = [
        "Nhập Tên công việc và Tên dự án. Chọn Danh mục KPI cá nhân để hệ thống tổng hợp kế hoạch đúng chỉ tiêu.",
        "Chọn Người thực hiện, Người phối hợp nếu có; sau đó chọn Loại công việc và Định kỳ.",
        "Thiết lập Ngày bắt đầu, Ngày hoàn thành, Trạng thái ban đầu và Tiến độ. Đính kèm hồ sơ khi cần.",
        "Ghi Nội dung công việc / Báo cáo tiến độ, rồi chọn Lưu công việc. Công việc sẽ xuất hiện trong danh sách phía dưới.",
    ]
    for index, item in enumerate(items, 1):
        y = number_item(pdf, index, item, 20 * mm, y, 170 * mm, BLUE) - 3.2 * mm
    footer(pdf, 2)
    pdf.showPage()

    # Step 2
    title(pdf, "Bước 2", "Chuyển trạng thái và cập nhật tiến độ", "Chọn công việc trong danh sách để xem chi tiết, sau đó chọn Sửa để cập nhật trực tiếp.")
    image_frame(pdf, images["detail"], 18 * mm, 238 * mm, 174 * mm, 84 * mm, "Ảnh chụp popup Chi tiết công việc - trạng thái đang thực hiện, tiến độ 60%")
    image_frame(pdf, images["status"], 18 * mm, 148 * mm, 174 * mm, 84 * mm, "Ảnh chụp popup Cập nhật công việc - chuyển Hoàn thành, tiến độ 100%")
    y = 56 * mm
    items = [
        "Trong popup Chi tiết công việc, chọn Sửa để mở biểu mẫu cập nhật. Các lần chuyển trạng thái và báo cáo tiến độ được lưu vào lịch sử công việc.",
        "Chọn trạng thái phù hợp và nhập tỷ lệ Tiến độ. Khi công việc đạt 100%, chọn Hoàn thành và Lưu công việc để chuyển sang bước đánh giá.",
    ]
    for index, item in enumerate(items, 1):
        y = number_item(pdf, index, item, 20 * mm, y, 170 * mm, TEAL) - 3 * mm
    footer(pdf, 3)
    pdf.showPage()

    # Step 3
    title(pdf, "Bước 3", "Phê duyệt hoàn thành công việc", "Người có thẩm quyền chọn Duyệt hoàn thành tại công việc đã hoàn thành để đánh giá kết quả và chất lượng.")
    image_frame(pdf, images["review"], 18 * mm, 238 * mm, 174 * mm, 104 * mm, "Ảnh chụp trực tiếp cửa sổ Duyệt hoàn thành")
    y = 112 * mm
    items = [
        "Chọn Kết quả đánh giá: Đạt hoặc Không đạt. Nếu Không đạt, công việc được trả về Đang thực hiện để tiếp tục cập nhật.",
        "Khi chọn Đạt, nhập Đánh giá chất lượng (%) và Nhận xét đánh giá. Ô chất lượng chỉ xuất hiện sau khi chọn Đạt.",
        "Hệ thống hiển thị Vượt tiến độ khi đạt trước Ngày hoàn thành; đạt sau thời hạn sẽ được ghi nhận Chậm tiến độ.",
        "Chọn Lưu đánh giá để xác nhận. Kết quả, người đánh giá và thời gian được ghi vào lịch sử báo cáo tiến độ của công việc.",
    ]
    for index, item in enumerate(items, 1):
        y = number_item(pdf, index, item, 20 * mm, y, 170 * mm, GREEN) - 3.2 * mm
    footer(pdf, 4)
    pdf.save()
    print(str(OUTPUT).encode("ascii", "backslashreplace").decode("ascii"))


if __name__ == "__main__":
    create_pdf()
