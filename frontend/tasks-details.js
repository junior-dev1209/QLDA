(() => {
"use strict";
const FEATURE_VERSION = "3.4.192";

function taskDetailActionMarkup(task) {
  const actions = [];
  const editable = canEditTaskDetails(task) && !isRecurrenceStoppedTask(task);
  const copyable = canCopyTask(task);
  const reportable = canUpdateTaskProgress(task);
  const reviewable = canReviewTaskCompletion(task);
  const deletable = canDeleteTask(task);
  if (reportable) actions.push('<button class="task-progress-update-button" type="button" data-task-detail-action="report" title="Cập nhật" aria-label="Cập nhật"><span>Cập nhật</span></button>');
  if (canStopTaskRecurrence(task)) actions.push('<button class="task-stop-recurrence-button" type="button" data-task-detail-action="stop-recurrence">Dừng định kỳ</button>');
  if (editable) actions.push('<button class="ghost task-icon-button" type="button" data-task-detail-action="edit" title="Sửa công việc" aria-label="Sửa công việc"><span aria-hidden="true">&#9998;</span></button>');
  if (copyable) actions.push('<button class="ghost task-icon-button" type="button" data-task-detail-action="copy" title="Sao chép công việc" aria-label="Sao chép công việc"><span aria-hidden="true">&#9112;</span></button>');
  if (reviewable) actions.push('<button class="ghost task-icon-button task-icon-approve" type="button" data-task-detail-action="review" title="Duyệt hoàn thành" aria-label="Duyệt hoàn thành"><span aria-hidden="true">&#10003;</span></button>');
  if (deletable) actions.push('<button class="ghost task-icon-button task-icon-delete" type="button" data-task-detail-action="delete" title="Xóa công việc" aria-label="Xóa công việc"><span aria-hidden="true">&times;</span></button>');
  return actions.length ? actions.join("") : '<span class="muted">Chỉ xem chi tiết công việc.</span>';
}

function openTaskDetailDialog(taskId) {
  restoreTaskDetailInlineEditor({ reset: true });
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || !canViewTaskRecord(task)) return;
  const collaborators = taskCollaboratorNames(task);
  const status = task.computedStatus || getDueStatus(task);
  const latestReport = latestTaskProgressReport(task);
  const blockerNote = String(task.blockerNote || "").trim();
  const extensionReason = String(task.deadlineExtensionReason || "").trim();
  const showBlockerNoteSeparately = blockerNote && blockerNote !== extensionReason;
  const deadlineReviewButton = taskDeadlineExtensionPending(task) && canReviewTaskDeadlineExtension(task)
    ? `<button class="task-progress-update-button task-deadline-review-button" type="button" data-review-deadline-extension="${escapeHtml(task.id)}">Duyệt gia hạn</button>`
    : "";
  const attachments = task.attachments || [];
  const violations = taskViolationReasons(task);
  const relatedGpmbCases = isGpmbWorkflowTask(task)
    ? (state.gpmbCases || [])
        .filter((record) => String(record.workflowId || "") === String(task.gpmbWorkflowId || ""))
        .sort((left, right) => {
          const leftCurrent = String(left.currentStepId || "") === String(task.gpmbStepId || "") ? 1 : 0;
          const rightCurrent = String(right.currentStepId || "") === String(task.gpmbStepId || "") ? 1 : 0;
          return rightCurrent - leftCurrent
            || String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || ""));
        })
    : [];
  const currentStepCaseCount = relatedGpmbCases.filter((record) => String(record.currentStepId || "") === String(task.gpmbStepId || "")).length;
  const visibleGpmbCases = relatedGpmbCases.slice(0, 20);
  const attachmentList = attachments.length
    ? `<div class="task-detail-attachments">${attachments
        .map((file) => taskAttachmentLinkHtml(file))
        .join("")}</div>`
    : `<p class="muted">${relatedGpmbCases.length ? "Chưa có tệp đính kèm; hồ sơ GPMB liên quan được hiển thị bên dưới." : "Chưa có hồ sơ liên quan."}</p>`;
  const gpmbCaseList = relatedGpmbCases.length ? `
    <div class="task-related-gpmb-cases">
      <div class="task-related-gpmb-head">
        <div><strong>Hồ sơ GPMB theo hộ/thửa</strong><span>${currentStepCaseCount} hồ sơ ở bước công việc này · ${relatedGpmbCases.length} hồ sơ cùng đợt GPMB</span></div>
      </div>
      <div class="task-related-gpmb-list">${visibleGpmbCases.map((record) => {
        const atCurrentStep = String(record.currentStepId || "") === String(task.gpmbStepId || "");
        const workflow = gpmbWorkflowById(record.workflowId);
        const step = gpmbCaseEnabledSteps(workflow).find((item) => item.id === record.currentStepId);
        const land = [record.mapSheet ? `Tờ ${record.mapSheet}` : "", record.parcelNumber ? `Thửa ${record.parcelNumber}` : "", gpmbCaseAreaLabel(record.areaM2)].filter(Boolean).join(" · ");
        return `<article class="task-related-gpmb-item${atCurrentStep ? " is-current-step" : ""}">
          <div class="task-related-gpmb-item-head"><span class="gpmb-case-code">${escapeHtml(record.caseCode || "Chưa cấp mã")}</span><span class="gpmb-case-status is-${escapeHtml(record.status || GPMB_CASE_STATUS_NEW)}">${escapeHtml(gpmbCaseStatusLabel(record.status))}</span></div>
          <strong>${escapeHtml(record.subjectName || "Đối tượng chưa cập nhật")}</strong>
          <span>${escapeHtml(land || "Chưa cập nhật tờ, thửa, diện tích")}</span>
          <span>${escapeHtml(atCurrentStep ? "Đang ở bước công việc này" : step ? `${gpmbWorkflowStepLabel(step)} · ${step.title}` : "Cùng đợt GPMB")}</span>
          ${record.note ? `<p>${escapeHtml(record.note)}</p>` : ""}
          <small>Cập nhật ${escapeHtml(formatDateTime(record.updatedAt) || "chưa rõ")} · ${escapeHtml(record.updatedBy || record.createdBy || "Không rõ tài khoản")}</small>
        </article>`;
      }).join("")}</div>
      ${relatedGpmbCases.length > visibleGpmbCases.length ? `<p class="muted task-related-gpmb-more">Đang hiển thị 20/${relatedGpmbCases.length} hồ sơ cập nhật gần nhất.</p>` : ""}
    </div>` : "";

  byId("taskDetailSubtitle").textContent = taskKindLabels[normalizeTaskKind(task)] || "Công việc";
  byId("taskDetailTitle").textContent = task.title || "Công việc";
  byId("taskDetailActions").innerHTML = taskDetailActionMarkup(task);
  byId("taskDetailMeta").classList.remove("is-hidden");
  byId("taskDetailMeta").innerHTML = `
    <span><strong>Trạng thái</strong><b class="badge ${taskStatusBadgeClass(status)}">${escapeHtml(status)}</b></span>
    <span><strong>Tiến độ</strong><b>${formatScore(task.progress)}%</b></span>
    <span><strong>Chất lượng</strong><b>${escapeHtml(taskQualityLabel(task))}</b></span>
    <span><strong>Điểm thực hiện KPI</strong><b>${formatScore(taskKpiActualScore(task))}</b></span>
  `;
  byId("taskDetailContent").innerHTML = `
    <section class="task-detail-section task-detail-information">
      <h3>Thông tin công việc</h3>
      <div class="task-detail-info-grid">
        <span><strong>Người thực hiện</strong>${escapeHtml(taskOwnerName(task, "Chưa cập nhật"))}</span>
        <span><strong>Người phối hợp</strong>${escapeHtml(collaborators.length ? collaborators.join(", ") : "Chưa chọn")}</span>
        <span><strong>Tên dự án</strong>${escapeHtml(projectNameForTask(task) || "Chưa cập nhật")}</span>
        <span><strong>Danh mục nhiệm vụ</strong>${escapeHtml(task.category || "Chưa phân loại")}</span>
        <span><strong>Loại công việc</strong>${escapeHtml(taskWorkTypeLabels[normalizeTaskWorkType(task)] || "Chưa cập nhật")}</span>
        <span><strong>Mức độ ưu tiên</strong>${escapeHtml(taskPriorityLabels[normalizeTaskPriority(task.priority)])}</span>
        <span><strong>Định kỳ</strong>${escapeHtml(taskRecurrenceLabels[normalizeTaskRecurrence(task)] || "Không định kỳ")}${task.recurrenceStoppedAt ? ` · Đã dừng ${escapeHtml(formatDate(task.recurrenceStopDate) || formatDateTime(task.recurrenceStoppedAt))}` : ""}</span>
        <span><strong>Ngày tạo</strong>${escapeHtml(formatDateTime(task.createdAt) || "Chưa ghi nhận")}</span>
        <span><strong>Người tạo</strong>${escapeHtml(taskRecordedCreatorName(task))}</span>
        <span><strong>Ngày bắt đầu</strong>${escapeHtml(formatTaskStartDate(task) || "Chưa cập nhật")}</span>
        <span><strong>Ngày hoàn thành</strong>${escapeHtml(formatTaskDeadline(task) || "Chưa cập nhật")}</span>
        <span><strong>Đánh giá hoàn thành</strong>${taskCompletionReviewValueHtml(task)}</span>
        <span><strong>Cập nhật gần nhất</strong>${escapeHtml(latestReport ? `${formatScore(latestReport.progress)}% · ${formatDateTime(latestReport.createdAt)}` : "Chưa có")}</span>
      </div>
    </section>
    <section class="task-detail-section">
      <h3>Nội dung công việc</h3>
      <p class="task-detail-note">${escapeHtml(task.note || "Chưa cập nhật.")}</p>
    </section>
    <section class="task-detail-section">
      <h3>Theo dõi điều hành</h3>
      <div class="task-detail-info-grid">
        <span><strong>Mốc cập nhật tiếp theo</strong>${escapeHtml(formatTaskDeadline({ due: task.followUpDate }) || "Chưa đặt mốc")}</span>
        <span><strong>Trạng thái trở ngại</strong>${escapeHtml(taskBlockerLabels[normalizeTaskBlockerStatus(task.blockerStatus)])}</span>
        <span><strong>Công việc phụ thuộc</strong>${escapeHtml(taskDependencyNames(task).join("; ") || "Không có")}</span>
      </div>
      ${task.deadlineExtensionStatus ? `<div class="task-deadline-extension-detail is-${escapeHtml(task.deadlineExtensionStatus)}"><div class="task-deadline-extension-detail-head"><strong>${taskDeadlineExtensionPending(task) ? "Đang chờ duyệt gia hạn" : task.deadlineExtensionStatus === "approved" ? "Đã chấp nhận mốc hoàn thành mới" : "Đề nghị gia hạn chưa được chấp nhận"}</strong>${deadlineReviewButton}</div><span>Hạn hiện tại: ${escapeHtml(formatTaskDeadline(task) || "Chưa có")} · Mốc đề nghị: ${escapeHtml(formatDate(task.deadlineExtensionRequestedDue) || "Chưa có")}</span>${extensionReason ? `<span><b>Nội dung trở ngại / đề nghị hỗ trợ:</b> ${escapeHtml(extensionReason)}</span>` : ""}${!taskDeadlineExtensionPending(task) && task.deadlineExtensionReviewNote ? `<span>Ý kiến duyệt: ${escapeHtml(task.deadlineExtensionReviewNote)}</span>` : ""}</div>` : ""}
      ${showBlockerNoteSeparately ? `<p class="task-detail-note">${escapeHtml(blockerNote)}</p>` : !task.deadlineExtensionStatus && !blockerNote ? `<p class="task-detail-note">Chưa có nội dung trở ngại hoặc đề nghị hỗ trợ.</p>` : ""}
    </section>
    <section class="task-detail-section">
      <h3>Lịch sử báo cáo tiến độ</h3>
      ${taskProgressReportListHtml(task) || `<p class="muted">Chưa có báo cáo tiến độ.</p>`}
    </section>
    <section class="task-detail-section">
      <h3>Hồ sơ liên quan</h3>
      ${attachmentList}
      ${gpmbCaseList}
    </section>
    ${violations.length ? `<div class="task-violation">${escapeHtml(violations.join("; "))}</div>` : ""}
  `;
  byId("taskDetailDialog").dataset.taskId = task.id;
  byId("taskDetailDialog").classList.remove("is-hidden");
  byId("taskDetailDialog").setAttribute("aria-hidden", "false");
  hydrateTaskAttachmentLinks(byId("taskDetailDialog"));
}

