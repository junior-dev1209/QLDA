/* Date-only values stay in local time; week navigation must not shift at UTC midnight. */
const WorkCalendar = (() => {
  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const parseDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) || dateKey(date) !== value ? null : date;
  };
  const addDays = (value, count) => {
    const date = parseDate(value);
    if (!date) return "";
    date.setDate(date.getDate() + count);
    return dateKey(date);
  };
  const weekStart = (value) => {
    const date = parseDate(value);
    return date ? addDays(value, -((date.getDay() + 6) % 7)) : "";
  };
  const weekNumber = (value) => {
    const date = parseDate(value);
    if (!date) return 0;
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
    return Math.ceil((((utc - new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
  };
  const ids = (value) => [...new Set((Array.isArray(value) ? value : []).map(String).filter(Boolean))];
  const searchable = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
  const isMine = (event, account, personId) => Boolean(account && (event.allHands || event.createdById === account.id || (personId && [...ids(event.leaderIds), ...ids(event.participantIds)].includes(personId))));
  const canManage = (account, calendarWrite = false) => Boolean(account
    && (["admin", "director"].includes(account.role) || calendarWrite === true));
  const upcoming = (events, account, personId, minutes, now = new Date()) => {
    if (!account || ![5, 15, 30, 60].includes(minutes)) return [];
    const time = now.getTime();
    return events.filter((event) => {
      const start = new Date(`${event.date}T${event.time}:00+07:00`).getTime();
      return isMine(event, account, personId) && Number.isFinite(start) && start >= time - 60000 && start <= time + minutes * 60000;
    }).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  };
  const validate = (event) => {
    if (!String(event.title || "").trim() || event.title.length > 500) return "Nhập nội dung cuộc họp (tối đa 500 ký tự).";
    if (!parseDate(event.date)) return "Ngày họp không hợp lệ.";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time || "")) return "Chọn giờ bắt đầu hợp lệ.";
    if (event.endTime && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.endTime) || event.endTime <= event.time)) return "Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.";
    if (!String(event.location || "").trim() || event.location.length > 300) return "Nhập địa điểm (tối đa 300 ký tự).";
    if (!ids(event.departmentIds).length) return "Chọn ít nhất một phòng chuẩn bị.";
    return "";
  };
  const filter = (events, options) => {
    const end = addDays(options.week, 6);
    const query = searchable(options.search).trim();
    return events.filter((event) => event.date >= options.week && event.date <= end
      && (options.tab !== "mine" || isMine(event, options.account, options.personId))
      && (!options.leaderId || ids(event.leaderIds).includes(options.leaderId))
      && (!options.departmentId || ids(event.departmentIds).includes(options.departmentId))
      && (!query || searchable([event.title, event.location, event.note, event.conclusion, ...(options.names?.(event) || [])].join(" ")).includes(query)))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`) || String(a.id).localeCompare(String(b.id)));
  };
  const icsEscape = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
  const foldLine = (line) => {
    let output = "", length = 0;
    for (const char of line) {
      const bytes = new TextEncoder().encode(char).length;
      if (length + bytes > 75) { output += "\r\n "; length = 1; }
      output += char; length += bytes;
    }
    return output;
  };
  const toIcs = (events, now = new Date()) => {
    const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Phuc Thinh//Lich Cong Viec//VI", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    events.forEach((event) => {
      const instant = (time) => new Date(`${event.date}T${time}:00+07:00`).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      lines.push("BEGIN:VEVENT", `UID:${icsEscape(event.id)}@phuc-thinh`, `DTSTAMP:${stamp}`,
        `DTSTART:${instant(event.time)}`);
      if (event.endTime) lines.push(`DTEND:${instant(event.endTime)}`);
      lines.push(`SUMMARY:${icsEscape(event.title)}`, `LOCATION:${icsEscape(event.location)}`, `DESCRIPTION:${icsEscape([event.note, event.conclusion].filter(Boolean).join("\n"))}`, "END:VEVENT");
    });
    return [...lines, "END:VCALENDAR"].map(foldLine).join("\r\n") + "\r\n";
  };
  return { dateKey, parseDate, addDays, weekStart, weekNumber, ids, searchable, isMine, canManage, upcoming, validate, filter, toIcs };
})();

const calendarUi = { week: WorkCalendar.weekStart(WorkCalendar.dateKey(new Date())), tab: "all", leaderId: "", editId: "", editBase: "", formBase: "", mode: "edit", returnFocus: null };
let calendarTaskSourceId = "";

function calendarDirectory() {
  return [...new Map([...(state.calendarDirectory || []), ...state.people].map((person) => [person.id, person])).values()];
}

function calendarLeaders() {
  return calendarDirectory().filter((person) => person.departmentId === "ban-giam-doc" || /^(pho-)?giam-doc-/.test(person.roleId || ""));
}

function calendarPersonName(id) {
  return calendarDirectory().find((person) => person.id === id)?.name || "Nhân sự đã ngừng sử dụng";
}

function calendarDepartmentName(id) {
  return departments.find((department) => department.id === id)?.name || id;
}

function calendarWritesAvailable() {
  return isOfflineFileRuntime() || !usingSupabaseSync() || sharedSync.calendarEventsSupported === true;
}

function canManageCalendar() {
  const account = currentAccount();
  return WorkCalendar.canManage(account, accountAccessGrants(account).calendarWrite);
}

function canManageCalendarEvent() {
  return canAccessView("calendar") && calendarWritesAvailable() && canManageCalendar();
}

function calendarFilteredEvents() {
  return WorkCalendar.filter(state.calendarEvents || [], {
    week: calendarUi.week, tab: calendarUi.tab, leaderId: calendarUi.leaderId,
    departmentId: byId("calendarDepartment").value, search: byId("calendarSearch").value,
    account: currentAccount(), personId: currentPerson()?.id || "",
    names: (event) => [...WorkCalendar.ids(event.departmentIds).map(calendarDepartmentName), ...WorkCalendar.ids(event.leaderIds).map(calendarPersonName)],
  });
}

function calendarConclusionTasks(event) {
  return state.tasks.filter((task) => task.sourceCalendarEventId === event.id && canViewTaskRecord(task));
}

function calendarLeaderBadges(event) {
  if (event.allHands) return '<span class="calendar-person-chip tone-1">Toàn thể</span>';
  const leaders = calendarLeaders();
  return WorkCalendar.ids(event.leaderIds).map((id) => `<span class="calendar-person-chip tone-${Math.max(0, leaders.findIndex((person) => person.id === id)) % 4}">${escapeHtml(calendarPersonName(id))}</span>`).join("") || "-";
}

function calendarEntries() {
  const events = calendarFilteredEvents();
  return calendarUi.tab === "conclusions" ? events.flatMap((event) => calendarConclusionTasks(event).map((task) => ({ event, task }))) : events.map((event) => ({ event }));
}

function calendarRenderRows() {
  const entries = calendarEntries();
  byId("calendarCount").textContent = `${entries.length} ${calendarUi.tab === "conclusions" ? "công việc từ kết luận" : "lịch công việc"}`;
  const dayNames = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
  byId("calendarRows").innerHTML = Array.from({ length: 7 }, (_, day) => {
    const date = WorkCalendar.addDays(calendarUi.week, day);
    const rows = entries.filter(({ event }) => event.date === date);
    const today = date === WorkCalendar.dateKey(new Date());
    const dayCell = `<td class="calendar-day" rowspan="${Math.max(1, rows.length)}">${dayNames[day]}<span>${escapeHtml(formatDate(date))}${today ? " · Hôm nay" : ""}</span></td>`;
    if (!rows.length) return `<tr class="${today ? "calendar-today" : ""}">${dayCell}<td colspan="6" class="calendar-empty">Không có ${calendarUi.tab === "conclusions" ? "công việc từ kết luận" : "lịch"}</td></tr>`;
    return rows.map(({ event, task }, index) => `<tr class="${today ? "calendar-today" : ""}">
      ${index === 0 ? dayCell : ""}<td><strong>${escapeHtml(event.time)}</strong>${event.endTime ? `<span class="calendar-row-note">${escapeHtml(event.endTime)}</span>` : ""}</td>
      <td><button type="button" class="calendar-row-title" ${task ? `data-calendar-task="${escapeHtml(task.id)}"` : `data-calendar-open="${escapeHtml(event.id)}"`}>${escapeHtml(task?.title || event.title)}</button>
        ${task ? `<span class="calendar-row-note">${escapeHtml(getDueStatus(task))} · ${formatScore(task.progress || 0)}% · ${escapeHtml(taskOwnerName(task))}</span><span class="calendar-row-note">${escapeHtml(event.title)}</span>` : (event.conclusion ? '<span class="calendar-row-note">Đã có kết luận</span>' : "")}</td>
      <td>${escapeHtml(event.location)}</td><td>${calendarLeaderBadges(event)}</td><td>${WorkCalendar.ids(event.departmentIds).map((id) => escapeHtml(calendarDepartmentName(id))).join("<br>")}</td>
      <td><button type="button" class="ghost calendar-icon" data-calendar-open="${escapeHtml(event.id)}" title="Chi tiết cuộc họp" aria-label="Chi tiết: ${escapeHtml(event.title)}">···</button></td></tr>`).join("");
  }).join("");
}

function calendarRenderMobileRows() {
  const entries = calendarEntries();
  const dayNames = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
  byId("calendarMobileRows").innerHTML = Array.from({ length: 7 }, (_, day) => {
    const date = WorkCalendar.addDays(calendarUi.week, day);
    const rows = entries.filter(({ event }) => event.date === date);
    const today = date === WorkCalendar.dateKey(new Date());
    const heading = `${dayNames[day]} · ${formatDate(date)}${today ? " · Hôm nay" : ""}`;
    if (!rows.length) return `<section class="calendar-mobile-day${today ? " calendar-today" : ""}"><h3>${escapeHtml(heading)}</h3><p class="calendar-mobile-empty">Không có ${calendarUi.tab === "conclusions" ? "công việc từ kết luận" : "lịch"}</p></section>`;
    return `<section class="calendar-mobile-day${today ? " calendar-today" : ""}"><h3>${escapeHtml(heading)}</h3>${rows.map(({ event, task }) => `<article class="calendar-mobile-card">
      <div class="calendar-mobile-time"><strong>${escapeHtml(event.time)}</strong>${event.endTime ? `<span>${escapeHtml(event.endTime)}</span>` : ""}</div>
      <div class="calendar-mobile-content"><button type="button" class="calendar-row-title" ${task ? `data-calendar-task="${escapeHtml(task.id)}"` : `data-calendar-open="${escapeHtml(event.id)}"`}>${escapeHtml(task?.title || event.title)}</button>
        <p>${escapeHtml(event.location)}</p>${task ? `<p>${escapeHtml(getDueStatus(task))} · ${formatScore(task.progress || 0)}% · ${escapeHtml(taskOwnerName(task))}</p><p class="calendar-row-note">${escapeHtml(event.title)}</p>` : (event.conclusion ? '<p class="calendar-row-note">Đã có kết luận</p>' : "")}
        <div class="calendar-mobile-meta">${calendarLeaderBadges(event)}<span>${WorkCalendar.ids(event.departmentIds).map((id) => escapeHtml(calendarDepartmentName(id))).join(", ")}</span></div></div>
      <button type="button" class="ghost calendar-icon" data-calendar-open="${escapeHtml(event.id)}" title="Chi tiết cuộc họp" aria-label="Chi tiết: ${escapeHtml(event.title)}">···</button>
    </article>`).join("")}</section>`;
  }).join("");
}

function renderCalendarView() {
  if (!canAccessView("calendar")) return;
  const canWrite = canManageCalendarEvent();
  if (!canWrite && calendarUi.tab !== "all") calendarUi.tab = "all";
  byId("calendarWeekLabel").textContent = `Tuần ${WorkCalendar.weekNumber(calendarUi.week)}: ${formatDate(calendarUi.week)} - ${formatDate(WorkCalendar.addDays(calendarUi.week, 6))}`;
  byId("calendarAdd").classList.toggle("is-hidden", !canWrite);
  byId("calendarAdd").disabled = !calendarWritesAvailable();
  const notice = byId("calendarAvailability");
  notice.classList.toggle("is-hidden", calendarWritesAvailable());
  notice.textContent = calendarWritesAvailable() ? "" : "Máy chủ chưa hỗ trợ lưu Lịch công việc. Cần cập nhật kpi-sync trước khi thêm hoặc sửa lịch online.";
  const selectedDepartment = byId("calendarDepartment").value;
  fillSelect(byId("calendarDepartment"), [{ value: "", label: "Tất cả phòng" }, ...departments.map((department) => ({ value: department.id, label: department.name }))], selectedDepartment);
  const leaders = calendarLeaders();
  if (!leaders.some((person) => person.id === calendarUi.leaderId)) calendarUi.leaderId = "";
  byId("calendarLeaderFilter").innerHTML = [{ id: "", name: "Tất cả" }, ...leaders].map((person) => `<button type="button" data-calendar-leader="${escapeHtml(person.id)}" aria-pressed="${calendarUi.leaderId === person.id}">${escapeHtml(person.name)}</button>`).join("");
  document.querySelectorAll("[data-calendar-tab]").forEach((button) => {
    const available = canWrite || button.dataset.calendarTab === "all";
    const active = button.dataset.calendarTab === calendarUi.tab;
    button.hidden = !available; button.disabled = !available;
    button.setAttribute("aria-selected", String(active)); button.tabIndex = active && available ? 0 : -1;
    if (active) byId("calendarPanel").setAttribute("aria-labelledby", button.id);
  });
  byId("calendarIcs").disabled = calendarUi.tab === "conclusions";
  byId("calendarReminderMinutes").value = String(calendarReminderMinutes());
  byId("calendarEnableNotifications").textContent = typeof Notification !== "undefined" && Notification.permission === "granted" ? "Đã bật thông báo thiết bị" : "Bật thông báo thiết bị";
  calendarRenderRows();
  calendarRenderMobileRows();
}

function calendarCheckboxes(containerId, values, selected) {
  const selectedIds = new Set(WorkCalendar.ids(selected));
  byId(containerId).innerHTML = values.map((item) => `<label><input type="checkbox" value="${escapeHtml(item.id)}" ${selectedIds.has(item.id) ? "checked" : ""}><span>${escapeHtml(item.name)}</span></label>`).join("") || '<span class="muted">Chưa có danh mục</span>';
}

function calendarSelectedIds(containerId) {
  return [...byId(containerId).querySelectorAll("input:checked")].map((input) => input.value);
}

function openCalendarDialog(id = "", mode = id ? "detail" : "edit") {
  if (!canAccessView("calendar")) return;
  const event = (state.calendarEvents || []).find((item) => item.id === id);
  if (id && !event) return;
  if ((!id || mode === "edit") && !canManageCalendarEvent()) return;
  calendarUi.editId = id;
  calendarUi.mode = event && mode === "detail" ? "detail" : "edit";
  calendarUi.editBase = event ? JSON.stringify(event) : "";
  calendarUi.returnFocus = document.activeElement;
  byId("calendarForm").reset();
  const canEdit = canManageCalendarEvent(event);
  const editable = !event || (calendarUi.mode === "edit" && canEdit);
  byId("calendarDialogTitle").textContent = event ? (editable ? "Cập nhật cuộc họp" : "Chi tiết cuộc họp") : "Thêm cuộc họp";
  const today = WorkCalendar.dateKey(new Date());
  byId("calendarTitle").value = event?.title || "";
  byId("calendarDate").value = event?.date || (WorkCalendar.weekStart(today) === calendarUi.week ? today : calendarUi.week);
  byId("calendarTime").value = event?.time || "08:00";
  byId("calendarEndTime").value = event?.endTime || "";
  byId("calendarLocation").value = event?.location || "";
  byId("calendarNote").value = event?.note || "";
  byId("calendarConclusion").value = event?.conclusion || "";
  byId("calendarAllHands").checked = event?.allHands === true;
  calendarCheckboxes("calendarLeaders", calendarLeaders(), event?.leaderIds);
  calendarCheckboxes("calendarDepartments", departments, event?.departmentIds || [currentDepartmentId()]);
  calendarCheckboxes("calendarParticipants", calendarDirectory(), event?.participantIds);
  byId("calendarForm").querySelectorAll("input, textarea, select").forEach((input) => { input.disabled = !editable; });
  byId("calendarParticipantSearch").disabled = !editable;
  byId("calendarEdit").classList.toggle("is-hidden", !event || !canEdit || editable);
  byId("calendarSave").classList.toggle("is-hidden", !editable);
  byId("calendarDelete").classList.toggle("is-hidden", !event || !editable);
  byId("calendarCreateTask").classList.toggle("is-hidden", !event || !editable || !canAccessView("tasks") || !canCreateRegularTasks());
  const linked = event ? calendarConclusionTasks(event) : [];
  byId("calendarLinkedTasks").innerHTML = linked.length ? linked.map((task) => `<button type="button" class="calendar-linked-task" data-calendar-task="${escapeHtml(task.id)}">${escapeHtml(task.title)}<span class="calendar-row-note">${escapeHtml(taskOwnerName(task))} · ${escapeHtml(getDueStatus(task))} · ${formatScore(task.progress || 0)}%</span></button>`).join("") : '<p class="muted">Chưa có công việc từ kết luận.</p>';
  byId("calendarAudit").textContent = event ? `Tạo bởi ${event.createdBy || "-"} · ${formatDateTime(event.createdAt)}${event.updatedAt ? ` · Cập nhật ${formatDateTime(event.updatedAt)}` : ""}` : "";
  byId("calendarFormError").textContent = "";
  calendarUi.formBase = JSON.stringify(calendarReadForm());
  openModal("calendarDialog");
  (editable ? byId("calendarTitle") : (!byId("calendarEdit").classList.contains("is-hidden") ? byId("calendarEdit") : byId("calendarClose"))).focus();
}

function closeCalendarDialog() {
  closeModal("calendarDialog");
  calendarUi.returnFocus?.focus?.();
}

function calendarReadForm() {
  return { title: byId("calendarTitle").value.trim(), date: byId("calendarDate").value,
    time: byId("calendarTime").value, endTime: byId("calendarEndTime").value,
    location: byId("calendarLocation").value.trim(), leaderIds: calendarSelectedIds("calendarLeaders"),
    departmentIds: calendarSelectedIds("calendarDepartments"), participantIds: calendarSelectedIds("calendarParticipants"),
    allHands: byId("calendarAllHands").checked, note: byId("calendarNote").value.trim(), conclusion: byId("calendarConclusion").value.trim() };
}

function saveCalendarEvent(event) {
  event.preventDefault();
  const existing = (state.calendarEvents || []).find((item) => item.id === calendarUi.editId);
  const error = byId("calendarFormError");
  if (calendarUi.mode !== "edit" || !canManageCalendarEvent(existing) || (calendarUi.editId && !existing)) { error.textContent = "Không thể lưu: quyền truy cập hoặc cuộc họp đã thay đổi."; return; }
  if (existing && JSON.stringify(existing) !== calendarUi.editBase) { error.textContent = "Cuộc họp đã được cập nhật ở nơi khác. Nội dung đang nhập được giữ nguyên; đóng và mở lại cuộc họp để kiểm tra bản mới trước khi sửa."; return; }
  const values = calendarReadForm();
  error.textContent = WorkCalendar.validate(values);
  if (error.textContent) return;
  const record = applyRecordAudit({ ...existing, ...values, id: existing?.id || uid("meeting") }, existing);
  const previous = state.calendarEvents || [], previousLog = state.activityLog;
  state.calendarEvents = existing ? previous.map((item) => item.id === record.id ? record : item) : [...previous, record];
  logActivity({ action: existing ? "Cập nhật cuộc họp" : "Thêm cuộc họp", module: "Lịch công việc", targetType: "calendar-event", targetId: record.id, title: record.title, departmentId: record.departmentIds[0] || "", details: `${formatDate(record.date)} ${record.time} · ${record.location}` });
  try { saveState(); } catch { state.calendarEvents = previous; state.activityLog = previousLog; error.textContent = "Chưa lưu được dữ liệu trên thiết bị. Nội dung đang nhập được giữ lại."; return; }
  calendarUi.week = WorkCalendar.weekStart(record.date);
  closeCalendarDialog(); renderCalendarView(); checkCalendarReminders();
}

function deleteCalendarEvent() {
  const event = (state.calendarEvents || []).find((item) => item.id === calendarUi.editId);
  if (!event || calendarUi.mode !== "edit" || !canManageCalendarEvent(event)) return;
  if (JSON.stringify(event) !== calendarUi.editBase) { byId("calendarFormError").textContent = "Cuộc họp đã thay đổi. Hãy mở lại bản mới trước khi xóa."; return; }
  if (state.tasks.some((task) => task.sourceCalendarEventId === event.id)) { byId("calendarFormError").textContent = "Cuộc họp đã có công việc từ kết luận nên không thể xóa. Có thể cập nhật nội dung cuộc họp."; return; }
  if (!confirm(`Xóa cuộc họp "${event.title}"?`)) return;
  const previous = state.calendarEvents, previousLog = state.activityLog, previousDeleted = state.deletedIds;
  state.calendarEvents = previous.filter((item) => item.id !== event.id);
  registerDeletedId(event.id);
  logActivity({ action: "Xóa cuộc họp", module: "Lịch công việc", targetType: "calendar-event", targetId: event.id, title: event.title, departmentId: event.departmentIds[0] || "" });
  try { saveState(); } catch { state.calendarEvents = previous; state.activityLog = previousLog; state.deletedIds = previousDeleted; byId("calendarFormError").textContent = "Không thể lưu thao tác xóa. Vui lòng thử lại."; return; }
  closeCalendarDialog(); renderCalendarView(); checkCalendarReminders();
}

function exportCalendarExcel() {
  const events = calendarFilteredEvents();
  const title = `${calendarUi.tab === "conclusions" ? "Việc từ kết luận" : "Lịch công việc"} tuần ${WorkCalendar.weekNumber(calendarUi.week)}`;
  const common = (event) => [formatDate(event.date), event.time, event.endTime || "", event.title, event.location,
    event.allHands ? "Toàn thể" : WorkCalendar.ids(event.leaderIds).map(calendarPersonName).join(", "), WorkCalendar.ids(event.departmentIds).map(calendarDepartmentName).join(", ")];
  const headers = ["Ngày", "Bắt đầu", "Kết thúc", "Nội dung cuộc họp", "Địa điểm", "Lãnh đạo", "Phòng chuẩn bị"];
  const rows = calendarUi.tab === "conclusions"
    ? events.flatMap((event) => calendarConclusionTasks(event).map((task) => [...common(event), task.title, taskOwnerName(task), getDueStatus(task), `${formatScore(task.progress || 0)}%`, formatDate(task.due)]))
    : events.map((event) => [...common(event), event.allHands ? "Toàn thể" : WorkCalendar.ids(event.participantIds).map(calendarPersonName).join(", "), event.note || "", event.conclusion || ""]);
  downloadDashboardPopupExcel({ title, sheetName: "Lich cong viec", fileName: `lich-cong-viec-${calendarUi.week}.xls`, subtitle: `${formatDate(calendarUi.week)} - ${formatDate(WorkCalendar.addDays(calendarUi.week, 6))}`,
    headers: [...headers, ...(calendarUi.tab === "conclusions" ? ["Công việc từ kết luận", "Người thực hiện", "Trạng thái", "Tiến độ", "Hạn hoàn thành"] : ["Thành phần tham dự", "Ghi chú", "Kết luận"])], rows });
}

function syncTaskStatusChoices() {
  const select = byId("taskStatus");
  byId("taskStatusChoices")?.querySelectorAll("input").forEach((input) => { input.checked = input.value === select.value; input.disabled = select.disabled; });
}

function editableTaskStatus(task) {
  const value = normalizeTaskStatus(task?.status);
  return value === "Quá hạn" ? (Number(task?.progress) > 0 ? "Đang thực hiện" : TASK_STATUS_PREPARING) : value;
}

const calendarReminders = { accountId: "", visible: [], notifications: [], delivered: {} };

function calendarReminderMinutes() {
  try {
    const value = localStorage.getItem(`calendar-reminder-minutes-${currentAccount()?.id || ""}`);
    return value !== null && [0, 5, 15, 30, 60].includes(Number(value)) ? Number(value) : 15;
  } catch { return 15; }
}

function clearCalendarReminders() {
  byId("calendarReminderToast")?.classList.add("is-hidden");
  if (byId("calendarReminderList")) byId("calendarReminderList").textContent = "";
  calendarReminders.visible = [];
  calendarReminders.notifications.forEach((notification) => notification.close());
  calendarReminders.notifications = [];
}

function checkCalendarReminders() {
  const account = currentAccount();
  if (!account || !canAccessView("calendar")) { clearCalendarReminders(); return; }
  if (calendarReminders.accountId !== account.id) {
    clearCalendarReminders(); calendarReminders.delivered = {}; calendarReminders.accountId = account.id;
  }
  const minutes = calendarReminderMinutes();
  if (!minutes) { clearCalendarReminders(); return; }
  const key = `calendar-reminders-${account.id}`;
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(key) || "{}"); } catch { /* Memory deduplication still works when storage is unavailable. */ }
  const now = new Date();
  const delivered = { ...(stored && typeof stored === "object" ? stored : {}), ...calendarReminders.delivered };
  const upcoming = WorkCalendar.upcoming(state.calendarEvents || [], account, currentPerson()?.id || "", minutes, now);
  const signature = (event) => `${event.id}|${event.date}|${event.time}`;
  const newEvents = upcoming.filter((event) => !delivered[signature(event)]);
  const stillUpcoming = new Set(upcoming.map(signature));
  calendarReminders.visible = calendarReminders.visible.filter((event) => stillUpcoming.has(signature(event)));
  if (newEvents.length) {
    newEvents.forEach((event) => { delivered[signature(event)] = now.getTime(); });
    calendarReminders.delivered = Object.fromEntries(Object.entries(delivered).filter(([, time]) => Number(time) > now.getTime() - 2 * 86400000).slice(-500));
    try { localStorage.setItem(key, JSON.stringify(calendarReminders.delivered)); } catch { /* Keep the per-tab ledger. */ }
    calendarReminders.visible.push(...newEvents);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      newEvents.forEach((event) => {
        try {
          const notification = new Notification("Sắp đến lịch làm việc", { body: `${event.time} · ${event.title}\n${event.location}`, tag: signature(event), icon: "app-icon-phuc-thinh.png" });
          notification.onclick = () => { if (currentAccount()?.id === account.id && canAccessView("calendar")) { window.focus(); openCalendarDialog(event.id); } notification.close(); };
          notification.onclose = () => { calendarReminders.notifications = calendarReminders.notifications.filter((item) => item !== notification); };
          calendarReminders.notifications.push(notification);
        } catch { /* The in-app reminder remains available on unsupported browsers. */ }
      });
    }
  }
  byId("calendarReminderToast").classList.toggle("is-hidden", !calendarReminders.visible.length);
  byId("calendarReminderList").innerHTML = calendarReminders.visible.map((event) => `<button type="button" class="calendar-linked-task" data-calendar-reminder="${escapeHtml(event.id)}">${escapeHtml(event.title)}<span class="calendar-row-note">${escapeHtml(event.time)} · ${escapeHtml(event.location)}</span></button>`).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  byId("taskStatusChoices").addEventListener("change", (event) => {
    const input = event.target.closest("input");
    if (!input || byId("taskStatus").disabled) return;
    byId("taskStatus").value = input.value;
    byId("taskStatus").dispatchEvent(new Event("change", { bubbles: true }));
    syncTaskStatusChoices();
  });
  syncTaskStatusChoices();
  byId("calendarPrev").addEventListener("click", () => { calendarUi.week = WorkCalendar.addDays(calendarUi.week, -7); renderCalendarView(); });
  byId("calendarNext").addEventListener("click", () => { calendarUi.week = WorkCalendar.addDays(calendarUi.week, 7); renderCalendarView(); });
  byId("calendarToday").addEventListener("click", () => { calendarUi.week = WorkCalendar.weekStart(WorkCalendar.dateKey(new Date())); renderCalendarView(); });
  byId("calendarAdd").addEventListener("click", () => openCalendarDialog());
  byId("calendarEdit").addEventListener("click", () => {
    if (!calendarUi.editId || !canManageCalendarEvent()) return;
    openCalendarDialog(calendarUi.editId, "edit");
  });
  byId("calendarClose").addEventListener("click", closeCalendarDialog);
  byId("calendarForm").addEventListener("submit", saveCalendarEvent);
  byId("calendarDelete").addEventListener("click", deleteCalendarEvent);
  byId("calendarDepartment").addEventListener("change", calendarRenderRows);
  byId("calendarSearch").addEventListener("input", calendarRenderRows);
  byId("calendarLeaderFilter").addEventListener("click", (event) => { const button = event.target.closest("[data-calendar-leader]"); if (button) { calendarUi.leaderId = button.dataset.calendarLeader; renderCalendarView(); } });
  const tabs = [...document.querySelectorAll("[data-calendar-tab]")];
  tabs.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled || button.hidden || (!canManageCalendar() && button.dataset.calendarTab !== "all")) return;
      calendarUi.tab = button.dataset.calendarTab; renderCalendarView();
    });
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const availableTabs = tabs.filter((item) => !item.hidden && !item.disabled);
      const index = availableTabs.indexOf(button);
      const next = event.key === "Home" ? 0 : event.key === "End" ? availableTabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + availableTabs.length) % availableTabs.length;
      availableTabs[next]?.click(); availableTabs[next]?.focus();
    });
  });
  byId("calendarParticipantSearch").addEventListener("input", () => {
    const query = WorkCalendar.searchable(byId("calendarParticipantSearch").value);
    byId("calendarParticipants").querySelectorAll("label").forEach((label) => { label.hidden = !WorkCalendar.searchable(label.textContent).includes(query); label.style.display = label.hidden ? "none" : ""; });
  });
  const openLinked = (event) => {
    const taskId = event.target.closest("[data-calendar-task]")?.dataset.calendarTask;
    const meetingId = event.target.closest("[data-calendar-open]")?.dataset.calendarOpen;
    if (taskId) { const task = state.tasks.find((item) => item.id === taskId); if (task && canViewTaskRecord(task)) { closeCalendarDialog(); openTaskDetailDialog(taskId); } }
    else if (meetingId) openCalendarDialog(meetingId);
  };
  byId("calendarRows").addEventListener("click", openLinked);
  byId("calendarMobileRows").addEventListener("click", openLinked);
  byId("calendarLinkedTasks").addEventListener("click", openLinked);
  byId("calendarCreateTask").addEventListener("click", () => {
    const event = (state.calendarEvents || []).find((item) => item.id === calendarUi.editId);
    if (!event || calendarUi.mode !== "edit" || !canManageCalendarEvent() || !canCreateRegularTasks() || !canAccessView("tasks")) return;
    if (canManageCalendarEvent(event) && JSON.stringify(calendarReadForm()) !== calendarUi.formBase) {
      byId("calendarFormError").textContent = "Lưu thay đổi cuộc họp trước khi tạo công việc từ kết luận."; return;
    }
    closeCalendarDialog(); switchView("tasks"); openNewTaskFormDialog();
    calendarTaskSourceId = event.id;
    byId("taskTitle").value = `Kết luận: ${event.title}`;
    byId("taskNote").value = event.conclusion || "";
  });
  byId("calendarExcel").addEventListener("click", exportCalendarExcel);
  byId("calendarIcs").addEventListener("click", () => {
    const events = calendarFilteredEvents();
    if (!events.length) { alert("Không có lịch để xuất."); return; }
    downloadBlobFile(new Blob([WorkCalendar.toIcs(events)], { type: "text/calendar;charset=utf-8" }), `lich-cong-viec-${calendarUi.week}.ics`);
  });
  byId("calendarDialog").addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeCalendarDialog(); }
    if (event.key === "Tab") {
      const focusable = [...byId("calendarDialog").querySelectorAll("button, input, textarea, [tabindex='0']")].filter((element) => !element.disabled && element.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  byId("calendarReminderMinutes").addEventListener("change", () => {
    try { localStorage.setItem(`calendar-reminder-minutes-${currentAccount()?.id || ""}`, byId("calendarReminderMinutes").value); }
    catch { alert("Không lưu được thiết lập nhắc trên thiết bị này."); }
    checkCalendarReminders();
  });
  byId("calendarEnableNotifications").addEventListener("click", async () => {
    if (typeof Notification === "undefined") { alert("Trình duyệt này không hỗ trợ thông báo thiết bị. Nhắc lịch trong ứng dụng vẫn hoạt động."); return; }
    try {
      const result = await Notification.requestPermission();
      if (result !== "granted") alert("Chưa có quyền thông báo thiết bị. Nhắc lịch trong ứng dụng vẫn hoạt động.");
    } catch { alert("Không thể bật thông báo thiết bị. Nhắc lịch trong ứng dụng vẫn hoạt động."); }
    renderCalendarView();
  });
  byId("calendarDismissReminders").addEventListener("click", clearCalendarReminders);
  byId("calendarReminderList").addEventListener("click", (event) => {
    const id = event.target.closest("[data-calendar-reminder]")?.dataset.calendarReminder;
    if (id) { clearCalendarReminders(); openCalendarDialog(id); }
  });
  window.setInterval(checkCalendarReminders, 30000);
  window.addEventListener("focus", checkCalendarReminders);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checkCalendarReminders(); });
  checkCalendarReminders();
});
