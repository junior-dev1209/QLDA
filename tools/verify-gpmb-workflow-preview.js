const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261007000000_gpmb_workflows.sql", "utf8");

[
  'id="tasks"',
  'id="taskManagementShortcuts"',
  'id="gpmbWorkflowPanel"',
  'id="openGpmbWorkflowManager"',
  'id="gpmbWorkflowManagerDialog"',
  'id="gpmbWorkflowManagerTitle"',
  'id="openGpmbWorkflowCreate"',
  'id="gpmbWorkflowList"',
  'id="gpmbWorkflowDefaultCollaborators"',
  'id="gpmbWorkflowCreateDialog"',
  'id="gpmbWorkflowEditDialog"',
  'id="gpmbWorkflowEditForm"',
  'id="gpmbWorkflowDetailDialog"',
  'id="gpmbWorkflowDetailSteps"',
].forEach((marker) => assert.ok(html.includes(marker), `Thiếu giao diện quy trình GPMB: ${marker}`));

assert.ok(!html.includes('id="gpmbWorkflowRulesTitle"'), "Quy trình GPMB phải được chuyển khỏi mục Quy chế.");

assert.ok(!html.includes('data-view="gpmb-workflow-preview"'), "Quy trình GPMB không được nằm ở màn hình dùng thử riêng.");
assert.ok(!html.includes('id="gpmb-workflow-preview"'), "Màn hình dùng thử GPMB cũ phải được loại khỏi giao diện.");
assert.ok(html.includes("Hệ thống tự động tuần tự giao công việc các bước theo quy trình khi bước trước được duyệt Đạt"), "Hướng dẫn tạo đợt GPMB phải nêu đúng cơ chế tự động giao bước tiếp theo.");
assert.ok(!html.includes("Hệ thống chỉ tạo công việc của bước 01."), "Không được giữ lại hướng dẫn tạo bước 01 cũ.");

