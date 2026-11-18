(function () {
  "use strict";

  const PROJECT_TEMPLATE_VERSION = 1;
  const PROJECT_STATUSES = ["draft", "active", "on-hold", "completed"];
  const STAGE_STATUSES = ["pending", "in-progress", "completed", "blocked"];
  const CHECK_STATUSES = ["pending", "pass", "missing", "na"];
  const MILESTONE_STATUSES = ["pending", "in-progress", "completed", "delayed"];
  const RISK_LEVELS = ["low", "medium", "high", "critical"];
  const RISK_STATUSES = ["open", "monitoring", "resolved"];

  const STAGES = Object.freeze([
    { id: "preparation", title: "Chuẩn bị đầu tư", short: "Chuẩn bị đầu tư" },
    { id: "appraisal", title: "Thẩm định và quyết định đầu tư", short: "Thẩm định, phê duyệt" },
    { id: "implementation-preparation", title: "Chuẩn bị thực hiện", short: "Chuẩn bị thực hiện" },
    { id: "implementation", title: "Thực hiện dự án", short: "Thực hiện" },
    { id: "handover", title: "Nghiệm thu và bàn giao", short: "Nghiệm thu, bàn giao" },
    { id: "settlement", title: "Quyết toán và kết thúc", short: "Quyết toán" },
  ]);

  const CHECKLIST = Object.freeze([
    { id: "policy", stageId: "preparation", title: "Quyết định/chấp thuận chủ trương đầu tư", note: "Đúng thẩm quyền, mục tiêu, quy mô và thời gian thực hiện." },
    { id: "planning", stageId: "preparation", title: "Sự phù hợp quy hoạch và kế hoạch đầu tư công", note: "Có căn cứ quy hoạch, kế hoạch vốn và khả năng cân đối vốn." },
    { id: "survey", stageId: "preparation", title: "Hồ sơ khảo sát, nhu cầu và phương án sơ bộ", note: "Đủ dữ liệu đầu vào để lập và thẩm định dự án." },
    { id: "appraisal-result", stageId: "appraisal", title: "Kết quả thẩm định dự án", note: "Liên kết hồ sơ thẩm định và các nội dung đã được hoàn thiện." },
    { id: "investment-decision", stageId: "appraisal", title: "Quyết định đầu tư", note: "Ghi nhận số, ngày, cấp quyết định và tổng mức đầu tư được duyệt." },
    { id: "capital-plan", stageId: "appraisal", title: "Kế hoạch bố trí vốn", note: "Phù hợp thời gian thực hiện và tổng mức đầu tư được duyệt." },
    { id: "land-gpmb", stageId: "implementation-preparation", title: "Đất đai và giải phóng mặt bằng", note: "Đã xác định phạm vi, kế hoạch và tình trạng bàn giao mặt bằng." },
    { id: "design", stageId: "implementation-preparation", title: "Thiết kế, dự toán và thủ tục xây dựng", note: "Hồ sơ được thẩm định/phê duyệt theo phạm vi dự án." },
    { id: "environment-permits", stageId: "implementation-preparation", title: "Môi trường, PCCC và giấy phép chuyên ngành", note: "Các thủ tục bắt buộc đã hoàn thành hoặc được xác định không áp dụng." },
    { id: "procurement", stageId: "implementation-preparation", title: "Kế hoạch lựa chọn nhà thầu", note: "Phạm vi, tiến độ và nguồn vốn của các gói thầu thống nhất với dự án." },
    { id: "contracts", stageId: "implementation", title: "Hợp đồng và điều kiện khởi công", note: "Hợp đồng, bảo lãnh, mặt bằng và điều kiện thi công đã sẵn sàng." },
    { id: "quality", stageId: "implementation", title: "Quản lý chất lượng, khối lượng và tiến độ", note: "Có hồ sơ kiểm soát, nghiệm thu và xử lý sai lệch." },
    { id: "disbursement", stageId: "implementation", title: "Thanh toán và giải ngân", note: "Khối lượng, hồ sơ thanh toán và số liệu vốn được đối chiếu." },
    { id: "acceptance", stageId: "handover", title: "Nghiệm thu hoàn thành", note: "Đủ biên bản, kết quả kiểm tra và điều kiện đưa vào sử dụng." },
    { id: "asset-handover", stageId: "handover", title: "Bàn giao công trình, tài sản và hồ sơ hoàn công", note: "Xác định đơn vị tiếp nhận, vận hành và lưu hồ sơ." },
    { id: "settlement-file", stageId: "settlement", title: "Hồ sơ quyết toán dự án hoàn thành", note: "Đủ thành phần, số liệu và đối chiếu công nợ/tài sản." },
    { id: "settlement-approval", stageId: "settlement", title: "Thẩm tra và phê duyệt quyết toán", note: "Kết quả xử lý sau thẩm tra được cập nhật đầy đủ." },
    { id: "post-evaluation", stageId: "settlement", title: "Đánh giá kết thúc và bàn giao lưu trữ", note: "Tổng hợp mục tiêu, hiệu quả, tồn tại và hồ sơ lưu trữ." },
  ]);

  const $ = (id) => document.getElementById(id);
  const text = (value, maxLength = 240, multiline = false) => {
    const source = String(value || "").trim();
    const normalized = multiline
      ? source.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n")
      : source.replace(/\s+/g, " ");
    return normalized.slice(0, maxLength);
  };
  const ids = (value, limit = 200) => [...new Set((Array.isArray(value) ? value : []).map((item) => String(item || "").trim()).filter(Boolean))].slice(0, limit);
  const isoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";
  const makeId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}-${Math.random().toString(16).slice(2)}`;
  const stageById = (id) => STAGES.find((stage) => stage.id === String(id || "")) || STAGES[0];
  const optionSelected = (value, expected) => value === expected ? " selected" : "";
  const safe = (value) => typeof escapeHtml === "function" ? escapeHtml(value) : String(value || "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
  const currentIsoDate = () => {
    if (typeof gpmbWorkflowTodayIso === "function") return gpmbWorkflowTodayIso();
    return new Date().toISOString().slice(0, 10);
  };

  function normalizeStages(value) {
    const saved = new Map((Array.isArray(value) ? value : []).filter((item) => item && typeof item === "object").map((item) => [String(item.id || ""), item]));
    return STAGES.map((template, index) => {
      const item = saved.get(template.id) || {};
      return {
        id: template.id,
        status: STAGE_STATUSES.includes(String(item.status || "")) ? String(item.status) : index === 0 ? "in-progress" : "pending",
        plannedStart: isoDate(item.plannedStart),
        plannedEnd: isoDate(item.plannedEnd),
        actualEnd: isoDate(item.actualEnd),
        note: text(item.note, 3000, true),
      };
    });
  }

  function normalizeChecklist(value) {
    const saved = new Map((Array.isArray(value) ? value : []).filter((item) => item && typeof item === "object").map((item) => [String(item.id || ""), item]));
    return CHECKLIST.map((template) => {
      const item = saved.get(template.id) || {};
      return {
        id: template.id,
        status: CHECK_STATUSES.includes(String(item.status || "")) ? String(item.status) : "pending",
        note: text(item.note, 3000, true),
        archiveRecordId: String(item.archiveRecordId || ""),
      };
    });
  }

  function normalizeMilestones(value) {
    return (Array.isArray(value) ? value : []).filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: String(item.id || makeId("project-milestone")),
        title: text(item.title, 240),
        stageId: stageById(item.stageId).id,
        ownerId: String(item.ownerId || ""),
        dueDate: isoDate(item.dueDate),
        completedDate: isoDate(item.completedDate),
        status: MILESTONE_STATUSES.includes(String(item.status || "")) ? String(item.status) : "pending",
        note: text(item.note, 3000, true),
      }))
      .filter((item) => item.title)
      .slice(-300);
  }

  function normalizeRisks(value) {
    return (Array.isArray(value) ? value : []).filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: String(item.id || makeId("project-risk")),
        title: text(item.title, 300),
        level: RISK_LEVELS.includes(String(item.level || "")) ? String(item.level) : "medium",
        status: RISK_STATUSES.includes(String(item.status || "")) ? String(item.status) : "open",
        ownerId: String(item.ownerId || ""),
        dueDate: isoDate(item.dueDate),
        resolution: text(item.resolution, 4000, true),
      }))
      .filter((item) => item.title)
      .slice(-200);
  }

  function normalizeHistory(value) {
    return (Array.isArray(value) ? value : []).filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: String(item.id || makeId("project-history")),
        action: text(item.action, 180),
        details: text(item.details, 1200, true),
        createdAt: String(item.createdAt || ""),
        createdBy: text(item.createdBy, 160),
        createdById: String(item.createdById || ""),
      }))
      .filter((item) => item.action || item.createdAt)
      .slice(-300);
  }

  function normalizeCollection(records = [], projects = []) {
    const projectMap = new Map((Array.isArray(projects) ? projects : []).map((project) => [String(project.id || ""), project]));
    const usedProjects = new Set();
    const usedCodes = new Set();
    return (Array.isArray(records) ? records : [])
      .filter((item) => item && typeof item === "object" && String(item.id || "").trim())
      .map((item) => {
        const project = projectMap.get(String(item.projectId || ""));
        const code = text(item.code, 80).toUpperCase();
        const codeKey = code.toLocaleLowerCase("vi");
        if (!project || !code || usedProjects.has(project.id) || usedCodes.has(codeKey)) return null;
        usedProjects.add(project.id);
        usedCodes.add(codeKey);
        const stages = normalizeStages(item.stages);
        const firstOpenStage = stages.find((stage) => stage.status !== "completed") || stages[stages.length - 1];
        return {
          ...item,
          id: String(item.id),
          projectId: project.id,
          projectName: String(project.name || ""),
          code,
          status: PROJECT_STATUSES.includes(String(item.status || "")) ? String(item.status) : "draft",
          phase: firstOpenStage.id,
          projectGroup: ["A", "B", "C", "other"].includes(String(item.projectGroup || "")) ? String(item.projectGroup) : "C",
          sector: text(item.sector, 160),
          investor: text(item.investor, 240),
          authority: text(item.authority, 200),
          capitalSource: text(item.capitalSource, 240),
          totalInvestment: Math.max(0, Math.round(Number(item.totalInvestment) || 0)),
          decisionNo: text(item.decisionNo, 120),
          decisionDate: isoDate(item.decisionDate),
          plannedStart: isoDate(item.plannedStart),
          plannedEnd: isoDate(item.plannedEnd),
          objective: text(item.objective, 6000, true),
          departmentId: String(item.departmentId || ""),
          managerId: String(item.managerId || ""),
          participantIds: ids(item.participantIds).filter((id) => id !== String(item.managerId || "")),
          archiveRecordIds: ids(item.archiveRecordIds),
          templateVersion: PROJECT_TEMPLATE_VERSION,
          stages,
          checklist: normalizeChecklist(item.checklist),
          milestones: normalizeMilestones(item.milestones),
          risks: normalizeRisks(item.risks),
          history: normalizeHistory(item.history),
        };
      })
      .filter(Boolean);
  }

  let stageDrafts = [];
  let checklistDrafts = [];
  let milestoneDrafts = [];
  let riskDrafts = [];
  let historyDrafts = [];
  let activeTab = "overview";

  const accountRole = (account = currentAccount?.()) => String(account?.role || "");
  const personIdForAccount = (account = currentAccount?.()) => String(account?.personId || currentPerson?.()?.id || "");
  const departmentIdForAccount = (account = currentAccount?.()) => String(account?.departmentId || currentPerson?.()?.departmentId || "");
  const recordById = (id) => (state.publicInvestmentProjects || []).find((record) => record.id === String(id || "")) || null;

  function canCreate(account = currentAccount?.()) {
    return Boolean(account && moduleIsAvailableToAccount?.("public-investment-projects", account)
      && ["admin", "director", "manager", "deputy_manager", "section_head"].includes(accountRole(account)));
  }

  function canManage(record, account = currentAccount?.()) {
    if (!account || !record) return false;
    if (["admin", "director"].includes(accountRole(account))) return true;
    return ["manager", "deputy_manager", "section_head"].includes(accountRole(account))
      && String(record.departmentId || "") === departmentIdForAccount(account);
  }

  function assignedToRecord(record, account = currentAccount?.()) {
    const personId = personIdForAccount(account);
    return Boolean(personId && [String(record?.managerId || ""), ...(record?.participantIds || [])].includes(personId));
  }

  function canView(record, account = currentAccount?.()) {
    if (!account || !record || !moduleIsAvailableToAccount?.("public-investment-projects", account)) return false;
    if (["admin", "director"].includes(accountRole(account))) return true;
    if (["manager", "deputy_manager", "section_head"].includes(accountRole(account)) && String(record.departmentId || "") === departmentIdForAccount(account)) return true;
    return assignedToRecord(record, account);
  }

  function canEdit(record, account = currentAccount?.()) {
    return canManage(record, account) || assignedToRecord(record, account);
  }

  function onlineSupported() {
    if (typeof isOfflineFileRuntime === "function" && isOfflineFileRuntime()) return true;
    if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return true;
    return typeof usingSupabaseSync === "function" && usingSupabaseSync()
      && typeof deploymentVersionAtLeast === "function"
      && deploymentVersionAtLeast(sharedSync.deploymentVersion, PUBLIC_INVESTMENT_PROJECT_DEPLOYMENT_VERSION);
  }

  function projectStatusLabel(value) {
    return ({ draft: "Đang thiết lập", active: "Đang thực hiện", "on-hold": "Tạm dừng", completed: "Đã kết thúc" })[value] || "Đang thiết lập";
  }
  function stageStatusLabel(value) {
    return ({ pending: "Chưa bắt đầu", "in-progress": "Đang thực hiện", completed: "Hoàn thành", blocked: "Đang vướng" })[value] || "Chưa bắt đầu";
  }
  function checkStatusLabel(value) {
    return ({ pending: "Chưa kiểm tra", pass: "Đạt", missing: "Thiếu / chưa đạt", na: "Không áp dụng" })[value] || "Chưa kiểm tra";
  }
  function milestoneStatusLabel(value) {
    return ({ pending: "Chưa bắt đầu", "in-progress": "Đang thực hiện", completed: "Hoàn thành", delayed: "Chậm tiến độ" })[value] || "Chưa bắt đầu";
  }
  function riskLevelLabel(value) {
    return ({ low: "Thấp", medium: "Trung bình", high: "Cao", critical: "Nghiêm trọng" })[value] || "Trung bình";
  }
  function riskStatusLabel(value) {
    return ({ open: "Cần xử lý", monitoring: "Đang theo dõi", resolved: "Đã xử lý" })[value] || "Cần xử lý";
  }

  function recordProgress(record) {
    const stages = normalizeStages(record?.stages);
    const stageScore = stages.reduce((total, item) => total + (item.status === "completed" ? 1 : item.status === "in-progress" ? 0.5 : 0), 0) / stages.length;
    const checks = normalizeChecklist(record?.checklist);
    const checkScore = checks.filter((item) => ["pass", "na"].includes(item.status)).length / checks.length;
    return Math.round((stageScore * 0.65 + checkScore * 0.35) * 100);
  }

  function projectLinks(record) {
    const projectId = String(record?.projectId || "");
    const projectNameKey = typeof projectCatalogNameKey === "function" ? projectCatalogNameKey(record?.projectName) : String(record?.projectName || "").toLowerCase();
    const tasks = (state.tasks || []).filter((task) => String(task.projectId || "") === projectId || (!task.projectId && (typeof projectCatalogNameKey === "function" ? projectCatalogNameKey(task.projectName) : String(task.projectName || "").toLowerCase()) === projectNameKey));
    return {
      tasks,
      appraisals: (state.publicInvestmentAppraisals || []).filter((item) => String(item.projectId || "") === projectId),
      gpmb: (state.gpmbWorkflows || []).filter((item) => String(item.projectId || "") === projectId),
      archives: (state.archiveRecords || []).filter((item) => String(item.projectId || "") === projectId || (item.projectName && (typeof projectCatalogNameKey === "function" ? projectCatalogNameKey(item.projectName) : String(item.projectName || "").toLowerCase()) === projectNameKey)),
    };
  }

  function renderMetrics(records) {
    const total = records.length;
    const active = records.filter((record) => record.status === "active").length;
    const critical = records.filter((record) => (record.risks || []).some((risk) => risk.status !== "resolved" && ["high", "critical"].includes(risk.level))).length;
    const today = currentIsoDate();
    const upcoming = records.flatMap((record) => record.milestones || []).filter((item) => item.status !== "completed" && item.dueDate && item.dueDate >= today && item.dueDate <= (typeof addDaysToIsoDate === "function" ? addDaysToIsoDate(today, 14) : today)).length;
    const average = total ? Math.round(records.reduce((sum, record) => sum + recordProgress(record), 0) / total) : 0;
    const values = [
      ["Hồ sơ dự án", total, "Trong phạm vi tài khoản"],
      ["Đang thực hiện", active, "Dự án đang triển khai"],
      ["Có rủi ro cao", critical, "Cần ưu tiên xử lý"],
      ["Mốc 14 ngày tới", upcoming, "Chưa hoàn thành"],
      ["Tiến độ hồ sơ", `${average}%`, "Bình quân toàn danh mục"],
    ];
    $("publicInvestmentProjectMetrics").innerHTML = values.map(([label, value, note]) => `<article class="public-project-metric"><span>${safe(label)}</span><strong>${safe(value)}</strong><small>${safe(note)}</small></article>`).join("");
  }

  function visibleRecords() {
    const search = typeof normalizeSearchText === "function" ? normalizeSearchText($("publicInvestmentProjectSearch")?.value) : String($("publicInvestmentProjectSearch")?.value || "").toLowerCase();
    const phase = $("publicInvestmentProjectPhaseFilter")?.value || "";
    const status = $("publicInvestmentProjectStatusFilter")?.value || "";
    return (state.publicInvestmentProjects || []).filter((record) => canView(record)).filter((record) => {
      const haystack = typeof normalizeSearchText === "function"
        ? normalizeSearchText([record.code, record.projectName, record.investor, record.sector].join(" "))
        : [record.code, record.projectName, record.investor, record.sector].join(" ").toLowerCase();
      return (!search || haystack.includes(search)) && (!phase || record.phase === phase) && (!status || record.status === status);
    }).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }

  function render() {
    const list = $("publicInvestmentProjectList");
    if (!list || typeof state === "undefined") return;
    const phaseFilter = $("publicInvestmentProjectPhaseFilter");
    if (phaseFilter && phaseFilter.options.length <= 1) phaseFilter.innerHTML = '<option value="">Tất cả giai đoạn</option>' + STAGES.map((stage) => `<option value="${stage.id}">${safe(stage.short)}</option>`).join("");
    const records = visibleRecords();
    renderMetrics((state.publicInvestmentProjects || []).filter((record) => canView(record)));
    $("openPublicInvestmentProjectForm")?.classList.toggle("is-hidden", !canCreate());
    if (!records.length) {
      list.innerHTML = '<div class="empty-state">Chưa có hồ sơ dự án phù hợp với bộ lọc.</div>';
      return;
    }
    list.innerHTML = records.map((record) => {
      const progress = recordProgress(record);
      const phase = stageById(record.phase);
      const links = projectLinks(record);
      const openRisks = (record.risks || []).filter((risk) => risk.status !== "resolved").length;
      return `<article class="public-project-record">
        <div class="public-project-record-main">
          <div class="public-project-record-title"><strong>${safe(record.code)}</strong><h3>${safe(record.projectName)}</h3><span class="public-project-status" data-status="${safe(record.status)}">${safe(projectStatusLabel(record.status))}</span><span class="public-project-phase-badge">${safe(phase.short)}</span></div>
          <div class="public-project-record-meta"><span>Phụ trách: ${safe(personById?.(record.managerId)?.name || "Chưa phân công")}</span><span>Kế hoạch: ${safe(formatDate?.(record.plannedStart) || "Chưa đặt")} - ${safe(formatDate?.(record.plannedEnd) || "Chưa đặt")}</span><span>Tổng mức đầu tư: ${safe(record.totalInvestment ? record.totalInvestment.toLocaleString("vi-VN") + " đ" : "Chưa cập nhật")}</span></div>
          <div class="public-project-record-progress"><span>Hồ sơ ${progress}%</span><span>${links.tasks.length} công việc</span><span>${links.appraisals.length} hồ sơ thẩm định</span><span>${links.gpmb.length} đợt GPMB</span><span>${openRisks} vướng mắc mở</span></div>
          <div class="public-project-progress-bar" aria-label="Tiến độ hồ sơ ${progress}%"><span style="width:${progress}%"></span></div>
        </div>
        <div class="public-project-record-actions"><button class="ghost" type="button" data-public-project-print="${safe(record.id)}">Báo cáo</button><button type="button" data-public-project-open="${safe(record.id)}">${canEdit(record) ? "Cập nhật" : "Xem"}</button>${accountRole() === "admin" ? `<button class="danger ghost" type="button" data-public-project-delete="${safe(record.id)}">Xóa</button>` : ""}</div>
      </article>`;
    }).join("");
  }

  function renderPersonOptions(record) {
    const people = (state.people || []).filter((person) => typeof isActivePerson !== "function" || isActivePerson(person)).slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "vi"));
    const options = people.map((person) => `<option value="${safe(person.id)}">${safe(person.name)}${person.departmentId ? ` · ${safe(departmentById?.(person.departmentId)?.name || "")}` : ""}</option>`).join("");
    ["publicInvestmentProjectManagerId", "publicInvestmentProjectMilestoneOwner", "publicInvestmentProjectRiskOwner"].forEach((id) => {
      const select = $(id);
      if (!select) return;
      const first = id === "publicInvestmentProjectManagerId" ? '<option value="">Chọn người phụ trách</option>' : '<option value="">Người phụ trách</option>';
      select.innerHTML = first + options;
    });
    $("publicInvestmentProjectParticipantIds").innerHTML = options;
    if (record?.managerId) $("publicInvestmentProjectManagerId").value = record.managerId;
    const selected = new Set(record?.participantIds || []);
    Array.from($("publicInvestmentProjectParticipantIds")?.options || []).forEach((option) => { option.selected = selected.has(option.value); });
  }

  function renderCatalogOptions(selectedId = "") {
    const used = new Set((state.publicInvestmentProjects || []).map((record) => record.projectId));
    const currentId = String(selectedId || "");
    const options = (state.projectCatalog || []).filter((project) => project.id === currentId || !used.has(project.id)).slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "vi"));
    $("publicInvestmentProjectCatalogId").innerHTML = '<option value="">Chọn dự án</option>' + options.map((project) => `<option value="${safe(project.id)}">${safe(project.name)}</option>`).join("");
    $("publicInvestmentProjectCatalogId").value = options.some((project) => project.id === currentId) ? currentId : "";
  }

  function renderArchiveOptions(selectedIds = []) {
    const selected = new Set(selectedIds || []);
    const options = (state.archiveRecords || []).slice().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    $("publicInvestmentProjectArchiveIds").innerHTML = options.map((item) => `<option value="${safe(item.id)}">${safe(item.title || item.name || "Hồ sơ lưu trữ")}</option>`).join("");
    Array.from($("publicInvestmentProjectArchiveIds")?.options || []).forEach((option) => { option.selected = selected.has(option.value); });
  }

  function collectStages() {
    stageDrafts = Array.from($("publicInvestmentProjectStages")?.querySelectorAll("[data-public-project-stage]") || []).map((row) => ({
      id: row.dataset.publicProjectStage,
      status: row.querySelector("select")?.value || "pending",
      plannedStart: row.querySelector('[data-field="plannedStart"]')?.value || "",
      plannedEnd: row.querySelector('[data-field="plannedEnd"]')?.value || "",
      actualEnd: row.querySelector('[data-field="actualEnd"]')?.value || "",
      note: row.querySelector('[data-field="note"]')?.value || "",
    }));
    return stageDrafts;
  }

  function renderStages(editable = true, managerEditable = true) {
    const values = new Map(normalizeStages(stageDrafts).map((item) => [item.id, item]));
    $("publicInvestmentProjectStages").innerHTML = STAGES.map((template, index) => {
      const value = values.get(template.id);
      const previousComplete = index === 0 || values.get(STAGES[index - 1].id)?.status === "completed";
      const locked = !previousComplete && value.status !== "completed";
      const checks = checklistDrafts.filter((item) => CHECKLIST.find((templateItem) => templateItem.id === item.id)?.stageId === template.id);
      const passed = checks.filter((item) => ["pass", "na"].includes(item.status)).length;
      const progress = checks.length ? Math.round(passed / checks.length * 100) : 0;
      return `<div class="public-project-stage" data-public-project-stage="${template.id}">
        <span class="public-project-stage-number">${String(index + 1).padStart(2, "0")}</span>
        <div class="public-project-stage-title"><strong>${safe(template.title)}</strong><small>${locked ? "Chờ giai đoạn trước hoàn thành" : `${passed}/${checks.length} điều kiện pháp lý đạt`}</small><div class="public-project-stage-progress"><span style="width:${progress}%"></span></div></div>
        <select aria-label="Trạng thái ${safe(template.title)}"${!editable || !managerEditable || locked ? " disabled" : ""}>${STAGE_STATUSES.map((status) => `<option value="${status}"${optionSelected(value.status, status)}>${safe(stageStatusLabel(status))}</option>`).join("")}</select>
        <input data-field="plannedStart" type="date" value="${safe(value.plannedStart)}" aria-label="Ngày bắt đầu ${safe(template.title)}"${!editable || !managerEditable ? " disabled" : ""}>
        <input data-field="plannedEnd" type="date" value="${safe(value.plannedEnd)}" aria-label="Ngày kết thúc ${safe(template.title)}"${!editable || !managerEditable ? " disabled" : ""}>
        <input data-field="note" value="${safe(value.note)}" maxlength="3000" placeholder="Ghi chú giai đoạn" aria-label="Ghi chú ${safe(template.title)}"${!editable ? " disabled" : ""}>
        <input class="is-hidden" data-field="actualEnd" type="date" value="${safe(value.actualEnd)}" tabindex="-1">
      </div>`;
    }).join("");
  }

  function collectChecklist() {
    checklistDrafts = Array.from($("publicInvestmentProjectChecklist")?.querySelectorAll("[data-public-project-check]") || []).map((row) => ({
      id: row.dataset.publicProjectCheck,
      status: row.querySelector("select")?.value || "pending",
      note: row.querySelector("input")?.value || "",
      archiveRecordId: row.querySelector('[data-field="archive"]')?.value || "",
    }));
    return checklistDrafts;
  }

  function renderChecklist(editable = true) {
    const values = new Map(normalizeChecklist(checklistDrafts).map((item) => [item.id, item]));
    const groups = new Map(STAGES.map((stage) => [stage.id, []]));
    CHECKLIST.forEach((item) => groups.get(item.stageId).push(item));
    const archives = (state.archiveRecords || []).map((item) => `<option value="${safe(item.id)}">${safe(item.title || item.name || "Hồ sơ")}</option>`).join("");
    $("publicInvestmentProjectChecklist").innerHTML = [...groups.entries()].map(([stageId, items]) => `<section class="public-project-check-group"><h4>${safe(stageById(stageId).title)}</h4>${items.map((template) => {
      const value = values.get(template.id);
      return `<div class="public-project-check-row" data-public-project-check="${template.id}"><div><strong>${safe(template.title)}</strong><small>${safe(template.note)}</small></div><select aria-label="Kết quả ${safe(template.title)}"${!editable ? " disabled" : ""}>${CHECK_STATUSES.map((status) => `<option value="${status}"${optionSelected(value.status, status)}>${safe(checkStatusLabel(status))}</option>`).join("")}</select><div><input value="${safe(value.note)}" maxlength="3000" placeholder="Căn cứ / nội dung cần hoàn thiện" aria-label="Ghi chú ${safe(template.title)}"${!editable ? " disabled" : ""}><select class="is-hidden" data-field="archive" tabindex="-1"><option value="">Không liên kết</option>${archives}</select></div></div>`;
    }).join("")}</section>`).join("");
    Array.from($("publicInvestmentProjectChecklist")?.querySelectorAll("[data-public-project-check]") || []).forEach((row) => {
      const value = values.get(row.dataset.publicProjectCheck);
      const select = row.querySelector('[data-field="archive"]');
      if (select) select.value = value.archiveRecordId || "";
    });
  }

  function collectMilestones() {
    milestoneDrafts = Array.from($("publicInvestmentProjectMilestones")?.querySelectorAll("[data-public-project-milestone]") || []).map((row) => ({
      id: row.dataset.publicProjectMilestone,
      title: row.querySelector('[data-field="title"]')?.value || "",
      stageId: row.querySelector('[data-field="stage"]')?.value || STAGES[0].id,
      ownerId: row.querySelector('[data-field="owner"]')?.value || "",
      dueDate: row.querySelector('[data-field="due"]')?.value || "",
      completedDate: row.querySelector('[data-field="completed"]')?.value || "",
      status: row.querySelector('[data-field="status"]')?.value || "pending",
      note: row.querySelector('[data-field="note"]')?.value || "",
    }));
    return normalizeMilestones(milestoneDrafts);
  }

  function personOptions(selectedId = "") {
    return '<option value="">Chưa phân công</option>' + (state.people || []).map((person) => `<option value="${safe(person.id)}"${optionSelected(String(selectedId || ""), String(person.id || ""))}>${safe(person.name || "")}</option>`).join("");
  }

  function renderMilestones(editable = true) {
    const container = $("publicInvestmentProjectMilestones");
    if (!milestoneDrafts.length) {
      container.innerHTML = '<div class="empty-state">Chưa có mốc tiến độ.</div>';
      return;
    }
    container.innerHTML = milestoneDrafts.map((item) => `<div class="public-project-milestone" data-public-project-milestone="${safe(item.id)}">
      <input data-field="title" value="${safe(item.title)}" maxlength="240" aria-label="Tên mốc"${!editable ? " disabled" : ""}>
      <select data-field="stage" aria-label="Giai đoạn"${!editable ? " disabled" : ""}>${STAGES.map((stage) => `<option value="${stage.id}"${optionSelected(item.stageId, stage.id)}>${safe(stage.short)}</option>`).join("")}</select>
      <select data-field="owner" aria-label="Người phụ trách"${!editable ? " disabled" : ""}>${personOptions(item.ownerId)}</select>
      <input data-field="due" type="date" value="${safe(item.dueDate)}" aria-label="Thời hạn"${!editable ? " disabled" : ""}>
      <div><select data-field="status" aria-label="Trạng thái mốc"${!editable ? " disabled" : ""}>${MILESTONE_STATUSES.map((status) => `<option value="${status}"${optionSelected(item.status, status)}>${safe(milestoneStatusLabel(status))}</option>`).join("")}</select><input class="is-hidden" data-field="completed" type="date" value="${safe(item.completedDate)}"><input class="is-hidden" data-field="note" value="${safe(item.note)}"></div>
      ${editable ? `<button class="danger ghost" type="button" data-public-project-remove-milestone="${safe(item.id)}" aria-label="Xóa mốc">Xóa</button>` : ""}
    </div>`).join("");
  }

  function collectRisks() {
    riskDrafts = Array.from($("publicInvestmentProjectRisks")?.querySelectorAll("[data-public-project-risk]") || []).map((row) => ({
      id: row.dataset.publicProjectRisk,
      title: row.querySelector('[data-field="title"]')?.value || "",
      level: row.querySelector('[data-field="level"]')?.value || "medium",
      status: row.querySelector('[data-field="status"]')?.value || "open",
      ownerId: row.querySelector('[data-field="owner"]')?.value || "",
      dueDate: row.querySelector('[data-field="due"]')?.value || "",
      resolution: row.querySelector('[data-field="resolution"]')?.value || "",
    }));
    return normalizeRisks(riskDrafts);
  }

  function renderRisks(editable = true) {
    const container = $("publicInvestmentProjectRisks");
    if (!riskDrafts.length) {
      container.innerHTML = '<div class="empty-state">Chưa có vướng mắc hoặc rủi ro được ghi nhận.</div>';
      return;
    }
    container.innerHTML = riskDrafts.map((item) => `<div class="public-project-risk" data-public-project-risk="${safe(item.id)}">
      <input data-field="title" value="${safe(item.title)}" maxlength="300" aria-label="Nội dung vướng mắc"${!editable ? " disabled" : ""}>
      <select data-field="level" aria-label="Mức độ"${!editable ? " disabled" : ""}>${RISK_LEVELS.map((level) => `<option value="${level}"${optionSelected(item.level, level)}>${safe(riskLevelLabel(level))}</option>`).join("")}</select>
      <select data-field="owner" aria-label="Người xử lý"${!editable ? " disabled" : ""}>${personOptions(item.ownerId)}</select>
      <input data-field="due" type="date" value="${safe(item.dueDate)}" aria-label="Hạn xử lý"${!editable ? " disabled" : ""}>
      <div><select data-field="status" aria-label="Trạng thái xử lý"${!editable ? " disabled" : ""}>${RISK_STATUSES.map((status) => `<option value="${status}"${optionSelected(item.status, status)}>${safe(riskStatusLabel(status))}</option>`).join("")}</select><input data-field="resolution" value="${safe(item.resolution)}" maxlength="4000" placeholder="Kết quả / hướng xử lý" aria-label="Hướng xử lý"${!editable ? " disabled" : ""}></div>
      ${editable ? `<button class="danger ghost" type="button" data-public-project-remove-risk="${safe(item.id)}" aria-label="Xóa vướng mắc">Xóa</button>` : ""}
    </div>`).join("");
  }

  function renderLinks(record) {
    const links = projectLinks(record || { projectId: $("publicInvestmentProjectCatalogId")?.value, projectName: projectById?.($("publicInvestmentProjectCatalogId")?.value)?.name });
    const items = [
      ["tasks", "Công việc", links.tasks.length, "tasks"],
      ["appraisals", "Hồ sơ thẩm định", links.appraisals.length, "public-investment-appraisal"],
      ["gpmb", "Đợt GPMB", links.gpmb.length, "tasks"],
      ["archives", "Hồ sơ lưu trữ", links.archives.length, "archive"],
    ];
    $("publicInvestmentProjectLinks").innerHTML = items.map(([kind, label, count, view]) => `<article class="public-project-link"><div><span>${safe(label)}</span><strong>${count}</strong></div><button class="ghost" type="button" data-public-project-open-view="${view}" data-link-kind="${kind}">Mở</button></article>`).join("");
  }

  function renderHistory() {
    const records = normalizeHistory(historyDrafts).slice().reverse();
    $("publicInvestmentProjectHistory").innerHTML = records.length ? records.map((item) => `<article class="public-project-history-item"><div><strong>${safe(item.action || "Cập nhật hồ sơ")}</strong><p>${safe(item.details || "")}</p></div><small>${safe(item.createdBy || "")} ${item.createdAt ? `· ${safe(formatDateTime?.(item.createdAt) || item.createdAt)}` : ""}</small></article>`).join("") : '<div class="empty-state">Nhật ký sẽ được ghi khi hồ sơ được lưu.</div>';
  }

  function setTab(tabId) {
    activeTab = ["overview", "stages", "legal", "schedule", "links", "risks", "history"].includes(tabId) ? tabId : "overview";
    document.querySelectorAll("[data-public-project-tab]").forEach((button) => {
      const active = button.dataset.publicProjectTab === activeTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-public-project-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.publicProjectPanel === activeTab));
  }

  function resetForm() {
    $("publicInvestmentProjectForm")?.reset();
    $("publicInvestmentProjectId").value = "";
    renderCatalogOptions("");
    renderPersonOptions(null);
    renderArchiveOptions([]);
    const current = typeof currentPerson === "function" ? currentPerson() : null;
    if (current?.id) $("publicInvestmentProjectManagerId").value = current.id;
    stageDrafts = normalizeStages([]);
    checklistDrafts = normalizeChecklist([]);
    milestoneDrafts = [];
    riskDrafts = [];
    historyDrafts = [];
    renderStages(true, true);
    renderChecklist(true);
    renderMilestones(true);
    renderRisks(true);
    renderHistory();
    renderLinks(null);
    $("publicInvestmentProjectMilestoneStage").innerHTML = STAGES.map((stage) => `<option value="${stage.id}">${safe(stage.short)}</option>`).join("");
    $("publicInvestmentProjectPlannedStart").value = currentIsoDate();
    $("publicInvestmentProjectStatus").value = "draft";
    $("publicInvestmentProjectDialogTitle").textContent = "Khởi tạo hồ sơ dự án";
    $("publicInvestmentProjectDialogNote").textContent = "Một nguồn dữ liệu xuyên suốt vòng đời dự án.";
    $("printPublicInvestmentProject")?.classList.add("is-hidden");
    setTab("overview");
  }

  function setFormEditable(record) {
    const editable = !record || canEdit(record);
    const managerEditable = !record || canManage(record);
    Array.from($("publicInvestmentProjectForm")?.elements || []).forEach((element) => {
      if (["printPublicInvestmentProject", "resetPublicInvestmentProject"].includes(element.id)) return;
      element.disabled = !editable;
    });
    if (record && editable && !managerEditable) {
      ["publicInvestmentProjectCatalogId", "publicInvestmentProjectCode", "publicInvestmentProjectStatus", "publicInvestmentProjectGroup", "publicInvestmentProjectSector", "publicInvestmentProjectInvestor", "publicInvestmentProjectAuthority", "publicInvestmentProjectCapitalSource", "publicInvestmentProjectTotalInvestment", "publicInvestmentProjectDecisionNo", "publicInvestmentProjectDecisionDate", "publicInvestmentProjectPlannedStart", "publicInvestmentProjectPlannedEnd", "publicInvestmentProjectManagerId", "publicInvestmentProjectParticipantIds", "publicInvestmentProjectObjective", "publicInvestmentProjectArchiveIds"].forEach((id) => { if ($(id)) $(id).disabled = true; });
    }
    $("savePublicInvestmentProject")?.classList.toggle("is-hidden", !editable);
    $("resetPublicInvestmentProject")?.classList.toggle("is-hidden", Boolean(record) || !editable);
    renderStages(editable, managerEditable);
    renderChecklist(editable);
    renderMilestones(editable);
    renderRisks(editable);
    ["publicInvestmentProjectMilestoneTitle", "publicInvestmentProjectMilestoneStage", "publicInvestmentProjectMilestoneOwner", "publicInvestmentProjectMilestoneDue", "addPublicInvestmentProjectMilestone", "publicInvestmentProjectRiskTitle", "publicInvestmentProjectRiskLevel", "publicInvestmentProjectRiskOwner", "publicInvestmentProjectRiskDue", "addPublicInvestmentProjectRisk"].forEach((id) => { if ($(id)) $(id).disabled = !editable; });
  }

  function openForm(recordId = "") {
    if (!onlineSupported()) {
      showSystemToast?.("Máy chủ chưa hỗ trợ quản lý dự án", "Cần triển khai migration và Edge Function phiên bản mới trước khi lưu hồ sơ online.", { tone: "warning", duration: 10000 });
      return;
    }
    const record = recordById(recordId);
    if (record && !canView(record)) return showSystemToast?.("Không có quyền xem hồ sơ", "Dự án nằm ngoài phạm vi tài khoản hiện tại.", { tone: "warning" });
    if (!record && !canCreate()) return showSystemToast?.("Không có quyền khởi tạo", "Chỉ Ban lãnh đạo và cấp quản lý được khởi tạo hồ sơ dự án.", { tone: "warning" });
    resetForm();
    if (record) {
      renderCatalogOptions(record.projectId);
      renderPersonOptions(record);
      renderArchiveOptions(record.archiveRecordIds);
      $("publicInvestmentProjectId").value = record.id;
      $("publicInvestmentProjectCatalogId").value = record.projectId;
      $("publicInvestmentProjectCode").value = record.code;
      $("publicInvestmentProjectStatus").value = record.status;
      $("publicInvestmentProjectGroup").value = record.projectGroup;
      $("publicInvestmentProjectSector").value = record.sector || "";
      $("publicInvestmentProjectInvestor").value = record.investor || "";
      $("publicInvestmentProjectAuthority").value = record.authority || "";
      $("publicInvestmentProjectCapitalSource").value = record.capitalSource || "";
      $("publicInvestmentProjectTotalInvestment").value = record.totalInvestment || "";
      $("publicInvestmentProjectDecisionNo").value = record.decisionNo || "";
      $("publicInvestmentProjectDecisionDate").value = record.decisionDate || "";
      $("publicInvestmentProjectPlannedStart").value = record.plannedStart || "";
      $("publicInvestmentProjectPlannedEnd").value = record.plannedEnd || "";
      $("publicInvestmentProjectManagerId").value = record.managerId || "";
      $("publicInvestmentProjectObjective").value = record.objective || "";
      stageDrafts = normalizeStages(record.stages);
      checklistDrafts = normalizeChecklist(record.checklist);
      milestoneDrafts = normalizeMilestones(record.milestones);
      riskDrafts = normalizeRisks(record.risks);
      historyDrafts = normalizeHistory(record.history);
      renderLinks(record);
      renderHistory();
      $("publicInvestmentProjectDialogTitle").textContent = canEdit(record) ? "Cập nhật hồ sơ dự án" : "Chi tiết hồ sơ dự án";
      $("publicInvestmentProjectDialogNote").textContent = `${record.code} · ${record.projectName}`;
      $("printPublicInvestmentProject")?.classList.remove("is-hidden");
    }
    setFormEditable(record);
    openModal?.("publicInvestmentProjectDialog");
  }

  function validateGates(stages, checklist) {
    for (let index = 0; index < stages.length; index += 1) {
      const stage = stages[index];
      if (index > 0 && ["in-progress", "completed", "blocked"].includes(stage.status) && stages[index - 1].status !== "completed") {
        return `Giai đoạn “${stageById(stage.id).title}” chỉ được bắt đầu sau khi giai đoạn trước hoàn thành.`;
      }
      if (stage.status === "completed") {
        const required = checklist.filter((item) => CHECKLIST.find((template) => template.id === item.id)?.stageId === stage.id);
        if (required.some((item) => !["pass", "na"].includes(item.status))) return `Chưa thể hoàn thành “${stageById(stage.id).title}” vì còn điều kiện pháp lý chưa đạt.`;
      }
      if (stage.plannedStart && stage.plannedEnd && stage.plannedEnd < stage.plannedStart) return `Thời gian của “${stageById(stage.id).title}” chưa hợp lệ.`;
    }
    return "";
  }

  function save() {
    const existing = recordById($("publicInvestmentProjectId").value);
    if (existing && !canEdit(existing)) return;
    if (!existing && !canCreate()) return;
    const project = projectById?.($("publicInvestmentProjectCatalogId").value);
    const manager = personById?.($("publicInvestmentProjectManagerId").value);
    const plannedStart = $("publicInvestmentProjectPlannedStart").value;
    const plannedEnd = $("publicInvestmentProjectPlannedEnd").value;
    if (!project || !manager || !$("publicInvestmentProjectCode").value.trim()) {
      showSystemToast?.("Chưa đủ thông tin", "Dự án, mã dự án và người phụ trách là bắt buộc.", { tone: "warning" });
      return;
    }
    if (plannedStart && plannedEnd && plannedEnd < plannedStart) {
      showSystemToast?.("Thời gian chưa hợp lệ", "Ngày kết thúc kế hoạch không được trước ngày bắt đầu.", { tone: "warning" });
      return;
    }
    const stages = collectStages();
    const checklist = collectChecklist();
    const gateError = validateGates(stages, checklist);
    if (gateError) {
      showSystemToast?.("Chưa thể lưu giai đoạn", gateError, { tone: "warning", duration: 9000 });
      setTab("legal");
      return;
    }
    const account = currentAccount?.();
    const timestamp = new Date().toISOString();
    const code = text($("publicInvestmentProjectCode").value, 80).toUpperCase();
    const duplicate = (state.publicInvestmentProjects || []).some((record) => record.id !== existing?.id && (record.projectId === project.id || String(record.code || "").toLocaleLowerCase("vi") === code.toLocaleLowerCase("vi")));
    if (duplicate) {
      showSystemToast?.("Hồ sơ đã tồn tại", "Mỗi dự án và mã dự án chỉ có một hồ sơ quản lý xuyên suốt.", { tone: "warning" });
      return;
    }
    const participants = Array.from($("publicInvestmentProjectParticipantIds")?.selectedOptions || []).map((option) => option.value).filter((id) => id && id !== manager.id);
    const action = existing ? "Cập nhật hồ sơ dự án" : "Khởi tạo hồ sơ dự án";
    const candidate = {
      ...(existing || {}),
      id: existing?.id || makeId("public-investment-project"),
      projectId: project.id,
      code,
      status: $("publicInvestmentProjectStatus").value,
      projectGroup: $("publicInvestmentProjectGroup").value,
      sector: $("publicInvestmentProjectSector").value,
      investor: $("publicInvestmentProjectInvestor").value,
      authority: $("publicInvestmentProjectAuthority").value,
      capitalSource: $("publicInvestmentProjectCapitalSource").value,
      totalInvestment: Number($("publicInvestmentProjectTotalInvestment").value) || 0,
      decisionNo: $("publicInvestmentProjectDecisionNo").value,
      decisionDate: $("publicInvestmentProjectDecisionDate").value,
      plannedStart,
      plannedEnd,
      objective: $("publicInvestmentProjectObjective").value,
      departmentId: existing?.departmentId || manager.departmentId || departmentIdForAccount(account),
      managerId: manager.id,
      participantIds: participants,
      archiveRecordIds: Array.from($("publicInvestmentProjectArchiveIds")?.selectedOptions || []).map((option) => option.value),
      stages,
      checklist,
      milestones: collectMilestones(),
      risks: collectRisks(),
      history: [...historyDrafts, { id: makeId("project-history"), action, details: `${projectStatusLabel($("publicInvestmentProjectStatus").value)} · Tiến độ hồ sơ ${recordProgress({ stages, checklist })}%`, createdAt: timestamp, createdBy: account?.displayName || account?.username || "", createdById: account?.id || "" }],
      createdAt: existing?.createdAt || timestamp,
      createdBy: existing?.createdBy || account?.displayName || account?.username || "",
      createdById: existing?.createdById || account?.id || "",
      updatedAt: timestamp,
      updatedBy: account?.displayName || account?.username || "",
      updatedById: account?.id || "",
    };
    const next = normalizeCollection([candidate], state.projectCatalog)[0];
    if (!next) return showSystemToast?.("Không thể chuẩn hóa hồ sơ", "Kiểm tra lại mã dự án và dữ liệu bắt buộc.", { tone: "warning" });
    const index = (state.publicInvestmentProjects || []).findIndex((record) => record.id === next.id);
    if (index >= 0) state.publicInvestmentProjects[index] = next;
    else state.publicInvestmentProjects = [...(state.publicInvestmentProjects || []), next];
    logActivity?.({ action, module: "Quản lý dự án đầu tư công", targetType: "public-investment-project", targetId: next.id, title: next.projectName, details: `${next.code} · ${stageById(next.phase).title}` });
    saveState?.();
    closeModal?.("publicInvestmentProjectDialog");
    render();
    showSystemToast?.("Đã lưu hồ sơ dự án", `${next.code} đã được cập nhật.`, { tone: "success" });
  }

  function removeRecord(id) {
    const record = recordById(id);
    if (!record || accountRole() !== "admin" || !window.confirm(`Xóa hồ sơ quản lý ${record.code}? Dữ liệu dự án gốc và công việc liên quan không bị xóa.`)) return;
    state.publicInvestmentProjects = (state.publicInvestmentProjects || []).filter((item) => item.id !== record.id);
    registerDeletedId?.(record.id);
    logActivity?.({ action: "Xóa hồ sơ dự án", module: "Quản lý dự án đầu tư công", targetType: "public-investment-project", targetId: record.id, title: record.projectName, details: record.code });
    saveState?.();
    render();
  }

  function printReport(id) {
    const record = recordById(id);
    if (!record || !canView(record)) return;
    const links = projectLinks(record);
    const report = window.open("", "_blank", "width=1100,height=800");
    if (!report) return showSystemToast?.("Không thể mở báo cáo", "Trình duyệt đang chặn cửa sổ báo cáo.", { tone: "warning" });
    const stages = normalizeStages(record.stages);
    const checks = normalizeChecklist(record.checklist);
    report.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${safe(record.code)} - Hồ sơ dự án</title><style>body{font-family:Arial,sans-serif;color:#17283a;margin:28px;line-height:1.45}h1{font-size:24px;margin:4px 0}h2{font-size:17px;margin-top:24px;border-bottom:1px solid #b9c9d4;padding-bottom:5px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-top:18px}.meta div{border-bottom:1px dotted #ccd6dd;padding:4px 0}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}th,td{border:1px solid #bccbd5;padding:7px;text-align:left;vertical-align:top}th{background:#edf4f6}.footer{margin-top:30px;text-align:right}@media print{body{margin:12mm}}</style></head><body><p>PHÂN HỆ QUẢN LÝ DỰ ÁN ĐẦU TƯ CÔNG</p><h1>HỒ SƠ DỰ ÁN SỐ</h1><strong>${safe(record.projectName)}</strong><div class="meta"><div>Mã dự án: <b>${safe(record.code)}</b></div><div>Trạng thái: <b>${safe(projectStatusLabel(record.status))}</b></div><div>Giai đoạn: ${safe(stageById(record.phase).title)}</div><div>Tiến độ hồ sơ: ${recordProgress(record)}%</div><div>Người phụ trách: ${safe(personById?.(record.managerId)?.name || "")}</div><div>Tổng mức đầu tư: ${safe(record.totalInvestment ? record.totalInvestment.toLocaleString("vi-VN") + " đồng" : "Chưa cập nhật")}</div><div>Công việc liên kết: ${links.tasks.length}</div><div>Hồ sơ thẩm định: ${links.appraisals.length}</div></div><h2>Giai đoạn thực hiện</h2><table><thead><tr><th>Giai đoạn</th><th>Trạng thái</th><th>Kế hoạch</th><th>Ghi chú</th></tr></thead><tbody>${stages.map((item) => `<tr><td>${safe(stageById(item.id).title)}</td><td>${safe(stageStatusLabel(item.status))}</td><td>${safe(formatDate?.(item.plannedStart) || "")} - ${safe(formatDate?.(item.plannedEnd) || "")}</td><td>${safe(item.note)}</td></tr>`).join("")}</tbody></table><h2>Điều kiện pháp lý</h2><table><thead><tr><th>Nội dung</th><th>Kết quả</th><th>Ghi chú</th></tr></thead><tbody>${CHECKLIST.map((template) => { const item = checks.find((value) => value.id === template.id); return `<tr><td>${safe(template.title)}</td><td>${safe(checkStatusLabel(item?.status))}</td><td>${safe(item?.note || "")}</td></tr>`; }).join("")}</tbody></table><h2>Vướng mắc đang mở</h2><ul>${(record.risks || []).filter((item) => item.status !== "resolved").map((item) => `<li><b>${safe(riskLevelLabel(item.level))}</b> · ${safe(item.title)} · ${safe(personById?.(item.ownerId)?.name || "Chưa phân công")}</li>`).join("") || "<li>Không có</li>"}</ul><p class="footer">Người xuất: ${safe(currentAccount?.()?.displayName || "")}<br>${safe(formatDateTime?.(new Date().toISOString()) || "")}</p></body></html>`);
    report.document.close();
    report.onafterprint = () => report.close();
    window.setTimeout(() => { report.focus(); report.print(); }, 350);
  }

  function bindEvents() {
    $("openPublicInvestmentProjectForm")?.addEventListener("click", () => openForm());
    $("closePublicInvestmentProjectForm")?.addEventListener("click", () => closeModal?.("publicInvestmentProjectDialog"));
    $("publicInvestmentProjectDialog")?.addEventListener("click", (event) => { if (event.target === $("publicInvestmentProjectDialog")) closeModal?.("publicInvestmentProjectDialog"); });
    $("publicInvestmentProjectForm")?.addEventListener("submit", (event) => { event.preventDefault(); save(); });
    $("resetPublicInvestmentProject")?.addEventListener("click", resetForm);
    $("printPublicInvestmentProject")?.addEventListener("click", () => printReport($("publicInvestmentProjectId").value));
    document.querySelector(".public-project-tabs")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-public-project-tab]");
      if (!button) return;
      if (activeTab === "stages") collectStages();
      if (activeTab === "legal") collectChecklist();
      if (activeTab === "schedule") collectMilestones();
      if (activeTab === "risks") collectRisks();
      setTab(button.dataset.publicProjectTab);
    });
    $("publicInvestmentProjectChecklist")?.addEventListener("change", () => {
      collectChecklist();
      renderStages(Boolean($("savePublicInvestmentProject") && !$("savePublicInvestmentProject").classList.contains("is-hidden")), canManage(recordById($("publicInvestmentProjectId").value)) || !$("publicInvestmentProjectId").value);
    });
    $("addPublicInvestmentProjectMilestone")?.addEventListener("click", () => {
      collectMilestones();
      const title = text($("publicInvestmentProjectMilestoneTitle").value, 240);
      const dueDate = $("publicInvestmentProjectMilestoneDue").value;
      if (!title || !dueDate) return showSystemToast?.("Chưa đủ thông tin", "Tên mốc và thời hạn là bắt buộc.", { tone: "warning" });
      milestoneDrafts.push({ id: makeId("project-milestone"), title, stageId: $("publicInvestmentProjectMilestoneStage").value, ownerId: $("publicInvestmentProjectMilestoneOwner").value, dueDate, completedDate: "", status: "pending", note: "" });
      $("publicInvestmentProjectMilestoneTitle").value = "";
      $("publicInvestmentProjectMilestoneDue").value = "";
      renderMilestones(true);
    });
    $("publicInvestmentProjectMilestones")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-public-project-remove-milestone]");
      if (!button) return;
      collectMilestones();
      milestoneDrafts = milestoneDrafts.filter((item) => item.id !== button.dataset.publicProjectRemoveMilestone);
      renderMilestones(true);
    });
    $("addPublicInvestmentProjectRisk")?.addEventListener("click", () => {
      collectRisks();
      const title = text($("publicInvestmentProjectRiskTitle").value, 300);
      if (!title) return showSystemToast?.("Chưa có nội dung", "Nhập nội dung vướng mắc hoặc rủi ro cần theo dõi.", { tone: "warning" });
      riskDrafts.push({ id: makeId("project-risk"), title, level: $("publicInvestmentProjectRiskLevel").value, status: "open", ownerId: $("publicInvestmentProjectRiskOwner").value, dueDate: $("publicInvestmentProjectRiskDue").value, resolution: "" });
      $("publicInvestmentProjectRiskTitle").value = "";
      $("publicInvestmentProjectRiskDue").value = "";
      renderRisks(true);
    });
    $("publicInvestmentProjectRisks")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-public-project-remove-risk]");
      if (!button) return;
      collectRisks();
      riskDrafts = riskDrafts.filter((item) => item.id !== button.dataset.publicProjectRemoveRisk);
      renderRisks(true);
    });
    $("publicInvestmentProjectList")?.addEventListener("click", (event) => {
      const openButton = event.target.closest("[data-public-project-open]");
      if (openButton) return openForm(openButton.dataset.publicProjectOpen);
      const printButton = event.target.closest("[data-public-project-print]");
      if (printButton) return printReport(printButton.dataset.publicProjectPrint);
      const deleteButton = event.target.closest("[data-public-project-delete]");
      if (deleteButton) removeRecord(deleteButton.dataset.publicProjectDelete);
    });
    $("publicInvestmentProjectLinks")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-public-project-open-view]");
      if (!button) return;
      closeModal?.("publicInvestmentProjectDialog");
      switchView?.(button.dataset.publicProjectOpenView);
    });
    ["publicInvestmentProjectSearch", "publicInvestmentProjectPhaseFilter", "publicInvestmentProjectStatusFilter"].forEach((id) => $(id)?.addEventListener(id.endsWith("Search") ? "input" : "change", render));
  }

  window.PublicInvestmentProjects = {
    STAGES,
    CHECKLIST,
    normalizeCollection,
    render,
    open: openForm,
    canCreate,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindEvents, { once: true });
  else bindEvents();
})();
