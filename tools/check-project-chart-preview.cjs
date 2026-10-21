const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "C:/Users/Hi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const outputDirectory = path.resolve(process.cwd(), "tmp", "project-chart-preview-qa");
const pageUrl = "http://127.0.0.1:4173/bao-cao-cong-viec/xem-truoc-bieu-do-du-an.html";

async function run() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.UI_TEST_BROWSER ? { executablePath: process.env.UI_TEST_BROWSER } : {}),
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
    await page.goto(pageUrl, { waitUntil: "networkidle" });

    await assert.equal(await page.locator("h1").textContent(), "Biểu đồ theo dõi dự án");
    await assert.equal(await page.locator("#healthRows [data-project-detail]").count(), 5);
    await page.screenshot({ path: path.join(outputDirectory, "health-desktop.png"), fullPage: true });

    await page.getByRole("button", { name: /Mẫu 2: Xu hướng tuần/ }).click();
    await assert.equal(await page.locator("#trendTemplate").isVisible(), true);
    await assert.equal(await page.locator("#trendSvg circle").count(), 14);
    await page.screenshot({ path: path.join(outputDirectory, "trend-desktop.png"), fullPage: true });

    await page.getByRole("button", { name: /Mẫu 3: Mốc và rủi ro/ }).click();
    await assert.equal(await page.locator("#milestoneRows .milestone-row").count(), 5);
    await page.screenshot({ path: path.join(outputDirectory, "milestones-desktop.png"), fullPage: true });

    await page.getByRole("button", { name: /Mẫu 4: Nguồn lực/ }).click();
    await assert.equal(await page.locator("#resourceRows [data-project-detail]").count(), 5);
    await page.getByRole("button", { name: /Mẫu 1: Sức khỏe dự án/ }).click();
    await page.locator("#healthRows [data-project-detail]").first().click();
    await assert.equal(await page.locator("#chartPreviewDialog").evaluate((dialog) => dialog.open), true);
    await assert.match(await page.locator("#chartPreviewDialogTitle").textContent(), /Vành đai 3/);
    await page.locator("#closeChartPreviewDialog").click();

    await page.selectOption("#chartDepartmentFilter", { label: "phòng GPMB" });
    await assert.equal(await page.locator("#healthRows [data-project-detail]").count(), 2);
    await page.selectOption("#chartProjectFilter", "tien-duong");
    await assert.equal(await page.locator("#healthRows [data-project-detail]").count(), 1);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(outputDirectory, "health-mobile.png"), fullPage: true });
    await assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      true,
      "The preview must not introduce global horizontal overflow on mobile.",
    );
  } finally {
    await browser.close();
  }
}

run().then(() => console.log("project_chart_preview_ui=passed")).catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
