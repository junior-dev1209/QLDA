const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "C:/Users/Hi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const source = fs.readFileSync("script.js", "utf8");
const html = fs.readFileSync("index.html", "utf8").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<link\b[^>]*>/gi, "");
const outputDirectory = path.resolve(process.cwd(), "tmp", "dashboard-project-workload-qa");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = source.indexOf("\nfunction ", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

const functionNames = [
  "dashboardWorkloadDateKey",
  "dashboardWorkloadWeekBounds",
  "dashboardWorkloadTasksInRange",
  "dashboardWorkloadProjectKey",
  "dashboardWorkloadProjectName",
  "dashboardWorkloadDepartmentOptions",
  "dashboardWorkloadScopedTasks",
  "dashboardWorkloadProjectRows",
  "dashboardWorkloadPeopleRows",
  "dashboardWorkloadTableHead",
  "dashboardWorkloadSummary",
  "renderDashboardOperations",
  "openDashboardWorkloadProjectTasks",
  "dashboardAnalyticsOpenTask",
  "dashboardAnalyticsTrendBuckets",
  "dashboardAnalyticsProjectRows",
  "dashboardProjectTimelineStatus",
  "dashboardProjectTrendSvg",
  "renderDashboardAnalyticsProjects",
  "openDashboardAnalyticsProjectTasks",
  "openDashboardAnalyticsProjectTimelineTasks",
  "setDashboardAnalyticsTab",
  "dailyReportDateValue",
  "dailyReportDatePart",
  "dailyReportTaskEvents",
  "taskIsCompletedByReportCutoff",
  "taskHasReportableCompletionEventOnDate",
  "taskOccurredInDailyReport",
  "dailyReportTaskStatus",
  "dailyReportStatusTone",
  "dailyReportTaskOwner",
  "dailyReportTaskDepartment",
  "dailyReportTaskProjectName",
  "dailyReportTaskActivity",
  "dailyReportTaskNote",
  "dailyReportProjectKey",
  "dailyWorkReportData",
  "reportPrintAutoCloseScript",
  "applyReportPrintAutoClose",
  "dailyWorkReportDocumentTemplate",
  "dailyWorkReportDocumentHtml",
  "exportDailyWorkReportPdf",
];

async function run() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.UI_TEST_BROWSER ? { executablePath: process.env.UI_TEST_BROWSER } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.setContent(html);
    await page.addStyleTag({ content: fs.readFileSync("styles.css", "utf8") });
    await page.evaluate(() => {
      const RealDate = Date;
      window.Date = class TestDate extends RealDate {
        constructor(...args) {
          super(...(args.length ? args : ["2026-09-18T12:00:00"]));
        }

        static now() {
          return new RealDate("2026-09-18T12:00:00").getTime();
        }
      };
      document.body.classList.add("is-authenticated");
      document.getElementById("loginScreen").classList.add("is-hidden");
      document.querySelector(".layout").classList.remove("is-hidden");
      document.querySelector(".topbar").classList.remove("is-hidden");
      document.querySelectorAll(".view").forEach((view) => view.classList.toggle("is-active", view.id === "dashboard"));
      window.byId = (id) => document.getElementById(id);
      window.state = {
        activePeriod: "2026-09",
        projectCatalog: [
          { id: "a", name: "Dự án đường Vành đai 3" }, { id: "b", name: "GPMB xã Tiên Dương 2" },
          { id: "c", name: "Cải tạo hạ tầng khu trung tâm" }, { id: "d", name: "Chuẩn bị đầu tư Dự án 1" },
          { id: "e", name: "Tổng hợp kế hoạch đầu tư" }, { id: "f", name: "Khu tái định cư phía Bắc" },
        ],
        tasks: [
          { id: "t1", title: "Hoàn thiện hồ sơ", due: "2026-09-18", projectId: "a", ownerId: "p1", collaboratorIds: ["p2"], approved: true, progressReports: [{ createdAt: "2026-09-18T08:00:00", action: "Cập nhật tiến độ" }] },
          { id: "t2", title: "Kiểm tra hiện trạng", due: "2026-09-19", projectId: "a", ownerId: "p1", overdue: true },
          { id: "t4", title: "Chuẩn bị hồ sơ", due: "2026-09-06", projectId: "a", ownerId: "p1", status: "Chuẩn bị thực hiện" },
          { id: "t3", title: "Tổng hợp số liệu", due: "2026-09-17", projectId: "b", ownerId: "p3", pending: true },
          { id: "t5", title: "Kiểm tra phương án", due: "2026-09-16", projectId: "c", ownerId: "p2", approved: true },
          { id: "t6", title: "Báo cáo tiến độ", due: "2026-09-18", projectId: "d", ownerId: "p1", status: "Đang thực hiện", progressReports: [{ createdAt: "2026-09-18T09:00:00", action: "Cập nhật tiến độ" }] },
          { id: "t7", title: "Rà soát hồ sơ", due: "2026-09-19", projectId: "e", ownerId: "p3", overdue: true },
          { id: "t8", title: "Phối hợp thực hiện", due: "2026-09-20", projectId: "f", ownerId: "p2", pending: true },
        ],
      };
      window.departments = [{ id: "gpmb", name: "phòng GPMB" }, { id: "qlht", name: "phòng QLHT" }];
      window.people = {
        p1: { id: "p1", name: "Nguyễn Cẩm Trang", departmentId: "gpmb" },
        p2: { id: "p2", name: "Đỗ Ngọc Dương", departmentId: "gpmb" },
        p3: { id: "p3", name: "Hà Văn Thịnh", departmentId: "qlht" },
      };
      window.dashboardWorkloadPeriod = "week";
      window.dashboardWorkloadView = "projects";
      window.dashboardWorkloadDepartmentFilter = "";
      window.dashboardAnalyticsActiveTab = "operations";
      window.dashboardProjectTrendKey = "";
      window.TASK_STATUS_CLOSED = "Đã kết thúc";
      window.escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
      window.formatScore = (value) => Number(value || 0).toFixed(1).replace(".0", "");
      window.formatDate = (value) => {
        const [year, month, day] = String(value).slice(0, 10).split("-");
        return year ? `${day}/${month}/${year}` : "";
      };
      window.formatDateTime = () => "18/09/2026 16:00:00";
      window.clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
      window.projectIdForTask = (task) => task.projectId || "";
      window.projectNameForTask = (task) => state.projectCatalog.find((project) => project.id === task.projectId)?.name || task.projectName || "";
      window.taskParticipantIds = (task) => [...new Set([task.ownerId, ...(task.collaboratorIds || [])].filter(Boolean))];
      window.uniquePersonIds = (ids) => [...new Set(ids.filter(Boolean))];
      window.personById = (id) => people[id] || null;
      window.departmentById = (id) => departments.find((department) => department.id === id) || null;
      window.dashboardDepartmentFilterOptions = (items) => [...new Set(items.map((item) => item.departmentId))].map((id) => ({ value: id, label: departmentById(id).name }));
      window.taskHasParticipantInDepartment = (task, departmentId) => taskParticipantIds(task).some((id) => personById(id)?.departmentId === departmentId);
      window.dashboardTasksForPeriod = () => state.tasks;
      window.taskCompletionIsApproved = (task) => task.approved === true;
      window.taskCompletionNeedsReview = (task) => task.pending === true;
      window.isTaskFinishedStatus = (status) => ["Hoàn thành", "Đã kết thúc"].includes(status);
      window.getDueStatus = (task) => task.overdue ? "Quá hạn" : task.status || "Đang thực hiện";
      window.taskIsLateCompletion = (task) => task.late === true;
      window.normalizeTaskStatus = (status) => status || "";
      window.dashboardAnalyticsInProgressTask = (task) => !task.approved && !task.pending && !task.overdue;
      window.dashboardAnalyticsTasksForDepartment = (tasks, departmentId) => departmentId ? tasks.filter((task) => taskHasParticipantInDepartment(task, departmentId)) : tasks;
      window.dashboardAnalyticsPercent = (value, total) => total ? Math.min(100, Math.max(0, value / total * 100)) : 0;
      window.currentTaskDisplayScope = () => "current";
      window.normalizeTaskDisplayScope = (scope) => scope === "all" ? "all" : "current";
      window.taskDisplayScopePeriod = () => "2026-09";
      window.taskDisplayScopeLabel = () => "kỳ đánh giá 09/2026";
      window.currentMonth = () => "2026-09";
      window.daysInMonth = () => 30;
      window.taskPeriod = (task) => task.due.slice(0, 7);
      window.fillSelect = (select, options, selected) => { select.innerHTML = options.map((option) => `<option value="${option.value}">${option.label}</option>`).join(""); select.value = selected || ""; };
      window.dashboardOperationRows = () => ({ actionable: [], rows: [] });
      window.dashboardOperationalTasks = () => [];
      window.canAccessView = () => true;
      window.canViewTaskRecord = () => true;
      window.currentAccount = () => ({ displayName: "Admin tổng hợp" });
      window.dashboardTaskContextHtml = (tasks) => `<span>${tasks.length} công việc</span>`;
      window.openTaskStatusDetailDialog = (status, options) => { window.lastPopup = options; };
    });
    await page.addScriptTag({ content: functionNames.map(extractFunction).join("\n") });
    await page.evaluate(() => { renderDashboardOperations([]); renderDashboardAnalyticsProjects(state.tasks); });
    assert.equal(await page.locator("#dashboardWorkload .dashboard-workload-table-head").count(), 1);
    assert.equal(await page.locator("#dashboardWorkload [data-dashboard-project-workload]").count(), 6);
    assert.equal(await page.locator("#dashboardProjectHealthChart [data-dashboard-project-analytics]").count(), 6);
    assert.equal(await page.locator("#dashboardProjectTrendFilter option").count(), 6);
    assert.equal(await page.locator("#dashboardProjectTrendChart .dashboard-project-trend-svg").count(), 1);
    assert.equal(await page.locator("#dashboardProjectTrendChart .dashboard-project-trend-line").count(), 2);
    assert.equal(await page.locator("#dashboardProjectTimelineChart [data-dashboard-project-timeline]").count(), 24);
    assert.equal(await page.locator("#dashboardProjectResourceChart [data-dashboard-project-analytics]").count(), 6);
    assert.equal(await page.locator("#dashboardDailyReportDate").count(), 1);
    assert.equal(await page.locator("#exportDailyWorkReportPdf").count(), 1);
    await page.screenshot({ path: path.join(outputDirectory, "desktop-projects.png"), fullPage: true });
    await page.evaluate(() => setDashboardAnalyticsTab("projects"));
    assert.equal(await page.locator("#dashboardAnalyticsProjects").isVisible(), true, "Project analytics tab should become visible.");
    for (const selector of ["#dashboardProjectHealthChart", "#dashboardProjectTimelineChart", "#dashboardProjectResourceChart"]) {
      assert.equal(await page.locator(selector).evaluate((element) => element.scrollHeight > element.clientHeight), true, `${selector} must scroll after five visible rows.`);
    }
    await page.selectOption("#dashboardProjectTrendFilter", "id:b");
    assert.equal(await page.locator("#dashboardProjectTrendFilter").inputValue(), "id:b");
    assert.equal(await page.locator("#dashboardProjectTrendChart .dashboard-project-trend-line").count(), 2);
    await page.screenshot({ path: path.join(outputDirectory, "desktop-project-analytics.png"), fullPage: true });

    await page.evaluate(() => openDashboardWorkloadProjectTasks("id:a"));
    assert.equal(await page.evaluate(() => lastPopup.tasks.length), 2, "Project drilldown should show the current week after removing the date switch.");

    await page.evaluate(() => openDashboardAnalyticsProjectTimelineTasks("id:a", "2026-09-1"));
    assert.equal(await page.evaluate(() => lastPopup.tasks.length), 1, "A project milestone should open only the work in its reporting bucket.");

    await page.evaluate(() => {
      byId("dashboardDailyReportDate").value = "2026-09-18";
      window.dailyReportHtml = "";
      window.open = () => ({
        document: { open() {}, write(value) { window.dailyReportHtml = value; }, close() {} },
        focus() {},
      });
      exportDailyWorkReportPdf();
    });
    const dailyReportHtml = await page.evaluate(() => window.dailyReportHtml);
    assert.match(dailyReportHtml, /Báo cáo công việc hàng ngày/, "Daily PDF report should include the report heading.");
    assert.match(dailyReportHtml, /Dự án đường Vành đai 3/, "Daily PDF report should include projects with work on the selected date.");
    assert.match(dailyReportHtml, /window\.print\(\)/, "Daily PDF report should open the native Save as PDF flow.");

    await page.evaluate(() => { dashboardWorkloadView = "people"; renderDashboardOperations([]); });
    assert.equal(await page.locator("#dashboardWorkload [data-dashboard-person-tasks]").count(), 3);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(outputDirectory, "mobile-projects.png"), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, "Dashboard workload must not overflow on mobile.");
  } finally { await browser.close(); }
}

run().then(() => console.log("dashboard_project_workload_ui=passed")).catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
