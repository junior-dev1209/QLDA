const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("document-templates.js", "utf8");
const css = fs.readFileSync("document-templates.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const assets = [
  "pdf.min.mjs", "pdf.worker.min.mjs", "pdf-lib.min.js", "docxtemplater.min.js",
  "pizzip.min.js", "tesseract.min.js", "worker.min.js", "vie.traineddata.gz",
];

assert.match(html, /id="documentTemplateDialog"/, "Thiếu hộp thoại mẫu văn bản.");
assert.match(html, /accept="[^"]*\.pdf[^"]*\.docx[^"]*\.png[^"]*\.jpg/, "Bộ chọn tệp phải chỉ quảng bá định dạng được hỗ trợ.");
assert.doesNotMatch(html.match(/id="documentTemplateFile"[^>]*>/)?.[0] || "", /\.tiff?|image\/tiff/i, "Không hiện TIFF khi chưa hỗ trợ.");
assert.match(html, /document-templates\.js\?v=/, "Thiếu mô-đun mẫu văn bản có phiên bản.");
assert.match(html, /document-templates\.css\?v=/, "Thiếu CSS mẫu văn bản có phiên bản.");
assert.match(html, /lưu riêng theo tài khoản trên trình duyệt này/, "Cần nói rõ mẫu lưu trên thiết bị hiện tại.");
assert.match(app, /indexedDB\.open\("phuc-thinh-document-templates"/, "Mẫu cần lưu bền vững bằng IndexedDB.");
assert.match(app, /item\.accountKey === state\.accountKey/, "Danh sách mẫu phải tách theo tài khoản.");
assert.match(app, /30 \* 1024 \* 1024/, "Tệp cần có giới hạn dung lượng.");
assert.match(app, /import\("\.\/assets\/document-tools\/pdf\.min\.mjs"\)/, "PDF.js phải được tải cục bộ khi cần.");
assert.match(app, /createWorker\("vie"/, "OCR phải cấu hình ngôn ngữ tiếng Việt.");
assert.match(app, /langPath: new URL\("", base\)\.href/, "Dữ liệu OCR cần phục vụ cục bộ.");
assert.match(app, /function addOverlayField/, "PDF/ảnh cần hỗ trợ đặt trường thủ công.");
assert.match(app, /function suggestPdfTextFields/, "PDF có lớp chữ cần gợi ý trường từ nội dung.");
assert.match(app, /doc\.render\(values\)/, "DOCX cần thay thế các placeholder khi tạo văn bản.");
assert.match(app, /function fillPdf/, "Cần có luồng xuất PDF đã điền.");
assert.match(app, /function fillImage/, "Ảnh scan cần xuất được thành PDF đã điền.");
assert.doesNotMatch(app, /https?:\/\//i, "Tài liệu không được gửi tới CDN/dịch vụ ngoài.");
assert.match(css, /\.document-template-modal/, "Thiếu kiểu giao diện của hộp thoại.");
assert.match(worker, /"document-templates\.js"/, "Service worker cần cache mã tính năng.");
assert.match(worker, /"document-templates\.css"/, "Service worker cần cache kiểu giao diện.");

for (const asset of assets) {
  const file = path.join("assets", "document-tools", asset);
  assert.ok(fs.existsSync(file) && fs.statSync(file).size > 0, `Thiếu tài nguyên xử lý cục bộ: ${asset}`);
}

console.log("document_templates=passed (PDF/DOCX/image, local Vietnamese OCR, per-account storage)");
