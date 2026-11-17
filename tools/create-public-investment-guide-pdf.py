# -*- coding: utf-8 -*-
"""Create the illustrated user guide for the Public Investment module."""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "tmp" / "pdfs"
ASSET_DIR = TMP / "guide-assets"
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT = OUTPUT_DIR / "huong-dan-du-an-dau-tu-cong.pdf"

PAGE_W, PAGE_H = landscape(A4)
MARGIN = 34

NAVY = HexColor("#153B57")
TEAL = HexColor("#0D7181")
TEAL_DARK = HexColor("#075766")
TEAL_PALE = HexColor("#EAF5F6")
BLUE = HexColor("#3D5E9A")
BLUE_PALE = HexColor("#EEF2FA")
GREEN = HexColor("#178269")
GREEN_PALE = HexColor("#E9F6F1")
AMBER = HexColor("#D99020")
AMBER_PALE = HexColor("#FFF4DF")
RED = HexColor("#B94747")
RED_PALE = HexColor("#FCECEC")
INK = HexColor("#17283A")
MUTED = HexColor("#587083")
LINE = HexColor("#C9D9E2")
PAPER = HexColor("#F7FAFB")
WHITE = white


def register_fonts() -> None:
    candidates = [
        ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/ariali.ttf"),
        ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/seguisb.ttf", "C:/Windows/Fonts/segoeuii.ttf"),
    ]
    for regular, bold, italic in candidates:
        if Path(regular).exists() and Path(bold).exists():
            pdfmetrics.registerFont(TTFont("GuideSans", regular))
            pdfmetrics.registerFont(TTFont("GuideSans-Bold", bold))
            if Path(italic).exists():
                pdfmetrics.registerFont(TTFont("GuideSans-Italic", italic))
            else:
                pdfmetrics.registerFont(TTFont("GuideSans-Italic", regular))
            return
    raise FileNotFoundError("Không tìm thấy font tiếng Việt phù hợp.")


def wrap_lines(text: str, font: str, size: float, max_width: float) -> list[str]:
    paragraphs = str(text).split("\n")
    result: list[str] = []
    for paragraph in paragraphs:
        words = paragraph.split()
        if not words:
            result.append("")
            continue
        line = words[0]
        for word in words[1:]:
            candidate = f"{line} {word}"
            if pdfmetrics.stringWidth(candidate, font, size) <= max_width:
                line = candidate
            else:
                result.append(line)
                line = word
        result.append(line)
    return result


def text_block(c: canvas.Canvas, text: str, x: float, y: float, width: float,
               size: float = 10, color=INK, font: str = "GuideSans",
               leading: float | None = None, max_lines: int | None = None) -> float:
    leading = leading or size * 1.35
    lines = wrap_lines(text, font, size, width)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while pdfmetrics.stringWidth(last + "…", font, size) > width and last:
            last = last[:-1]
        lines[-1] = last.rstrip() + "…"
    c.setFont(font, size)
    c.setFillColor(color)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def rounded_box(c: canvas.Canvas, x: float, y: float, w: float, h: float,
                fill=WHITE, stroke=LINE, radius: float = 10, shadow: bool = False) -> None:
    if shadow:
        c.setFillColor(Color(0.05, 0.18, 0.25, alpha=0.10))
        c.roundRect(x + 3, y - 3, w, h, radius, stroke=0, fill=1)
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, radius, stroke=1, fill=1)


def badge(c: canvas.Canvas, text: str, x: float, y: float, fill=TEAL, color=WHITE,
          size: float = 8.5, pad_x: float = 8, h: float = 20) -> float:
    w = pdfmetrics.stringWidth(text, "GuideSans-Bold", size) + pad_x * 2
    c.setFillColor(fill)
    c.roundRect(x, y, w, h, h / 2, stroke=0, fill=1)
    c.setFillColor(color)
    c.setFont("GuideSans-Bold", size)
    c.drawCentredString(x + w / 2, y + (h - size) / 2 + 1.2, text)
    return w


def draw_simple_icon(c: canvas.Canvas, kind: str, cx: float, cy: float, color=TEAL, scale: float = 1) -> None:
    c.saveState()
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(1.8 * scale)
    s = 10 * scale
    if kind == "folder":
        c.roundRect(cx - s, cy - s * .55, 2 * s, 1.35 * s, 2.5 * scale, stroke=1, fill=0)
        c.line(cx - s * .8, cy + s * .8, cx - s * .2, cy + s * .8)
        c.line(cx - s * .2, cy + s * .8, cx + s * .05, cy + s * .55)
    elif kind == "check":
        c.roundRect(cx - s * .8, cy - s * .8, 1.6 * s, 1.6 * s, 3 * scale, stroke=1, fill=0)
        c.line(cx - s * .42, cy, cx - s * .08, cy - s * .34)
        c.line(cx - s * .08, cy - s * .34, cx + s * .5, cy + s * .36)
    elif kind == "users":
        c.circle(cx - s * .35, cy + s * .35, s * .28, stroke=1, fill=0)
        c.circle(cx + s * .35, cy + s * .35, s * .28, stroke=1, fill=0)
        c.arc(cx - s, cy - s * .8, cx + s * .2, cy + s * .18, 0, 180)
        c.arc(cx - s * .2, cy - s * .8, cx + s, cy + s * .18, 0, 180)
    elif kind == "link":
        c.arc(cx - s, cy - s * .35, cx + s * .1, cy + s * .55, 300, 210)
        c.arc(cx - s * .1, cy - s * .55, cx + s, cy + s * .35, 120, 210)
        c.line(cx - s * .28, cy, cx + s * .28, cy)
    elif kind == "shield":
        p = c.beginPath()
        p.moveTo(cx, cy + s)
        p.lineTo(cx + s * .75, cy + s * .55)
        p.lineTo(cx + s * .58, cy - s * .35)
        p.lineTo(cx, cy - s)
        p.lineTo(cx - s * .58, cy - s * .35)
        p.lineTo(cx - s * .75, cy + s * .55)
        p.close()
        c.drawPath(p, stroke=1, fill=0)
        c.line(cx - s * .35, cy, cx - s * .05, cy - s * .3)
        c.line(cx - s * .05, cy - s * .3, cx + s * .4, cy + s * .3)
    elif kind == "clock":
        c.circle(cx, cy, s * .8, stroke=1, fill=0)
        c.line(cx, cy, cx, cy + s * .45)
        c.line(cx, cy, cx + s * .4, cy - s * .25)
    elif kind == "report":
        c.rect(cx - s * .7, cy - s, s * 1.4, s * 2, stroke=1, fill=0)
        c.line(cx - s * .42, cy + s * .45, cx + s * .4, cy + s * .45)
        c.line(cx - s * .42, cy, cx + s * .4, cy)
        c.line(cx - s * .42, cy - s * .45, cx + s * .2, cy - s * .45)
    elif kind == "risk":
        p = c.beginPath()
        p.moveTo(cx, cy + s)
        p.lineTo(cx + s, cy - s)
        p.lineTo(cx - s, cy - s)
        p.close()
        c.drawPath(p, stroke=1, fill=0)
        c.line(cx, cy + s * .35, cx, cy - s * .25)
        c.circle(cx, cy - s * .55, s * .06, stroke=1, fill=1)
    else:
        c.circle(cx, cy, s * .8, stroke=1, fill=0)
    c.restoreState()


