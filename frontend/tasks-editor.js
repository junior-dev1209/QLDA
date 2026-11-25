(() => {
"use strict";
const FEATURE_VERSION = "3.4.192";

function taskEditorProgressOnlyChange(previous, next) {
  // Keep this wire-field contract in parity with the Edge classifier (tested).
  const fields = [
    "status", "progress", "followUpDate", "deadlineExtensionStatus", "deadlineExtensionRequestedDue",
    "deadlineExtensionOriginalDue", "deadlineExtensionReason", "deadlineExtensionRequestedAt",
    "deadlineExtensionRequestedById", "deadlineExtensionRequestedByName", "blockerStatus", "blockerNote",
    "attachments", "progressReports", "completedAt", "completedById", "completedByName",
    "completionReviewStatus", "completionReviewedAt", "completionReviewedById", "completionReviewedByName",
    "completionReviewNote", "lateCompletion", "qualityPercent", "qualityAssessedAt", "qualityAssessedById",
    "qualityAssessedByName", "updatedAt", "updatedBy", "updatedById", "responseStatus", "responseNote",
    "responseAt", "responseById", "responseByName", "collaboratorIds", "collaboratorId",
  ];
  const same = (left, right) => JSON.stringify(stableSharedValue(left)) === JSON.stringify(stableSharedValue(right));
  const beforeReports = previous.progressReports || [];
  const nextReports = next.progressReports || [];
  if (!Array.isArray(beforeReports) || !Array.isArray(nextReports) || beforeReports.length > nextReports.length
    || !beforeReports.every((report, index) => same(report, nextReports[index]))) return false;
  const details = (value) => Object.fromEntries(Object.entries(value).filter(([key]) => !fields.includes(key)));
  return same(details(previous), details(next));
}

async function saveTaskRecord(record, fileInput, draftAttachments, progressReportNote, resetCallback, forceProgressReport = false, editContext = null) {
  const actorId = String(currentAccount()?.id || "");
  const sameActor = () => !!actorId && String(currentAccount()?.id || "") === actorId;
  const sameDraft = () => !editContext || editContext.isCurrent();
  const index = state.tasks.findIndex((item) => item.id === record.id);
  const existingTask = index >= 0 ? state.tasks[index] : null;
  const adminOverride = isAdmin();
  if (!sameActor() || !sameDraft()) return false;
  const customFields = collectCustomFieldValues("tasks", existingTask?.customFields);
  let uploadedAttachments = [];
  try {
    uploadedAttachments = await readTaskAttachmentFiles(fileInput.files);
    if (!sameActor() || !sameDraft()) return false;
  } catch (error) {
    if (!sameActor() || !sameDraft()) return false;
    alert(error.message || "Không thể đọc hồ sơ đính kèm. Vui lòng thử lại.");
    return false;
  }
  const preparedRecord = {
    ...record,
    attachments: [...draftAttachments, ...uploadedAttachments],
    customFields,
  };
  preparedRecord.priority = normalizeTaskPriority(preparedRecord.priority);
  preparedRecord.blockerStatus = normalizeTaskBlockerStatus(preparedRecord.blockerStatus);
  preparedRecord.blockerNote = String(preparedRecord.blockerNote || "").trim();
  preparedRecord.followUpDate = String(preparedRecord.followUpDate || "");
  [
    "deadlineExtensionStatus",
    "deadlineExtensionRequestedDue",
    "deadlineExtensionOriginalDue",
    "deadlineExtensionReason",
    "deadlineExtensionRequestedAt",
    "deadlineExtensionRequestedById",
    "deadlineExtensionRequestedByName",
    "deadlineExtensionReviewedAt",
    "deadlineExtensionReviewedById",
    "deadlineExtensionReviewedByName",
    "deadlineExtensionReviewNote",
  ].forEach((field) => {
    if (existingTask) preparedRecord[field] = existingTask[field] || "";
  });
  preparedRecord.dependencyIds = taskDependencyIds(preparedRecord).filter((id) => id !== preparedRecord.id);
  const progressOnlyUpdate = !!existingTask && !canEditTaskDetails(existingTask) && canUpdateTaskProgress(existingTask);
  if (progressOnlyUpdate) {
    // A collaborator receives a filtered personnel list from the server. Preserve
    // immutable task details instead of relying on disabled form controls.
    preparedRecord.ownerId = existingTask.ownerId;
    preparedRecord.projectId = projectIdForTask(existingTask);
  }
  const selectedProject = projectById(preparedRecord.projectId);
  if (preparedRecord.projectId && !selectedProject) {
    alert("Danh mục dự án đã chọn không còn tồn tại. Vui lòng chọn lại.");
    return false;
  }
  if (!selectedProject) {
    alert("Vui lòng chọn Danh mục dự án trước khi lưu công việc.");
    return false;
  }
  if (!preparedRecord.startDate) {
    alert("Vui lòng nhập Ngày bắt đầu trước khi lưu công việc.");
    return false;
  }
  preparedRecord.projectId = selectedProject?.id || "";
  preparedRecord.projectName = selectedProject?.name || "";
  const recordKind = TASK_KIND_REGULAR;
  preparedRecord.kind = recordKind;
  preparedRecord.workType = normalizeTaskWorkType(preparedRecord);
  preparedRecord.recurrence = normalizeTaskRecurrence(preparedRecord);
  preparedRecord.collaboratorIds = taskCollaboratorIds(preparedRecord).filter((id) => id !== preparedRecord.ownerId);
  preparedRecord.collaboratorId = "";
  if (preparedRecord.recurrence === TASK_RECURRENCE_NONE) {
    preparedRecord.recurrenceSourceId = "";
    preparedRecord.recurrenceSeriesId = "";
    preparedRecord.recurrenceAnchorDue = "";
    preparedRecord.recurrenceAnchorDay = "";
  } else if (existingTask?.recurrenceSourceId) {
    preparedRecord.recurrenceSourceId = existingTask.recurrenceSourceId;
    preparedRecord.recurrenceSeriesId = existingTask.recurrenceSeriesId || existingTask.recurrenceSourceId;
    preparedRecord.recurrenceAnchorDue = existingTask.recurrenceAnchorDue || existingTask.due;
    preparedRecord.recurrenceAnchorDay = existingTask.recurrenceAnchorDay || Number(existingTask.due?.slice(8, 10)) || "";
  } else {
    preparedRecord.recurrenceSourceId = "";
    preparedRecord.recurrenceSeriesId = existingTask?.recurrenceSeriesId || preparedRecord.id;
    preparedRecord.recurrenceAnchorDue = preparedRecord.due;
    preparedRecord.recurrenceAnchorDay = Number(preparedRecord.due?.slice(8, 10)) || "";
  }
  const canEditDetails = existingTask
    ? canEditTaskDetails(existingTask)
    : canCreateRegularTaskForPerson(preparedRecord.ownerId);
  const reportLockedByApproval = !!existingTask && taskProgressLockedAfterApproval(existingTask) && !adminOverride;
  const canUpdateReport = existingTask ? !reportLockedByApproval && (adminOverride || canUpdateTaskProgress(existingTask)) : false;
  const canUpdateCollaborators = !!existingTask && !reportLockedByApproval && (canEditDetails || canUpdateTaskCollaborators(existingTask));
  if (reportLockedByApproval) {
    preparedRecord.status = existingTask.status;
    preparedRecord.progress = existingTask.progress;
    preparedRecord.attachments = existingTask.attachments || [];
    preparedRecord.note = existingTask.note || "";
  }
  if (existingTask && !canUpdateCollaborators) {
    preparedRecord.collaboratorIds = taskCollaboratorIds(existingTask);
    preparedRecord.collaboratorId = "";
  }
  const submittedQuality = normalizeTaskQualityInput(preparedRecord.qualityPercent);
  const priorQuality = existingTask ? normalizeTaskQualityInput(existingTask.qualityPercent) : "";
  const nextStatusForQuality = normalizeTaskStatus(preparedRecord.status);
  const canEditQuality = !!existingTask && adminOverride;
  const nextQuality = adminOverride
    ? (canEditQuality ? submittedQuality : priorQuality)
    : nextStatusForQuality === TASK_STATUS_COMPLETED && taskCompletionIsApproved(existingTask)
      ? (canEditQuality ? submittedQuality : priorQuality)
      : "";
  const qualityChanged = String(nextQuality) !== String(priorQuality);
  const qualityAssessmentChanged = qualityChanged && (nextStatusForQuality === TASK_STATUS_COMPLETED || adminOverride);
  preparedRecord.qualityPercent = nextQuality;
  if (!canEditDetails && !canUpdateReport && !canEditQuality) {
    alert("Tài khoản hiện tại không có quyền lưu hoặc cập nhật công việc này.");
    return false;
  }
  if (!existingTask && !canEditDetails) {
    alert("Tài khoản hiện tại không có quyền tạo loại công việc này.");
    return false;
  }
  if (canEditDetails && !isAdmin() && !canCreateRegularTaskForPerson(preparedRecord.ownerId)) {
    alert("Tài khoản hiện tại chỉ được tạo/sửa công việc thường kỳ trong phạm vi được xem.");
    return false;
  }
  let deadlineExtensionRequest = false;
  if (existingTask) {
    const requestedDue = String(preparedRecord.followUpDate || "");
    const exceedsCurrentDue = Boolean(requestedDue && requestedDue > String(existingTask.due || ""));
    if (taskDeadlineExtensionPending(existingTask)) {
      preparedRecord.followUpDate = existingTask.followUpDate || "";
      [
        "deadlineExtensionStatus", "deadlineExtensionRequestedDue", "deadlineExtensionOriginalDue",
        "deadlineExtensionReason", "deadlineExtensionRequestedAt", "deadlineExtensionRequestedById",
        "deadlineExtensionRequestedByName", "deadlineExtensionReviewedAt", "deadlineExtensionReviewedById",
        "deadlineExtensionReviewedByName", "deadlineExtensionReviewNote",
      ].forEach((field) => { preparedRecord[field] = existingTask[field] || ""; });
    } else if (exceedsCurrentDue && isGpmbWorkflowTask(existingTask)) {
      if (requestedDue !== String(existingTask.followUpDate || "")) {
        alert("Công việc GPMB phải điều chỉnh hạn trong Quản lý GPMB để đồng bộ với quy trình.");
        return false;
      }
    } else if (exceedsCurrentDue) {
      const reason = String(preparedRecord.blockerNote || "").trim();
      const requestAlreadyMatches = existingTask.deadlineExtensionStatus === "rejected"
        && existingTask.deadlineExtensionRequestedDue === requestedDue
        && String(existingTask.deadlineExtensionReason || "").trim() === reason;
      if (!requestAlreadyMatches) {
        if (reason.length < 10) {
          alert("Nhập căn cứ đề nghị gia hạn trong trường Nội dung trở ngại / đề nghị hỗ trợ (ít nhất 10 ký tự) trước khi lưu.");
          byId("taskBlockerNote").focus();
          return false;
        }
        if (!await ensureTaskDeadlineExtensionReviewSupported()) return false;
        if (!sameActor() || !sameDraft()) return false;
        const actor = currentActorInfo();
        preparedRecord.deadlineExtensionStatus = "pending";
        preparedRecord.deadlineExtensionRequestedDue = requestedDue;
        preparedRecord.deadlineExtensionOriginalDue = String(existingTask.due || "");
        preparedRecord.deadlineExtensionReason = reason;
        preparedRecord.deadlineExtensionRequestedAt = new Date().toISOString();
        preparedRecord.deadlineExtensionRequestedById = actor.id;
        preparedRecord.deadlineExtensionRequestedByName = actor.name;
        deadlineExtensionRequest = true;
      }
    }
  }
  const timestamp = new Date().toISOString();
  const actor = currentActorInfo();
  const ownerChanged = existingTask && existingTask.ownerId !== preparedRecord.ownerId;
  const collaboratorsChanged = !!existingTask && (
    (existingTask.collaboratorId || "") !== (preparedRecord.collaboratorId || "") ||
    !samePersonIdList(taskCollaboratorIds(existingTask), taskCollaboratorIds(preparedRecord))
  );
  const detailsChanged =
    !existingTask ||
    ownerChanged ||
    normalizeTaskKind(existingTask) !== recordKind ||
    existingTask.title !== preparedRecord.title ||
    projectIdForTask(existingTask) !== (preparedRecord.projectId || "") ||
    (existingTask.projectName || "") !== (preparedRecord.projectName || "") ||
    collaboratorsChanged ||
    existingTask.category !== preparedRecord.category ||
    normalizeTaskWorkType(existingTask) !== preparedRecord.workType ||
    normalizeTaskPriority(existingTask.priority) !== preparedRecord.priority ||
    normalizeTaskRecurrence(existingTask) !== preparedRecord.recurrence ||
    (existingTask.startDate || "") !== (preparedRecord.startDate || "") ||
    existingTask.due !== preparedRecord.due ||
    (existingTask.dueTime || "") !== (preparedRecord.dueTime || "") ||
    !samePersonIdList(taskDependencyIds(existingTask), preparedRecord.dependencyIds) ||
    (existingTask.note || "") !== preparedRecord.note;

  let mergedRecord = canEditDetails
    ? {
        ...existingTask,
        ...preparedRecord,
        progressReports: existingTask?.progressReports || [],
      }
    : canUpdateReport
      ? {
          ...existingTask,
          status: preparedRecord.status,
          progress: preparedRecord.progress,
          attachments: preparedRecord.attachments,
          followUpDate: preparedRecord.followUpDate,
          deadlineExtensionStatus: preparedRecord.deadlineExtensionStatus || "",
          deadlineExtensionRequestedDue: preparedRecord.deadlineExtensionRequestedDue || "",
          deadlineExtensionOriginalDue: preparedRecord.deadlineExtensionOriginalDue || "",
          deadlineExtensionReason: preparedRecord.deadlineExtensionReason || "",
          deadlineExtensionRequestedAt: preparedRecord.deadlineExtensionRequestedAt || "",
          deadlineExtensionRequestedById: preparedRecord.deadlineExtensionRequestedById || "",
          deadlineExtensionRequestedByName: preparedRecord.deadlineExtensionRequestedByName || "",
          deadlineExtensionReviewedAt: preparedRecord.deadlineExtensionReviewedAt || "",
          deadlineExtensionReviewedById: preparedRecord.deadlineExtensionReviewedById || "",
          deadlineExtensionReviewedByName: preparedRecord.deadlineExtensionReviewedByName || "",
          deadlineExtensionReviewNote: preparedRecord.deadlineExtensionReviewNote || "",
          blockerStatus: preparedRecord.blockerStatus,
          blockerNote: preparedRecord.blockerNote,
        }
      : {
          ...existingTask,
        };
  if (!canEditDetails && canUpdateCollaborators) {
    mergedRecord.collaboratorIds = taskCollaboratorIds(preparedRecord);
    mergedRecord.collaboratorId = "";
  }
  mergedRecord.qualityPercent = nextQuality;
  const completionResubmitted = nextStatusForQuality === TASK_STATUS_COMPLETED && (
    !existingTask ||
    normalizeTaskStatus(existingTask.status) !== TASK_STATUS_COMPLETED ||
    taskCompletionReviewStatus(existingTask) === "failed"
  );
  if (completionResubmitted) {
    mergedRecord.completionReviewStatus = "pending";
    mergedRecord.completionReviewedAt = "";
    mergedRecord.completionReviewedById = "";
    mergedRecord.completionReviewedByName = "";
    mergedRecord.completionReviewNote = "";
    mergedRecord.lateCompletion = false;
    if (!adminOverride) mergedRecord.qualityPercent = "";
    mergedRecord.qualityAssessedAt = "";
    mergedRecord.qualityAssessedById = "";
    mergedRecord.qualityAssessedByName = "";
  } else if (nextStatusForQuality !== TASK_STATUS_COMPLETED) {
    mergedRecord.completionReviewStatus = "";
    mergedRecord.completionReviewedAt = "";
    mergedRecord.completionReviewedById = "";
    mergedRecord.completionReviewedByName = "";
    mergedRecord.completionReviewNote = "";
    mergedRecord.lateCompletion = false;
  } else if (!mergedRecord.completionReviewStatus) {
    mergedRecord.completionReviewStatus = taskCompletionReviewStatus(existingTask);
  }
  if (nextStatusForQuality !== TASK_STATUS_COMPLETED && !adminOverride) {
    mergedRecord.qualityAssessedAt = "";
    mergedRecord.qualityAssessedById = "";
    mergedRecord.qualityAssessedByName = "";
  } else if (qualityChanged) {
    mergedRecord.qualityAssessedAt = timestamp;
    mergedRecord.qualityAssessedById = actor.id;
    mergedRecord.qualityAssessedByName = actor.name;
  }
  if (existingTask && !adminOverride && canUpdateReport && !sharedSyncSupportsTaskProgressLifecycle()) {
    preserveLegacyTaskProgressLifecycle(mergedRecord, existingTask);
  }

  if (canEditDetails) {
    mergedRecord.assignedById = "";
    mergedRecord.assignedByName = "";
    mergedRecord.assignedAt = "";
    mergedRecord.responseStatus = "";
    mergedRecord.responseNote = "";
    mergedRecord.responseAt = "";
    mergedRecord.responseById = "";
    mergedRecord.responseByName = "";
  }

  if (normalizeTaskStatus(mergedRecord.status) === TASK_STATUS_COMPLETED) {
    // A completed task is always a fully completed task; this also repairs
    // legacy records that were marked completed while their progress was 0%.
    mergedRecord.progress = 100;
  }

  const previousStatus = normalizeTaskStatus(existingTask?.status);
  const nextStatus = normalizeTaskStatus(mergedRecord.status);
  const previousComputedStatus = existingTask ? getDueStatus(existingTask) : previousStatus;
  const nextComputedStatus = getDueStatus(mergedRecord);
  const progressChanged = existingTask && Number(existingTask.progress || 0) !== Number(mergedRecord.progress || 0);
  const statusChanged = existingTask && (previousStatus !== nextStatus || previousComputedStatus !== nextComputedStatus);
  const progressReportNoteText = String(progressReportNote || "").trim();
  const shouldAppendProgressNote = !!progressReportNoteText && (forceProgressReport || !canEditDetails || progressReportNoteText !== (existingTask?.note || ""));
  const updateChangeLabels = existingTask ? taskUpdateChangeLabels(existingTask, mergedRecord) : [];
  const hasTaskUpdate = updateChangeLabels.length > 0 || deadlineExtensionRequest;
  if ((existingTask && !reportLockedByApproval && (canUpdateReport || canEditDetails)) && (shouldAppendProgressNote || hasTaskUpdate)) {
    const updateAction = deadlineExtensionRequest
      ? `Đề nghị gia hạn hạn hoàn thành đến ${formatDate(mergedRecord.deadlineExtensionRequestedDue)}`
      : statusChanged
      ? "Chuyển trạng thái công việc"
      : qualityChanged
        ? "Cập nhật đánh giá chất lượng"
        : collaboratorsChanged
          ? "Cập nhật người phối hợp"
          : progressChanged || shouldAppendProgressNote
            ? "Cập nhật tiến độ công việc"
            : "Cập nhật thông tin công việc";
    const updateNote = deadlineExtensionRequest
      ? `Lý do đề nghị: ${mergedRecord.deadlineExtensionReason}${shouldAppendProgressNote ? ` · Báo cáo tiến độ: ${progressReportNoteText}` : ""}`
      : shouldAppendProgressNote
      ? progressReportNoteText
      : hasTaskUpdate
        ? `Đã thay đổi: ${updateChangeLabels.join(", ")}.`
        : "Cập nhật công việc.";
    mergedRecord.progressReports = [
      ...(mergedRecord.progressReports || []),
      {
        id: uid("task-report"),
        ...(deadlineExtensionRequest ? { type: "deadline-extension-request" } : {}),
        progress: mergedRecord.progress,
        status: nextStatus,
        previousStatus,
        action: updateAction,
        note: updateNote,
        createdAt: timestamp,
        createdById: actor.id,
        createdBy: actor.name,
      },
    ];
  }

  if (nextStatus === "Hoàn thành" && previousStatus !== "Hoàn thành") {
    mergedRecord.completedAt = timestamp;
    mergedRecord.completedById = actor.id;
    mergedRecord.completedByName = actor.name;
  } else if (nextStatus !== "Hoàn thành") {
    mergedRecord.completedAt = "";
    mergedRecord.completedById = "";
    mergedRecord.completedByName = "";
  }

  const totalAttachmentSize = mergedRecord.attachments.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  if (totalAttachmentSize > MAX_TASK_ATTACHMENT_TOTAL_BYTES) {
    alert("Tổng dung lượng hồ sơ đính kèm của một công việc không được vượt quá 5MB.");
    return false;
  }
  const previousTasks = state.tasks;
  const previousActivityLog = state.activityLog;
  const previousEvaluations = state.evaluations;
  const auditedRecord = applyTaskRecordAudit(mergedRecord, existingTask);
  const taskCommand = deadlineExtensionRequest
    ? "request-extension"
    : completionResubmitted
      ? "submit-completion"
      : qualityAssessmentChanged
        ? "review-completion"
        : existingTask && taskEditorProgressOnlyChange(existingTask, auditedRecord)
          ? "update-progress"
          : "save-task";
  const pendingCreation = editContext?.creating && !isOfflineFileRuntime() && sharedSync.session && usingSupabaseSync()
    && !(sharedSync.serverBaseState?.tasks || []).some((task) => String(task.id) === String(auditedRecord.id));
  const commandResult = await submitTaskCommandOnline(existingTask && !pendingCreation ? existingTask : null, auditedRecord, taskCommand);
  if (!commandResult.ok || !sameActor()) return false;
  const committedRecord = commandResult.task || auditedRecord;
  if (!commandResult.remote) {
    state.tasks = index >= 0 ? state.tasks.map((item) => (item.id === preparedRecord.id ? committedRecord : item)) : [...state.tasks, committedRecord];
  }
  syncPersonalEvaluationTaskScoresForTask(committedRecord, existingTask);
  const owner = personById(committedRecord.ownerId);
  const collaboratorNames = taskCollaboratorNames(committedRecord);
  const collaboratorMeta = collaboratorNames.length ? ` · phối hợp ${collaboratorNames.join(", ")}` : "";
  const projectMeta = committedRecord.projectName ? ` · dự án ${committedRecord.projectName}` : "";
  const action = !existingTask
    ? "Tạo"
    : canEditDetails && detailsChanged
      ? "Cập nhật thường kỳ"
      : updateChangeLabels.length
        ? "Cập nhật công việc"
      : collaboratorsChanged
        ? "Cập nhật người phối hợp"
      : qualityAssessmentChanged
        ? "Đánh giá chất lượng"
      : "Cập nhật tiến độ";
  logActivity({
    action,
    module: "Công việc",
    targetType: "task",
    targetId: preparedRecord.id,
    personId: committedRecord.ownerId,
    departmentId: owner?.departmentId || "",
    period: taskPeriod(committedRecord),
    title: committedRecord.title,
    details: `${taskKindLabels[recordKind]} · ${taskWorkMeta(committedRecord)}${projectMeta} · ${taskOwnerName(committedRecord, "Chưa rõ người nhận")}${collaboratorMeta} · ${normalizeTaskStatus(committedRecord.status)} · hoàn thành ${formatTaskDeadline(committedRecord) || "chưa có"}${taskHasQualityPercent(committedRecord) ? ` · chất lượng ${formatScore(taskQualityPercentValue(committedRecord))}%` : ""}`,
    score: taskHasQualityPercent(committedRecord)
      ? `Tiến độ ${formatScore(committedRecord.progress)}% · Chất lượng ${formatScore(taskQualityPercentValue(committedRecord))}%`
      : `${formatScore(committedRecord.progress)}%`,
  });
  try {
    saveState();
  } catch {
    if (commandResult.remote) {
      showSystemToast("Công việc đã được lưu trên máy chủ", "Bộ nhớ cục bộ không đủ để lưu bản sao tệp; dữ liệu online vẫn được giữ nguyên.", { tone: "warning", duration: 9000 });
      resetCallback();
      renderAll();
      return true;
    }
    state.tasks = previousTasks;
    state.activityLog = previousActivityLog;
    state.evaluations = previousEvaluations;
    alert("Không thể lưu hồ sơ đính kèm vì dung lượng dữ liệu trình duyệt đã đầy. Vui lòng giảm số lượng hoặc dung lượng tệp.");
    return false;
  }
  if (!commandResult.remote && (!existingTask || sharedSync.session) && !await confirmTaskMutationOnline(committedRecord.id)) return false;
  if (!sameActor()) return false;
  resetCallback();
  renderAll();
  return true;
}

async function reviewTaskCompletion(taskId, decision, note = "", qualityPercent = "") {
  const actorId = String(currentAccount()?.id || "");
  const taskIndex = state.tasks.findIndex((item) => item.id === taskId);
  const task = taskIndex >= 0 ? state.tasks[taskIndex] : null;
  if (!task || !canReviewTaskCompletion(task) || !["passed", "failed"].includes(decision)) return false;

  const timestamp = new Date().toISOString();
  const actor = currentActorInfo();
  const previousStatus = getDueStatus(task);
  const previousWorkflowStatus = normalizeTaskStatus(task.status);
  const approved = decision === "passed";
  const assessedQuality = approved ? normalizeTaskQualityInput(qualityPercent) : "";
  if (approved && assessedQuality === "") {
    alert("Nhập Đánh giá chất lượng trước khi lưu kết quả Đạt.");
    return false;
  }
  const wasApproved = taskCompletionIsApproved(task);
  const completionReviewedAt = approved && wasApproved && task.completionReviewedAt ? task.completionReviewedAt : timestamp;
  const returnedStatus = previousStatus === "Quá hạn" || taskIsPastDeadline(task) ? "Quá hạn" : "Đang thực hiện";
  const completedAtForReview = task.completedAt || timestamp;
  const lateCompletion = approved
    ? task?.due
      ? !isTimestampBeforeDeadline(completedAtForReview, task)
      : false
    : false;
  const nextTask = {
    ...task,
    status: approved ? TASK_STATUS_COMPLETED : returnedStatus,
    completionReviewStatus: decision,
    completionReviewedAt,
    completionReviewedById: actor.id,
    completionReviewedByName: actor.name,
    completionReviewNote: String(note || "").trim(),
    lateCompletion,
    qualityPercent: assessedQuality,
    qualityAssessedAt: approved ? timestamp : "",
    qualityAssessedById: approved ? actor.id : "",
    qualityAssessedByName: approved ? actor.name : "",
  };
  if (approved) {
    nextTask.completedAt = completedAtForReview;
    nextTask.completedById = task.completedById || task.ownerId || "";
    nextTask.completedByName = task.completedByName || personById(task.ownerId)?.name || "";
  } else {
    nextTask.completedAt = "";
    nextTask.completedById = "";
    nextTask.completedByName = "";
  }
  const nextStatus = getDueStatus(nextTask);
  const completionTimingStatus = approved ? taskCompletionTimingStatus(nextTask) : "";
  const completionTimingLabel = approved ? taskCompletionTimingLabel(nextTask) : "";
  nextTask.progressReports = [
    ...(task.progressReports || []),
    {
      id: uid("task-report"),
      type: "completion-review",
      decision,
      action: approved
        ? `${wasApproved ? "Cập nhật đánh giá chất lượng" : "Đánh giá hoàn thành: Đạt"}${completionTimingLabel ? ` · ${completionTimingLabel}` : ""} · Chất lượng: ${formatScore(assessedQuality)}%`
        : `Đánh giá hoàn thành: Không đạt · Chuyển về ${returnedStatus}`,
      previousStatus: previousWorkflowStatus,
      status: normalizeTaskStatus(nextTask.status),
      progress: Number(nextTask.progress || 0),
      qualityPercent: assessedQuality,
      completionTiming: completionTimingStatus,
      note: String(note || "").trim(),
      createdAt: timestamp,
      createdById: actor.id,
      createdBy: actor.name,
    },
  ];
  const auditedTask = applyTaskRecordAudit(nextTask, task);
  const commandResult = await submitTaskCommandOnline(task, auditedTask, "review-completion");
  if (!commandResult.ok || String(currentAccount()?.id || "") !== actorId) return false;
  const committedTask = commandResult.task || auditedTask;
  if (!commandResult.remote) {
    state.tasks = state.tasks.map((item, index) => (index === taskIndex ? committedTask : item));
  }
  const gpmbAdvanced = approved && isGpmbWorkflowTask(committedTask) && !commandResult.remote
    ? ensureGpmbWorkflowProgressionLocally(committedTask.gpmbWorkflowId, committedTask.id)
    : false;
  syncPersonalEvaluationTaskScoresForTask(committedTask, task);
  const owner = personById(committedTask.ownerId);
  logActivity({
    action: approved
      ? wasApproved
        ? "Cập nhật đánh giá chất lượng"
        : `Đánh giá công việc Đạt${completionTimingLabel ? ` · ${completionTimingLabel}` : ""}`
      : `Đánh giá công việc Không đạt · Chuyển về ${returnedStatus}`,
    module: "Công việc",
    targetType: "task",
    targetId: committedTask.id,
    personId: committedTask.ownerId,
    departmentId: owner?.departmentId || "",
    period: taskPeriod(committedTask),
    detail: `${committedTask.title} · ${previousWorkflowStatus} -> ${normalizeTaskStatus(committedTask.status)}${approved && completionTimingLabel ? ` · ${completionTimingLabel}` : ""}${approved ? ` · chất lượng ${formatScore(assessedQuality)}%` : ""}${note ? ` · ${String(note).trim()}` : ""}`,
  });
  saveState();
  renderAll();
  if (gpmbAdvanced) showSystemToast("Đã chuyển bước GPMB", "Công việc của bước tiếp theo đã được phát sinh theo quy trình.", { tone: "success" });
  return true;
}

async function reviewTaskDeadlineExtension(taskId, decision, note = "") {
  const actorId = String(currentAccount()?.id || "");
  const taskIndex = state.tasks.findIndex((item) => item.id === taskId);
  const task = taskIndex >= 0 ? state.tasks[taskIndex] : null;
  const reviewNote = String(note || "").trim();
  const requestedDue = String(task?.deadlineExtensionRequestedDue || "");
  if (!task || !canReviewTaskDeadlineExtension(task) || !["approved", "rejected"].includes(decision)) return false;
  if (!await ensureTaskDeadlineExtensionReviewSupported()) return false;
  if (String(currentAccount()?.id || "") !== actorId) return false;
  if (reviewNote.length < 3) {
    alert("Vui lòng ghi ý kiến duyệt (ít nhất 3 ký tự).");
    return false;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDue) || requestedDue !== String(task.followUpDate || "") || requestedDue <= String(task.due || "")) {
    alert("Đề nghị gia hạn không còn hợp lệ. Hãy tải lại dữ liệu công việc trước khi duyệt.");
    return false;
  }

  const timestamp = new Date().toISOString();
  const actor = currentActorInfo();
  const approved = decision === "approved";
  const nextTask = {
    ...task,
    due: approved ? requestedDue : task.due,
    deadlineExtensionStatus: decision,
    deadlineExtensionReviewedAt: timestamp,
    deadlineExtensionReviewedById: actor.id,
    deadlineExtensionReviewedByName: actor.name,
    deadlineExtensionReviewNote: reviewNote,
    progressReports: [
      ...(task.progressReports || []),
      {
        id: uid("task-report"),
        type: "deadline-extension-review",
        decision,
        action: approved
          ? `Chấp nhận gia hạn đến ${formatDate(requestedDue)}`
          : `Không chấp nhận gia hạn; giữ hạn ${formatTaskDeadline(task) || "hiện tại"}`,
        note: reviewNote,
        progress: Number(task.progress || 0),
        status: normalizeTaskStatus(task.status),
        createdAt: timestamp,
        createdById: actor.id,
        createdBy: actor.name,
      },
    ],
  };
  const auditedTask = applyTaskRecordAudit(nextTask, task);
  const commandResult = await submitTaskCommandOnline(task, auditedTask, "review-extension");
  if (!commandResult.ok || String(currentAccount()?.id || "") !== actorId) return false;
  const committedTask = commandResult.task || auditedTask;
  if (!commandResult.remote) {
    state.tasks = state.tasks.map((item, index) => index === taskIndex ? committedTask : item);
  }
  syncPersonalEvaluationTaskScoresForTask(committedTask, task);
  const owner = personById(committedTask.ownerId);
  logActivity({
    action: approved ? "Chấp nhận gia hạn công việc" : "Không chấp nhận gia hạn công việc",
    module: "Công việc",
    targetType: "task",
    targetId: committedTask.id,
    personId: committedTask.ownerId,
    departmentId: owner?.departmentId || "",
    period: taskPeriod(committedTask),
    detail: `${committedTask.title} · hạn ${formatTaskDeadline(task) || "chưa có"} -> ${formatTaskDeadline(committedTask) || "chưa có"} · ${reviewNote}`,
  });
  saveState();
  renderAll();
  return true;
}

globalThis.QldaFeatures.register("tasks-editor", FEATURE_VERSION, { saveTaskRecord, reviewTaskCompletion, reviewTaskDeadlineExtension });
})();