function openTaskDetailInlineEditor(taskId, focusId = "", { progressReportOnly = false } = {}) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || (progressReportOnly ? !canUpdateTaskProgress(task) : !canEditTaskDetails(task))) return false;
  const form = byId("taskForm");
  if (!form) return;
  restoreTaskDetailInlineEditor({ reset: true });
  const anchor = document.createElement("span");
  anchor.className = "task-detail-form-anchor";
  form.parentNode.insertBefore(anchor, form);
  taskDetailInlineEditor = {
    taskId: task.id,
    kind: TASK_KIND_REGULAR,
    progressReportOnly,
    form,
    anchor,
  };

  byId("taskDetailSubtitle").textContent = "Chỉnh sửa trực tiếp";
  byId("taskDetailTitle").textContent = task.title || "Công việc";
  byId("taskDetailMeta").classList.add("is-hidden");
  byId("taskDetailActions").innerHTML = '<button class="ghost" type="button" data-task-detail-action="cancel-edit">Hủy chỉnh sửa</button>';
  byId("taskDetailContent").innerHTML = `
    <section class="task-detail-editor">
      <h3>Cập nhật công việc</h3>
      <div id="taskDetailEditorSlot"></div>
    </section>
  `;
  byId("taskDetailEditorSlot").append(form);
  form.classList.add("task-detail-inline-form");
  populateTaskForm(task);
  if (taskDetailInlineEditor.progressReportOnly) byId("taskNote").value = "";

  const target = byId(focusId) || byId("taskTitle");
  if (target && !target.disabled) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.focus({ preventScroll: true });
  }
  return true;
}

