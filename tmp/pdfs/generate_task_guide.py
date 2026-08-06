from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(r"C:\Users\Hi\Documents\New project")
IMAGE_DIR = ROOT / "tmp" / "pdfs" / "task-guide"
OUTPUT = ROOT / "output" / "pdf" / "Huong-dan-su-dung-muc-Cong-viec.pdf"
FONT_REGULAR = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")

NAVY = colors.HexColor("#123D5A")
TEAL = colors.HexColor("#007C89")
SKY = colors.HexColor("#EAF5F7")
INK = colors.HexColor("#18212B")
MUTED = colors.HexColor("#526474")
LINE = colors.HexColor("#C9D9DE")
AMBER = colors.HexColor("#EAAE2B")


def register_fonts():
    pdfmetrics.registerFont(TTFont("GuideArial", str(FONT_REGULAR)))
    pdfmetrics.registerFont(TTFont("GuideArialBold", str(FONT_BOLD)))


def image(path, max_width, max_height):
    img = Image(str(path))
    width, height = img.imageWidth, img.imageHeight
    ratio = min(max_width / width, max_height / height)
    img.drawWidth = width * ratio
    img.drawHeight = height * ratio
    return img


def add_page_number(canvas, doc):
    canvas.saveState()
    page_width, _ = A4
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(doc.leftMargin, 1.35 * cm, page_width - doc.rightMargin, 1.35 * cm)
    canvas.setFont("GuideArial", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(doc.leftMargin, 0.85 * cm, "Quản Trị Nhân Sự - Ban QLDA Đầu Tư - Hạ Tầng xã Phúc Thịnh")
    canvas.drawRightString(page_width - doc.rightMargin, 0.85 * cm, f"Trang {doc.page}")
    canvas.restoreState()


def bullet(text, styles):
    return Paragraph(f'<font color="#007C89">•</font>&nbsp;&nbsp;{text}', styles["body"])


def section_title(text, styles):
    return Paragraph(text, styles["guide_h2"])


def note(text, styles):
    table = Table([[Paragraph(f"<b>Lưu ý:</b> {text}", styles["note"]) ]], colWidths=[17.0 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF6DE")),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#E5B75B")),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def role_table(styles):
    data = [
        [Paragraph("<b>Loại tài khoản</b>", styles["table_head"]), Paragraph("<b>Quyền trong mục Công việc</b>", styles["table_head"])],
        [Paragraph("Nhân viên", styles["table"]), Paragraph("Tạo và cập nhật công việc liên quan đến bản thân; nhận việc và báo cáo tiến độ khi được giao; xem công việc trong phạm vi được phân quyền.", styles["table"])],
        [Paragraph("Trưởng bộ phận/Trưởng nhóm", styles["table"]), Paragraph("Tạo công việc, xem danh mục công việc của phòng; có thể tham gia phối hợp và cập nhật tiến độ theo phân quyền.", styles["table"])],
        [Paragraph("Trưởng phòng/Phó phòng", styles["table"]), Paragraph("Giao việc trong phạm vi quản lý, theo dõi tiến độ, đánh giá hoàn thành Đạt/Không đạt và nhập đánh giá chất lượng cho công việc đủ điều kiện.", styles["table"])],
        [Paragraph("Ban giám đốc", styles["table"]), Paragraph("Xem và điều hành toàn bộ dữ liệu công việc theo quyền được cấp.", styles["table"])],
        [Paragraph("Admin", styles["table"]), Paragraph("Quyền cao nhất: xem, sửa mọi trường kể cả công việc đang khóa/quá hạn/đã kết thúc và xóa vĩnh viễn công việc khi cần.", styles["table"])],
    ]
    table = Table(data, colWidths=[4.4 * cm, 12.6 * cm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F6FAFB")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def build_pdf():
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=2.0 * cm,
        leftMargin=2.0 * cm,
        topMargin=1.8 * cm,
        bottomMargin=2.0 * cm,
        title="Hướng dẫn sử dụng mục Công việc",
        author="Ban QLDA Đầu Tư - Hạ Tầng xã Phúc Thịnh",
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="cover_org", fontName="GuideArialBold", fontSize=10, leading=14,
        alignment=TA_CENTER, textColor=NAVY, spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        name="cover_title", fontName="GuideArialBold", fontSize=24, leading=31,
        alignment=TA_CENTER, textColor=INK, spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        name="cover_subtitle", fontName="GuideArial", fontSize=11.5, leading=17,
        alignment=TA_CENTER, textColor=MUTED,
    ))
    styles.add(ParagraphStyle(
        name="guide_h1", fontName="GuideArialBold", fontSize=17, leading=22,
        textColor=INK, spaceBefore=2, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="guide_h2", fontName="GuideArialBold", fontSize=14, leading=18,
        textColor=NAVY, spaceBefore=4, spaceAfter=7,
    ))
    styles.add(ParagraphStyle(
        name="body", fontName="GuideArial", fontSize=10, leading=14.5,
        textColor=INK, spaceAfter=5,
    ))
    styles.add(ParagraphStyle(
        name="caption", fontName="GuideArial", fontSize=8.5, leading=11,
        textColor=MUTED, alignment=TA_CENTER, spaceBefore=5, spaceAfter=9,
    ))
    styles.add(ParagraphStyle(
        name="note", fontName="GuideArial", fontSize=9.2, leading=13,
        textColor=INK,
    ))
    styles.add(ParagraphStyle(
        name="table", fontName="GuideArial", fontSize=8.4, leading=11.3,
        textColor=INK,
    ))
    styles.add(ParagraphStyle(
        name="table_head", fontName="GuideArialBold", fontSize=8.5, leading=11,
        textColor=colors.white,
    ))

    story = []
    icon_path = ROOT / "app-icon-phuc-thinh.png"
    if icon_path.exists():
        icon = image(icon_path, 4.3 * cm, 4.3 * cm)
        icon.hAlign = "CENTER"
        story.extend([Spacer(1, 1.1 * cm), icon, Spacer(1, 0.45 * cm)])
    story.append(Paragraph("BAN QUẢN LÝ DỰ ÁN ĐẦU TƯ - HẠ TẦNG XÃ PHÚC THỊNH", styles["cover_org"]))
    story.append(Paragraph("HƯỚNG DẪN SỬ DỤNG<br/>MỤC CÔNG VIỆC", styles["cover_title"]))
    story.append(Paragraph("Tạo công việc, cập nhật tiến độ, lọc theo dự án và giao việc trên hệ thống Quản Trị Nhân Sự.", styles["cover_subtitle"]))
    story.append(Spacer(1, 0.75 * cm))
    cover_box = Table([[Paragraph("<b>Phạm vi:</b> Danh mục công việc, bộ lọc, Giao việc, tiến độ, đánh giá và phân quyền.", styles["note"]) ]], colWidths=[15.6 * cm])
    cover_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SKY),
        ("BOX", (0, 0), (-1, -1), 0.8, TEAL),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
    ]))
    story.append(cover_box)
    story.append(Spacer(1, 1.0 * cm))
    story.append(Paragraph("Thao tác cơ bản", styles["guide_h2"]))
    for item in [
        "Chọn <b>Công việc</b> tại thanh menu bên trái.",
        "Nhập hoặc cập nhật thông tin công việc, sau đó chọn <b>Lưu công việc</b>.",
        "Theo dõi công việc theo trạng thái, tên dự án và khoảng thời gian.",
        "Dùng nút <b>Giao việc</b> để tạo, theo dõi và kết thúc công việc được giao theo quyền hạn.",
    ]:
        story.append(bullet(item, styles))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("Ảnh trong tài liệu được chụp từ giao diện hệ thống. Nội dung và nút hiển thị có thể khác theo quyền của tài khoản đăng nhập.", styles["caption"]))
    story.append(PageBreak())

    story.append(section_title("1. Tạo và cập nhật công việc", styles))
    story.append(Paragraph("Tại phần <b>Danh mục công việc</b>, điền thông tin theo từng dòng để bảo đảm dữ liệu được liên kết đúng với KPI cá nhân.", styles["body"]))
    story.append(image(IMAGE_DIR / "01-danh-muc-cong-viec.png", 17.0 * cm, 12.7 * cm))
    story.append(Paragraph("Hình 1. Biểu mẫu tạo hoặc cập nhật công việc trong mục Công việc.", styles["caption"]))
    for item in [
        "Nhập <b>Tên công việc</b>, <b>Tên dự án</b> và chọn <b>Danh mục KPI cá nhân</b> phù hợp.",
        "Chọn <b>Người thực hiện</b>; có thể chọn nhiều <b>Người phối hợp</b> khi cần cùng tham gia.",
        "Chọn loại công việc, định kỳ, ngày bắt đầu, ngày hoàn thành, trạng thái và tỷ lệ tiến độ.",
        "Tải hồ sơ liên quan (nếu có), sau đó ghi nội dung công việc hoặc báo cáo tiến độ. Mỗi lần cập nhật được lưu thành dòng lịch sử riêng.",
        "Chỉ nhập <b>Đánh giá chất lượng</b> khi công việc đã được đánh giá hoàn thành Đạt. Điểm thực hiện được liên kết với KPI cá nhân theo quy định hệ thống.",
    ]:
        story.append(bullet(item, styles))
    story.append(note("Không dùng ngày quá khứ để thay đổi kết quả kỳ đã khóa nếu tài khoản không có quyền. Admin vẫn có thể chỉnh sửa dữ liệu công việc trong các trạng thái khóa.", styles))
    story.append(PageBreak())

    story.append(section_title("2. Lọc, theo dõi và mở chi tiết công việc", styles))
    story.append(Paragraph("Khu vực lọc ở dưới biểu mẫu giúp thu hẹp nhanh danh sách trước khi kiểm tra hoặc cập nhật.", styles["body"]))
    story.append(image(IMAGE_DIR / "03-bo-loc-cong-viec.png", 17.0 * cm, 9.55 * cm))
    story.append(Paragraph("Hình 2. Khu vực lọc theo từ khóa, tên dự án, trạng thái và khoảng thời gian.", styles["caption"]))
    for item in [
        "Gõ từ khóa để tìm theo tên công việc, người giao hoặc người được giao.",
        "Chọn <b>Tất cả dự án</b> hoặc một tên dự án cụ thể để lọc công việc theo dự án. Danh sách tự hình thành từ các công việc mà tài khoản được phép xem.",
        "Chọn trạng thái: Chuẩn bị thực hiện, Đang thực hiện, Hoàn thành hoặc Quá hạn.",
        "Chọn khoảng <b>Từ ngày</b> và <b>Đến ngày</b> theo ngày hoàn thành; nút <b>Bỏ lọc ngày</b> chỉ xóa điều kiện thời gian.",
        "Nhấn vào tiêu đề trạng thái để xem danh sách chi tiết của trạng thái đó; nhấn trực tiếp vào một thẻ công việc để mở chi tiết.",
    ]:
        story.append(bullet(item, styles))
    story.append(note("Công việc được giao cũng xuất hiện trong danh mục chính và có mác <b>Việc được giao</b> để phân biệt với công việc thường kỳ.", styles))
    story.append(PageBreak())

    story.append(section_title("3. Giao việc và báo cáo tiến độ", styles))
    story.append(Paragraph("Chọn nút <b>Giao việc</b> ở đầu mục Công việc để mở hộp tạo và theo dõi công việc được giao.", styles["body"]))
    story.append(image(IMAGE_DIR / "02-giao-viec.png", 17.0 * cm, 9.7 * cm))
    story.append(Paragraph("Hình 3. Màn hình Giao việc với người được giao, người phối hợp, thời hạn và nội dung yêu cầu.", styles["caption"]))
    for item in [
        "Người giao nhập tên công việc, tên dự án, người được giao, người phối hợp, danh mục KPI, ngày/giờ hoàn thành và nội dung giao việc.",
        "Người được giao phản hồi nhận việc hoặc lý do cần trao đổi; người được giao và người phối hợp cập nhật báo cáo tiến độ theo quyền.",
        "Khi công việc ở trạng thái Hoàn thành, Trưởng phòng/Phó phòng hoặc người có quyền đánh giá hoàn thành chọn <b>Đạt</b> hoặc <b>Không đạt</b>.",
        "Nếu Không đạt, công việc quay về Đang thực hiện; nếu đã quá ngày hoàn thành thì hệ thống thể hiện Quá hạn. Lịch sử báo cáo ghi nhận thời gian và tài khoản thao tác.",
        "Người giao việc có thể dùng nút <b>Kết thúc</b> để đóng công việc; Admin cũng có quyền thao tác khi cần.",
    ]:
        story.append(bullet(item, styles))
    story.append(PageBreak())

    story.append(section_title("4. Phân quyền và lưu ý xử lý", styles))
    story.append(Paragraph("Quyền hiển thị và thao tác phụ thuộc vào loại tài khoản. Danh sách dưới đây tóm tắt các quyền áp dụng trong mục Công việc.", styles["body"]))
    story.append(role_table(styles))
    story.append(Spacer(1, 0.45 * cm))
    story.append(section_title("Quy trình khuyến nghị", styles))
    for item in [
        "Tạo công việc đúng danh mục KPI và ghi rõ tên dự án để hệ thống tổng hợp kế hoạch chính xác.",
        "Cập nhật tiến độ, nội dung báo cáo và hồ sơ liên quan trước ngày hoàn thành.",
        "Đánh giá hoàn thành Đạt trước khi nhập đánh giá chất lượng; kiểm tra lịch sử báo cáo nếu có thay đổi trạng thái.",
        "Dùng bộ lọc tên dự án để rà soát nhanh khối lượng công việc của từng dự án.",
        "Chỉ Admin thực hiện xóa vĩnh viễn khi thật sự cần thiết; thao tác xóa được đồng bộ sang các thiết bị khác.",
    ]:
        story.append(bullet(item, styles))
    story.append(Spacer(1, 0.25 * cm))
    story.append(note("Tài liệu này hướng dẫn thao tác mục Công việc. Các quy định về KPI, đánh giá và khen thưởng vẫn thực hiện theo Quy chế hiện hành của Ban QLDA.", styles))

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)


if __name__ == "__main__":
    build_pdf()