def page_shell(c: canvas.Canvas, page_no: int, section: str, title: str, subtitle: str = "") -> None:
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - 58, PAGE_W, 58, stroke=0, fill=1)
    c.setFillColor(TEAL)
    c.rect(0, PAGE_H - 58, 9, 58, stroke=0, fill=1)
    c.setFont("GuideSans-Bold", 8.2)
    c.setFillColor(HexColor("#9ED7DD"))
    c.drawString(MARGIN, PAGE_H - 21, section.upper())
    c.setFont("GuideSans-Bold", 19)
    c.setFillColor(WHITE)
    c.drawString(MARGIN, PAGE_H - 44, title)
    if subtitle:
        c.setFont("GuideSans", 8.5)
        c.setFillColor(HexColor("#D9E8EE"))
        c.drawRightString(PAGE_W - MARGIN, PAGE_H - 39, subtitle)
    c.setStrokeColor(LINE)
    c.line(MARGIN, 24, PAGE_W - MARGIN, 24)
    c.setFont("GuideSans", 7.5)
    c.setFillColor(MUTED)
    c.drawString(MARGIN, 11, "HƯỚNG DẪN SỬ DỤNG DỰ ÁN ĐẦU TƯ CÔNG")
    c.drawRightString(PAGE_W - MARGIN, 11, f"Trang {page_no}")


