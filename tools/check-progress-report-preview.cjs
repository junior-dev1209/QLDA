const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "C:/Users/Hi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const baseUrl = process.env.PREVIEW_BASE_URL || "http://127.0.0.1:4173/bao-cao-cong-viec/xem-truoc-tien-do.html";
const outputDirectory = path.resolve(process.cwd(), "tmp", "progress-preview-qa");

async function run() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.UI_TEST_BROWSER ? { executablePath: process.env.UI_TEST_BROWSER } : {}),
  });

  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
    await desktop.goto(baseUrl, { waitUntil: "networkidle" });
    await expectText(desktop, "#previewTitle", "Tiến độ theo ngày và tuần");
    assert.equal(await desktop.locator(".project-data").count(), 5, "Default scope should show all preview projects.");
    await desktop.screenshot({ path: path.join(outputDirectory, "desktop.png"), fullPage: true });

    await desktop.getByRole("button", { name: "Theo tuần" }).click();
    await expectText(desktop, "#previewPeriod", "Tuần 38");
    await desktop.locator('[data-project-id="vanh-dai-3"]').click();
    await expectText(desktop, "#previewDialogTitle", "Dự án đường Vành đai 3");
    assert.equal(await desktop.locator("#previewDialog").evaluate((dialog) => dialog.open), true, "Project detail dialog should open.");
    await desktop.locator("#closePreviewDialog").click();

    await desktop.locator("#previewDepartment").selectOption({ label: "phòng GPMB" });
    assert.equal(await desktop.locator(".project-data").count(), 2, "Department filter should narrow project rows.");
    await desktop.locator('[data-metric="overdue"]').click();
    await expectText(desktop, "#previewDialogTitle", "Công việc quá hạn đang mở");
    await desktop.locator("#closePreviewDialog").click();

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await mobile.goto(baseUrl, { waitUntil: "networkidle" });
    await mobile.screenshot({ path: path.join(outputDirectory, "mobile.png"), fullPage: true });
    const hasHorizontalOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(hasHorizontalOverflow, false, "Mobile preview must not horizontally overflow.");
    await mobile.getByRole("button", { name: "Theo tuần" }).click();
    await expectText(mobile, "#previewPeriod", "Tuần 38");
  } finally {
    await browser.close();
  }
}

async function expectText(page, selector, expected) {
  const content = await page.locator(selector).textContent();
  assert.ok(String(content || "").includes(expected), `Expected ${selector} to include "${expected}", received "${content}".`);
}

run().then(() => console.log("progress_report_preview=passed")).catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
