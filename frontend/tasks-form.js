(() => {
"use strict";
const FEATURE_VERSION = "3.4.192";

function ensureTaskOwnerOption(task) {
  const select = byId("taskOwner");
  const ownerId = String(task?.ownerId || "").trim();
  if (!select || !ownerId || Array.from(select.options).some((option) => option.value === ownerId)) return;
  const person = personById(ownerId) || personById(taskParticipantPersonId(ownerId));
  const label = person
    ? `${person.name} - ${roleById(person.roleId)?.name || "Chưa rõ vị trí"}`
    : String(task?.ownerName || "Người thực hiện hiện tại");
  const option = document.createElement("option");
  option.value = ownerId;
  option.textContent = label;
  select.append(option);
}

function selectedTaskCollaboratorIds() {
  return uniquePersonIds(
    Array.from(byId("taskCollaborators")?.querySelectorAll('input[type="checkbox"]:checked') || []).map((input) => input.value),
  ).filter((id) => id !== byId("taskOwner").value);
}

function updateTaskCollaboratorSummary() {
  const summary = byId("taskCollaboratorSummary");
  const container = byId("taskCollaborators");
  if (!summary || !container) return;
  const selectedIds = selectedTaskCollaboratorIds();
  const optionCount = container.querySelectorAll('input[type="checkbox"]').length;
  if (!optionCount) {
    summary.textContent = "Không có người phối hợp phù hợp";
    return;
  }
  summary.textContent = selectedIds.length ? `Đã chọn ${selectedIds.length} người phối hợp` : "Chọn người phối hợp";
}

function updateTaskOwnerSummary() {
  const select = byId("taskOwner");
  const summary = byId("taskOwnerSummary");
  if (!select || !summary) return;
  const option = Array.from(select.options).find((item) => item.value === select.value);
  summary.textContent = option?.value ? option.textContent || "Chọn người thực hiện" : "Chọn người thực hiện";
}

function filterTaskOwnerOptions() {
  const container = byId("taskOwnerOptions");
  const searchInput = byId("taskOwnerSearch");
  const emptyState = byId("taskOwnerSearchEmpty");
  if (!container || !searchInput) return;
  const query = normalizeSearchText(searchInput.value);
  let visibleCount = 0;
  container.querySelectorAll(".task-owner-option").forEach((option) => {
    const visible = !query || normalizeSearchText(option.textContent).includes(query);
    option.classList.toggle("is-hidden", !visible);
    if (visible) visibleCount += 1;
  });
  emptyState?.classList.toggle("is-hidden", !query || visibleCount > 0);
}

function resetTaskOwnerSearch() {
  const input = byId("taskOwnerSearch");
  if (input) input.value = "";
  filterTaskOwnerOptions();
}

function isTaskOwnerPickerOpen() {
  const panel = byId("taskOwnerPanel");
  return !!panel && !panel.classList.contains("is-hidden");
}

function setTaskOwnerPickerOpen(open) {
  const picker = byId("taskOwnerPicker");
  const panel = byId("taskOwnerPanel");
  const toggle = byId("taskOwnerToggle");
  if (!picker || !panel || !toggle) return;
  const shouldOpen = Boolean(open) && !picker.classList.contains("is-disabled");
  picker.classList.toggle("is-open", shouldOpen);
  panel.classList.toggle("is-hidden", !shouldOpen);
  toggle.setAttribute("aria-expanded", String(shouldOpen));
  if (!shouldOpen) {
    resetTaskOwnerSearch();
    return;
  }
  setTaskCollaboratorPickerOpen(false);
  requestAnimationFrame(() => byId("taskOwnerSearch")?.focus());
}

function updateTaskOwnerOptions() {
  const select = byId("taskOwner");
  const container = byId("taskOwnerOptions");
  if (!select || !container) return;
  const selectedId = String(select.value || "");
  const options = Array.from(select.options)
    .filter((option) => option.value)
    .map((option) => ({ value: option.value, label: option.textContent || "Nhân sự" }));
  container.classList.toggle("is-empty", !options.length);
  container.innerHTML = options.length
    ? options.map((option) => `
        <label class="checkbox-option task-owner-option">
          <input type="radio" name="taskOwnerChoice" value="${escapeHtml(option.value)}" ${option.value === selectedId ? "checked" : ""}>
          <span>${escapeHtml(option.label)}</span>
        </label>
      `).join("")
    : "<span>Không có nhân sự phù hợp.</span>";
  updateTaskOwnerSummary();
  filterTaskOwnerOptions();
}

function filterTaskCollaboratorOptions() {
  const container = byId("taskCollaborators");
  const searchInput = byId("taskCollaboratorSearch");
  const emptyState = byId("taskCollaboratorSearchEmpty");
  if (!container || !searchInput) return;
  const query = normalizeSearchText(searchInput.value);
  let visibleCount = 0;
  container.querySelectorAll(".checkbox-option").forEach((option) => {
    const visible = !query || normalizeSearchText(option.textContent).includes(query);
    option.classList.toggle("is-hidden", !visible);
    if (visible) visibleCount += 1;
  });
  emptyState?.classList.toggle("is-hidden", !query || visibleCount > 0);
}

function resetTaskCollaboratorSearch() {
  const input = byId("taskCollaboratorSearch");
  if (input) input.value = "";
  filterTaskCollaboratorOptions();
}

function isTaskCollaboratorPickerOpen() {
  const panel = byId("taskCollaboratorPanel");
  return !!panel && !panel.classList.contains("is-hidden");
}

function setTaskCollaboratorPickerOpen(open) {
  const picker = byId("taskCollaboratorPicker");
  const panel = byId("taskCollaboratorPanel");
  const toggle = byId("taskCollaboratorToggle");
  if (!picker || !panel || !toggle) return;
  const shouldOpen = Boolean(open) && !picker.classList.contains("is-disabled");
  picker.classList.toggle("is-open", shouldOpen);
  panel.classList.toggle("is-hidden", !shouldOpen);
  toggle.setAttribute("aria-expanded", String(shouldOpen));
  if (!shouldOpen) {
    resetTaskCollaboratorSearch();
    return;
  }
  requestAnimationFrame(() => byId("taskCollaboratorSearch")?.focus());
}

function updateTaskCategoryOptions(selectedValue, ownerSelectId = "taskOwner", categorySelectId = "taskCategory") {
  const select = byId(categorySelectId);
  const ownerId = byId(ownerSelectId).value;
  const options = taskCategoryOptionsForPerson(ownerId);
  const selectedCandidates = [selectedValue, select.value].filter((value) => value && !String(value).startsWith("Chọn người được giao"));
  const requested = selectedCandidates[0] || "";
  const optionRows = options.map((category) => ({ value: category, label: category }));
  const preserveLegacyCategory = Boolean(byId("taskId")?.value);
  if (preserveLegacyCategory && requested && !options.some((category) => normalizeSearchText(category) === normalizeSearchText(requested))) {
    optionRows.unshift({ value: requested, label: `${requested} (danh mục cũ, chưa có mục thay thế)` });
  }
  if (!optionRows.length) {
    optionRows.push({
      value: "",
      label: ownerId ? "Chức vụ chưa có danh mục nhiệm vụ được cấu hình" : "Chọn người được giao để lấy danh mục nhiệm vụ",
    });
  }
  const selected = requested && optionRows.some((option) => option.value === requested) ? requested : options[0] || "";
  fillSelect(select, optionRows, selected);
  if (!options.length && select.options[0]) select.options[0].disabled = true;
}

function updateTaskCollaboratorOptions(selectedValues = []) {
  const container = byId("taskCollaborators");
  updateTaskOwnerOptions();
  const ownerId = byId("taskOwner").value;
  const selectedIds = uniquePersonIds(selectedValues.length ? selectedValues : selectedTaskCollaboratorIds()).filter((id) => id !== ownerId);
  const taskPeople = visiblePeopleForTasks();
  const peopleWithSelected = [...taskPeople];
  selectedIds.forEach((personId) => {
    const person = personById(personId);
    if (person && !peopleWithSelected.some((item) => item.id === person.id)) {
      peopleWithSelected.unshift(person);
    }
  });
  const options = peopleWithSelected
    .filter((person) => person.id !== ownerId)
    .map((person) => ({
      value: person.id,
      label: `${person.name} - ${roleById(person.roleId)?.name || "Chưa rõ vị trí"}`,
    }));
  container.classList.toggle("is-empty", !options.length);
  container.innerHTML = options.length
    ? options
        .map(
          (option) => `
            <label class="checkbox-option">
              <input type="checkbox" value="${escapeHtml(option.value)}" ${selectedIds.includes(String(option.value)) ? "checked" : ""}>
              <span>${escapeHtml(option.label)}</span>
            </label>
          `,
        )
        .join("")
    : '<span>Không có nhân sự phối hợp phù hợp.</span>';
  updateTaskCollaboratorSummary();
  filterTaskCollaboratorOptions();
}

function renderTaskProjectOptions() {
  const options = [{ value: "", label: "Chưa chọn danh mục dự án" }, ...taskProjectOptions()];
  ["taskProjectId"].forEach((selectId) => {
    const select = byId(selectId);
    if (!select) return;
    const selected = select.value;
    fillSelect(select, options, selected);
  });
}

function renderTaskDependencyOptions(selectedIds = [], currentTaskId = byId("taskId")?.value || "") {
  const list = byId("taskDependencies");
  if (!list) return;
  const selected = new Set((Array.isArray(selectedIds) ? selectedIds : []).map((id) => String(id || "")));
  const currentId = String(currentTaskId || "");
  const disabled = list.classList.contains("is-disabled");
  const options = state.tasks
    .filter((task) => String(task.id || "") !== currentId && canViewTaskRecord(task))
    .slice()
    .sort((left, right) => String(left.due || "9999-12-31").localeCompare(String(right.due || "9999-12-31")) || String(left.title || "").localeCompare(String(right.title || ""), "vi"));
  list.innerHTML = options.length
    ? options.map((task) => {
      const taskId = String(task.id || "");
      const checked = selected.has(taskId) ? " checked" : "";
      const inputDisabled = disabled ? " disabled" : "";
      const label = `${task.title || "Công việc chưa đặt tên"} · ${formatTaskDeadline(task) || "chưa có hạn"}`;
      return `<label class="task-dependency-option"><input type="checkbox" value="${escapeHtml(taskId)}"${checked}${inputDisabled}><span>${escapeHtml(label)}</span></label>`;
    }).join("")
    : '<p class="task-dependency-empty">Chưa có công việc phù hợp để liên kết.</p>';
}

function selectedTaskDependencyIds() {
  const list = byId("taskDependencies");
  return list ? [...list.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value).filter(Boolean) : [];
}

function syncTaskFormDialogHeading() {
  byId("taskFormDialogTitle").textContent = byId("taskId").value ? "Cập nhật công việc" : "Thêm công việc";
}

function showTaskFormDialog({ focusId = "taskTitle" } = {}) {
  const dialog = byId("taskFormDialog");
  if (!dialog) return;
  syncTaskFormDialogHeading();
  dialog.classList.remove("is-hidden");
  dialog.setAttribute("aria-hidden", "false");
  if (window.QldaFeatures) void window.QldaFeatures.load("tasks-editor").catch(() => {});
  const focusTarget = () => {
    const target = byId(focusId) || byId("taskTitle");
    if (target && !target.disabled) target.focus({ preventScroll: true });
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(focusTarget);
  else window.setTimeout(focusTarget, 0);
}

function openNewTaskFormDialog(draft = {}) {
  if (!canCreateRegularTasks()) return false;
  restoreTaskDetailInlineEditor();
  resetTaskForm();
  if (draft?.calendarEventId) {
    const event = (state.calendarEvents || []).find((item) => item.id === draft.calendarEventId);
    if (!event || !canManageCalendarEvent(event)) return false;
    calendarTaskSourceId = event.id;
    byId("taskTitle").value = `Kết luận: ${event.title}`;
    byId("taskNote").value = event.conclusion || "";
  }
  showTaskFormDialog();
  return true;
}

function populateTaskForm(task) {
  if (!task) return;
  createDraftId = "";
  taskFormGeneration++;
  renderTaskPersonOptions();
  setTaskOwnerPickerOpen(false);
  setTaskCollaboratorPickerOpen(false);
  byId("taskId").value = task.id;
  byId("taskTitle").value = task.title;
  renderTaskProjectOptions();
  byId("taskProjectId").value = projectIdForTask(task);
  ensureTaskOwnerOption(task);
  byId("taskOwner").value = task.ownerId;
  updateTaskCollaboratorOptions(taskCollaboratorIds(task));
  updateTaskCategoryOptions(task.category);
  byId("taskWorkType").value = normalizeTaskWorkType(task);
  byId("taskPriority").value = normalizeTaskPriority(task.priority);
  byId("taskRecurrence").value = normalizeTaskRecurrence(task);
  byId("taskStartDate").value = task.startDate || "";
  byId("taskDue").value = task.due;
  byId("taskDueTime").value = task.dueTime || "";
  byId("taskStatus").value = editableTaskStatus(task);
  byId("taskProgress").value = task.progress;
  byId("taskQualityPercent").value = normalizeTaskQualityInput(task.qualityPercent);
  byId("taskNote").value = task.note || "";
  byId("taskFollowUpDate").value = task.followUpDate || "";
  byId("taskBlockerStatus").value = normalizeTaskBlockerStatus(task.blockerStatus);
  byId("taskBlockerNote").value = task.blockerNote || task.deadlineExtensionReason || "";
  renderTaskDependencyOptions(taskDependencyIds(task), task.id);
  updateTaskResponseMeta(task);
  byId("taskAttachments").value = "";
  renderTaskAttachmentSelection();
  taskAttachmentDraft = [...(task.attachments || [])];
  renderTaskAttachmentDraft();
  updateTaskFormLock(task);
  renderCustomFieldsForScope("tasks");
  applyFieldCustomizations();
}

function renderTaskProgressReportList(targetId, task) {
  const container = byId(targetId);
  if (!container) return;
  container.innerHTML = taskProgressReportRowsHtml(task);
}

function updateTaskResponseMeta(task) {
  const taskProgressMeta = byId("taskProgressMeta");
  if (!task) {
    taskProgressMeta.textContent = "";
    taskProgressMeta.dataset.baseText = "";
    renderTaskProgressReportList("taskProgressReportList", null);
    return;
  }
  const taskLatestReport = latestTaskProgressReport(task);
  taskProgressMeta.textContent = taskLatestReport
    ? `Cập nhật gần nhất lúc ${formatDateTime(taskLatestReport.createdAt)} bởi ${taskLatestReport.createdBy || "người thực hiện"}: ${formatScore(taskLatestReport.progress)}%.`
    : "Chưa có cập nhật tiến độ.";
  taskProgressMeta.dataset.baseText = taskProgressMeta.textContent;
  renderTaskProgressReportList("taskProgressReportList", task);
}

function updateTaskDeadlineExtensionNotice(task = null) {
  const notice = byId("taskDeadlineExtensionNotice");
  if (!notice) return;
  const existingTask = task || state.tasks.find((item) => item.id === byId("taskId").value);
  const followUpDate = String(byId("taskFollowUpDate").value || "");
  const dueDate = String(byId("taskDue").value || existingTask?.due || "");
  const exceedsDue = Boolean(followUpDate && dueDate && followUpDate > dueDate);
  const pending = taskDeadlineExtensionPending(existingTask);
  notice.classList.remove("is-pending");
  let message = "";
  if (pending) {
    notice.classList.add("is-pending");
    message = `Đề nghị dời hạn đến ${formatDate(existingTask.deadlineExtensionRequestedDue) || "mốc mới"} đang chờ Trưởng/Phó phòng duyệt. Hạn hiện tại ${formatTaskDeadline(existingTask) || "vẫn được giữ nguyên"}; tiến độ công việc chưa bị đổi hạn.`;
  } else if (exceedsDue && isGpmbWorkflowTask(existingTask)) {
    message = "Công việc GPMB không gia hạn tại đây. Hãy điều chỉnh thời hạn bước trong Quản lý GPMB để đồng bộ lịch quy trình.";
  } else if (exceedsDue) {
    message = "Mốc cập nhật vượt Ngày hoàn thành. Hãy ghi căn cứ gia hạn trong Nội dung trở ngại / đề nghị hỗ trợ; hạn chỉ đổi sau khi Trưởng/Phó phòng duyệt.";
  } else if (existingTask?.deadlineExtensionStatus === "approved") {
    notice.classList.add("is-pending");
    message = `Mốc mới đã được chấp nhận. Ngày hoàn thành hiện tại: ${formatTaskDeadline(existingTask) || "chưa có"}.`;
  } else if (existingTask?.deadlineExtensionStatus === "rejected") {
    message = `Đề nghị trước chưa được chấp nhận; hạn hiện tại vẫn là ${formatTaskDeadline(existingTask) || "chưa có"}.`;
  }
  notice.textContent = message;
  notice.classList.toggle("is-hidden", !message);
}

function updateTaskFormLock(task = null) {
  const existingTask = task || state.tasks.find((item) => item.id === byId("taskId").value);
  const adminOverride = isAdmin();
  const canEditDetails = existingTask
    ? canEditTaskDetails(existingTask)
    : canCreateRegularTasks();
  const reportLockedByApproval = !!existingTask && taskProgressLockedAfterApproval(existingTask) && !adminOverride;
  const canUpdateReport = existingTask ? !reportLockedByApproval && (adminOverride || canUpdateTaskProgress(existingTask) || canEditDetails) : canEditDetails;
  const canUpdateCollaborators = existingTask ? !reportLockedByApproval && (canEditDetails || canUpdateTaskCollaborators(existingTask)) : canEditDetails;
  const canEditQuality = !!existingTask && adminOverride;
  byId("taskOwnerLabelText").textContent = "Người thực hiện";
  byId("taskNoteLabelText").textContent = "Nội dung công việc / Báo cáo tiến độ";
  byId("taskNote").placeholder = existingTask
    ? "Nội dung công việc hoặc báo cáo tiến độ cập nhật..."
    : "Nội dung công việc, báo cáo tiến độ, rủi ro, phối hợp, hồ sơ liên quan...";
  document.querySelectorAll(".regular-only").forEach((element) => {
    element.classList.remove("is-hidden");
  });
  byId("taskForm")
    .querySelectorAll("#taskTitle, #taskProjectId, #taskOwner, #taskCategory, #taskWorkType, #taskPriority, #taskRecurrence, #taskStartDate, #taskDue, #taskDueTime")
    .forEach((input) => {
      input.disabled = !canEditDetails;
    });
  const dependencyList = byId("taskDependencies");
  if (dependencyList) {
    dependencyList.classList.toggle("is-disabled", !canEditDetails);
    dependencyList.setAttribute("aria-disabled", String(!canEditDetails));
    dependencyList.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.disabled = !canEditDetails;
    });
  }
  const ownerPickerLocked = !canEditDetails || isEmployee();
  const ownerPicker = byId("taskOwnerPicker");
  if (ownerPicker) {
    ownerPicker.classList.toggle("is-disabled", ownerPickerLocked);
    ownerPicker.setAttribute("aria-disabled", String(ownerPickerLocked));
    byId("taskOwnerToggle").disabled = ownerPickerLocked;
    byId("taskOwnerSearch").disabled = ownerPickerLocked;
    if (ownerPickerLocked) setTaskOwnerPickerOpen(false);
  }
  byId("taskNote").disabled = reportLockedByApproval || (!canEditDetails && !(existingTask && canUpdateReport));
  byId("taskCollaborators")
    .querySelectorAll('input[type="checkbox"]')
    .forEach((input) => {
      input.disabled = !canUpdateCollaborators;
    });
  byId("taskCollaborators").classList.toggle("is-disabled", !canUpdateCollaborators);
  const collaboratorPicker = byId("taskCollaboratorPicker");
  if (collaboratorPicker) {
    collaboratorPicker.classList.toggle("is-disabled", !canUpdateCollaborators);
    collaboratorPicker.setAttribute("aria-disabled", String(!canUpdateCollaborators));
    if (!canUpdateCollaborators) setTaskCollaboratorPickerOpen(false);
  }
  if (isEmployee()) {
    byId("taskOwner").disabled = true;
  }
  byId("taskStatus").disabled = !canUpdateReport;
  syncTaskStatusChoices();
  byId("taskForm")
    .querySelectorAll("#taskProgress, #taskAttachments, #taskBlockerStatus, #taskBlockerNote")
    .forEach((input) => {
      input.disabled = !canUpdateReport;
    });
  const pendingDeadlineExtension = taskDeadlineExtensionPending(existingTask);
  byId("taskFollowUpDate").disabled = !canUpdateReport || pendingDeadlineExtension;
  const qualityInput = byId("taskQualityPercent");
  if (!taskCompletionIsApproved(existingTask) && !adminOverride) {
    qualityInput.value = "";
  }
  qualityInput.disabled = !canEditQuality;
  qualityInput.title = canEditQuality
    ? "Admin có thể cập nhật đánh giá chất lượng và mọi dữ liệu công việc, kể cả khi công việc đang khóa."
    : "Đánh giá chất lượng được nhập cùng kết quả Đạt tại màn hình Duyệt hoàn thành.";
  if (reportLockedByApproval) {
    const progressMeta = byId("taskProgressMeta");
    if (progressMeta) {
      const baseText = progressMeta.dataset.baseText || progressMeta.textContent || "";
      progressMeta.textContent = `${baseText ? `${baseText} ` : ""}Công việc đã được đánh giá hoàn thành là Đạt, báo cáo tiến độ đã khóa.`;
    }
  }
  byId("taskForm").querySelector("button[type='submit']").disabled = !canEditDetails && !canUpdateReport && !canEditQuality;
  updateTaskDeadlineExtensionNotice(existingTask);
}

function copiedTaskTitle(title) {
  const value = String(title || "").trim();
  return value ? `Bản sao - ${value}` : "Bản sao công việc";
}

function copyRegularTaskToForm(task) {
  resetTaskForm();
  byId("taskTitle").value = copiedTaskTitle(task.title);
  byId("taskProjectId").value = projectIdForTask(task);
  byId("taskOwner").value = task.ownerId || "";
  updateTaskCollaboratorOptions(taskCollaboratorIds(task));
  updateTaskCategoryOptions(task.category);
  byId("taskWorkType").value = normalizeTaskWorkType(task);
  byId("taskPriority").value = normalizeTaskPriority(task.priority);
  byId("taskRecurrence").value = normalizeTaskRecurrence(task);
  byId("taskStartDate").value = task.startDate || "";
  byId("taskDue").value = task.due || "";
  byId("taskDueTime").value = task.dueTime || "";
  byId("taskStatus").value = TASK_STATUS_PREPARING;
  byId("taskProgress").value = 0;
  byId("taskQualityPercent").value = "";
  byId("taskNote").value = task.note || "";
  byId("taskFollowUpDate").value = "";
  byId("taskBlockerStatus").value = "none";
  byId("taskBlockerNote").value = "";
  renderTaskDependencyOptions(taskDependencyIds(task));
  taskAttachmentDraft = [];
  byId("taskAttachments").value = "";
  renderTaskAttachmentSelection();
  updateTaskResponseMeta(null);
  renderTaskAttachmentDraft();
  updateTaskFormLock();
  renderCustomFieldsForScope("tasks");
  applyFieldCustomizations();
  focusEditForm("taskForm", "taskTitle");
}

function copyTaskToForm(task) {
  task = state.tasks.find((item) => item.id === task?.id);
  if (!task || !canCopyTask(task)) return;
  copyRegularTaskToForm(task);
}

function resetTaskForm() {
  createDraftId = "";
  taskFormGeneration++;
  calendarTaskSourceId = "";
  byId("taskForm").reset();
  byId("taskId").value = "";
  renderTaskProjectOptions();
  byId("taskProjectId").value = "";
  byId("taskCollaborators").innerHTML = "";
  setTaskOwnerPickerOpen(false);
  setTaskCollaboratorPickerOpen(false);
  renderTaskPersonOptions();
  byId("taskWorkType").value = TASK_WORK_TYPE_ROUTINE;
  byId("taskRecurrence").value = TASK_RECURRENCE_NONE;
  byId("taskPriority").value = TASK_PRIORITY_NORMAL;
  byId("taskProgress").value = 0;
  byId("taskQualityPercent").value = "";
  byId("taskStatus").value = TASK_STATUS_PREPARING;
  byId("taskStartDate").value = "";
  byId("taskDueTime").value = "";
  byId("taskFollowUpDate").value = "";
  byId("taskBlockerStatus").value = "none";
  byId("taskBlockerNote").value = "";
  renderTaskDependencyOptions();
  updateTaskResponseMeta(null);
  byId("taskAttachments").value = "";
  renderTaskAttachmentSelection();
  taskAttachmentDraft = [];
  updateTaskCategoryOptions();
  renderTaskAttachmentDraft();
  updateTaskFormLock();
}

function renderTaskAttachmentSelection(files = byId("taskAttachments")?.files) {
  const preview = byId("taskAttachmentSelection");
  if (!preview) return;
  const selected = Array.from(files || []);
  preview.replaceChildren();
  preview.classList.toggle("is-hidden", !selected.length);
  if (!selected.length) return;

  const title = document.createElement("strong");
  title.textContent = selected.length === 1 ? "Tệp đã chọn" : `Đã chọn ${selected.length} tệp`;
  const list = document.createElement("ul");
  selected.forEach((file) => {
    const item = document.createElement("li");
    item.textContent = `${file.name || "Tệp không tên"} · ${formatFileSize(file.size)}`;
    list.append(item);
  });
  preview.append(title, list);
}

function renderTaskAttachmentDraft() {
  const list = byId("taskAttachmentList");
  if (!taskAttachmentDraft.length) {
    list.innerHTML = '<span class="muted">Chưa có hồ sơ đính kèm.</span>';
    return;
  }
  list.innerHTML = taskAttachmentDraft
    .map(
      (file) => `
        <div class="attachment-item">
          ${taskAttachmentLinkHtml(file)}
          <span class="muted">${escapeHtml(formatFileSize(file.size))}</span>
          <button class="ghost" data-remove-task-attachment="${escapeHtml(file.id)}" type="button">Bỏ</button>
        </div>
      `,
    )
    .join("");
  hydrateTaskAttachmentLinks(list);
}

function applyLunaTaskDraft(draft = {}) {
  if (!canCreateRegularTasks() || !byId("taskFormDialog") || byId("taskFormDialog").classList.contains("is-hidden")) return false;
  const title = byId("taskTitle");
  title.value = String(draft.title || "").trim();
  title.dispatchEvent(new Event("input", { bubbles: true }));
  const projectSelect = byId("taskProjectId");
  if (draft.projectId && Array.from(projectSelect.options).some((option) => option.value === String(draft.projectId))) {
    projectSelect.value = String(draft.projectId);
    projectSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const ownerSelect = byId("taskOwner");
  if (draft.ownerId && canCreateRegularTaskForPerson(String(draft.ownerId))
    && Array.from(ownerSelect.options).some((option) => option.value === String(draft.ownerId))) {
    ownerSelect.value = String(draft.ownerId);
    ownerSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const categorySelect = byId("taskCategory");
  if (draft.category && Array.from(categorySelect.options).some((option) => normalizeSearchText(option.value) === normalizeSearchText(draft.category))) {
    categorySelect.value = Array.from(categorySelect.options).find((option) => normalizeSearchText(option.value) === normalizeSearchText(draft.category)).value;
    categorySelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const taskCollaborators = byId("taskCollaborators");
  const allowedCollaboratorIds = Array.isArray(draft.collaboratorIds)
    ? draft.collaboratorIds.map(String).filter((personId) => personId !== ownerSelect.value && canCreateRegularTaskForPerson(personId))
    : [];
  taskCollaborators.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = allowedCollaboratorIds.includes(checkbox.value);
  });
  updateTaskCollaboratorSummary();
  const fieldValues = [
    ["taskWorkType", draft.workType, ["routine", "arising"]],
    ["taskPriority", draft.priority, ["normal", "high", "urgent"]],
    ["taskRecurrence", draft.recurrence, ["none", "daily", "weekly", "monthly", "quarterly"]],
  ];
  fieldValues.forEach(([id, value, allowed]) => {
    if (allowed.includes(value)) byId(id).value = value;
  });
  if (draft.note) byId("taskNote").value = String(draft.note);
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))
    && Number.isFinite(new Date(String(value) + "T00:00:00").getTime());
  if (validDate(draft.startDate)) byId("taskStartDate").value = draft.startDate;
  if (validDate(draft.due)) byId("taskDue").value = draft.due;
  return true;
}