const templateStart = client.indexOf("const GPMB_WORKFLOW_TEMPLATE");
const templateEnd = client.indexOf("const customFieldScopes", templateStart);
const template = client.slice(templateStart, templateEnd);
const edgeTemplateStart = edge.indexOf("const gpmbWorkflowTemplate = [");
const edgeTemplateEnd = edge.indexOf("\n] as const;", edgeTemplateStart);
const edgeTemplate = edge.slice(edgeTemplateStart, edgeTemplateEnd);
assert.equal((template.match(/\bid: "/g) || []).length, 16, "Quy trình GPMB phải có đúng 16 bước.");
const gpmbKpiCategories = {
  plan: "Điều tra, kiểm đếm đất đai / Trích đo, quy chủ",
  meeting: "Niêm yết công khai / Đối thoại / Lấy ý kiến",
  notice: "Niêm yết công khai / Đối thoại / Lấy ý kiến",
  survey: "Điều tra, kiểm đếm đất đai / Trích đo, quy chủ",
  "draft-plan": "Lập / Thẩm định / Phê duyệt phương án bồi thường",
  disclosure: "Niêm yết công khai / Đối thoại / Lấy ý kiến",
  consultation: "Niêm yết công khai / Đối thoại / Lấy ý kiến",
  appraisal: "Lập / Thẩm định / Phê duyệt phương án bồi thường",
  approval: "Lập / Thẩm định / Phê duyệt phương án bồi thường",
  "approval-disclosure": "Niêm yết công khai / Đối thoại / Lấy ý kiến",
  "send-plan": "Niêm yết công khai / Đối thoại / Lấy ý kiến",
  payment: "Chi trả tiền đền bù / Bàn giao mặt bằng / Xử lý đơn thư",
  "recovery-decision": "Xác minh nguồn gốc / Thông báo thu hồi đất",
  persuasion: "Niêm yết công khai / Đối thoại / Lấy ý kiến",
  handover: "Niêm yết công khai / Đối thoại / Lấy ý kiến",
  "land-management": "Chi trả tiền đền bù / Bàn giao mặt bằng / Xử lý đơn thư",
};
for (const [stepId, expectedCategory] of Object.entries(gpmbKpiCategories)) {
  for (const source of [template, edgeTemplate]) {
    const line = source.split("\n").find((item) => item.includes(`{ id: "${stepId}"`));
    assert.ok(line, `Thiếu bước ${stepId} trong cấu hình quy trình.`);
    assert.ok(line.includes(`category: "${expectedCategory}"`), `Sai danh mục KPI của bước ${stepId}.`);
  }
}
assert.match(client, /function normalizeGpmbTaskCategories/, "Công việc GPMB cũ phải được chuẩn hóa danh mục theo bước.");
assert.match(edge, /const category = gpmbWorkflowTemplate\.find\(\(step\) => step\.id === String\(task\.gpmbStepId \|\| ""\)\)\?\.category/, "Máy chủ phải chuẩn hóa danh mục các công việc GPMB đã sinh.");
assert.match(template, /conditionalDays: 60/, "Nhánh đối thoại phải có thời hạn 60 ngày khi phát sinh.");
assert.match(template, /activationKey: "noCooperation"/, "Nhánh không đồng thuận chưa được cấu hình.");
assert.match(template, /activationKey: "noHandover"/, "Nhánh chưa bàn giao đất chưa được cấu hình.");

[
  'gpmbWorkflows',
  'function normalizeGpmbWorkflows',
  'function canManageGpmbWorkflows',
  'function canAdjustGpmbWorkflowTimeline',
  'function gpmbWorkflowCollaboratorIds',
  'function gpmbWorkflowTaskFromStep',
  'function ensureGpmbWorkflowProgressionLocally',
  'function renderGpmbWorkflows',
  'function createGpmbWorkflow',
  'function openGpmbWorkflowEditDialog',
  'function saveGpmbWorkflowInfo',
  'function deleteGpmbWorkflow',
  'function saveGpmbWorkflowDetail',
].forEach((marker) => assert.ok(client.includes(marker), `Thiếu xử lý GPMB phía giao diện: ${marker}`));
assert.match(client, /if \(usingSupabaseSync\(\)\) return false;/, "Khi online, trình duyệt không được tự ý chuyển bước GPMB.");
assert.match(client, /isGpmbWorkflowTask\(task\)/, "Công việc GPMB phải được nhận diện để khoá chỉnh sửa cấu trúc.");
assert.match(client, /hasDepartmentTaskAccess\(\)/, "Trưởng bộ phận/trưởng nhóm và trưởng-phó phòng phải được thao tác quy trình GPMB.");
assert.match(client, /renderGpmbWorkflows\(\);[\s\S]*?renderTaskBoard/, "Quy trình GPMB phải được hiển thị trong mục Công việc.");
assert.match(client, /data-edit-gpmb-workflow/, "Quản lý GPMB phải có thao tác sửa đợt.");
assert.match(client, /data-delete-gpmb-workflow/, "Quản lý GPMB phải có thao tác xóa đợt.");

[
  '"gpmbWorkflows"',
  '"gpmb_workflows"',
  'function normalizeGpmbWorkflow',
  'function advanceGpmbWorkflows',
  'function canAdjustGpmbWorkflowTimeline',
  'function gpmbCollaboratorIds',
  'function gpmbWorkflowTaskChangeAllowed',
  'function synchronizeGpmbWorkflowTaskLinks',
  'completedTaskStatus(activeTask.status)',
  'String(activeTask.completionReviewStatus || "") === "passed"',
  'if (collection === "gpmbWorkflows") return canManageGpmbWorkflow',
  'if (collection === "gpmbWorkflows") return isAdmin(actor);',
  'serverGeneratedTaskIds',
  'serverUpdatedGpmbWorkflowIds',
  'gpmbWorkflows: true,',
].forEach((marker) => assert.ok(edge.includes(marker), `Thiếu kiểm soát GPMB trên máy chủ: ${marker}`));
assert.match(edge, /moduleIsAvailableToAccount\(state, actor, "tasks"\)[\s\S]*?hasDepartmentTaskAccess\(actor\)/, "Máy chủ phải cấp quyền điều hành GPMB cho các cấp quản lý trong mục Công việc.");
assert.match(edge, /canAdjustTimeline = !previous \|\| canAdjustGpmbWorkflowTimeline\(actor\)/, "Máy chủ phải chỉ cho Ban lãnh đạo/Admin điều chỉnh thời hạn GPMB sau khi khởi tạo.");
assert.match(edge, /canAdjustCore = !previous \|\| isAdmin\(actor\) \|\| isDirector\(actor\)/, "Ban lãnh đạo phải được sửa thông tin nền tảng của đợt GPMB.");
assert.match(edge, /if \(collection === "gpmbWorkflows"\) return isAdmin\(actor\);/, "Chỉ Admin được xóa đợt GPMB.");
assert.match(edge, /const gpmbTaskLinks = synchronizeGpmbWorkflowTaskLinks\(next, actor\);/, "Máy chủ phải đồng bộ hoặc xóa kèm công việc GPMB theo đợt.");
assert.match(edge, /gpmbWorkflows: gpmbWorkflowAllowed \? records\(state, "gpmbWorkflows"\) : \[\]/, "Nhân viên không được nhận dữ liệu quy trình GPMB.");

[
  'create table if not exists public.gpmb_workflows',
  'alter table public.gpmb_workflows enable row level security',
  'revoke all on table public.gpmb_workflows from anon, authenticated',
].forEach((marker) => assert.ok(migration.includes(marker), `Migration GPMB chưa đủ: ${marker}`));

assert.match(css, /\.gpmb-workflow-step-row \{[\s\S]*?grid-template-columns:/, "Bảng điều hành GPMB chưa có bố cục rõ ràng.");
assert.match(css, /\.gpmb-workflow-collaborator-list/, "Thiếu danh sách tích chọn người phối hợp GPMB.");
assert.match(css, /\.gpmb-workflow-create-form \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/, "Biểu mẫu tạo đợt GPMB chưa giãn đều hai cột.");
assert.match(css, /@media \(max-width: 560px\) \{[\s\S]*?\.gpmb-workflow-create-form \{ grid-template-columns: 1fr; \}/, "Biểu mẫu tạo đợt GPMB chưa thu gọn một cột trên mobile.");
assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.gpmb-workflow-step-row \{[\s\S]*?grid-template-columns: 31px minmax\(0, 1fr\);/, "Bảng điều hành GPMB chưa tối ưu cho mobile.");

console.log("gpmb_workflow=passed");
