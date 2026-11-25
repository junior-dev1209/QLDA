(() => {
"use strict";
const FEATURE_VERSION = "3.4.192";

function parseTaskBulkImportCsv(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] || "";
  const delimiter = [";", ",", "\t"].reduce(
    (selected, candidate) => (firstLine.split(candidate).length > firstLine.split(selected).length ? candidate : selected),
    ";",
  );
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted && character === '"' && source[index + 1] === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && character === delimiter) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += character;
  }
  row.push(cell.trim());
  if (row.some((value) => value)) rows.push(row);
  if (quoted) throw new Error("Tệp CSV có dấu nháy kép chưa được đóng.");
  return rows;
}

function readTaskBulkImportZipEntries(buffer) {
  const data = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let endOffset = -1;
  for (let offset = Math.max(0, data.length - 65557); offset <= data.length - 22; offset += 1) {
    if (view.getUint32(offset, true) === 0x06054b50) endOffset = offset;
  }
  if (endOffset < 0) throw new Error("Tệp Excel không có cấu trúc ZIP hợp lệ.");
  const entryCount = view.getUint16(endOffset + 10, true);
  let offset = view.getUint32(endOffset + 16, true);
  const entries = new Map();
  const decoder = new TextDecoder();
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("Tệp Excel có danh mục ZIP không hợp lệ.");
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(data.slice(offset + 46, offset + 46 + nameLength));
    entries.set(name, { method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { data, view, entries };
}

async function readTaskBulkImportZipText(archive, name) {
  const entry = archive.entries.get(name);
  if (!entry) return "";
  const { data, view } = archive;
  if (view.getUint32(entry.localOffset, true) !== 0x04034b50) throw new Error("Tệp Excel có dữ liệu ZIP không hợp lệ.");
  const nameLength = view.getUint16(entry.localOffset + 26, true);
  const extraLength = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const compressed = data.slice(start, start + entry.compressedSize);
  let output;
  if (entry.method === 0) {
    output = compressed;
  } else if (entry.method === 8 && typeof DecompressionStream === "function") {
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    output = new Uint8Array(await new Response(stream).arrayBuffer());
  } else {
    throw new Error("Trình duyệt không hỗ trợ đọc định dạng nén của tệp Excel này. Hãy lưu lại dưới dạng .xlsx hoặc .csv.");
  }
  return new TextDecoder().decode(output);
}

function taskBulkImportColumnIndex(cellReference) {
  const letters = String(cellReference || "").match(/[A-Z]+/i)?.[0] || "A";
  return [...letters.toUpperCase()].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

async function parseTaskBulkImportXlsx(buffer) {
  const archive = readTaskBulkImportZipEntries(buffer);
  const sharedStringsXml = await readTaskBulkImportZipText(archive, "xl/sharedStrings.xml");
  const sharedStrings = sharedStringsXml
    ? Array.from(new DOMParser().parseFromString(sharedStringsXml, "application/xml").getElementsByTagName("si")).map((item) =>
        Array.from(item.getElementsByTagName("t")).map((text) => text.textContent || "").join(""),
      )
    : [];
  const sheetName = [...archive.entries.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))[0];
  if (!sheetName) throw new Error("Không tìm thấy trang dữ liệu trong tệp Excel.");
  const sheetXml = await readTaskBulkImportZipText(archive, sheetName);
  const documentXml = new DOMParser().parseFromString(sheetXml, "application/xml");
  if (documentXml.getElementsByTagName("parsererror").length) throw new Error("Không đọc được nội dung XML của tệp Excel.");
  return Array.from(documentXml.getElementsByTagName("row")).map((row) => {
    const values = [];
    Array.from(row.getElementsByTagName("c")).forEach((cell) => {
      const index = taskBulkImportColumnIndex(cell.getAttribute("r"));
      const type = cell.getAttribute("t") || "";
      const valueNode = cell.getElementsByTagName("v")[0];
      const inlineText = Array.from(cell.getElementsByTagName("t")).map((item) => item.textContent || "").join("");
      const raw = valueNode?.textContent || inlineText || "";
      values[index] = type === "s" ? sharedStrings[Number(raw)] || "" : type === "inlineStr" ? inlineText : raw;
    });
    return values.map((value) => String(value ?? "").trim());
  }).filter((row) => row.some((value) => value));
}

function validateTaskBulkImportRows(rows) {
  if (!rows.length) throw new Error("Tệp chưa có dòng dữ liệu.");
  const [headers, ...dataRows] = rows;
  const columns = taskBulkImportColumnMap(headers);
  const missingHeaders = ["title", "project", "owner", "category", "startDate", "due"].filter((field) => columns[field] < 0);
  if (missingHeaders.length) {
    const labels = {
      title: "Tên công việc",
      project: "Danh mục dự án",
      owner: "Người thực hiện",
      category: "Danh mục nhiệm vụ",
      startDate: "Ngày bắt đầu",
      due: "Ngày hoàn thành",
    };
    throw new Error(`Thiếu cột bắt buộc: ${missingHeaders.map((field) => labels[field]).join(", ")}.`);
  }
  if (dataRows.length > TASK_BULK_IMPORT_MAX_ROWS) throw new Error(`Mỗi lần chỉ nhập tối đa ${TASK_BULK_IMPORT_MAX_ROWS} công việc.`);

  const existingSignatures = new Set(
    state.tasks.map((task) => taskBulkImportSignature({
      title: task.title,
      ownerId: task.ownerId,
      projectName: projectNameForTask(task),
      startDate: task.startDate || "",
      due: task.due || "",
    })),
  );
  const importedSignatures = new Set();
  const validatedRows = [];
  const errors = [];

  dataRows.forEach((source, index) => {
    const line = index + 2;
    const messages = [];
    const title = taskBulkImportCell(source, columns, "title");
    const projectName = normalizedProjectCatalogName(taskBulkImportCell(source, columns, "project"));
    const ownerReference = taskBulkImportCell(source, columns, "owner");
    const owner = taskBulkImportPerson(ownerReference);
    const categorySource = taskBulkImportCell(source, columns, "category");
    const startDate = normalizeTaskBulkImportDate(taskBulkImportCell(source, columns, "startDate"));
    const due = normalizeTaskBulkImportDate(taskBulkImportCell(source, columns, "due"));
    if (!title) messages.push("Thiếu tên công việc");
    if (!projectName) messages.push("Thiếu danh mục dự án");
    if (!owner) messages.push(`Không tìm thấy hoặc trùng người thực hiện: ${ownerReference || "trống"}`);
    if (!startDate) messages.push("Ngày bắt đầu không hợp lệ");
    if (!due) messages.push("Ngày hoàn thành không hợp lệ");
    if (startDate && due && startDate > due) messages.push("Ngày bắt đầu phải trước hoặc bằng ngày hoàn thành");
    const category = owner
      ? taskCategoryOptionsForPerson(owner.id).find((option) => normalizeSearchText(option) === normalizeSearchText(categorySource)) || ""
      : "";
    if (!category) messages.push(`Tiêu chí KPI không đúng với người thực hiện: ${categorySource || "trống"}`);
    const workType = taskBulkImportWorkType(taskBulkImportCell(source, columns, "workType"));
    if (!workType) messages.push("Loại công việc không hợp lệ");
    const recurrence = taskBulkImportRecurrence(taskBulkImportCell(source, columns, "recurrence"));
    if (!recurrence) messages.push("Định kỳ không hợp lệ");
    const status = taskBulkImportStatus(taskBulkImportCell(source, columns, "status"));
    if (!status) messages.push("Trạng thái không hợp lệ");
    const progressText = taskBulkImportCell(source, columns, "progress");
    const progress = progressText === "" ? (status === TASK_STATUS_COMPLETED ? 100 : 0) : Number(String(progressText).replace(",", "."));
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) messages.push("Tiến độ phải từ 0 đến 100");
    if (status === TASK_STATUS_COMPLETED && Number(progress) < 100) messages.push("Công việc Hoàn thành cần tiến độ 100%");

    const collaboratorIds = [];
    const collaboratorSource = taskBulkImportCell(source, columns, "collaborators");
    collaboratorSource
      .split(/[;|,\n]+/)
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((reference) => {
        const collaborator = taskBulkImportPerson(reference);
        if (!collaborator) {
          messages.push(`Không tìm thấy hoặc trùng người phối hợp: ${reference}`);
        } else if (collaborator.id !== owner?.id && !collaboratorIds.includes(collaborator.id)) {
          collaboratorIds.push(collaborator.id);
        }
      });

    const record = {
      line,
      title,
      projectName,
      ownerId: owner?.id || "",
      ownerName: owner?.name || ownerReference,
      collaboratorIds,
      category,
      workType,
      recurrence,
      startDate,
      due,
      status,
      progress: Number.isFinite(progress) ? progress : 0,
      note: taskBulkImportCell(source, columns, "note"),
      errors: messages,
    };
    const signature = taskBulkImportSignature(record);
    if (!messages.length && (existingSignatures.has(signature) || importedSignatures.has(signature))) {
      record.errors.push("Trùng công việc đã có hoặc trùng một dòng khác trong tệp");
    }
    if (!record.errors.length) importedSignatures.add(signature);
    if (record.errors.length) errors.push({ line, messages: record.errors });
    validatedRows.push(record);
  });
  return { rows: validatedRows, errors };
}

async function parseTaskBulkImportFile(file) {
  if (!file) return [];
  if (Number(file.size) > TASK_BULK_IMPORT_MAX_FILE_BYTES) {
    throw new Error("Tệp nhập công việc không được vượt quá 10 MB.");
  }
  const name = String(file.name || "").toLowerCase();
  if (name.endsWith(".csv")) return parseTaskBulkImportCsv(await file.text());
  if (name.endsWith(".xlsx")) return parseTaskBulkImportXlsx(await file.arrayBuffer());
  throw new Error("Chỉ hỗ trợ tệp .xlsx hoặc .csv.");
}

async function handleTaskBulkImportFile(file) {
  if (!isAdmin() || !file) return;
  resetTaskBulkImport();
  const actorId = String(currentAccount()?.id || "");
  const generation = taskBulkImportReadGeneration;
  const current = () => generation === taskBulkImportReadGeneration && String(currentAccount()?.id || "") === actorId && isAdmin();
  byId("taskBulkImportSummary").textContent = "Đang đọc và kiểm tra tệp Excel...";
  try {
    const rows = await parseTaskBulkImportFile(file);
    if (!current()) return;
    const validated = validateTaskBulkImportRows(rows);
    taskBulkImportState = { ...validated, fileName: file.name || "Tệp Excel" };
    renderTaskBulkImportPreview();
  } catch (error) {
    if (!current()) return;
    taskBulkImportState = { rows: [], errors: [], fileName: "" };
    byId("taskBulkImportSummary").textContent = error?.message || "Không thể đọc tệp Excel.";
    byId("taskBulkImportPreview").innerHTML = '<tr><td colspan="7" class="empty-cell">Không có dữ liệu hợp lệ để xem trước.</td></tr>';
  }
}

function importTaskBulkRows() {
  if (!isAdmin()) return;
  const rows = taskBulkImportState.rows.filter((row) => !row.errors.length);
  if (!rows.length || taskBulkImportState.errors.length) return;
  if (!confirm(`Nhập ${rows.length} công việc mới vào hệ thống? Dữ liệu sẽ được đồng bộ với các tài khoản khác.`)) return;
  const previous = {
    tasks: state.tasks,
    projectCatalog: state.projectCatalog,
    evaluations: state.evaluations,
    activityLog: state.activityLog,
  };
  const timestamp = new Date().toISOString();
  const actor = currentActorInfo();
  const projectsByName = new Map((state.projectCatalog || []).map((project) => [projectCatalogNameKey(project.name), project]));
  const newProjects = [];
  rows.forEach((row) => {
    const key = projectCatalogNameKey(row.projectName);
    if (projectsByName.has(key)) return;
    const project = applyRecordAudit({ id: uid("project"), name: row.projectName }, null);
    projectsByName.set(key, project);
    newProjects.push(project);
  });
  const importedTasks = rows.map((row) => {
    const project = projectsByName.get(projectCatalogNameKey(row.projectName));
    const completed = row.status === TASK_STATUS_COMPLETED;
    return applyRecordAudit({
      id: uid("task"),
      kind: TASK_KIND_REGULAR,
      title: row.title,
      projectId: project?.id || "",
      projectName: project?.name || row.projectName,
      ownerId: row.ownerId,
      collaboratorIds: row.collaboratorIds,
      collaboratorId: "",
      category: row.category,
      workType: row.workType,
      recurrence: row.recurrence,
      startDate: row.startDate,
      due: row.due,
      dueTime: "",
      status: row.status,
      progress: row.progress,
      qualityPercent: "",
      attachments: [],
      note: row.note,
      customFields: {},
      completionReviewStatus: completed ? "pending" : "",
      completionReviewedAt: "",
      completionReviewedById: "",
      completionReviewedByName: "",
      completionReviewNote: "",
      completedAt: completed ? timestamp : "",
      completedById: completed ? actor.id : "",
      completedByName: completed ? actor.name : "",
      progressReports: row.note ? [{
        id: uid("task-report"),
        progress: row.progress,
        status: row.status,
        previousStatus: "",
        action: "Nhập hàng loạt từ Excel",
        note: row.note,
        createdAt: timestamp,
        createdById: actor.id,
        createdBy: actor.name,
      }] : [],
    }, null);
  });
  try {
    state.projectCatalog = [...(state.projectCatalog || []), ...newProjects];
    state.tasks = [...(state.tasks || []), ...importedTasks];
    importedTasks.forEach((task) => {
      syncPersonalEvaluationTaskScoresForTask(task);
      const owner = personById(task.ownerId);
      logActivity({
        action: "Nhập hàng loạt từ Excel",
        module: "Công việc",
        targetType: "task",
        targetId: task.id,
        personId: task.ownerId,
        departmentId: owner?.departmentId || "",
        period: taskPeriod(task),
        title: task.title,
        details: `${task.projectName} · ${taskOwnerName(task, "Chưa rõ người thực hiện")} · ${task.category} · ${normalizeTaskStatus(task.status)}`,
        score: `${formatScore(task.progress)}%`,
      });
    });
    newProjects.forEach((project) => logActivity({
      action: "Thêm dự án từ Excel",
      module: "Công việc",
      targetType: "project-catalog",
      targetId: project.id,
      title: project.name,
      details: "Tự tạo khi nhập hàng loạt công việc.",
    }));
    saveState();
    closeTaskBulkImportDialog();
    renderAll();
    alert(`Đã nhập ${importedTasks.length} công việc${newProjects.length ? ` và thêm ${newProjects.length} dự án mới` : ""}.`);
  } catch (error) {
    state.tasks = previous.tasks;
    state.projectCatalog = previous.projectCatalog;
    state.evaluations = previous.evaluations;
    state.activityLog = previous.activityLog;
    alert(error?.message || "Không thể lưu dữ liệu nhập từ Excel.");
  }
}

function openTaskBulkImportDialog() {
  if (!isAdmin()) return;
  resetTaskBulkImport();
  const dialog = byId("taskBulkImportDialog");
  dialog.classList.remove("is-hidden");
  dialog.setAttribute("aria-hidden", "false");
}


function normalizeTaskBulkImportKey(value) {
  return normalizeSearchText(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function taskBulkImportColumnMap(headers) {
  const normalizedHeaders = headers.map((header) => normalizeTaskBulkImportKey(header));
  return Object.fromEntries(
    Object.entries(taskBulkImportHeaders).map(([field, aliases]) => [
      field,
      normalizedHeaders.findIndex((header) => aliases.some((alias) => header === normalizeTaskBulkImportKey(alias))),
    ]),
  );
}

function taskBulkImportCell(row, columns, field) {
  const index = Number(columns[field]);
  return index >= 0 ? String(row[index] ?? "").trim() : "";
}

function taskBulkImportExcelDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 20000 || serial > 90000) return "";
  const date = new Date((Math.floor(serial) - 25569) * 86400000);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function normalizeTaskBulkImportDate(value) {
  const text = String(value ?? "").trim();
  const excelDate = taskBulkImportExcelDate(text);
  if (excelDate) return excelDate;
  const iso = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  const vietnam = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  const parts = iso ? [iso[1], iso[2], iso[3]] : vietnam ? [vietnam[3], vietnam[2], vietnam[1]] : null;
  if (!parts) return "";
  const result = `${parts[0]}-${padDatePart(parts[1])}-${padDatePart(parts[2])}`;
  const date = new Date(`${result}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === result ? result : "";
}

function taskBulkImportPerson(reference) {
  const raw = String(reference || "").trim();
  if (!raw) return null;
  const byId = personById(raw);
  if (byId) return byId;
  const normalized = normalizeSearchText(raw);
  const directMatches = state.people.filter((person) => normalizeSearchText(person.name) === normalized);
  if (directMatches.length === 1) return directMatches[0];
  const accountMatches = state.accounts
    .filter((account) => normalizeSearchText(account.username) === normalized || normalizeSearchText(account.displayName) === normalized)
    .map((account) => personById(account.personId))
    .filter(Boolean);
  return accountMatches.length === 1 ? accountMatches[0] : null;
}

function taskBulkImportWorkType(value) {
  const normalized = normalizeSearchText(value);
  if (!normalized || normalized === "routine" || normalized.includes("thuong xuyen")) return TASK_WORK_TYPE_ROUTINE;
  if (normalized === "arising" || normalized.includes("phat sinh")) return TASK_WORK_TYPE_ARISING;
  return "";
}

function taskBulkImportRecurrence(value) {
  const normalized = normalizeSearchText(value);
  if (!normalized || normalized === "none" || normalized.includes("khong dinh ky")) return TASK_RECURRENCE_NONE;
  if (normalized === "daily" || normalized.includes("hang ngay")) return TASK_RECURRENCE_DAILY;
  if (normalized === "weekly" || normalized.includes("hang tuan")) return TASK_RECURRENCE_WEEKLY;
  if (normalized === "monthly" || normalized.includes("hang thang")) return TASK_RECURRENCE_MONTHLY;
  if (normalized === "quarterly" || normalized.includes("hang quy")) return TASK_RECURRENCE_QUARTERLY;
  return "";
}

function taskBulkImportStatus(value) {
  const normalized = normalizeSearchText(value);
  if (!normalized || normalized.includes("chuan bi") || normalized.includes("chua bat dau")) return TASK_STATUS_PREPARING;
  if (normalized.includes("dang thuc hien")) return "Đang thực hiện";
  if (normalized.includes("hoan thanh")) return TASK_STATUS_COMPLETED;
  // "Quá hạn" is calculated from the deadline, never accepted as a manually-set status.
  if (normalized.includes("qua han")) return "Đang thực hiện";
  return "";
}

function taskBulkImportSignature(row) {
  return [normalizeSearchText(row.title), row.ownerId, projectCatalogNameKey(row.projectName), row.startDate, row.due].join("|");
}

function renderTaskBulkImportPreview() {
  const rows = taskBulkImportState.rows;
  const errors = taskBulkImportState.errors;
  const validCount = rows.filter((row) => !row.errors.length).length;
  const existingProjectKeys = new Set((state.projectCatalog || []).map((project) => projectCatalogNameKey(project.name)));
  const safeNewProjectCount = new Set(
    rows.filter((row) => !row.errors.length).map((row) => projectCatalogNameKey(row.projectName)).filter((key) => !existingProjectKeys.has(key)),
  ).size;
  byId("taskBulkImportSummary").textContent = taskBulkImportState.fileName
    ? `${taskBulkImportState.fileName}: ${rows.length} dòng dữ liệu · ${validCount} hợp lệ · ${errors.length} lỗi · ${safeNewProjectCount} dự án mới sẽ được thêm.`
    : "Chưa chọn tệp để kiểm tra.";
  byId("confirmTaskBulkImport").disabled = !validCount || Boolean(errors.length);
  byId("taskBulkImportPreview").innerHTML = rows.length
    ? rows.slice(0, 50).map((row) => `
        <tr>
          <td>${row.line}</td>
          <td>${escapeHtml(row.title || "-")}</td>
          <td>${escapeHtml(row.projectName || "-")}</td>
          <td>${escapeHtml(row.ownerName || "-")}</td>
          <td>${escapeHtml(row.category || "-")}</td>
          <td>${escapeHtml(row.startDate ? `${formatDate(row.startDate)} - ${formatDate(row.due)}` : "-")}</td>
          <td>${row.errors.length ? `<span class="badge bad">${escapeHtml(row.errors.join("; "))}</span>` : '<span class="badge good">Hợp lệ</span>'}</td>
        </tr>
      `).join("")
    : '<tr><td colspan="7" class="empty-cell">Chưa có dữ liệu xem trước.</td></tr>';
  const errorBox = byId("taskBulkImportErrors");
  errorBox.classList.toggle("is-hidden", !errors.length);
  errorBox.innerHTML = errors.length
    ? `<strong>Cần sửa ${errors.length} dòng trước khi nhập:</strong><ul>${errors.slice(0, 12).map((error) => `<li>Dòng ${error.line}: ${escapeHtml(error.messages.join("; "))}</li>`).join("")}${errors.length > 12 ? `<li>... và ${errors.length - 12} dòng khác.</li>` : ""}</ul>`
    : "";
}

function downloadTaskBulkImportTemplate() {
  const headers = ["Tên công việc", "Danh mục dự án", "Người thực hiện", "Người phối hợp", "Danh mục nhiệm vụ", "Loại công việc", "Định kỳ", "Ngày bắt đầu", "Ngày hoàn thành", "Trạng thái", "Tiến độ (%)", "Nội dung công việc / Báo cáo tiến độ"];
  const content = `\uFEFF${headers.join(";")}\n`;
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mau-nhap-cong-viec.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

let initialized = false;
function initialize() {
  if (initialized) return;
  initialized = true;
  byId("taskBulkImportFile").addEventListener("change", (event) => {
    handleTaskBulkImportFile(event.target.files?.[0]);
  });
  byId("downloadTaskImportTemplate").addEventListener("click", downloadTaskBulkImportTemplate);
  byId("confirmTaskBulkImport").addEventListener("click", importTaskBulkRows);
  byId("resetTaskBulkImport").addEventListener("click", resetTaskBulkImport);
}

globalThis.QldaFeatures.register("tasks-import", FEATURE_VERSION, { handleTaskBulkImportFile, importTaskBulkRows, openTaskBulkImportDialog, downloadTaskBulkImportTemplate, initialize });
})();
