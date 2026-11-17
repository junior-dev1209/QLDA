const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261111000000_public_investment_appraisals.sql", "utf8");

[
  'data-view="public-investment-projects"',
  'data-public-investment-workspace="appraisal"',
  'id="publicInvestmentAppraisalWorkspace"',
  'id="publicInvestmentAppraisalMetrics"',
  'id="publicInvestmentAppraisalList"',
  'id="publicInvestmentAppraisalDialog"',
  'id="publicInvestmentAppraisalProjectId"',
  'id="publicInvestmentAppraisalChecklist"',
  'id="publicInvestmentAppraisalOpinionList"',
  'id="publicInvestmentAppraisalConclusion"',
  'id="printPublicInvestmentAppraisal"',
].forEach((marker) => assert.ok(html.includes(marker), `Thiếu giao diện thẩm định: ${marker}`));
assert.ok(!html.includes('data-view="public-investment-appraisal"'), "Thẩm định không được còn là một mục điều hướng tách biệt.");

[
  '"publicInvestmentAppraisals"',
  'PUBLIC_INVESTMENT_LEGACY_APPRAISAL_VIEW',
  'PUBLIC_INVESTMENT_HUB_VIEW',
  'function setPublicInvestmentWorkspace',
  'PUBLIC_INVESTMENT_APPRAISAL_CHECKLIST',
  'function normalizePublicInvestmentAppraisals',
  'function canViewPublicInvestmentAppraisal',
  'function canConcludePublicInvestmentAppraisal',
  'function renderPublicInvestmentAppraisals',
  'function savePublicInvestmentAppraisal',
  'function printPublicInvestmentAppraisalReport',
  'PUBLIC_INVESTMENT_APPRAISAL_DEPLOYMENT_VERSION',
].forEach((marker) => assert.ok(client.includes(marker), `Thiếu xử lý giao diện thẩm định: ${marker}`));

assert.match(client, /dueDate < receivedDate/, "Giao diện phải chặn thời hạn trước ngày tiếp nhận.");
assert.match(client, /normalizePublicInvestmentAppraisalChecklist/, "Checklist phải được chuẩn hóa theo mẫu cố định.");
assert.match(client, /reportWindow\.onafterprint = \(\) => reportWindow\.close\(\)/, "Cửa sổ báo cáo phải tự đóng sau khi in.");

[
  '"publicInvestmentAppraisals"',
  '"public_investment_appraisals"',
  'function normalizePublicInvestmentAppraisal',
  'function canViewPublicInvestmentAppraisalRecord',
  'function canUpdatePublicInvestmentAppraisalRecord',
  'function canConcludePublicInvestmentAppraisalRecord',
  'if (collection === "publicInvestmentAppraisals") return canUpdatePublicInvestmentAppraisalRecord',
  'if (collection === "publicInvestmentAppraisals") return isAdmin(actor)',
  'publicInvestmentAppraisals: moduleIsAvailableToAccount',
].forEach((marker) => assert.ok(edge.includes(marker), `Thiếu kiểm soát máy chủ thẩm định: ${marker}`));
assert.match(edge, /canManagePublicInvestmentAppraisalRecord[\s\S]*?moduleIsAvailableToAccount\(state, actor, "public-investment-projects"\)/, "Thẩm định phải dùng chung quyền phân hệ Dự án đầu tư công.");

assert.match(edge, /duplicate = records\(state, "publicInvestmentAppraisals"\)/, "Máy chủ phải chặn trùng mã hồ sơ.");
assert.match(edge, /personIsActive\(lead\)/, "Máy chủ phải kiểm tra người chủ trì còn hoạt động.");
assert.match(edge, /archiveRecordIds\.every/, "Máy chủ phải kiểm tra hồ sơ lưu trữ liên kết.");
assert.match(edge, /history\.push\(\{[\s\S]*?createdById:/, "Máy chủ phải tự ghi lịch sử thao tác.");

[
  'create table if not exists public.public_investment_appraisals',
  'public_investment_appraisals_code_idx',
  'public_investment_appraisals_project_id_idx',
  'public_investment_appraisals_department_id_idx',
  'alter table public.public_investment_appraisals enable row level security',
  'revoke all on table public.public_investment_appraisals from anon, authenticated',
].forEach((marker) => assert.ok(migration.includes(marker), `Migration thẩm định thiếu: ${marker}`));

assert.match(css, /\.appraisal-metrics \{[\s\S]*?grid-template-columns:/, "Thiếu số liệu tổng hợp hồ sơ.");
assert.match(css, /\.appraisal-checklist-row \{[\s\S]*?grid-template-columns:/, "Thiếu bố cục checklist rõ ràng.");
assert.match(css, /@media \(max-width: 600px\) \{[\s\S]*?\.appraisal-record/, "Phân hệ chưa có bố cục mobile.");

console.log("public_investment_appraisal=passed");
