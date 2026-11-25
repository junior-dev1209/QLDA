(() => {
"use strict";
const FEATURE_VERSION = "3.4.192";

function resetTaskProjectCatalogForm() {
  const form = byId("taskProjectCatalogForm");
  if (!form) return;
  form.reset();
  byId("taskProjectCatalogId").value = "";
}

function renderTaskProjectCatalog() {
  renderTaskProjectOptions();
  const panel = byId("taskProjectCatalogPanel");
  if (!panel) return;
  const canManage = canManageProjectCatalog();
  const canView = canViewProjectCatalog();
  panel.classList.toggle("is-hidden", !canView);
  byId("openTaskProjectCatalog").textContent = canManage ? "Quản lý dự án" : "Danh mục dự án";
  byId("taskProjectCatalogForm").classList.toggle("is-hidden", !canManage);
  if (!canView) return;
  const projects = taskProjectOptions();
  const search = normalizeSearchText(byId("taskProjectCatalogSearch")?.value || "");
  const visibleProjects = search
    ? projects.filter((project) => normalizeSearchText(project.label).includes(search))
    : projects;
  byId("taskProjectCatalogDialogTitle").textContent = canManage ? "Quản lý tên dự án" : "Danh mục dự án";
  byId("taskProjectCatalogNote").textContent = projects.length
    ? `${projects.length} dự án đang được dùng làm tên chuẩn cho công việc.`
    : "Chưa có dự án. Thêm dự án để liên kết khi tạo công việc.";
  byId("taskProjectCatalogList").innerHTML = visibleProjects.length
    ? visibleProjects
        .map(
          (project) => `
            <div class="project-catalog-item">
              <button class="project-catalog-project-link" type="button" data-open-project-tasks="${escapeHtml(project.value)}" title="Xem công việc thuộc dự án ${escapeHtml(project.label)}">${escapeHtml(project.label)}</button>
              ${canManage ? `<div class="project-catalog-actions">
                <button class="ghost" type="button" data-edit-task-project="${escapeHtml(project.value)}">Sửa</button>
                <button class="ghost project-catalog-delete" type="button" data-delete-task-project="${escapeHtml(project.value)}" title="Xóa dự án" aria-label="Xóa dự án ${escapeHtml(project.label)}">X</button>
              </div>` : ""}
            </div>
          `,
        )
        .join("")
    : search
      ? '<p class="muted">Không tìm thấy dự án phù hợp.</p>'
      : '<p class="muted">Chưa có tên dự án trong danh mục.</p>';
}

function openTaskProjectCatalogDialog() {
  if (!canViewProjectCatalog()) return;
  byId("taskProjectCatalogSearch").value = "";
  renderTaskProjectCatalog();
  const dialog = byId("taskProjectCatalogDialog");
  dialog.classList.remove("is-hidden");
  dialog.setAttribute("aria-hidden", "false");
  (canManageProjectCatalog() ? byId("taskProjectCatalogName") : byId("taskProjectCatalogSearch")).focus();
}

function editTaskProjectCatalog(projectId) {
  if (!canManageProjectCatalog()) return;
  const project = projectById(projectId);
  if (!project) return;
  byId("taskProjectCatalogId").value = project.id;
  byId("taskProjectCatalogName").value = project.name;
  byId("taskProjectCatalogName").focus();
  byId("taskProjectCatalogName").scrollIntoView({ behavior: "smooth", block: "center" });
}

function deleteTaskProjectCatalog(projectId) {
  if (!canManageProjectCatalog()) {
    alert("Tài khoản hiện tại không có quyền xóa dự án trong danh mục.");
    return;
  }
  const project = projectById(projectId);
  if (!project) return;
  const linkedAppraisalCount = (state.publicInvestmentAppraisals || []).filter((record) => record.projectId === project.id).length;
  if (linkedAppraisalCount) {
    alert(`Không thể xóa dự án đang được liên kết với ${linkedAppraisalCount} hồ sơ thẩm định. Hãy chuyển hoặc xóa hồ sơ thẩm định trước.`);
    return;
  }
  const linkedManagementCount = (state.publicInvestmentProjects || []).filter((record) => record.projectId === project.id).length;
  if (linkedManagementCount) {
    alert(`Không thể xóa dự án đang có hồ sơ quản lý thực hiện. Hãy xử lý hồ sơ dự án số trước.`);
    return;
  }
  const linkedTaskCount = state.tasks.filter((task) => projectIdForTask(task) === project.id).length;
  const linkedTaskNote = linkedTaskCount
    ? ` ${linkedTaskCount} công việc đã liên kết vẫn được giữ nguyên để tra cứu lịch sử.`
    : "";
  if (!confirm(`Xóa dự án "${project.name}" khỏi danh mục?${linkedTaskNote}`)) return;
  registerDeletedId(project.id);
  state.projectCatalog = state.projectCatalog.filter((item) => item.id !== project.id);
  logActivity({
    action: "Xóa dự án khỏi danh mục",
    module: "Công việc",
    targetType: "project-catalog",
    targetId: project.id,
    title: project.name,
    details: linkedTaskCount
      ? `Xóa khỏi danh mục; giữ lại ${linkedTaskCount} công việc đã liên kết để tra cứu.`
      : "Xóa khỏi danh mục dự án.",
  });
  saveState();
  resetTaskProjectCatalogForm();
  renderAll();
}

function saveTaskProjectCatalog(event) {
  event.preventDefault();
  if (!canManageProjectCatalog()) {
    alert("Tài khoản hiện tại không có quyền cập nhật danh mục dự án.");
    return;
  }
  const projectId = String(byId("taskProjectCatalogId").value || "").trim();
  const name = normalizedProjectCatalogName(byId("taskProjectCatalogName").value);
  if (!name) return;
  const duplicate = (state.projectCatalog || []).find(
    (project) => project.id !== projectId && projectCatalogNameKey(project.name) === projectCatalogNameKey(name),
  );
  if (duplicate) {
    alert("Tên dự án này đã có trong danh mục.");
    return;
  }
  const actor = currentActorInfo();
  const timestamp = new Date().toISOString();
  const existing = projectId ? projectById(projectId) : null;
  const savedProject = existing
    ? {
        ...existing,
        name,
        updatedAt: timestamp,
        updatedById: actor.id,
        updatedByName: actor.name,
      }
    : {
        id: uid("project"),
        name,
        createdAt: timestamp,
        createdById: actor.id,
        createdByName: actor.name,
        updatedAt: timestamp,
        updatedById: actor.id,
        updatedByName: actor.name,
      };
  state.projectCatalog = existing
    ? state.projectCatalog.map((project) => (project.id === existing.id ? savedProject : project))
    : [...state.projectCatalog, savedProject];
  logActivity({
    action: existing ? "Cập nhật danh mục dự án" : "Thêm dự án vào danh mục",
    module: "Công việc",
    targetType: "project-catalog",
    targetId: savedProject.id,
    title: savedProject.name,
    details: existing ? `Đổi tên dự án thành ${savedProject.name}.` : `Thêm dự án ${savedProject.name}.`,
  });
  saveState();
  resetTaskProjectCatalogForm();
  renderAll();
}

let initialized = false;
function initialize() {
  if (initialized) return;
  initialized = true;
  byId("taskProjectCatalogForm").addEventListener("submit", saveTaskProjectCatalog);
  byId("resetTaskProjectCatalogForm").addEventListener("click", resetTaskProjectCatalogForm);
  byId("taskProjectCatalogSearch").addEventListener("input", renderTaskProjectCatalog);
  byId("taskProjectCatalogList").addEventListener("click", (event) => {
    const projectTaskListId = event.target.closest("[data-open-project-tasks]")?.dataset.openProjectTasks;
    if (projectTaskListId) {
      openProjectTaskList(projectTaskListId);
      return;
    }
    const editProjectId = event.target.closest("[data-edit-task-project]")?.dataset.editTaskProject;
    if (editProjectId) {
      editTaskProjectCatalog(editProjectId);
      return;
    }
    const deleteProjectId = event.target.closest("[data-delete-task-project]")?.dataset.deleteTaskProject;
    if (deleteProjectId) deleteTaskProjectCatalog(deleteProjectId);
  });
}

globalThis.QldaFeatures.register("tasks-catalog", FEATURE_VERSION, { resetTaskProjectCatalogForm, renderTaskProjectCatalog, openTaskProjectCatalogDialog, initialize });
})();
