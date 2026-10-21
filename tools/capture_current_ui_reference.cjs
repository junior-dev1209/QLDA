const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("C:/Users/Hi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "tmp", "current-ui-reference");
const mode = process.argv[2] || "dashboard";

function localTask(id, title, ownerId, project, due, status, progress, category, extra = {}) {
  return {
    id,
    kind: "regular",
    title,
    ownerId,
    collaboratorIds: [],
    projectId: project.id,
    projectName: project.name,
    category,
    startDate: "2026-09-01",
    due,
    status,
    progress,
    qualityPercent: status === "Hoàn thành" ? 100 : "",
    priority: progress < 40 ? "high" : "normal",
    recurrence: "none",
    note: "Cập nhật nội dung thực hiện và các mốc cần phối hợp.",
    createdAt: "2026-09-02T08:00:00.000Z",
    updatedAt: "2026-09-24T08:00:00.000Z",
    createdBy: "Admin tổng hợp",
    updatedBy: "Admin tổng hợp",
    completionDecision: status === "Hoàn thành" ? "passed" : "",
    ...extra,
  };
}

async function seedCurrentPreview(page) {
  await page.evaluate(() => {
    const people = [
      ["preview-person-1", "Nguyễn Minh Anh", "ke-hoach", "truong-phong-ke-hoach", "Biên chế"],
      ["preview-person-2", "Trần Quốc Huy", "du-an-1", "truong-phong-du-an-1", "Biên chế"],
      ["preview-person-3", "Lê Thu Hà", "gpmb", "can-bo-gpmb", "Hợp đồng chuyên môn"],
      ["preview-person-4", "Phạm Đức Long", "ha-tang", "can-bo-ha-tang", "Hợp đồng chuyên môn"],
    ].map(([id, name, departmentId, roleId, contract]) => ({
      id, name, departmentId, roleId, contract, gender: "", qualification: "", contractTerm: "",
      contractSignedDate: "", phone: "", birthDate: "", start: "", salaryCoefficient: "",
      salaryGrade: "", salaryReviewDate: "", address: "", note: "",
    }));
    state.people = people;
    state.tasks = [];
    state.evaluations = [];
    state.departmentEvaluations = departments.map((department, index) => {
      const score = 84 + index * 2;
      return applyRecordAudit({
        id: `preview-dept-eval-${department.id}`,
        period: state.activePeriod,
        departmentId: department.id,
        criteriaScores: {},
        finalScore: score,
        grade: gradeDepartment(score),
        reviewer: "Giám đốc",
        comment: "Dữ liệu minh họa phục vụ xem thử.",
      });
    });
    state.evaluations = people.map((person, index) => {
      const departmentScore = latestDepartmentEvaluation(person.departmentId)?.finalScore ?? 84 + index;
      const personalScore = 86 + index * 2;
      const behaviorScore = index === 0 ? 2 : 0;
      const finalScore = calculatePersonalFinalScore(personalScore, departmentScore, behaviorScore);
      return applyRecordAudit({
        id: `preview-eval-${person.id}`,
        period: state.activePeriod,
        personId: person.id,
        criteriaScores: {},
        behavior: {},
        personalScore,
        departmentScore,
        behaviorScore,
        finalScore,
        grade: gradePersonal(finalScore),
        reviewer: "Hội đồng thi đua",
        comment: "Dữ liệu minh họa phục vụ xem thử.",
      });
    });
    const projects = [
      { id: "project-1", name: "Dự án đường Vành đai 3" },
      { id: "project-2", name: "GPMB xã Phúc Thịnh" },
      { id: "project-3", name: "Cải tạo hạ tầng khu trung tâm" },
    ];
    state.projectCatalog = projects;
    const task = (id, title, ownerIndex, projectIndex, due, status, progress, category, extra = {}) => ({
      id,
      kind: "regular",
      title,
      ownerId: people[ownerIndex].id,
      collaboratorIds: people.length > 2 ? [people[(ownerIndex + 1) % people.length].id] : [],
      projectId: projects[projectIndex].id,
      projectName: projects[projectIndex].name,
      category,
      startDate: "2026-09-01",
      due,
      status,
      progress,
      qualityPercent: status === "Hoàn thành" ? 100 : "",
      priority: progress < 45 ? "high" : "normal",
      recurrence: "none",
      note: "Cập nhật nội dung thực hiện và các mốc cần phối hợp.",
      createdAt: "2026-09-02T08:00:00.000Z",
      updatedAt: "2026-09-24T08:00:00.000Z",
      createdBy: "Admin tổng hợp",
      updatedBy: "Admin tổng hợp",
      completionDecision: status === "Hoàn thành" ? "passed" : "",
      ...extra,
    });
    state.tasks.push(
      task("preview-task-1", "Hoàn thiện hồ sơ giải phóng mặt bằng", 0, 1, "2026-09-24", "Đang thực hiện", 65, "Tiến độ - chất lượng - chi phí", { followUpDate: "2026-09-29", blockerStatus: "needs-support", blockerNote: "Cần phối hợp xác minh hồ sơ.", dependencyIds: [] }),
      task("preview-task-2", "Rà soát tiến độ dự án đường Vành đai 3", 1, 0, "2026-09-26", "Đang thực hiện", 45, "Tiến độ - chất lượng - chi phí", { followUpDate: "2026-09-30", blockerStatus: "none" }),
      task("preview-task-3", "Tổng hợp danh mục công việc quý IV", 2, 2, "2026-10-02", "Chuẩn bị thực hiện", 15, "Cải cách hành chính"),
      task("preview-task-4", "Kiểm tra hiện trường hạng mục hạ tầng", 3, 2, "2026-09-27", "Hoàn thành", 100, "Tiến độ - chất lượng - chi phí"),
      task("preview-task-5", "Chuẩn bị nội dung họp giao ban", 0, 0, "2026-09-29", "Đang thực hiện", 80, "Cải cách hành chính"),
      task("preview-task-6", "Hoàn thiện dự toán điều chỉnh", 1, 1, "2026-10-04", "Chuẩn bị thực hiện", 25, "Tiến độ - chất lượng - chi phí"),
      task("preview-task-7", "Cập nhật tiến độ giải ngân", 2, 0, "2026-09-25", "Hoàn thành", 100, "Tiến độ - chất lượng - chi phí"),
      task("preview-task-8", "Phối hợp rà soát hồ sơ kỹ thuật", 3, 2, "2026-09-30", "Đang thực hiện", 50, "Tiến độ - chất lượng - chi phí")
    );
    state.calendarEvents = [
      { id: "calendar-1", title: "Họp rà soát tiến độ dự án", date: "2026-09-28", time: "08:00", endTime: "09:30", location: "Phòng họp Ban", leaderIds: [], departmentIds: ["gpmb"], participantIds: [people[0].id, people[1].id], recurrence: "none", remind: true, allHands: false, note: "Chuẩn bị báo cáo tiến độ và các nội dung cần phối hợp.", conclusion: "Thống nhất mốc cập nhật tuần." },
      { id: "calendar-2", title: "Kiểm tra hiện trường hạng mục hạ tầng", date: "2026-09-29", time: "14:00", endTime: "16:00", location: "Dự án", leaderIds: [], departmentIds: ["ha-tang"], participantIds: [people[2].id], recurrence: "none", remind: true, allHands: false, note: "Kiểm tra chất lượng và khối lượng thực hiện.", conclusion: "" },
      { id: "calendar-3", title: "Làm việc với đơn vị phối hợp", date: "2026-09-30", time: "08:30", endTime: "10:00", location: "Trụ sở", leaderIds: [], departmentIds: ["du-an-1"], participantIds: [people[1].id, people[3].id], recurrence: "weekly", remind: false, allHands: false, note: "Rà soát tiến độ giải phóng mặt bằng.", conclusion: "" },
    ];
    saveState();
    renderAll();
    if (typeof renderCalendarView === "function") renderCalendarView();
  });
  await page.waitForTimeout(900);
}

async function openTaskDetail(page) {
  await page.locator(".sidebar button[data-view='tasks']").click();
  await page.waitForTimeout(500);
  const firstTask = page.locator("[data-task-id]").first();
  if (await firstTask.count()) await firstTask.click();
  await page.waitForTimeout(400);
}

async function captureReport(page, buttonSelector, filename) {
  const popupPromise = page.waitForEvent("popup", { timeout: 8000 });
  await page.locator(buttonSelector).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  await popup.waitForTimeout(900);
  await popup.emulateMedia({ media: "screen" });
  await popup.screenshot({ path: path.join(output, filename), fullPage: true });
  await popup.close();
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("phuc-thinh-current-account-v1", "account-admin");
  });
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept());
  try {
    await page.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.classList.contains("is-authenticated"), null, { timeout: 15000 });
    await seedCurrentPreview(page);

    if (mode === "dashboard") {
      await page.locator("#dashboard").screenshot({ path: path.join(output, "dashboard.png") });
    } else if (mode === "tasks") {
      await page.locator(".sidebar button[data-view='tasks']").click();
      await page.waitForTimeout(500);
      await page.locator("#tasks").screenshot({ path: path.join(output, "tasks.png") });
    } else if (mode === "task-detail") {
      await openTaskDetail(page);
      await page.screenshot({ path: path.join(output, "task-detail.png"), fullPage: false });
    } else if (mode === "task-form") {
      await page.locator(".sidebar button[data-view='tasks']").click();
      await page.waitForTimeout(400);
      await page.locator("#openTaskForm").click();
      await page.waitForSelector("#taskFormDialog:not(.is-hidden)");
      await page.locator("#taskTitle").fill("Hoàn thiện báo cáo tiến độ dự án Vành đai 3");
      await page.locator("#taskStartDate").fill("2026-09-28");
      await page.locator("#taskDue").fill("2026-10-03");
      await page.locator("#taskProgress").fill("60");
      await page.locator("#taskNote").fill("Tổng hợp khối lượng đã thực hiện, các điểm cần phối hợp và mốc hoàn thành tiếp theo.");
      await page.screenshot({ path: path.join(output, "task-form.png"), fullPage: false });
    } else if (mode === "calendar") {
      await page.locator(".sidebar button[data-view='calendar']").click();
      await page.waitForTimeout(500);
      await page.locator("#calendar").screenshot({ path: path.join(output, "calendar.png") });
    } else if (mode === "kpi") {
      await page.locator(".sidebar button[data-view='evaluations']").click();
      await page.waitForTimeout(500);
      await page.locator("#evaluations").screenshot({ path: path.join(output, "kpi.png") });
    } else if (mode === "daily-report") {
      await page.locator("#dashboardDailyReportDate").fill("2026-09-24");
      await captureReport(page, "#exportDailyWorkReportPdf", "daily-report.png");
    } else if (mode === "monthly-report") {
      await captureReport(page, "#exportMonthlyWorkReportPdf", "monthly-report.png");
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