function renderTaskPersonOptions() {
  const currentTaskOwner = byId("taskOwner").value;
  const currentTaskCollaborators = selectedTaskCollaboratorIds();
  const editingTask = state.tasks.find((task) => task.id === byId("taskId").value);
  const taskPeople = visiblePeopleForTasks();
  const taskPeopleWithSelected =
    currentTaskOwner && !taskPeople.some((person) => person.id === currentTaskOwner)
      ? [personById(currentTaskOwner), ...taskPeople].filter(Boolean)
      : taskPeople;
  const taskSelectOptions = taskPeopleWithSelected.map((person) => ({
    value: person.id,
    label: `${person.name} - ${roleById(person.roleId)?.name || "Chưa rõ vị trí"}`,
  }));
  const personPlaceholder = [{ value: "", label: taskSelectOptions.length ? "Chọn nhân sự" : "Chưa có nhân sự" }];
  const currentTaskPerson = currentPerson();
  const selectedTaskOwner =
    isEmployee() && currentTaskPerson && taskSelectOptions.some((option) => option.value === currentTaskPerson.id)
      ? currentTaskPerson.id
      : taskSelectOptions.some((option) => option.value === currentTaskOwner)
        ? currentTaskOwner
        : taskSelectOptions.length === 1
          ? taskSelectOptions[0].value
          : "";
  fillSelect(
    byId("taskOwner"),
    personPlaceholder.concat(taskSelectOptions),
    selectedTaskOwner,
  );
  if (editingTask) {
    // Online data for a collaborator can omit the owner's personnel record.
    // Keep the original owner in the disabled edit form so progress updates remain valid.
    ensureTaskOwnerOption(editingTask);
    byId("taskOwner").value = String(editingTask.ownerId || "");
  }
  updateTaskCollaboratorOptions(currentTaskCollaborators);
  updateTaskCategoryOptions(byId("taskCategory").value);
}

