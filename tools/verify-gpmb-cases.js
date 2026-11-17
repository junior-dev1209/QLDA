const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261110000000_gpmb_cases.sql", "utf8");

[
  'id="openGpmbCaseManager"',
  'id="gpmbCaseManagerDialog"',
  'id="gpmbCaseWorkflowFilter"',
  'id="gpmbCaseStatusFilter"',
  'id="gpmbCaseSearch"',
  'id="gpmbCaseList"',
  'id="openGpmbCaseCreate"',
  'id="gpmbCaseFormDialog"',
  'id="gpmbCaseWorkflowId"',
  'id="gpmbCaseCurrentStep"',
  'id="gpmbCaseNote"',
  'id="gpmbCaseNoteHistory"',
].forEach((marker) => assert.ok(html.includes(marker), `Thiếu giao diện Hồ sơ GPMB: ${marker}`));

[
  '"gpmbCases"',
  'function normalizeGpmbCases',
  'function gpmbCaseById',
  'function openGpmbCaseManagerDialog',
  'function openGpmbCaseFormDialog',
  'function saveGpmbCase',
  'function deleteGpmbCase',
  'function renderGpmbCases',
  'function gpmbCaseNoteHistory',
  'function renderGpmbCaseNoteHistory',
  'data-open-gpmb-cases-workflow',
  'linkedCases.forEach',
].forEach((marker) => assert.ok(client.includes(marker), `Thiếu xử lý Hồ sơ GPMB ở giao diện: ${marker}`));

assert.match(client, /gpmbCaseEnabledSteps\(workflow\)/, "Hồ sơ phải chỉ liên kết được với bước hợp lệ của đợt GPMB.");
assert.match(client, /record\.workflowId === workflow\.id/, "Danh sách đợt phải hiển thị tổng hồ sơ theo đúng đợt GPMB.");
assert.match(client, /canDeleteGpmbCase\(record\).*?isAdmin\(\)/s, "Chỉ Admin được xóa hồ sơ GPMB.");
assert.match(client, /function gpmbCasesOnlineSyncSupported\(\)[\s\S]*?usingSupabaseSync\(\)[\s\S]*?GPMB_CASES_DEPLOYMENT_VERSION/, "Giao diện phải chặn máy chủ online chưa hỗ trợ Hồ sơ GPMB.");
assert.match(client, /noteHistory: noteHistory\.slice\(-GPMB_CASE_NOTE_HISTORY_LIMIT\)/, "Mỗi lần đổi nội dung vướng mắc phải được lưu vào lịch sử có giới hạn an toàn.");
assert.match(client, /relatedGpmbCases = isGpmbWorkflowTask\(task\)[\s\S]*?record\.workflowId[\s\S]*?task\.gpmbWorkflowId/, "Chi tiết công việc GPMB phải lấy hồ sơ hộ\/thửa cùng đợt quy trình.");
assert.match(client, /currentStepCaseCount[\s\S]*?Đang ở bước công việc này/, "Hồ sơ đúng bước phải được nhận diện rõ trong công việc GPMB.");
assert.match(html, /gpmb-case-manager-modal/, "Thiếu màn hình quản lý hồ sơ GPMB chuyên biệt.");

[
  '"gpmbCases"',
  '"gpmb_cases"',
  'function normalizeGpmbCase',
  'function synchronizeGpmbCaseWorkflowLinks',
  'if (collection === "gpmbCases") return canManageGpmbWorkflow',
  'if (collection === "gpmbCases") return isAdmin(actor);',
  'gpmbCases: gpmbWorkflowAllowed ? records(state, "gpmbCases") : []',
  'serverUpdatedGpmbCaseIds',
  'serverDeletedGpmbCaseIds',
].forEach((marker) => assert.ok(edge.includes(marker), `Thiếu kiểm soát Hồ sơ GPMB ở máy chủ: ${marker}`));

assert.match(edge, /projectId: String\(workflow\.projectId \|\| ""\)/, "Máy chủ phải lấy dự án từ đợt GPMB thay vì tin dữ liệu từ trình duyệt.");
assert.match(edge, /gpmbCaseEnabledSteps\(workflow\)/, "Máy chủ phải kiểm tra bước xử lý thuộc đợt GPMB.");
assert.match(edge, /duplicate = records\(state, "gpmbCases"\)/, "Máy chủ phải chặn trùng mã hồ sơ trong cùng đợt.");
assert.match(edge, /function gpmbCaseNoteHistory[\s\S]*?gpmbCaseNoteHistoryLimit/, "Máy chủ phải chuẩn hóa lịch sử ghi chú Hồ sơ GPMB.");
assert.match(edge, /note !== previousNote[\s\S]*?createdBy: String\(actor\.displayName \|\| actor\.username/, "Máy chủ phải tự ghi người và thời điểm thay đổi ghi chú.");
assert.match(edge, /noteHistory: noteHistory\.slice\(-gpmbCaseNoteHistoryLimit\)/, "Máy chủ phải lưu lịch sử ghi chú đã chuẩn hóa.");

[
  'create table if not exists public.gpmb_cases',
  'gpmb_cases_workflow_id_idx',
  'gpmb_cases_status_idx',
  'alter table public.gpmb_cases enable row level security',
  'revoke all on table public.gpmb_cases from anon, authenticated',
].forEach((marker) => assert.ok(migration.includes(marker), `Migration Hồ sơ GPMB thiếu: ${marker}`));

assert.match(css, /\.gpmb-case-toolbar \{[\s\S]*?grid-template-columns:/, "Thiếu bộ lọc gọn cho Hồ sơ GPMB.");
assert.match(css, /\.gpmb-case-card-grid \{[\s\S]*?grid-template-columns:/, "Thiếu bố cục thông tin hộ/thửa theo hàng rõ ràng.");
assert.match(css, /\.gpmb-case-note-history-item \{[\s\S]*?border-left:/, "Lịch sử ghi chú phải có bố cục dễ đọc.");
assert.match(css, /\.task-related-gpmb-list \{[\s\S]*?grid-template-columns:/, "Hồ sơ GPMB liên quan trong công việc phải có bố cục đáp ứng.");
assert.match(css, /@media \(max-width: 560px\) \{[\s\S]*?\.gpmb-case-form \{ grid-template-columns: 1fr; \}/, "Biểu mẫu Hồ sơ GPMB chưa tối ưu cho mobile.");

console.log("gpmb_cases=passed");
