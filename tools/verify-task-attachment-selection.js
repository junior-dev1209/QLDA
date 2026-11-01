const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const start = client.indexOf("function renderTaskAttachmentSelection(");
const end = client.indexOf("\nfunction renderTaskAttachmentDraft(", start);
assert.notEqual(start, -1, "Thiếu hàm hiển thị tệp đã chọn.");
assert.notEqual(end, -1, "Không tìm thấy điểm kết thúc hàm xem trước.");

class FakeElement {
  constructor() {
    this.children = [];
    this.classList = { hidden: true, toggle: (_name, hidden) => { this.classList.hidden = hidden; } };
    this.textContent = "";
  }
  replaceChildren() { this.children = []; }
  append(...children) { this.children.push(...children); }
}

const preview = new FakeElement();
const sandbox = {
  byId: () => preview,
  document: { createElement: () => new FakeElement() },
  formatFileSize: (size) => `${size} B`,
};
vm.createContext(sandbox);
vm.runInContext(client.slice(start, end), sandbox);

sandbox.renderTaskAttachmentSelection([
  { name: "Bao cao.pdf", size: 1200 },
  { name: "<script>.docx", size: 800 },
]);
assert.equal(preview.classList.hidden, false);
assert.equal(preview.children[0].textContent, "Đã chọn 2 tệp");
assert.deepEqual(Array.from(preview.children[1].children, (item) => item.textContent), [
  "Bao cao.pdf · 1200 B",
  "<script>.docx · 800 B",
]);

sandbox.renderTaskAttachmentSelection([]);
assert.equal(preview.classList.hidden, true, "Ẩn xem trước khi chưa chọn tệp.");
assert.match(html, /id="taskAttachmentSelection"/);
assert.match(client, /byId\("taskAttachments"\)\.addEventListener\("change"/);
assert.match(css, /\.task-attachment-selection/);

console.log("task_attachment_selection=passed");