function openTaskEditForm(taskId, { focusId = "taskTitle" } = {}) {
  const task = state.tasks.find((item) => String(item.id) === String(taskId));
  if (!task || !canOpenTask(task)) return false;
  restoreTaskDetailInlineEditor();
  populateTaskForm(task);
  showTaskFormDialog({ focusId });
  return true;
}

function openTaskDraft(draft = {}) {
  if (!openNewTaskFormDialog()) return false;
  return applyLunaTaskDraft(draft);
}

function syncTaskStatusChoices() {
  const select = byId("taskStatus");
  byId("taskStatusChoices")?.querySelectorAll("input").forEach((input) => { input.checked = input.value === select.value; input.disabled = select.disabled; });
}

let submitting = false;
let createDraftId = "";
let initialized = false;
function initialize() {
  if (initialized) return;
  initialized = true;
  byId("taskForm").addEventListener("input", () => { taskFormGeneration++; });
  byId("taskForm").addEventListener("change", () => { taskFormGeneration++; });
  byId("taskForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting || !byId("taskForm").getClientRects().length || !currentAccount() || !canAccessView("tasks")) return;
    submitting = true;
    const actorId = String(currentAccount()?.id || "");
    const generation = taskFormGeneration;
    const sameDraft = () => String(currentAccount()?.id || "") === actorId && taskFormGeneration === generation;
    let resetApplied = false;
    try {
      const taskId = byId("taskId").value || (createDraftId ||= uid("task"));
      const existingTask = state.tasks.find((task) => task.id === taskId);
      const progressReportOnly = taskDetailInlineEditor?.taskId === taskId && taskDetailInlineEditor.progressReportOnly;
      const taskNote = byId("taskNote").value.trim();
      const preserveExistingOwner = !!existingTask && !canEditTaskDetails(existingTask);
      const ownerId = preserveExistingOwner ? String(existingTask.ownerId || "") : byId("taskOwner").value;
      if (!ownerId) {
        alert("Chọn Người thực hiện trước khi lưu công việc.");
        setTaskOwnerPickerOpen(true);
        return;
      }
      const saved = await saveTaskRecord(
        {
          id: taskId,
          kind: TASK_KIND_REGULAR,
          sourceCalendarEventId: existingTask?.sourceCalendarEventId || calendarTaskSourceId || "",
          title: byId("taskTitle").value.trim(),
          projectId: byId("taskProjectId").value,
          ownerId,
          collaboratorIds: selectedTaskCollaboratorIds(),
          category: byId("taskCategory").value,
          workType: byId("taskWorkType").value,
          priority: byId("taskPriority").value,
          recurrence: byId("taskRecurrence").value,
          startDate: byId("taskStartDate").value,
          due: byId("taskDue").value,
          dueTime: byId("taskDueTime").value,
          status: normalizeTaskStatus(byId("taskStatus").value),
          progress: clamp(byId("taskProgress").value, 0, 100),
          qualityPercent: normalizeTaskQualityInput(byId("taskQualityPercent").value),
          note: progressReportOnly && existingTask ? existingTask.note || "" : taskNote,
          followUpDate: byId("taskFollowUpDate").value,
          blockerStatus: byId("taskBlockerStatus").value,
          blockerNote: byId("taskBlockerNote").value.trim(),
          dependencyIds: selectedTaskDependencyIds(),
        },
        byId("taskAttachments"),
        taskAttachmentDraft,
        existingTask && (progressReportOnly || taskNote !== String(existingTask.note || "").trim()) ? taskNote : "",
        () => { if (sameDraft()) { resetApplied = true; resetTaskForm(); } },
        progressReportOnly,
        { isCurrent: sameDraft, creating: createDraftId === taskId && !byId("taskId").value },
      );
      if (String(currentAccount()?.id || "") !== actorId) return;
      if (!resetApplied) {
        if (saved && createDraftId === taskId && !byId("taskId").value) {
          byId("taskId").value = taskId;
          syncTaskFormDialogHeading();
        }
        return;
      }
      if (saved) window.virtualAssistantTaskWizardSaved?.(taskId);
      if (saved && taskDetailInlineEditor?.taskId === taskId) {
        restoreTaskDetailInlineEditor();
        openTaskDetailDialog(taskId);
      } else if (saved) {
        closeTaskFormDialog();
      }
    } finally { submitting = false; }
  });
  byId("taskStatusChoices").addEventListener("change", (event) => {
    const input = event.target.closest("input");
    if (!input || byId("taskStatus").disabled) return;
    byId("taskStatus").value = input.value;
    byId("taskStatus").dispatchEvent(new Event("change", { bubbles: true }));
    syncTaskStatusChoices();
  });
  byId("resetTaskForm").addEventListener("click", () => {
    resetTaskForm();
    syncTaskFormDialogHeading();
  });
  byId("taskOwner").addEventListener("change", () => {
    byId("taskCategory").value = "";
    updateTaskOwnerOptions();
    updateTaskCollaboratorOptions();
    updateTaskCategoryOptions();
    updateTaskFormLock();
  });
  byId("taskOwnerOptions").addEventListener("change", (event) => {
    const input = event.target.closest('input[type="radio"]');
    if (!input?.value || byId("taskOwner").disabled) return;
    byId("taskOwner").value = input.value;
    byId("taskOwner").dispatchEvent(new Event("change", { bubbles: true }));
    setTaskOwnerPickerOpen(false);
  });
  byId("taskOwnerSearch").addEventListener("input", debounce(filterTaskOwnerOptions, 100));
  byId("taskOwnerSearch").addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    setTaskOwnerPickerOpen(false);
    byId("taskOwnerToggle")?.focus();
  });
  byId("taskOwnerToggle").addEventListener("click", () => {
    setTaskOwnerPickerOpen(!isTaskOwnerPickerOpen());
  });
  byId("taskCollaborators").addEventListener("change", updateTaskCollaboratorSummary);
  byId("taskCollaboratorSearch").addEventListener("input", debounce(filterTaskCollaboratorOptions, 150));
  byId("taskCollaboratorSearch").addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    setTaskCollaboratorPickerOpen(false);
    byId("taskCollaboratorToggle")?.focus();
  });
  byId("taskCollaboratorToggle").addEventListener("click", () => {
    setTaskCollaboratorPickerOpen(!isTaskCollaboratorPickerOpen());
  });
  document.addEventListener("pointerdown", (event) => {
    const collaboratorPicker = byId("taskCollaboratorPicker");
    const ownerPicker = byId("taskOwnerPicker");
    if (isTaskCollaboratorPickerOpen() && !collaboratorPicker?.contains(event.target)) {
      setTaskCollaboratorPickerOpen(false);
    }
    if (isTaskOwnerPickerOpen() && !ownerPicker?.contains(event.target)) {
      setTaskOwnerPickerOpen(false);
    }
  });
  byId("taskStatus").addEventListener("change", () => {
    updateTaskFormLock();
  });
  byId("taskDue").addEventListener("input", () => updateTaskDeadlineExtensionNotice());
  byId("taskDue").addEventListener("change", () => updateTaskDeadlineExtensionNotice());
  byId("taskFollowUpDate").addEventListener("input", () => updateTaskDeadlineExtensionNotice());
  byId("taskFollowUpDate").addEventListener("change", () => updateTaskDeadlineExtensionNotice());
  byId("taskAttachmentList").addEventListener("click", (event) => {
    const removeId = event.target.dataset.removeTaskAttachment;
    if (!removeId) return;
    taskAttachmentDraft = taskAttachmentDraft.filter((file) => file.id !== removeId);
    renderTaskAttachmentDraft();
  });
  byId("taskAttachments").addEventListener("change", (event) => {
    renderTaskAttachmentSelection(event.target.files);
  });
}

globalThis.QldaFeatures.register("tasks-form", FEATURE_VERSION, { showTaskFormDialog, openNewTaskFormDialog, populateTaskForm, copyTaskToForm, resetTaskForm, updateTaskFormLock, renderTaskProjectOptions, selectedTaskCollaboratorIds, selectedTaskDependencyIds, applyLunaTaskDraft, renderTaskPersonOptions, openTaskEditForm, openTaskDraft, syncTaskStatusChoices, initialize });
})();
