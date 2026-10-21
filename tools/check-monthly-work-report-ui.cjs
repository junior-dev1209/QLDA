const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "C:/Users/Hi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const source = fs.readFileSync("script.js", "utf8");
const html = fs.readFileSync("index.html", "utf8").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<link\b[^>]*>/gi, "");
const outputDirectory = path.resolve(process.cwd(), "tmp", "monthly-work-report-qa");
const chromeExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";

function extractFunction(name) {
  const asyncMarker = `async function ${name}(`;
  const marker = source.includes(asyncMarker) ? asyncMarker : `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const nextFunction = source.indexOf("\nfunction ", start + marker.length);
  const nextAsyncFunction = source.indexOf("\nasync function ", start + marker.length);
  const end = [nextFunction, nextAsyncFunction].filter((index) => index >= 0).sort((left, right) => left - right)[0] ?? -1;
  return source.slice(start, end < 0 ? source.length : end);
}

const reportFunctions = [
  "monthlyWorkReportPeriodValue",
  "monthlyWorkReportCutoffDate",
  "taskIsCompletedByReportCutoff",
  "taskOccurredInMonthlyWorkReport",
  "monthlyWorkReportTaskStatus",
  "monthlyWorkReportMetrics",
  "monthlyWorkReportDepartmentIsIncluded",
  "monthlyWorkReportPersonIsIncluded",
  "monthlyWorkReportLoginMetrics",
  "monthlyWorkReportData",
  "reportPrintAutoCloseScript",
  "applyReportPrintAutoClose",
  "monthlyWorkReportDocumentTemplate",
  "monthlyWorkReportDocumentHtml",
  "monthlyWorkReportPrintOverrideCss",
  "applyMonthlyWorkReportPrintOverrides",
  "requestMonthlyWorkReportLoginPayload",
  "exportMonthlyWorkReportPdf",
];

async function run() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.mkdirSync(path.resolve(process.cwd(), "tmp", "pdfs"), { recursive: true });
  const executablePath = process.env.UI_TEST_BROWSER || (fs.existsSync(chromeExecutable) ? chromeExecutable : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.setContent(html);
    await page.addStyleTag({ content: fs.readFileSync("styles.css", "utf8") });
    await page.evaluate(() => {
      document.body.classList.add("is-authenticated");
      document.getElementById("loginScreen").classList.add("is-hidden");
      document.querySelector(".layout").classList.remove("is-hidden");
      document.querySelector(".topbar").classList.remove("is-hidden");
      document.querySelectorAll(".view").forEach((view) => view.classList.toggle("is-active", view.id === "dashboard"));
      window.byId = (id) => document.getElementById(id);
      window.state = {
        activePeriod: "2026-09",
        people: [
          { id: "p1", name: "Nguyễn An", departmentId: "gpmb" },
          { id: "p2", name: "Trần Bình", departmentId: "qlht" },
          { id: "p3", name: "Lãnh đạo Ban", departmentId: "ban-giam-doc" },
        ],
        accounts: [
          { id: "a1", personId: "p1" },
          { id: "a2", personId: "p2" },
          { id: "a3", personId: "p3" },
        ],
        tasks: [
          { id: "t1", ownerId: "p1", createdAt: "2026-09-02T08:00:00", due: "2026-09-10", status: "Hoàn thành" },
          { id: "t2", ownerId: "p2", createdAt: "2026-09-04T08:00:00", due: "2026-09-10", status: "Đang thực hiện" },
          { id: "t3", ownerId: "p3", createdAt: "2026-09-04T08:00:00", due: "2026-09-10", status: "Đang thực hiện" },
        ],
      };
      window.departments = [
        { id: "gpmb", name: "phòng GPMB" },
        { id: "qlht", name: "phòng QLHT" },
        { id: "ban-giam-doc", name: "Ban giám đốc", leadershipOnly: true, kpiExempt: true },
      ];
      window.currentMonth = () => "2026-10";
      window.padDatePart = (value) => String(value).padStart(2, "0");
      window.dailyReportDateValue = (value) => String(value || "").slice(0, 10);
      window.dailyReportDatePart = (value) => String(value || "").slice(0, 10);
      window.periodFromTimestamp = (value) => String(value || "").slice(0, 7);
      window.taskParticipantIds = (task) => [task.ownerId, ...(task.collaboratorIds || [])].filter(Boolean);
      window.personById = (id) => state.people.find((person) => person.id === id) || null;
      window.departmentById = (id) => departments.find((department) => department.id === id) || null;
      window.normalizeTaskStatus = (value) => value || "Chuẩn bị thực hiện";
      window.isTaskFinishedStatus = (value) => ["Hoàn thành", "Đã kết thúc"].includes(value);
      window.taskCompletionIsApproved = (task) => task.completionReviewStatus === "passed";
      window.formatMonthPeriod = (period) => `${period.slice(5, 7)}/${period.slice(0, 4)}`;
      window.formatDate = (value) => {
        const [year, month, day] = String(value || "").slice(0, 10).split("-");
        return year ? `${day}/${month}/${year}` : "";
      };
      window.formatDateTime = () => "30/09/2026 16:00:00";
      window.escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
      window.currentAccount = () => ({ displayName: "Admin tổng hợp" });
      window.canViewMonthlyWorkReport = () => true;
      window.accountPresenceAvailable = () => true;
      window.sharedJsonRequest = async () => ({
        response: { ok: true, status: 200 },
        payload: {
          available: true,
          period: "2026-09",
          accounts: [
            { accountId: "a1", loginCount: 3 },
            { accountId: "a2", loginCount: 2 },
            { accountId: "a3", loginCount: 8 },
          ],
        },
      });
      window.handleSharedSessionUnauthorized = () => {};
      window.ACCOUNT_USAGE_REQUEST_TIMEOUT_MS = 1000;
      window.alert = (message) => { window.alertMessage = message; };
    });
    await page.addScriptTag({ content: reportFunctions.map(extractFunction).join("\n") });
    assert.equal(await page.locator("#dashboardMonthlyReportPeriod").count(), 1);
    assert.equal(await page.locator("#exportMonthlyWorkReportPdf").count(), 1);
    await page.screenshot({ path: path.join(outputDirectory, "desktop-monthly-report-control.png"), fullPage: false });
    await page.evaluate(async () => {
      window.monthlyReportHtml = "";
      window.open = () => ({
        document: {
          open() {},
          write(value) { window.monthlyReportHtml = value; },
          close() {},
          createElement() { return {}; },
          head: { appendChild(style) { window.monthlyReportOverride = style.textContent; } },
        },
        focus() {},
      });
      await exportMonthlyWorkReportPdf();
    });
    const reportHtml = await page.evaluate(() => window.monthlyReportHtml);
    assert.match(reportHtml, /Báo cáo tổng hợp công việc hàng tháng/);
    assert.match(reportHtml, /Chi tiết theo nhân viên/);
    assert.match(reportHtml, /Kế hoạch/);
    assert.doesNotMatch(reportHtml, /Thuộc kỳ/);
    assert.doesNotMatch(reportHtml, /Ban giám đốc/);
    assert.match(reportHtml, /Lượt đăng nhập/);
    assert.match(reportHtml, />5<\/strong>/);
    assert.doesNotMatch(await page.evaluate(() => window.monthlyReportOverride), /login/);
    const reportOverrideCss = await page.evaluate(() => monthlyWorkReportPrintOverrideCss());
    const reportPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await reportPage.setContent(reportHtml.replace("</head>", `<style>${reportOverrideCss}</style></head>`), { waitUntil: "load" });
    await reportPage.pdf({
      path: path.resolve(process.cwd(), "tmp", "pdfs", "monthly-work-report-runtime-preview.pdf"),
      format: "A4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
    });
    await reportPage.close();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(outputDirectory, "mobile-monthly-report-control.png"), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, "Khu vực báo cáo tháng không được tràn ngang trên mobile.");
  } finally {
    await browser.close();
  }
}

run().then(() => console.log("monthly_work_report_ui=passed")).catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