function deleteTaskRecord(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || !canDeleteTask(task)) return false;
  if (!confirm("Xóa vĩnh viễn công việc này? Dữ liệu công việc sẽ bị loại khỏi danh mục và đồng bộ xóa trên các thiết bị khác.")) return false;
  registerDeletedId(taskId);
  const owner = personById(task.ownerId);
  state.tasks = state.tasks.filter((item) => item.id !== taskId);
  syncPersonalEvaluationTaskScoresForTask(null, task);
  logActivity({
    action: "Xóa",
    module: "Công việc",
    targetType: "task",
    targetId: taskId,
    personId: task.ownerId,
    departmentId: owner?.departmentId || "",
    period: taskPeriod(task),
    title: task.title,
    details: `${taskOwnerName(task, "Chưa rõ người nhận")} · ${normalizeTaskStatus(task.status)}`,
    score: `${formatScore(task.progress)}%`,
  });
  saveState();
  renderAll();
  return true;
}

function openTaskCompletionReviewDialog(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || !canReviewTaskCompletion(task)) return;
  const currentStatus = getDueStatus(task);
  byId("taskCompletionReviewTaskId").value = task.id;
  byId("taskCompletionReviewStatus").value = taskCompletionIsApproved(task) ? "passed" : "";
  byId("taskCompletionReviewQualityPercent").value = normalizeTaskQualityInput(task.qualityPercent);
  byId("taskCompletionReviewNote").value = "";
  updateTaskCompletionReviewQualityField();
  byId("taskCompletionReviewTitle").textContent = `Duyệt hoàn thành: ${task.title}`;
  byId("taskCompletionReviewSummary").textContent = `${taskOwnerName(task, "Chưa rõ người thực hiện")} · Trạng thái hiện tại: ${currentStatus} · Ngày hoàn thành: ${formatTaskDeadline(task) || "chưa cập nhật"}`;
  byId("taskCompletionReviewDialog").classList.remove("is-hidden");
  byId("taskCompletionReviewDialog").setAttribute("aria-hidden", "false");
  byId("taskCompletionReviewStatus").focus();
}

