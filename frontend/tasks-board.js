(() => {
"use strict";
const FEATURE_VERSION = "3.4.192";

let pendingVisibleLimit = 0;
let serverPages = null;
let serverReadGeneration = 0;
let serverPageBusy = false;

function serverPageQuery() {
  return {scope:currentTaskDisplayScope(),period:taskDisplayScopePeriod(),search:byId("taskSearch").value.trim().toLowerCase(),
    status:byId("taskStatusFilter").value,project:currentTaskProjectFilter(),department:currentTaskDepartmentFilter(),
    person:currentTaskPersonFilter(),...currentTaskTimeFilter(),limit:40,offsetMinutes:new Date().getTimezoneOffset()};
}
function serverPageIdentity() {
  return JSON.stringify([currentAccount()?.id,sharedSync.sessionToken,sharedSync.revision,sharedSync.localChangeVersion,serverPageQuery()]);
}
function canReadServerPages() {
  return taskServerReadsEnabled() && !sharedSync.pending && !sharedSync.dirty && !sharedSync.inFlight && activeViewId() === "tasks";
}
function taskForBoardAction(id) {
  return serverPages?.buckets.flatMap((bucket)=>bucket.tasks).find((task)=>task.id===id) || state.tasks.find((task)=>task.id===id);
}
function showTaskPageError(error) {
  const host = byId("taskBoard");
  const message = document.createElement("p"); message.className="muted"; message.setAttribute("role","status");
  message.textContent = error.code === "TASK_PAGE_CHANGED" ? error.message : "Chưa tải được công việc từ máy chủ. Dữ liệu và nội dung đang nhập vẫn được giữ.";
  const retry=document.createElement("button"); retry.type="button"; retry.className="ghost"; retry.textContent="Tải lại danh sách";
  retry.addEventListener("click",()=>renderTaskBoard());
  host.replaceChildren(message,retry);
  byId("taskCompletionPendingList").textContent="Chưa tải được danh sách chờ phê duyệt.";
  byId("taskCompletionPendingCount").textContent="—";
}
async function renderServerTaskBoard(options = {}, status = "", cursor = "") {
  if (serverPageBusy && cursor) return;
  const generation=++serverReadGeneration, identity=serverPageIdentity(), previous=serverPages;
  serverPageBusy=true;
  if (!cursor) {
    serverPages=null;
    byId("taskBoard").innerHTML='<p class="muted" role="status">Đang tải công việc...</p>';
    byId("taskCompletionPendingList").textContent="Đang tải công việc...";
    byId("taskCompletionPendingCount").textContent="—";
  }
  const current=()=>generation===serverReadGeneration && identity===serverPageIdentity() && canAccessView("tasks") && activeViewId()==="tasks";
  try {
    const reader=await window.QldaFeatures.load("tasks-reader");
    if(!current()) return;
    const payload=await reader.readPage({...serverPageQuery(),bucket:status||"board",...(cursor?{cursor}:{})});
    if(!current()) return;
    if(payload===null) { serverPages=null;return renderTaskBoard(options); }
    if(cursor) {
      if(!previous || previous.revision!==payload.revision) {const error=new Error("Danh sách công việc đã thay đổi. Hãy tải lại danh sách.");error.code="TASK_PAGE_CHANGED";throw error;}
      const next=payload.buckets.find((bucket)=>bucket.status===status), old=previous.buckets.find((bucket)=>bucket.status===status);
      if(!next || !old || next.total!==old.total || next.tasks.some((task)=>old.tasks.some((item)=>item.id===task.id))) throw new Error("TASK_PAGE_INVALID");
      serverPages={...previous,buckets:previous.buckets.map((bucket)=>bucket.status===status?{...next,tasks:[...old.tasks,...next.tasks]}:bucket)};
    } else serverPages=payload;
    renderTaskBoard({...options,serverPage:serverPages});
  } catch(error) {
    if(current()) {serverPages=null;showTaskPageError(error);}
  } finally {if(generation===serverReadGeneration)serverPageBusy=false;}
}

function renderTaskCompletionPendingList(tasks = pendingTaskCompletionRecords(), page = null) {
  const list = byId("taskCompletionPendingList");
  if (!list) return;
  const limit = pendingVisibleLimit || TASK_BOARD_INITIAL_RENDER_LIMIT;
  const shownTasks = page ? tasks : tasks.slice(0, limit);
  const remaining = (page?.total ?? tasks.length) - shownTasks.length;
  const filterSummary = pendingTaskCompletionFilterSummary();
  byId("taskCompletionPendingCount").textContent = String(page?.total ?? tasks.length);
  list.classList.toggle("empty-state", !tasks.length);
  list.innerHTML = tasks.length
    ? shownTasks.map((task) => {
        const owner = taskOwnerName(task, "Chưa cập nhật");
        const collaborators = taskCollaboratorNames(task);
        const canReview = canReviewTaskCompletion(task);
        return `
          <article class="task-completion-pending-item">
            <div class="task-completion-pending-main">
              <button class="task-completion-pending-title" type="button" data-open-pending-task="${escapeHtml(task.id)}">${escapeHtml(task.title || "Công việc")}</button>
              <div class="task-completion-pending-meta">
                <span>${escapeHtml(projectNameForTask(task) || "Chưa gắn dự án")}</span>
                <span>Hoàn thành ${escapeHtml(formatTaskDeadline(task) || "chưa cập nhật")}</span>
                <span>Tiến độ ${formatScore(task.progress || 0)}%</span>
              </div>
              <p>${escapeHtml(owner)}${collaborators.length ? ` · ${escapeHtml(collaborators.join(", "))}` : ""}</p>
            </div>
            <div class="task-completion-pending-actions">
              ${canReview ? `<button type="button" data-review-pending-task="${escapeHtml(task.id)}">Đánh giá</button>` : ""}
              <button class="ghost" type="button" data-open-pending-task="${escapeHtml(task.id)}">Mở</button>
            </div>
          </article>
        `;
      }).join("") + (remaining ? `<button class="ghost task-column-load-more" data-load-more-pending-tasks type="button">Hiển thị thêm ${Math.min(TASK_BOARD_RENDER_STEP, remaining)} công việc (${remaining} còn lại)</button>` : "")
    : `Không có công việc chờ phê duyệt${filterSummary ? " theo điều kiện đang lọc" : ""}.`;
}

function renderTaskPersonFilterNote() {
  const note = byId("taskPersonFilterNote");
  if (!note) return;
  const person = personById(currentTaskPersonFilter());
  note.classList.toggle("is-hidden", !person);
  note.innerHTML = person
    ? `<span>Đang xem công việc có liên quan tới <strong>${escapeHtml(person.name)}</strong>.</span><button class="ghost" data-clear-task-person-filter type="button">Bỏ lọc</button>`
    : "";
}

function renderTaskBoard(options = {}) {
  if(!options.serverPage && canReadServerPages()) return renderServerTaskBoard(options);
  if(!options.serverPage) {serverReadGeneration++;serverPages=null;serverPageBusy=false;}
  syncTaskDisplayScopeControls();
  byId("openTaskForm")?.classList.toggle("is-hidden", !canCreateRegularTasks());
  byId("openTaskBulkImport")?.classList.toggle("is-hidden", !isAdmin());
  // One fresh, authorized read per synchronous render; never retain it across accounts or writes.
  const visibleRows = options.serverPage ? [] : taskViewRecords();
  if(options.serverPage) {
    renderTaskProjectFilterOptions(options.serverPage.projects.map((projectName)=>({projectName})));
    const select=byId("taskDepartmentFilter"), selected=currentTaskDepartmentFilter();
    select.classList.toggle("is-hidden",!canViewAllData());select.disabled=!canViewAllData();
    fillSelect(select,[{value:"",label:"Tất cả phòng"},...departments.filter((department)=>options.serverPage.departmentIds.includes(department.id))
      .sort((a,b)=>a.name.localeCompare(b.name,"vi")).map((department)=>({value:department.id,label:department.name}))],selected);
  } else {
    renderTaskProjectFilterOptions(visibleRows);
    renderTaskDepartmentFilterOptions(visibleRows);
  }
  const search = byId("taskSearch").value.trim().toLowerCase();
  const filter = byId("taskStatusFilter").value;
  const timeFilter = currentTaskTimeFilter();
  const projectFilter = currentTaskProjectFilter();
  const departmentId = currentTaskDepartmentFilter();
  const nextRenderSignature = JSON.stringify([String(currentAccount()?.id || ""), state.activePeriod, currentTaskDisplayScope(), search, filter, timeFilter.from, timeFilter.to, projectFilter, departmentId, currentTaskPersonFilter()]);
  if (taskBoardRenderSignature !== nextRenderSignature) {
    taskBoardRenderSignature = nextRenderSignature;
    taskBoardVisibleLimits.clear();
    pendingVisibleLimit = 0;
  }
  const matchingRows = filterTaskViewRecords(visibleRows, { search, timeFilter, projectFilter, departmentId });
  const pendingPage=options.serverPage?.buckets.find((bucket)=>bucket.status===TASK_STATUS_PENDING_REVIEW);
  renderTaskCompletionPendingList(pendingPage?.tasks || matchingRows.filter(taskCompletionNeedsReview).sort(compareTaskRecords),pendingPage);
  renderTaskPersonFilterNote();
  const tasks = matchingRows.filter((task) => taskMatchesStatusFilter(task, filter));

  const renderTaskColumns = () => {
    const boardStatuses = filter === TASK_STATUS_PENDING_REVIEW
      ? [TASK_STATUS_PENDING_REVIEW]
      : filter === TASK_STATUS_RECURRENCE_STOPPED ? [TASK_STATUS_RECURRENCE_STOPPED] : taskStatuses;
    return boardStatuses
      .map((status) => {
        const page=options.serverPage?.buckets.find((bucket)=>bucket.status===status);
        const statusTasks = page?.tasks || tasks.filter((task) => taskMatchesStatusFilter(task, status));
        const count = page?.total ?? statusTasks.length;
        const displayLimit = taskBoardVisibleLimits.get(status) || TASK_BOARD_INITIAL_RENDER_LIMIT;
        const renderedTasks = page ? statusTasks : statusTasks.slice(0, displayLimit);
        const cards = renderedTasks
          .map((task) => {
            const collaboratorNames = taskCollaboratorNames(task);
            const taskKind = normalizeTaskKind(task);
            const editable = canEditTaskDetails(task) && !isRecurrenceStoppedTask(task);
            const deletable = canDeleteTask(task);
            const copyable = canCopyTask(task);
            const reportable = canUpdateTaskProgress(task);
            const reviewable = canReviewTaskCompletion(task);
            const attachments = task.attachments || [];
            const latestReport = latestTaskProgressReport(task);
            const violations = taskViolationReasons(task);
            const reportText = latestReport
              ? `${formatScore(latestReport.progress)}% · ${formatDateTime(latestReport.createdAt)}`
              : "Chưa có cập nhật tiến độ";
            const attachmentList = attachments.length
              ? `<div class="task-attachments">${attachments
                  .map((file) => taskAttachmentLinkHtml(file))
                  .join("")}</div>`
              : "";
            return `
              <article class="task-card task-card-clickable" data-open-task-detail="${escapeHtml(task.id)}">
                <h4>${escapeHtml(task.title)}</h4>
                ${projectNameForTask(task) ? `<div class="task-meta">Dự án: ${escapeHtml(projectNameForTask(task))}</div>` : ""}
                <div class="task-meta">Người thực hiện ${escapeHtml(taskOwnerName(task))} · bắt đầu ${escapeHtml(formatTaskStartDate(task) || "chưa có")} · hoàn thành ${escapeHtml(formatTaskDeadline(task) || "chưa có")}</div>
                ${collaboratorNames.length ? `<div class="task-meta">Người phối hợp: ${escapeHtml(collaboratorNames.join(", "))}</div>` : ""}
                <div class="task-meta">${escapeHtml(taskWorkMeta(task))}</div>
                <span class="badge ${status === "Quá hạn" ? "bad" : status === "Hoàn thành" ? "good" : "warn"}">${escapeHtml(taskKindLabels[taskKind] || "Công việc")}: ${escapeHtml(task.category)}</span>
                <div class="task-status-grid">
                  <span><strong>Cập nhật:</strong> ${escapeHtml(reportText)}</span>
                  ${taskDeadlineExtensionPending(task) ? `<span class="task-extension-pending"><strong>Chờ duyệt gia hạn:</strong> ${escapeHtml(formatDate(task.deadlineExtensionRequestedDue) || "")}</span>` : ""}
                  ${taskCompletionReviewStatus(task) ? `<span><strong>Đánh giá hoàn thành:</strong> ${taskCompletionReviewValueHtml(task)}</span>` : ""}
                  <span><strong>Chất lượng:</strong> ${escapeHtml(taskQualityLabel(task))} · Thực hiện KPI ${formatScore(taskKpiActualScore(task))}</span>
                </div>
                <div class="progress" aria-label="Tiến độ ${task.progress}%"><span style="width:${clamp(task.progress, 0, 100)}%"></span></div>
                ${violations.length ? `<div class="task-violation">${escapeHtml(violations.join("; "))}</div>` : ""}
                ${attachmentList}
                <div class="row-actions task-card-actions">
                  ${reportable ? `<button class="task-progress-update-button" data-respond-task="${task.id}" type="button" title="Cập nhật" aria-label="Cập nhật"><span>Cập nhật</span></button>` : ""}
                  ${editable ? `<button class="ghost task-icon-button" data-edit-task="${task.id}" type="button" title="Sửa công việc" aria-label="Sửa công việc"><span aria-hidden="true">&#9998;</span></button>` : ""}
                  ${copyable ? `<button class="ghost task-icon-button" data-copy-task="${task.id}" type="button" title="Sao chép công việc" aria-label="Sao chép công việc"><span aria-hidden="true">&#9112;</span></button>` : ""}
                  ${reviewable ? `<button class="ghost task-icon-button task-icon-approve" data-review-task="${task.id}" type="button" title="Duyệt hoàn thành" aria-label="Duyệt hoàn thành"><span aria-hidden="true">&#10003;</span></button>` : ""}
                  ${deletable ? `<button class="ghost task-icon-button task-icon-delete" data-delete-task="${task.id}" type="button" title="Xóa công việc" aria-label="Xóa công việc"><span aria-hidden="true">&times;</span></button>` : ""}
                  ${editable || copyable || deletable || reportable || reviewable ? "" : "<span class=\"muted\">Chỉ xem</span>"}
                </div>
              </article>
            `;
          })
          .join("");
        const remaining = Math.max(0, count - renderedTasks.length);
        return `
          <section class="task-column">
            <button class="task-column-head" data-open-task-status="${escapeHtml(status)}" type="button" aria-label="Xem tất cả công việc trạng thái ${escapeHtml(status)}">
              <span>${escapeHtml(status)}</span>
              <strong>${count}</strong>
            </button>
            ${cards || "<div class=\"empty-state\">Không có công việc.</div>"}
            ${remaining ? `<button class="ghost task-column-load-more" data-load-more-task-status="${escapeHtml(status)}" type="button">Hiển thị thêm ${Math.min(TASK_BOARD_RENDER_STEP, remaining)} công việc (${remaining} còn lại)</button>` : ""}
          </section>
        `;
      })
      .join("");
  };

  byId("taskBoard").innerHTML = `<div class="task-columns">${renderTaskColumns()}</div>`;
  scheduleVisibleViewWork("tasks", () => hydrateTaskAttachmentLinks(byId("taskBoard")));
  if (options.applyCustomization !== false) applyFieldCustomizations();
}

function renderTaskStatusDetailItem(task) {
  const collaboratorNames = taskCollaboratorNames(task);
  const status = task.computedStatus || getDueStatus(task);
  const latestReport = latestTaskProgressReport(task);
  const violations = taskViolationReasons(task);
  const attachments = task.attachments || [];
  const canOpen = canOpenTask(task);
  return `
    <article class="kpi-task-detail-item">
      <div class="section-head">
        <div>
          <span class="badge ${taskStatusBadgeClass(status)}">${escapeHtml(status)}</span>
          <h3>${escapeHtml(task.title)}</h3>
        </div>
        ${canOpen ? `<button class="ghost" data-open-status-task="${escapeHtml(task.id)}" type="button">Mở công việc</button>` : "<span class=\"muted\">Chỉ xem</span>"}
      </div>
      <div class="kpi-task-detail-meta">
        <span><strong>Người thực hiện:</strong> ${escapeHtml(taskOwnerName(task))}</span>
        <span><strong>Người phối hợp:</strong> ${escapeHtml(collaboratorNames.length ? collaboratorNames.join(", ") : "Không chọn")}</span>
        <span><strong>Tên dự án:</strong> ${escapeHtml(projectNameForTask(task) || "Chưa cập nhật")}</span>
        <span><strong>Nhóm công việc:</strong> ${escapeHtml(taskKindLabels[normalizeTaskKind(task)] || "Công việc")}</span>
        <span><strong>Danh mục KPI:</strong> ${escapeHtml(task.category || "Chưa phân loại")}</span>
        <span><strong>Loại công việc:</strong> ${escapeHtml(taskWorkTypeLabels[normalizeTaskWorkType(task)])}</span>
        <span><strong>Định kỳ:</strong> ${escapeHtml(taskRecurrenceLabels[normalizeTaskRecurrence(task)])}</span>
        <span><strong>Ngày bắt đầu:</strong> ${escapeHtml(formatTaskStartDate(task) || "Chưa có")}</span>
        <span><strong>Ngày hoàn thành:</strong> ${escapeHtml(formatTaskDeadline(task) || "Chưa có")}</span>
        <span><strong>Tiến độ:</strong> ${formatScore(task.progress)}%</span>
        <span><strong>Đánh giá hoàn thành:</strong> ${taskCompletionReviewValueHtml(task)}</span>
        <span><strong>Đánh giá chất lượng:</strong> ${escapeHtml(taskQualityLabel(task))}</span>
        <span><strong>Điểm thực hiện KPI:</strong> ${formatScore(taskKpiActualScore(task))}</span>
        <span><strong>Cập nhật gần nhất:</strong> ${escapeHtml(latestReport ? `${formatScore(latestReport.progress)}% - ${formatDateTime(latestReport.createdAt)}` : "Chưa có")}</span>
        <span><strong>Hồ sơ:</strong> ${attachments.length ? `${attachments.length} tệp` : "Chưa có"}</span>
      </div>
      ${task.note ? `<p class="kpi-task-detail-note"><strong>Nội dung/Báo cáo:</strong> ${escapeHtml(task.note)}</p>` : ""}
      ${latestReport?.note && latestReport.note !== task.note ? `<p class="kpi-task-detail-note"><strong>Báo cáo gần nhất:</strong> ${escapeHtml(latestReport.note)}</p>` : ""}
      ${taskProgressReportListHtml(task)}
      ${violations.length ? `<div class="task-violation">${escapeHtml(violations.join("; "))}</div>` : ""}
    </article>
  `;
}

async function readAllTaskStatusPages(status) {
  const reader=await window.QldaFeatures.load("tasks-reader"), identity=serverPageIdentity(), surface=taskSurfaceGeneration;
  const tasks=[],seen=new Set(),cursors=new Set(); let cursor="", revision=null;
  do {
    const payload=await reader.readPage({...serverPageQuery(),status,bucket:status||"all",...(cursor?{cursor}:{})});
    if(identity!==serverPageIdentity() || surface!==taskSurfaceGeneration || !canAccessView("tasks") || activeViewId()!=="tasks") return false;
    if(payload===null) return null;
    if(revision!==null && revision!==payload.revision) throw new Error("TASK_PAGE_CHANGED");
    revision=payload.revision;
    const page=payload.buckets[0];
    if(!page || page.status!==(status||"all"))throw new Error("TASK_PAGE_INVALID");
    for(const task of page.tasks) {if(seen.has(task.id))throw new Error("TASK_PAGE_INVALID");seen.add(task.id);tasks.push(task);}
    cursor=page.nextCursor;
    if(cursor && cursors.has(cursor))throw new Error("TASK_PAGE_INVALID");cursors.add(cursor);
    if(!cursor && tasks.length!==page.total)throw new Error("TASK_PAGE_INVALID");
  }while(cursor);
  return tasks.map((task)=>({...task,status:normalizeTaskStatus(task.status),computedStatus:getDueStatus(task)}));
}

function openTaskStatusDetailDialog(status, options = {}) {
  if(!Array.isArray(options.tasks) && canReadServerPages()) {
    const identity=serverPageIdentity(),surface=taskSurfaceGeneration;
    byId("taskStatusDetailTitle").textContent="Đang tải công việc...";
    byId("taskStatusDetailSubtitle").textContent="";byId("taskStatusDetailContext").textContent="";
    byId("taskStatusDetailList").textContent="Đang tải danh sách từ máy chủ...";
    byId("exportTaskStatusDetailExcel").disabled=true;taskStatusDetailExport=null;
    byId("taskStatusDetailDialog").classList.remove("is-hidden");byId("taskStatusDetailDialog").setAttribute("aria-hidden","false");
    return readAllTaskStatusPages(status).then((tasks)=> {
      if(tasks===false || identity!==serverPageIdentity() || surface!==taskSurfaceGeneration)return false;
      if(tasks===null)return openTaskStatusDetailDialog(status,options);
      return openTaskStatusDetailDialog(status,{...options,tasks});
    }).catch(()=> {
      if(identity===serverPageIdentity() && surface===taskSurfaceGeneration)byId("taskStatusDetailList").textContent="Chưa tải đủ danh sách. Hãy đóng và mở lại; dữ liệu không bị thay đổi.";
      return false;
    });
  }
  const search = byId("taskSearch").value.trim();
  const timeFilter = currentTaskTimeFilter();
  const tasks = Array.isArray(options.tasks)
    ? [...options.tasks].sort(compareTaskRecords)
    : visibleTaskRecords(search, status, timeFilter).sort(compareTaskRecords);
  const averageProgress = tasks.length ? tasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) / tasks.length : 0;
  const nextDeadlineTask = tasks.find((task) => taskDeadlineDate(task));
  const rangeLabel = [
    timeFilter.from && `từ ${formatDate(timeFilter.from)}`,
    timeFilter.to && `đến ${formatDate(timeFilter.to)}`,
  ].filter(Boolean).join(" ");
  const reportTitle = options.title || status || "Tất cả trạng thái";
  const reportSubtitle = options.subtitle || [
    "Danh sách công việc",
    `phạm vi ${taskDisplayScopeLabel()}`,
    search && `đang lọc theo "${search}"`,
    rangeLabel && `ngày hoàn thành ${rangeLabel}`,
  ].filter(Boolean).join(" · ");
  byId("taskStatusDetailTitle").textContent = `${reportTitle} (${tasks.length})`;
  byId("taskStatusDetailSubtitle").textContent = reportSubtitle;
  byId("taskStatusDetailContext").innerHTML = options.contextHtml || `
    <span><strong>${tasks.length}</strong> công việc</span>
    <span><strong>${formatScore(averageProgress)}%</strong> tiến độ bình quân</span>
    <span><strong>${nextDeadlineTask ? formatTaskDeadline(nextDeadlineTask) : "Chưa có"}</strong> mốc hoàn thành gần nhất</span>
  `;
  byId("taskStatusDetailList").innerHTML = tasks.length
    ? tasks.map(renderTaskStatusDetailItem).join("")
    : `<div class="empty-state">Không có công việc thuộc trạng thái này.</div>`;
  taskStatusDetailExport = taskStatusDetailExportData({ title: reportTitle, subtitle: reportSubtitle, tasks });
  byId("exportTaskStatusDetailExcel").disabled = !tasks.length;
  byId("taskStatusDetailDialog").classList.remove("is-hidden");
  byId("taskStatusDetailDialog").setAttribute("aria-hidden", "false");
}

function openTaskCompletionPendingDetailDialog() {
  if(canReadServerPages()) return openTaskStatusDetailDialog(TASK_STATUS_PENDING_REVIEW);
  const tasks = pendingTaskCompletionRecords();
  const filterSummary = pendingTaskCompletionFilterSummary();
  openTaskStatusDetailDialog(TASK_STATUS_PENDING_REVIEW, {
    tasks,
    title: "Chờ phê duyệt hoàn thành",
    subtitle: `Danh sách công việc hoàn thành đang chờ đánh giá trong phạm vi ${taskDisplayScopeLabel()}${filterSummary ? ` · ${filterSummary}` : ""}.`,
  });
}




let initialized = false;
function initialize() {
  if (initialized) return;
  initialized = true;
  byId("taskSearch").addEventListener("input", debounce(renderTaskBoard, 200));
  byId("taskScopeFilter").addEventListener("change", (event) => setTaskDisplayScope(event.target.value));
  byId("taskProjectFilter").addEventListener("change", renderTaskBoard);
  byId("taskDepartmentFilter").addEventListener("change", renderTaskBoard);
  byId("taskStatusFilter").addEventListener("change", renderTaskBoard);
  byId("taskPersonFilterNote").addEventListener("click", (event) => {
    if (!event.target.closest("[data-clear-task-person-filter]")) return;
    taskDashboardPersonFilterId = "";
    renderTaskBoard();
  });
  byId("taskDateFrom").addEventListener("change", renderTaskBoard);
  byId("taskDateTo").addEventListener("change", renderTaskBoard);
  byId("clearTaskTimeFilter").addEventListener("click", () => {
    clearTaskTimeFilter();
    renderTaskBoard();
  });
  byId("taskStatusDetailList").addEventListener("click", (event) => {
    const taskId = event.target.closest("[data-open-status-task]")?.dataset.openStatusTask;
    if (!taskId) return;
    closeTaskStatusDetailDialog();
    openTaskDetailDialog(taskId);
  });
  byId("taskBoard").addEventListener("click", (event) => {
    const loadMoreStatus = event.target.closest("[data-load-more-task-status]")?.dataset.loadMoreTaskStatus;
    const statusButton = event.target.closest("[data-open-task-status]");
    const detailId = event.target.closest("[data-open-task-detail]")?.dataset.openTaskDetail;
    const editId = event.target.closest("[data-edit-task]")?.dataset.editTask;
    const copyId = event.target.closest("[data-copy-task]")?.dataset.copyTask;
    const respondId = event.target.closest("[data-respond-task]")?.dataset.respondTask;
    const reviewId = event.target.closest("[data-review-task]")?.dataset.reviewTask;
    const deadlineReviewId = event.target.closest("[data-review-deadline-extension]")?.dataset.reviewDeadlineExtension;
    const deleteId = event.target.closest("[data-delete-task]")?.dataset.deleteTask;
    if (loadMoreStatus) {
      const page=serverPages?.buckets.find((bucket)=>bucket.status===loadMoreStatus);
      if(page?.nextCursor) {renderServerTaskBoard({},loadMoreStatus,page.nextCursor);return;}
      const currentLimit = taskBoardVisibleLimits.get(loadMoreStatus) || TASK_BOARD_INITIAL_RENDER_LIMIT;
      taskBoardVisibleLimits.set(loadMoreStatus, currentLimit + TASK_BOARD_RENDER_STEP);
      renderTaskBoard();
      return;
    }
    if (statusButton) {
      openTaskStatusDetailDialog(statusButton.dataset.openTaskStatus);
      return;
    }
    if (detailId && !event.target.closest("button, a, input, select, textarea, label, details, summary")) {
      openTaskDetailDialog(detailId);
      return;
    }
    if (editId) {
      const task = taskForBoardAction(editId);
      if (!task || !canEditTaskDetails(task)) return;
      openTaskEditForm(task.id, { focusId: "taskTitle" });
    }
    if (copyId) {
      const task = taskForBoardAction(copyId);
      copyTaskToForm(task);
      return;
    }
    if (respondId) {
      const task = taskForBoardAction(respondId);
      if (!task || !canUpdateTaskProgress(task)) return;
      if (window.virtualAssistantSelectProgressTask?.(respondId,task) === true) return;
      openTaskEditForm(task.id, { focusId: "taskNote" });
    }
    if (reviewId) {
      openTaskCompletionReviewDialog(reviewId);
      return;
    }
    if (deadlineReviewId) {
      openTaskDeadlineExtensionReviewDialog(deadlineReviewId);
      return;
    }
    if (deleteId) deleteTaskRecord(deleteId);
  });
  byId("taskCompletionPendingList").addEventListener("click", (event) => {
    if (event.target.closest("[data-load-more-pending-tasks]")) {
      const page=serverPages?.buckets.find((bucket)=>bucket.status===TASK_STATUS_PENDING_REVIEW);
      if(page?.nextCursor) {renderServerTaskBoard({},TASK_STATUS_PENDING_REVIEW,page.nextCursor);return;}
      pendingVisibleLimit = (pendingVisibleLimit || TASK_BOARD_INITIAL_RENDER_LIMIT) + TASK_BOARD_RENDER_STEP;
      renderTaskBoard();
      return;
    }
    const taskId = event.target.closest("[data-open-pending-task]")?.dataset.openPendingTask;
    if (taskId) {
      openTaskDetailDialog(taskId);
      return;
    }
    const reviewTaskId = event.target.closest("[data-review-pending-task]")?.dataset.reviewPendingTask;
    if (reviewTaskId) openTaskCompletionReviewDialog(reviewTaskId);
  });
}

globalThis.QldaFeatures.register("tasks-board", FEATURE_VERSION, { renderTaskBoard, openTaskStatusDetailDialog, openTaskCompletionPendingDetailDialog, initialize });
})();
