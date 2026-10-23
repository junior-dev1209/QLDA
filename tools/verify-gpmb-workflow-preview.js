const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const client = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const edge = fs.readFileSync("supabase/functions/kpi-sync/index.ts", "utf8");
const clientDataSource = fs.readFileSync("gpmb-workflow-data.js", "utf8");
const edgeDataSource = fs.readFileSync("supabase/functions/kpi-sync/gpmb-workflow-template.ts", "utf8");
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
  'id="gpmbWorkflowResettlementRequired"',
  'id="gpmbWorkflowDetailResettlementRequired"',
].forEach((marker) => assert.ok(html.includes(marker), `Thiếu giao diện quy trình GPMB: ${marker}`));

assert.ok(!html.includes('id="gpmbWorkflowRulesTitle"'), "Quy trình GPMB phải được chuyển khỏi mục Quy chế.");

assert.ok(!html.includes('data-view="gpmb-workflow-preview"'), "Quy trình GPMB không được nằm ở màn hình dùng thử riêng.");
assert.ok(!html.includes('id="gpmb-workflow-preview"'), "Màn hình dùng thử GPMB cũ phải được loại khỏi giao diện.");
assert.ok(html.includes("Hệ thống tự động tuần tự giao công việc các bước theo quy trình khi bước trước được duyệt Đạt"), "Hướng dẫn tạo đợt GPMB phải nêu đúng cơ chế tự động giao bước tiếp theo.");
assert.ok(!html.includes("Hệ thống chỉ tạo công việc của bước 01."), "Không được giữ lại hướng dẫn tạo bước 01 cũ.");

const clientData = JSON.parse(clientDataSource.slice(clientDataSource.indexOf("Object.freeze(") + "Object.freeze(".length, clientDataSource.lastIndexOf(");")));
const edgeData = JSON.parse(edgeDataSource.slice(edgeDataSource.indexOf("= [") + 2, edgeDataSource.indexOf(" satisfies readonly")));
assert.deepEqual(clientData, edgeData, "Mẫu quy trình trên giao diện và máy chủ phải khớp từng bước.");
assert.equal(clientData.length, 106, "Quy trình Excel phải có đủ 106 bước.");
assert.deepEqual(Object.fromEntries(["I", "II", "III", "IV"].map((phase) => [phase, clientData.filter((step) => step.phase === phase).length])), { I: 32, II: 33, III: 22, IV: 19 }, "Số bước theo từng giai đoạn phải khớp nội dung đánh số trong Excel.");
assert.ok(clientData.every((step) => step.title && step.category && Number(step.days) >= 1), "Mỗi bước phải có nội dung, danh mục và thời lượng kế hoạch.");
assert.ok(clientData.every((step) => ["source", "planning-default"].includes(step.durationBasis)), "Mốc thời lượng phải phân biệt quy định trong Excel và thời lượng mặc định.");
assert.ok(clientData.some((step) => step.legalBasis) && clientData.some((step) => step.deliverable) && clientData.some((step) => step.notes), "Mẫu cần giữ căn cứ, sản phẩm và ghi chú từ Excel.");
const legacyTemplateStart = client.indexOf("const GPMB_LEGACY_WORKFLOW_TEMPLATE");
const legacyTemplateEnd = client.indexOf("const GPMB_WORKFLOW_TEMPLATE", legacyTemplateStart);
assert.equal((client.slice(legacyTemplateStart, legacyTemplateEnd).match(/\bid: "/g) || []).length, 16, "Các đợt quy trình cũ cần giữ lại 16 bước để bảo toàn lịch sử.");
assert.match(client, /function normalizeGpmbTaskCategories/, "Công việc GPMB cũ phải được chuẩn hóa danh mục theo bước.");
assert.match(edge, /gpmbTemplateByStepId\(task\.gpmbStepId, workflow\)\?\.category/, "Máy chủ phải xác định danh mục theo đúng phiên bản quy trình.");
assert.ok(clientData.some((step) => step.activationKey === "noCooperation"), "Nhánh không phối hợp chưa được cấu hình.");
assert.ok(clientData.some((step) => step.activationKey === "resettlementRequired"), "Nhánh tái định cư chưa được cấu hình.");
assert.ok(clientData.some((step) => step.activationKey === "noHandover" && step.activationValue === true), "Nhánh không bàn giao chưa được cấu hình.");
assert.ok(client.includes("migrateTaskCategoriesForCatalogChange") && edge.includes("migrateTaskCategoriesForCatalogChange"), "Danh mục cũ phải được ánh xạ sang mục cùng vị trí đã chỉnh sửa ở cả client và server.");
assert.ok(!client.includes("const nextCategory = matchedCategory || categories[0]"), "Không được tự chuyển nhiệm vụ sang danh mục đầu tiên khi không có ánh xạ.");

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
assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.gpmb-workflow-step-row \{[\s\S]*?grid-template-columns: 42px minmax\(0, 1fr\);/, "Bảng điều hành GPMB chưa tối ưu cho mobile.");

console.log("gpmb_workflow=passed");