function openTaskDeadlineExtensionReviewDialog(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || !canReviewTaskDeadlineExtension(task)) return;
  byId("taskDeadlineExtensionReviewTaskId").value = task.id;
  byId("taskDeadlineExtensionReviewSummary").textContent = task.title || "Công việc";
  byId("taskDeadlineExtensionCurrentDue").textContent = formatTaskDeadline(task) || "Chưa có";
  byId("taskDeadlineExtensionRequestedDue").textContent = formatDate(task.deadlineExtensionRequestedDue) || "Chưa có";
  byId("taskDeadlineExtensionRequester").textContent = task.deadlineExtensionRequestedByName || "Người thực hiện";
  byId("taskDeadlineExtensionRequestReason").textContent = task.deadlineExtensionReason || "Chưa nêu lý do.";
  byId("taskDeadlineExtensionReviewDecision").value = "";
  byId("taskDeadlineExtensionReviewNote").value = "";
  byId("taskDeadlineExtensionReviewDialog").classList.remove("is-hidden");
  byId("taskDeadlineExtensionReviewDialog").setAttribute("aria-hidden", "false");
  byId("taskDeadlineExtensionReviewDecision").focus();
}




let initialized = false;
function initialize() {
  if (initialized) return;
  initialized = true;
  byId("taskCompletionReviewStatus").addEventListener("change", updateTaskCompletionReviewQualityField);
  byId("taskCompletionReviewForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const taskId = byId("taskCompletionReviewTaskId").value;
    const decision = byId("taskCompletionReviewStatus").value;
    if (!decision) {
      alert("Chọn kết quả Đạt hoặc Không đạt trước khi lưu.");
      return;
    }
    const qualityPercent = normalizeTaskQualityInput(byId("taskCompletionReviewQualityPercent").value);
    if (decision === "passed" && qualityPercent === "") {
      alert("Nhập Đánh giá chất lượng trước khi lưu kết quả Đạt.");
      byId("taskCompletionReviewQualityPercent").focus();
      return;
    }
    if (await reviewTaskCompletion(taskId, decision, byId("taskCompletionReviewNote").value, qualityPercent)
      && byId("taskCompletionReviewTaskId").value === taskId) {
      closeTaskCompletionReviewDialog();
    }
  });
  byId("taskDeadlineExtensionReviewForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const taskId = byId("taskDeadlineExtensionReviewTaskId").value;
    const decision = byId("taskDeadlineExtensionReviewDecision").value;
    if (!decision) {
      alert("Chọn chấp nhận hoặc không chấp nhận mốc mới trước khi lưu.");
      return;
    }
    if (await reviewTaskDeadlineExtension(taskId, decision, byId("taskDeadlineExtensionReviewNote").value)
      && byId("taskDeadlineExtensionReviewTaskId").value === taskId) {
      closeTaskDeadlineExtensionReviewDialog();
    }
  });
  byId("taskDetailDialog").addEventListener("click", (event) => {
    const reviewButton = event.target.closest("[data-review-deadline-extension]");
    if (reviewButton) {
      const taskId = reviewButton.dataset.reviewDeadlineExtension;
      const task = state.tasks.find((item) => item.id === taskId);
      if (task && canReviewTaskDeadlineExtension(task)) {
        closeTaskDetailDialog();
        openTaskDeadlineExtensionReviewDialog(taskId);
      }
      return;
    }
    if (event.target === byId("taskDetailDialog")) {
      closeTaskDetailDialog();
    }
  });
  byId("taskDetailActions").addEventListener("click", async (event) => {
    const action = event.target.closest("[data-task-detail-action]")?.dataset.taskDetailAction;
    const taskId = byId("taskDetailDialog").dataset.taskId;
    const task = state.tasks.find((item) => item.id === taskId);
    if (!action || !task) return;
    if (action === "cancel-edit") {
      openTaskDetailDialog(taskId);
      return;
    }
    if (action === "stop-recurrence" && canStopTaskRecurrence(task)) {
      void stopRecurringTask(taskId);
      return;
    }
    if (action === "edit" && canEditTaskDetails(task)) {
      openTaskDetailInlineEditor(taskId);
      return;
    }
    if (action === "report" && canUpdateTaskProgress(task)) {
      if (window.virtualAssistantSelectProgressTask?.(taskId) === true) return;
      openTaskDetailInlineEditor(taskId, "taskNote", { progressReportOnly: true });
      return;
    }
    if (action === "copy" && canCopyTask(task)) {
      closeTaskDetailDialog();
      copyTaskToForm(task);
      return;
    }
    if (action === "review" && canReviewTaskCompletion(task)) {
      closeTaskDetailDialog();
      openTaskCompletionReviewDialog(taskId);
      return;
    }
    if (action === "review-deadline-extension" && canReviewTaskDeadlineExtension(task)) {
      closeTaskDetailDialog();
      openTaskDeadlineExtensionReviewDialog(taskId);
      return;
    }
    if (action === "delete" && canDeleteTask(task)) {
      if (await deleteTaskRecord(taskId) && byId("taskDetailDialog").dataset.taskId === taskId) closeTaskDetailDialog();
    }
  });
}

globalThis.QldaFeatures.register("tasks-details", FEATURE_VERSION, { openTaskDetailDialog, openTaskDetailInlineEditor, deleteTaskRecord, openTaskCompletionReviewDialog, openTaskDeadlineExtensionReviewDialog, initialize });
})();
