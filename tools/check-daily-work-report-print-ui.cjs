const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "C:/Users/Hi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const source = fs.readFileSync("script.js", "utf8");
const outputDirectory = path.resolve(process.cwd(), "tmp", "daily-work-report-print-qa");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = source.indexOf("\nfunction ", start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

const projects = Array.from({ length: 34 }, (_, index) => ({
  name: `Dự án trọng điểm ${index + 1}`,
  departments: [index % 2 ? "phòng QLHT" : "phòng GPMB"],
  dailyTasks: Array.from({ length: 2 + index % 3 }, () => ({})),
  approved: 5 + index % 4,
  total: 10 + index % 5,
  averageProgress: 35 + index % 61,
}));

const tasks = Array.from({ length: 72 }, (_, index) => ({
  title: `Nội dung công việc cần theo dõi số ${index + 1}`,
  department: index % 2 ? "phòng QLHT" : "phòng GPMB",
  owner: index % 2 ? "Nguyễn Thị Hồng Hạnh" : "Nguyễn Cẩm Trang",
  status: index % 5 === 0 ? "Quá hạn" : index % 4 === 0 ? "Chờ phê duyệt" : index % 3 === 0 ? "Hoàn thành đạt" : "Đang thực hiện",
  progress: 20 + index % 81,
  activity: "Cập nhật tiến độ trong ngày",
  note: "Đã ghi nhận diễn biến và trách nhiệm xử lý.",
}));

const report = {
  date: "2026-09-18",
  generatedAt: "2026-09-18T16:41:12",
  account: { displayName: "Kỹ Thuật Viên" },
  metrics: { total: tasks.length, approved: 18, pending: 12, overdue: 9 },
  departments: [
    { name: "phòng GPMB", total: 38, approved: 11, active: 14, pending: 7, overdue: 6 },
    { name: "phòng QLHT", total: 34, approved: 7, active: 13, pending: 5, overdue: 3 },
  ],
  projects,
  tasks,
};

async function run() {
  assert.match(source, /@media print[\s\S]*?\.panel\{break-inside:auto\}/, "Khối bảng phải được phép chảy qua trang in.");
  assert.match(source, /\.project-row,.summary-table tr,.detail-table tr\{break-inside:avoid/, "Từng dòng báo cáo phải không bị cắt giữa hai trang.");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.UI_TEST_BROWSER ? { executablePath: process.env.UI_TEST_BROWSER } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.addScriptTag({ content: [
      "window.escapeHtml=(value)=>String(value??'').replace(/[&<>\"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[char]));",
      "window.formatScore=(value)=>Number(value||0).toFixed(1).replace('.0','');",
      "window.formatDate=()=> '18/09/2026';",
      "window.formatDateTime=()=> '18/09/2026 16:41:12';",
      "window.dailyReportTaskStatus=(task)=>task.status;",
      "window.dailyReportStatusTone=(status)=>status==='Hoàn thành đạt'?'is-complete':status==='Chờ phê duyệt'?'is-pending':status==='Quá hạn'?'is-overdue':'is-active';",
      "window.dailyReportTaskDepartment=(task)=>({name:task.department});",
      "window.dailyReportTaskOwner=(task)=>task.owner;",
      "window.dailyReportTaskProjectName=(task)=>task.projectName || 'Dự án trọng điểm';",
      "window.dailyReportTaskActivity=(task)=>task.activity;",
      "window.dailyReportTaskNote=(task)=>task.note;",
      extractFunction("reportPrintAutoCloseScript"),
      extractFunction("applyReportPrintAutoClose"),
      extractFunction("dailyWorkReportDocumentTemplate"),
      extractFunction("dailyWorkReportDocumentHtml"),
    ].join("\n") });
    const documentHtml = await page.evaluate((data) => dailyWorkReportDocumentHtml(data), report);
    await page.setContent(documentHtml.replace(/<script>[\s\S]*?<\/script>/, ""));
    await page.emulateMedia({ media: "print" });
    const firstPanelTop = await page.locator(".grid .panel").first().evaluate((element) => Math.round(element.getBoundingClientRect().top));
    assert.ok(firstPanelTop < 420, "Bảng tổng hợp phải bắt đầu trên trang đầu, sát dưới các chỉ số.");
    await page.pdf({
      path: path.join(outputDirectory, "daily-work-report-layout.pdf"),
      format: "A4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
    });
    await page.screenshot({ path: path.join(outputDirectory, "daily-work-report-layout.png"), fullPage: true });
  } finally {
    await browser.close();
  }
}

run().then(() => console.log("daily_work_report_print_ui=passed")).catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
