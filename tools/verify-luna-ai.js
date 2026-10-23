const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("index.html", "utf8");
const assistant = fs.readFileSync("virtual-assistant.js", "utf8");
const styles = fs.readFileSync("virtual-assistant.css", "utf8");
const runtime = fs.readFileSync("script.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261022010000_luna_ai_rate_limit.sql", "utf8");

for (const asset of [
  "luna-flower.webp",
  "luna-cake.webp",
  "luna-notes.webp",
  "luna-research.webp",
  "luna-happy.webp",
  "luna-outfit-festival.webp",
  "luna-outfit-rose.webp",
  "luna-outfit-aodai-heritage.png",
  "luna-outfit-anniversary.webp",
]) {
  assert.ok(fs.statSync(`assets/${asset}`).size > 1000, `Ảnh Luna ${asset} bị thiếu hoặc quá nhỏ.`);
  assert.ok(worker.includes(`"assets/${asset}"`), `Service worker chưa cache ${asset}.`);
  assert.ok(assistant.includes(`"assets/${asset}"`), `Luna chưa dùng ảnh ${asset}.`);
}

for (const theme of ["default", "tet", "national-day", "anniversary", "women-day", "vietnamese-women-day", "new-year", "hung-kings", "vietnamese-culture-day", "reunification-day", "children-day", "martyrs-day", "august-revolution", "custom"]) {
  assert.ok(assistant.includes(`${theme}:`) || assistant.includes(`"${theme}":`), `Chưa ánh xạ trang phục chủ đề ${theme}.`);
}
assert.match(runtime, /phuc-thinh-theme-change/);
assert.match(assistant, /notice\.id\.startsWith\("birthday:"\) \? "cake"/);
assert.match(assistant, /: "notes";/);
assert.match(assistant, /moodExpressions/);
assert.doesNotMatch(html, /assistant-ai-privacy|AI dùng khi online/);
assert.doesNotMatch(styles, /\.assistant-ai-privacy/);
assert.match(html, /Hỏi Luna về công việc, quy trình, nhân sự/);

assert.match(assistant, /sharedJsonRequest\("luna-ai"/);
assert.match(assistant, /function cancelLunaAiRequest\(\)/, "Yêu cầu AI phải được hủy khi tài khoản đổi.");
assert.match(assistant, /signal: controller\.signal/, "Lệnh gọi AI phải hỗ trợ hủy theo phiên tài khoản.");
assert.match(assistant, /aiRequestController === controller/, "Yêu cầu cũ không được mở khóa hoặc ghi đè trạng thái của yêu cầu mới.");
assert.match(assistant, /appendMessage\("assistant", reply\)/, "AI trả lời phải được hiển thị dạng text, không chèn HTML từ mô hình.");
assert.match(assistant, /AI Luna cần kết nối hệ thống online/);
assert.match(edge, /action === "luna-ai"/);
assert.match(edge, /await requireSession\(request, current\)/);
assert.match(edge, /message\.length > 500/);
assert.match(edge, /admin\.rpc\("kpi_luna_ai_allow_request"/);
assert.match(edge, /visibleState\(state, account\)/, "Ngữ cảnh AI phải xuất phát từ dữ liệu máy chủ đã lọc quyền.");
assert.match(edge, /gender: lunaPlainText\(ownPerson\?\.gender \|\| account\.gender, 20\)/, "AI chỉ nhận giới tính của chính nhân sự gắn với tài khoản để xưng hô phù hợp.");
assert.match(edge, /Luôn xưng em; gọi người dùng là anh nếu account\.gender là Nam, chị nếu là Nữ/, "AI phải dùng đúng đại từ xưng hô theo giới tính đã biết.");
assert.match(edge, /visibleTaskProjectIds[\s\S]*canViewProjectCatalog \|\| visibleTaskProjectIds\.has\(recordId\(project\)\)/, "Danh mục dự án gửi cho AI phải đúng phạm vi tra cứu được phép.");
assert.match(edge, /https:\/\/api\.openai\.com\/v1\/responses/);
assert.match(edge, /Authorization: `Bearer \$\{lunaAiApiKey\}`/);
assert.match(edge, /store: false/);
assert.doesNotMatch(edge.slice(edge.indexOf('if (action === "luna-ai"'), edge.indexOf('if (action === "luna-announcement"')), /tools\s*:/, "AI không được cấp công cụ tự thao tác dữ liệu.");
assert.doesNotMatch(assistant, /OPENAI_API_KEY|sk-[A-Za-z0-9]{20,}/, "Không để khóa OpenAI trong mã phía trình duyệt.");
assert.match(migration, /enable row level security/i);
assert.match(migration, /revoke all on function[\s\S]*?from public, anon, authenticated/i);
assert.match(migration, /grant execute[\s\S]*?to service_role/i);

console.log("luna_ai=passed");