def section_card(c: canvas.Canvas, x: float, y: float, w: float, h: float, title: str,
                 body: str, icon: str, accent=TEAL, fill=WHITE, number: str | None = None) -> None:
    rounded_box(c, x, y, w, h, fill=fill, stroke=LINE, radius=9)
    c.setFillColor(accent)
    c.roundRect(x, y, 5, h, 2.5, stroke=0, fill=1)
    draw_simple_icon(c, icon, x + 24, y + h - 26, accent, .85)
    if number:
        c.setFillColor(accent)
        c.circle(x + w - 24, y + h - 24, 13, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont("GuideSans-Bold", 9)
        c.drawCentredString(x + w - 24, y + h - 27, number)
    c.setFont("GuideSans-Bold", 11)
    c.setFillColor(INK)
    c.drawString(x + 45, y + h - 30, title)
    text_block(c, body, x + 16, y + h - 53, w - 32, 8.5, MUTED, leading=11.5)


def prepare_image(source: Path, name: str, crop_ratio: float | None = None) -> Path | None:
    if not source.exists():
        return None
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    out = ASSET_DIR / name
    with Image.open(source) as im:
        im = im.convert("RGB")
        if crop_ratio:
            target_h = int(im.width / crop_ratio)
            target_h = min(target_h, im.height)
            im = im.crop((0, 0, im.width, target_h))
        im = ImageEnhance.Contrast(im).enhance(1.02)
        im = ImageEnhance.Sharpness(im).enhance(1.15)
        im.save(out, "JPEG", quality=88, optimize=True)
    return out


def image_card(c: canvas.Canvas, image_path: Path | None, x: float, y: float, w: float, h: float,
               caption: str = "") -> None:
    rounded_box(c, x, y, w, h, fill=WHITE, stroke=LINE, radius=10, shadow=True)
    inner_h = h - (27 if caption else 14)
    if image_path and image_path.exists():
        with Image.open(image_path) as im:
            iw, ih = im.size
        scale = min((w - 12) / iw, (inner_h - 6) / ih)
        dw, dh = iw * scale, ih * scale
        dx = x + (w - dw) / 2
        dy = y + (inner_h - dh) / 2 + (19 if caption else 7)
        c.drawImage(ImageReader(str(image_path)), dx, dy, dw, dh, preserveAspectRatio=True, mask="auto")
    else:
        c.setFillColor(TEAL_PALE)
        c.roundRect(x + 8, y + 8, w - 16, inner_h - 8, 6, stroke=0, fill=1)
        c.setFillColor(MUTED)
        c.setFont("GuideSans", 9)
        c.drawCentredString(x + w / 2, y + h / 2, "Minh họa giao diện hệ thống")
    if caption:
        c.setFillColor(TEAL_DARK)
        c.setFont("GuideSans-Bold", 8.2)
        c.drawString(x + 12, y + 9, caption)


def arrow(c: canvas.Canvas, x1: float, y: float, x2: float, color=TEAL) -> None:
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(1.5)
    c.line(x1, y, x2 - 7, y)
    p = c.beginPath()
    p.moveTo(x2, y)
    p.lineTo(x2 - 8, y + 4)
    p.lineTo(x2 - 8, y - 4)
    p.close()
    c.drawPath(p, stroke=0, fill=1)


def draw_cover(c: canvas.Canvas, logo: Path) -> None:
    c.setFillColor(NAVY)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(Color(.04, .55, .61, alpha=.20))
    c.circle(PAGE_W - 90, PAGE_H - 70, 160, stroke=0, fill=1)
    c.setFillColor(Color(.24, .37, .60, alpha=.28))
    c.circle(PAGE_W - 15, 40, 210, stroke=0, fill=1)
    c.setFillColor(TEAL)
    c.rect(0, 0, 12, PAGE_H, stroke=0, fill=1)
    if logo.exists():
        c.drawImage(ImageReader(str(logo)), 48, PAGE_H - 118, 58, 58, preserveAspectRatio=True, mask="auto")
    c.setFont("GuideSans-Bold", 9)
    c.setFillColor(HexColor("#A7DCE2"))
    c.drawString(122, PAGE_H - 77, "BAN QUẢN LÝ DỰ ÁN ĐẦU TƯ - HẠ TẦNG XÃ PHÚC THỊNH")
    c.setFont("GuideSans-Bold", 30)
    c.setFillColor(WHITE)
    c.drawString(48, PAGE_H - 170, "HƯỚNG DẪN SỬ DỤNG")
    c.setFont("GuideSans-Bold", 34)
    c.setFillColor(HexColor("#6ED1DA"))
    c.drawString(48, PAGE_H - 213, "DỰ ÁN ĐẦU TƯ CÔNG")
    c.setFont("GuideSans", 14)
    c.setFillColor(HexColor("#DDECF0"))
    c.drawString(50, PAGE_H - 246, "Quản lý dự án và Thẩm định dự án trên một luồng dữ liệu thống nhất")

    rounded_box(c, 48, 95, 348, 150, fill=HexColor("#204E67"), stroke=HexColor("#3D7184"), radius=14)
    c.setFont("GuideSans-Bold", 14)
    c.setFillColor(WHITE)
    c.drawString(72, 214, "TÀI LIỆU NÀY GIÚP BẠN")
    cover_items = [
        ("folder", "Khởi tạo và quản lý hồ sơ dự án xuyên suốt 6 giai đoạn"),
        ("check", "Thực hiện checklist, thẩm định, lấy ý kiến và kết luận"),
        ("shield", "Hiểu đúng quyền của từng vai trò và phạm vi dữ liệu"),
    ]
    yy = 181
    for icon, label in cover_items:
        draw_simple_icon(c, icon, 75, yy + 2, HexColor("#75D5DD"), .72)
        text_block(c, label, 96, yy + 7, 275, 9.5, HexColor("#E9F4F6"), leading=12)
        yy -= 42

    rounded_box(c, 430, 95, 360, 150, fill=WHITE, stroke=HexColor("#5D8795"), radius=14, shadow=True)
    c.setFont("GuideSans-Bold", 12)
    c.setFillColor(NAVY)
    c.drawString(454, 214, "HAI KHÔNG GIAN LÀM VIỆC")
    section_card(c, 454, 123, 145, 72, "Quản lý dự án", "Vòng đời, pháp lý, tiến độ, liên kết và rủi ro.", "folder", TEAL, TEAL_PALE)
    section_card(c, 616, 123, 150, 72, "Thẩm định dự án", "Hồ sơ, checklist, ý kiến phối hợp và kết luận.", "check", BLUE, BLUE_PALE)
    c.setFont("GuideSans", 8.5)
    c.setFillColor(HexColor("#B9CCD4"))
    c.drawString(48, 50, "Phiên bản hướng dẫn: 3.4.143  |  Cập nhật tháng 11/2026")
    c.drawRightString(PAGE_W - 48, 50, "Tài liệu sử dụng nội bộ")


def build_pdf() -> Path:
    register_fonts()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)
    logo = ROOT / "app-icon-phuc-thinh.png"
    project_hub = prepare_image(TMP / "giao-dien-quan-ly-du-an.png", "project-hub.jpg", 2.2)
    appraisal_hub = prepare_image(TMP / "giao-dien-tham-dinh-du-an.png", "appraisal-hub.jpg", 2.2)
    project_form = prepare_image(TMP / "bieu-mau-quan-ly-du-an.png", "project-form.jpg")
    appraisal_form = prepare_image(TMP / "bieu-mau-tham-dinh.png", "appraisal-form.jpg")

    c = canvas.Canvas(str(OUTPUT), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    c.setTitle("Hướng dẫn sử dụng Dự án đầu tư công")
    c.setAuthor("Ban Quản lý Dự án Đầu tư - Hạ tầng xã Phúc Thịnh")
    c.setSubject("Hướng dẫn Quản lý dự án và Thẩm định dự án")

    # 1. Cover
    draw_cover(c, logo)
    c.showPage()

    # 2. Start
    page_shell(c, 2, "Bắt đầu", "Truy cập và chọn đúng không gian làm việc", "Thời gian làm quen: khoảng 3 phút")
    image_card(c, project_hub, 360, 275, 445, 240, "Giao diện Dự án đầu tư công - tab Quản lý dự án")
    section_card(c, 36, 398, 295, 116, "Mở phân hệ", "Từ menu chính chọn Dự án đầu tư công. Hệ thống chỉ hiển thị dữ liệu trong phạm vi tài khoản được phép xem.", "folder", TEAL, WHITE, "01")
    section_card(c, 36, 264, 295, 116, "Chọn tab nghiệp vụ", "Chọn Quản lý dự án để điều hành vòng đời; chọn Thẩm định dự án để xử lý hồ sơ thẩm định.", "check", BLUE, WHITE, "02")
    section_card(c, 36, 130, 295, 116, "Tìm kiếm và lọc", "Dùng ô tìm kiếm, bộ lọc trạng thái và giai đoạn để thu hẹp hồ sơ trước khi mở xem hoặc cập nhật.", "report", GREEN, WHITE, "03")
    rounded_box(c, 360, 106, 445, 146, fill=AMBER_PALE, stroke=HexColor("#F0D49A"), radius=10)
    c.setFont("GuideSans-Bold", 12)
    c.setFillColor(HexColor("#8A5A08"))
    c.drawString(382, 226, "NGUYÊN TẮC CẦN NHỚ")
    tips = [
        "Quyền vào phân hệ và quyền trên từng hồ sơ là hai lớp kiểm soát khác nhau.",
        "Hồ sơ dự án dùng dữ liệu từ Danh mục dự án; không tự tạo một dự án trùng lặp.",
        "Nút Cập nhật chỉ xuất hiện khi tài khoản có quyền sửa hồ sơ đó.",
        "Các thao tác lưu tiếp tục được Edge Function kiểm tra quyền ở máy chủ.",
    ]
    yy = 202
    for tip in tips:
        c.setFillColor(AMBER)
        c.circle(387, yy + 2, 2.6, stroke=0, fill=1)
        yy = text_block(c, tip, 397, yy + 6, 380, 8.8, INK, leading=12) - 5
    c.showPage()

    # 3. Operating map
    page_shell(c, 3, "Tổng quan", "Bản đồ vận hành dữ liệu", "Một dự án - nhiều hồ sơ liên kết")
    c.setFont("GuideSans", 10)
    c.setFillColor(MUTED)
    c.drawString(36, 510, "Dữ liệu được tổ chức theo dự án gốc, sau đó liên kết các phân hệ thay vì nhập lại nhiều lần.")
    flow_x = [45, 205, 365, 525, 685]
    flow = [
        ("folder", "Danh mục dự án", "Tên chuẩn và mã dự án"),
        ("folder", "Hồ sơ quản lý", "6 giai đoạn xuyên suốt"),
        ("check", "Hồ sơ thẩm định", "Checklist và kết luận"),
        ("link", "Dữ liệu liên quan", "Công việc - GPMB - Lưu trữ"),
        ("report", "Báo cáo", "Tổng hợp và in hồ sơ"),
    ]
    for idx, ((icon, title, body), x) in enumerate(zip(flow, flow_x)):
        rounded_box(c, x, 350, 125, 115, fill=WHITE, stroke=LINE, radius=11, shadow=True)
        c.setFillColor(TEAL_PALE if idx < 2 else BLUE_PALE if idx == 2 else GREEN_PALE)
        c.circle(x + 62.5, 425, 21, stroke=0, fill=1)
        draw_simple_icon(c, icon, x + 62.5, 425, TEAL if idx < 2 else BLUE if idx == 2 else GREEN, .8)
        c.setFillColor(INK)
        c.setFont("GuideSans-Bold", 10)
        c.drawCentredString(x + 62.5, 393, title)
        lines = wrap_lines(body, "GuideSans", 7.8, 102)
        c.setFont("GuideSans", 7.8)
        c.setFillColor(MUTED)
        ty = 378
        for line in lines:
            c.drawCentredString(x + 62.5, ty, line)
            ty -= 10
        if idx < len(flow) - 1:
            arrow(c, x + 128, 407, flow_x[idx + 1] - 4)
    rounded_box(c, 45, 95, 740, 215, fill=WHITE, stroke=LINE, radius=12)
    c.setFont("GuideSans-Bold", 13)
    c.setFillColor(NAVY)
    c.drawString(65, 282, "CÁC MỐI LIÊN KẾT TỰ ĐỘNG")
    links = [
        ("Công việc", "Các nhiệm vụ cùng projectId hoặc cùng tên dự án chuẩn."),
        ("Thẩm định", "Hồ sơ thẩm định gắn trực tiếp với dự án trong danh mục."),
        ("GPMB", "Đợt GPMB cùng dự án được tổng hợp trong phần Liên kết."),
        ("Lưu trữ", "Hồ sơ, văn bản và tài liệu nguồn có thể liên kết vào checklist."),
    ]
    for i, (title, body) in enumerate(links):
        col = i % 2
        row = i // 2
        x = 65 + col * 360
        y = 225 - row * 82
        c.setFillColor(TEAL if col == 0 else BLUE)
        c.circle(x + 13, y + 10, 13, stroke=0, fill=1)
        c.setFont("GuideSans-Bold", 9)
        c.setFillColor(WHITE)
        c.drawCentredString(x + 13, y + 7, str(i + 1))
        c.setFont("GuideSans-Bold", 10)
        c.setFillColor(INK)
        c.drawString(x + 36, y + 15, title)
        text_block(c, body, x + 36, y - 1, 290, 8.3, MUTED, leading=11)
    c.showPage()

    # 4. Create project record
    page_shell(c, 4, "Quản lý dự án", "Khởi tạo hồ sơ quản lý dự án", "Chỉ cấp quản lý được khởi tạo")
    image_card(c, project_form, 378, 135, 427, 368, "Biểu mẫu khởi tạo hồ sơ quản lý dự án")
    steps = [
        ("Chọn dự án", "Chọn một dự án chưa có hồ sơ quản lý từ Danh mục dự án."),
        ("Nhập nhận diện", "Điền mã dự án, nhóm, lĩnh vực, chủ đầu tư và cấp quyết định."),
        ("Khai báo nguồn lực", "Nhập nguồn vốn, tổng mức đầu tư, thời gian kế hoạch và mục tiêu."),
        ("Phân công", "Chọn người phụ trách chính, người tham gia và hồ sơ lưu trữ liên quan."),
        ("Kiểm tra và lưu", "Mã dự án, dự án và người phụ trách là bắt buộc; ngày kết thúc không trước ngày bắt đầu."),
    ]
    yy = 473
    for i, (title, body) in enumerate(steps, 1):
        c.setFillColor(TEAL)
        c.circle(58, yy + 2, 15, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont("GuideSans-Bold", 9)
        c.drawCentredString(58, yy - 1, f"{i:02d}")
        c.setFont("GuideSans-Bold", 10.5)
        c.setFillColor(INK)
        c.drawString(83, yy + 8, title)
        yy = text_block(c, body, 83, yy - 9, 260, 8.3, MUTED, leading=11) - 17
    rounded_box(c, 36, 78, 318, 70, fill=GREEN_PALE, stroke=HexColor("#B9DFD0"), radius=9)
    c.setFont("GuideSans-Bold", 9.5)
    c.setFillColor(GREEN)
    c.drawString(54, 126, "KẾT QUẢ")
    text_block(c, "Hệ thống tạo một hồ sơ số duy nhất cho dự án và tự mở giai đoạn Chuẩn bị đầu tư.", 54, 109, 280, 8.5, INK, leading=11)
    c.showPage()

    # 5. Six stages
    page_shell(c, 5, "Quản lý dự án", "Điều hành vòng đời theo 6 giai đoạn", "Giai đoạn sau chỉ mở khi giai đoạn trước hoàn thành")
    stages = [
        ("01", "Chuẩn bị đầu tư", "Chủ trương, quy hoạch, khảo sát"),
        ("02", "Thẩm định và quyết định", "Kết quả thẩm định, quyết định, vốn"),
        ("03", "Chuẩn bị thực hiện", "GPMB, thiết kế, giấy phép, đấu thầu"),
        ("04", "Thực hiện dự án", "Hợp đồng, chất lượng, giải ngân"),
        ("05", "Nghiệm thu và bàn giao", "Nghiệm thu, bàn giao tài sản"),
        ("06", "Quyết toán và kết thúc", "Hồ sơ, phê duyệt và lưu trữ"),
    ]
    colors = [TEAL, TEAL, BLUE, BLUE, GREEN, GREEN]
    x0, y0, box_w, gap = 40, 350, 118, 17
    for i, ((num, title, body), color) in enumerate(zip(stages, colors)):
        x = x0 + i * (box_w + gap)
        rounded_box(c, x, y0, box_w, 132, fill=WHITE, stroke=LINE, radius=10)
        c.setFillColor(color)
        c.circle(x + 25, y0 + 103, 15, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont("GuideSans-Bold", 8.5)
        c.drawCentredString(x + 25, y0 + 100, num)
        text_block(c, title, x + 14, y0 + 76, box_w - 28, 9.2, INK, "GuideSans-Bold", leading=11)
        text_block(c, body, x + 14, y0 + 40, box_w - 28, 7.8, MUTED, leading=10)
        if i < 5:
            arrow(c, x + box_w + 2, y0 + 66, x + box_w + gap - 2, color)
    rounded_box(c, 40, 105, 762, 198, fill=WHITE, stroke=LINE, radius=11)
    c.setFont("GuideSans-Bold", 12)
    c.setFillColor(NAVY)
    c.drawString(60, 275, "CỔNG KIỂM SOÁT KHI CHUYỂN GIAI ĐOẠN")
    gate_cards = [
        ("1", "Đúng thứ tự", "Không thể bắt đầu, chặn hoặc hoàn thành giai đoạn sau khi giai đoạn trước chưa hoàn thành.", TEAL),
        ("2", "Đủ điều kiện pháp lý", "Muốn hoàn thành giai đoạn, toàn bộ checklist thuộc giai đoạn phải Đạt hoặc Không áp dụng.", BLUE),
        ("3", "Đúng thời gian", "Ngày kết thúc kế hoạch không được trước ngày bắt đầu; các mốc có người phụ trách và thời hạn rõ ràng.", GREEN),
    ]
    for i, (num, title, body, color) in enumerate(gate_cards):
        x = 60 + i * 246
        c.setFillColor(color)
        c.roundRect(x, 138, 220, 102, 9, stroke=0, fill=1)
        c.setFillColor(Color(1, 1, 1, alpha=.18))
        c.circle(x + 190, 208, 25, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont("GuideSans-Bold", 15)
        c.drawString(x + 18, 211, num)
        c.setFont("GuideSans-Bold", 10.5)
        c.drawString(x + 18, 190, title)
        text_block(c, body, x + 18, 172, 184, 7.8, WHITE, leading=10)
    c.showPage()

    # 6. Seven tabs and progress
    page_shell(c, 6, "Quản lý dự án", "Làm việc theo 7 tab hồ sơ", "Mỗi tab phục vụ một nhóm nghiệp vụ")
    tabs = [
        ("Tổng quan", "Thông tin nền, phân công, nguồn vốn và thời gian.", "folder", TEAL),
        ("Giai đoạn", "Trạng thái và kế hoạch của 6 giai đoạn.", "clock", TEAL),
        ("Pháp lý", "18 điều kiện kiểm soát và căn cứ hồ sơ.", "shield", BLUE),
        ("Tiến độ", "Mốc công việc, người phụ trách và hạn xử lý.", "clock", BLUE),
        ("Liên kết", "Công việc, Thẩm định, GPMB và Lưu trữ.", "link", GREEN),
        ("Vướng mắc", "Rủi ro, mức độ, người xử lý và kết quả.", "risk", AMBER),
        ("Lịch sử", "Người cập nhật, thời điểm và nội dung thay đổi.", "report", NAVY),
    ]
    for i, (title, body, icon, color) in enumerate(tabs):
        col = i % 4
        row = i // 4
        x = 36 + col * 195
        y = 345 - row * 130
        section_card(c, x, y, 180, 110, title, body, icon, color, WHITE, f"{i+1:02d}")
    rounded_box(c, 36, 92, 765, 105, fill=NAVY, stroke=NAVY, radius=12)
    c.setFillColor(WHITE)
    c.setFont("GuideSans-Bold", 12)
    c.drawString(60, 167, "CÁCH TÍNH TIẾN ĐỘ HỒ SƠ")
    badge(c, "65% GIAI ĐOẠN", 60, 122, TEAL, WHITE, 9.5, 12, 25)
    badge(c, "+", 190, 122, HexColor("#476474"), WHITE, 10, 10, 25)
    badge(c, "35% CHECKLIST", 226, 122, BLUE, WHITE, 9.5, 12, 25)
    badge(c, "= TIẾN ĐỘ TỔNG HỢP", 365, 122, GREEN, WHITE, 9.5, 12, 25)
    text_block(c, "Giai đoạn Đang thực hiện được tính 50%; checklist chỉ tính các mục Đạt hoặc Không áp dụng.", 575, 148, 195, 8.2, HexColor("#DDECF0"), leading=11)
    c.showPage()

    # 7. Daily operation
    page_shell(c, 7, "Quản lý dự án", "Thao tác cập nhật hằng ngày", "Tập trung vào mốc, vướng mắc và liên kết")
    image_card(c, project_hub, 36, 265, 410, 240, "Danh sách hồ sơ và chỉ số điều hành")
    section_card(c, 470, 397, 335, 108, "Cập nhật mốc tiến độ", "Thêm tên mốc, giai đoạn, người phụ trách, thời hạn và trạng thái. Khi hoàn thành, cập nhật kết quả đúng kỳ.", "clock", TEAL, WHITE, "01")
    section_card(c, 470, 265, 335, 108, "Ghi nhận vướng mắc", "Chọn mức độ, người xử lý, hạn xử lý và cập nhật hướng giải quyết. Rủi ro Cao/Nghiêm trọng được đưa vào chỉ số cảnh báo.", "risk", AMBER, WHITE, "02")
    rounded_box(c, 36, 86, 769, 150, fill=WHITE, stroke=LINE, radius=11)
    c.setFont("GuideSans-Bold", 12)
    c.setFillColor(NAVY)
    c.drawString(58, 211, "QUY TRÌNH CẬP NHẬT ĐỀ XUẤT")
    daily = [
        ("1", "Mở đúng hồ sơ", "Kiểm tra mã và tên dự án."),
        ("2", "Cập nhật nghiệp vụ", "Checklist, mốc hoặc vướng mắc."),
        ("3", "Kiểm tra cổng", "Đúng thứ tự và đủ điều kiện."),
        ("4", "Lưu hồ sơ", "Hệ thống ghi lịch sử tự động."),
        ("5", "Theo dõi liên kết", "Đối chiếu Công việc, GPMB, Lưu trữ."),
    ]
    for i, (num, title, body) in enumerate(daily):
        x = 58 + i * 145
        c.setFillColor(TEAL if i < 2 else BLUE if i < 4 else GREEN)
        c.circle(x + 14, 167, 14, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont("GuideSans-Bold", 9)
        c.drawCentredString(x + 14, 164, num)
        c.setFillColor(INK)
        c.setFont("GuideSans-Bold", 8.8)
        c.drawString(x, 141, title)
        text_block(c, body, x, 126, 123, 7.5, MUTED, leading=9.5)
    c.showPage()

    # 8. Create appraisal
    page_shell(c, 8, "Thẩm định dự án", "Khởi tạo hồ sơ thẩm định", "Hồ sơ luôn gắn với một dự án trong danh mục")
    image_card(c, appraisal_form, 365, 122, 440, 388, "Biểu mẫu tạo hồ sơ thẩm định")
    steps = [
        ("Tiếp nhận", "Chọn dự án, nhập mã hồ sơ, nội dung và giai đoạn thẩm định."),
        ("Thiết lập thời hạn", "Ngày tiếp nhận, hạn thẩm định và trạng thái ban đầu."),
        ("Phân công", "Chọn chủ trì, người phối hợp, công việc và hồ sơ nguồn."),
        ("Đánh giá", "Thực hiện checklist và ghi căn cứ cho từng nội dung."),
        ("Lấy ý kiến", "Giao đơn vị/người xử lý, đặt hạn và ghi nhận phản hồi."),
        ("Kết luận", "Cấp có quyền ghi kết luận và chuyển trạng thái cuối."),
    ]
    yy = 486
    for i, (title, body) in enumerate(steps, 1):
        c.setFillColor(BLUE)
        c.roundRect(38, yy - 18, 30, 30, 7, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont("GuideSans-Bold", 9)
        c.drawCentredString(53, yy - 7, f"{i:02d}")
        c.setFillColor(INK)
        c.setFont("GuideSans-Bold", 10)
        c.drawString(80, yy + 1, title)
        yy = text_block(c, body, 80, yy - 14, 250, 8.1, MUTED, leading=10.7) - 14
    c.showPage()

    # 9. Appraisal pipeline
    page_shell(c, 9, "Thẩm định dự án", "Checklist, lấy ý kiến và kết luận", "Dấu vết xử lý được ghi tự động")
    pipeline = [
        ("check", "1. Checklist thẩm định", "Pháp lý - Quy hoạch - Mục tiêu - GPMB - Kỹ thuật - Vốn - Hiệu quả - Rủi ro", TEAL),
        ("users", "2. Lấy ý kiến phối hợp", "Chọn đơn vị/người xử lý, thời hạn, trạng thái và nội dung phản hồi.", BLUE),
        ("report", "3. Kết luận/kiến nghị", "Chỉ cấp có thẩm quyền được kết luận Đạt hoặc Không đạt.", GREEN),
    ]
    for i, (icon, title, body, color) in enumerate(pipeline):
        x = 40 + i * 262
        rounded_box(c, x, 315, 235, 168, fill=WHITE, stroke=LINE, radius=12, shadow=True)
        c.setFillColor(color)
        c.circle(x + 36, 440, 22, stroke=0, fill=1)
        draw_simple_icon(c, icon, x + 36, 440, WHITE, .8)
        c.setFont("GuideSans-Bold", 11)
        c.setFillColor(INK)
        c.drawString(x + 68, 443, title)
        text_block(c, body, x + 22, 404, 190, 8.4, MUTED, leading=11.5)
        if i < 2:
            arrow(c, x + 237, 399, x + 260, color)
    rounded_box(c, 40, 92, 760, 185, fill=WHITE, stroke=LINE, radius=12)
    c.setFont("GuideSans-Bold", 12)
    c.setFillColor(NAVY)
    c.drawString(62, 248, "TRẠNG THÁI VÀ CÁCH HIỂU")
    statuses = [
        ("Đang chuẩn bị", "Hồ sơ mới tiếp nhận, đang hoàn thiện thông tin.", TEAL_PALE, TEAL),
        ("Đang thẩm định", "Đang đánh giá checklist và lấy ý kiến.", BLUE_PALE, BLUE),
        ("Chờ bổ sung", "Có nội dung cần chủ đầu tư hoặc đơn vị bổ sung.", AMBER_PALE, AMBER),
        ("Đã kết luận", "Đã có kết luận chính thức của người có thẩm quyền.", GREEN_PALE, GREEN),
        ("Không đạt", "Hồ sơ không đáp ứng yêu cầu thẩm định.", RED_PALE, RED),
    ]
    for i, (title, body, fill, color) in enumerate(statuses):
        x = 62 + (i % 3) * 245
        y = 176 - (i // 3) * 68
        rounded_box(c, x, y, 224, 54, fill=fill, stroke=fill, radius=8)
        c.setFillColor(color)
        c.setFont("GuideSans-Bold", 9)
        c.drawString(x + 12, y + 35, title)
        text_block(c, body, x + 12, y + 20, 198, 7.4, INK, leading=9)
    c.showPage()

    # 10. Permissions
    page_shell(c, 10, "Phân quyền", "Ai được làm gì trong phân hệ?", "Quyền giao diện và quyền máy chủ được kiểm tra đồng thời")
    headers = ["Vai trò", "Phạm vi xem", "Tạo hồ sơ", "Cập nhật", "Kết luận thẩm định", "Xóa"]
    rows = [
        ["Admin", "Toàn hệ thống", "Có", "Toàn quyền", "Có", "Có"],
        ["Ban giám đốc", "Toàn hệ thống", "Có", "Toàn hệ thống", "Có", "Không"],
        ["Trưởng phòng", "Trong phòng/được giao", "Có", "Toàn hồ sơ trong phòng", "Có, trong phòng", "Không"],
        ["Phó phòng", "Trong phòng/được giao", "Có", "Toàn hồ sơ trong phòng", "Có, trong phòng", "Không"],
        ["Trưởng bộ phận/nhóm", "Trong phòng/được giao", "Có", "Hồ sơ trong phòng", "Không", "Không"],
        ["Nhân viên", "Chỉ hồ sơ được giao", "Không", "Phần nghiệp vụ được giao", "Không", "Không"],
    ]
    x0, y_top = 36, 488
    widths = [130, 147, 76, 170, 140, 72]
    row_h = 49
    c.setFillColor(NAVY)
    c.roundRect(x0, y_top - 34, sum(widths), 34, 8, stroke=0, fill=1)
    x = x0
    for header, w in zip(headers, widths):
        c.setFillColor(WHITE)
        c.setFont("GuideSans-Bold", 8.5)
        c.drawCentredString(x + w / 2, y_top - 22, header)
        x += w
    for ridx, row in enumerate(rows):
        y = y_top - 34 - (ridx + 1) * row_h
        fill = WHITE if ridx % 2 == 0 else HexColor("#F0F6F8")
        c.setFillColor(fill)
        c.rect(x0, y, sum(widths), row_h, stroke=0, fill=1)
        c.setStrokeColor(LINE)
        c.line(x0, y, x0 + sum(widths), y)
        x = x0
        for cidx, (value, w) in enumerate(zip(row, widths)):
            font = "GuideSans-Bold" if cidx == 0 else "GuideSans"
            color = NAVY if cidx == 0 else GREEN if value == "Có" else RED if value == "Không" else INK
            lines = wrap_lines(value, font, 7.8, w - 12)
            yy = y + row_h / 2 + (len(lines) - 1) * 4
            c.setFont(font, 7.8)
            c.setFillColor(color)
            for line in lines:
                c.drawCentredString(x + w / 2, yy, line)
                yy -= 10
            x += w
    rounded_box(c, 36, 72, 765, 86, fill=AMBER_PALE, stroke=HexColor("#F0D49A"), radius=10)
    c.setFont("GuideSans-Bold", 10)
    c.setFillColor(HexColor("#8A5A08"))
    c.drawString(55, 133, "LƯU Ý QUAN TRỌNG")
    text_block(c, "Admin có thể bật/tắt toàn phân hệ theo vai trò trong Cấu hình hệ thống. Khi đã vào được phân hệ, hồ sơ vẫn tiếp tục được lọc theo phòng, người phụ trách và người tham gia. Nhân viên không được thay đổi thông tin nền, giai đoạn hoặc kết luận chính thức.", 55, 115, 720, 8.3, INK, leading=11)
    c.showPage()

    # 11. Scenarios
    page_shell(c, 11, "Tình huống", "Bốn tình huống sử dụng thường gặp", "Chọn đúng hồ sơ và đúng phạm vi quyền")
    scenarios = [
        ("A", "Mở giai đoạn tiếp theo", "Hoàn thành checklist của giai đoạn hiện tại -> chuyển giai đoạn hiện tại sang Hoàn thành -> mở giai đoạn kế tiếp.", TEAL, "clock"),
        ("B", "Hồ sơ thẩm định cần bổ sung", "Đánh dấu mục checklist Cần bổ sung -> ghi rõ căn cứ -> chuyển trạng thái Chờ bổ sung -> theo dõi phản hồi.", AMBER, "check"),
        ("C", "Phát sinh vướng mắc dự án", "Mở tab Vướng mắc -> ghi nội dung, mức độ, người xử lý và hạn -> cập nhật hướng xử lý cho đến khi Đã xử lý.", RED, "risk"),
        ("D", "Nhân viên được giao phối hợp", "Mở hồ sơ được phân công -> cập nhật checklist/mốc/vướng mắc hoặc phản hồi -> không đổi dữ liệu nền hay kết luận.", BLUE, "users"),
    ]
    for i, (letter, title, body, color, icon) in enumerate(scenarios):
        col = i % 2
        row = i // 2
        x = 40 + col * 392
        y = 305 - row * 195
        rounded_box(c, x, y, 365, 166, fill=WHITE, stroke=LINE, radius=12, shadow=True)
        c.setFillColor(color)
        c.roundRect(x, y, 66, 166, 12, stroke=0, fill=1)
        c.setFillColor(Color(1, 1, 1, alpha=.18))
        c.circle(x + 33, y + 118, 22, stroke=0, fill=1)
        draw_simple_icon(c, icon, x + 33, y + 118, WHITE, .8)
        c.setFillColor(WHITE)
        c.setFont("GuideSans-Bold", 18)
        c.drawCentredString(x + 33, y + 35, letter)
        c.setFillColor(INK)
        c.setFont("GuideSans-Bold", 11)
        c.drawString(x + 85, y + 132, title)
        text_block(c, body, x + 85, y + 109, 250, 8.5, MUTED, leading=12)
        badge(c, "ĐÚNG QUY TRÌNH", x + 85, y + 27, color, WHITE, 7.5, 9, 19)
    c.showPage()

    # 12. Checklist and troubleshooting
    page_shell(c, 12, "Hoàn tất", "Kiểm tra trước khi lưu và xử lý lỗi", "Giảm sai sót - tăng độ tin cậy dữ liệu")
    rounded_box(c, 36, 285, 360, 220, fill=WHITE, stroke=LINE, radius=12)
    c.setFont("GuideSans-Bold", 12)
    c.setFillColor(NAVY)
    c.drawString(58, 477, "CHECKLIST TRƯỚC KHI LƯU")
    checks = [
        "Đúng dự án, đúng mã hồ sơ và không bị trùng.",
        "Người phụ trách/chủ trì đang hoạt động và đúng phòng.",
        "Ngày kết thúc không trước ngày bắt đầu/tiếp nhận.",
        "Giai đoạn trước đã hoàn thành trước khi mở giai đoạn sau.",
        "Checklist có kết quả và căn cứ rõ ràng.",
        "Mốc tiến độ, vướng mắc và người xử lý đã được cập nhật.",
        "Kết luận thẩm định do đúng cấp có thẩm quyền thực hiện.",
    ]
    yy = 446
    for item in checks:
        draw_simple_icon(c, "check", 63, yy + 1, GREEN, .48)
        yy = text_block(c, item, 79, yy + 5, 290, 8.3, INK, leading=11) - 10

    rounded_box(c, 415, 285, 390, 220, fill=WHITE, stroke=LINE, radius=12)
    c.setFont("GuideSans-Bold", 12)
    c.setFillColor(NAVY)
    c.drawString(437, 477, "KHI HỆ THỐNG KHÔNG CHO LƯU")
    errors = [
        ("Không có quyền", "Kiểm tra quyền phân hệ, liên kết nhân sự và phòng làm việc."),
        ("Sai cổng giai đoạn", "Hoàn thành giai đoạn trước và xử lý checklist chưa đạt."),
        ("Dữ liệu không hợp lệ", "Kiểm tra mã trùng, ngày tháng, người phụ trách và liên kết hồ sơ."),
        ("Máy chủ chưa hỗ trợ", "Frontend và Edge Function phải được phát hành đồng bộ."),
    ]
    yy = 444
    for title, body in errors:
        c.setFillColor(RED_PALE)
        c.circle(442, yy + 1, 10, stroke=0, fill=1)
        c.setFillColor(RED)
        c.setFont("GuideSans-Bold", 9)
        c.drawCentredString(442, yy - 2, "!")
        c.setFillColor(INK)
        c.setFont("GuideSans-Bold", 8.8)
        c.drawString(461, yy + 5, title)
        yy = text_block(c, body, 461, yy - 9, 315, 7.7, MUTED, leading=10) - 12

    rounded_box(c, 36, 82, 769, 165, fill=NAVY, stroke=NAVY, radius=12)
    c.setFillColor(HexColor("#76D4DC"))
    c.setFont("GuideSans-Bold", 14)
    c.drawString(62, 215, "QUY TẮC VẬN HÀNH AN TOÀN")
    safe_rules = [
        "Không dùng chung tài khoản; mọi lịch sử được ghi theo người đăng nhập.",
        "Cập nhật hồ sơ ngay khi phát sinh thay đổi, không chờ đến cuối kỳ.",
        "Không thay đổi dữ liệu nền khi chỉ được giao phối hợp nghiệp vụ.",
        "Luôn kiểm tra trạng thái đồng bộ trước khi đóng màn hình sau khi lưu.",
    ]
    yy = 184
    for i, rule in enumerate(safe_rules, 1):
        c.setFillColor(TEAL)
        c.circle(68, yy + 1, 9, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont("GuideSans-Bold", 7.5)
        c.drawCentredString(68, yy - 1.5, str(i))
        yy = text_block(c, rule, 86, yy + 4, 685, 8.6, WHITE, leading=11.5) - 8
    c.setFont("GuideSans-Bold", 9)
    c.setFillColor(HexColor("#A6DCE1"))
    c.drawRightString(PAGE_W - 56, 96, "Frontend 3.4.143  |  Edge Function 2026.11.13.2")
    c.showPage()

    c.save()
    return OUTPUT


if __name__ == "__main__":
    build_pdf()
    print("output/pdf/huong-dan-du-an-dau-tu-cong.pdf")

