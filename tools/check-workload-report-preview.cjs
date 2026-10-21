const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "C:/Users/Hi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const baseUrl = process.env.PREVIEW_BASE_URL || "http://127.0.0.1:4173/bao-cao-cong-viec/xem-truoc-bao-cao-khoi-luong.html";
const outputDirectory = path.resolve(process.cwd(), "tmp", "workload-preview-qa");

async function expectText(page, selector, expected) {
  const content = await page.locator(selector).textContent();
  assert.ok(String(content || "").includes(expected), `Expected ${selector} to include "${expected}", received "${content}".`);
}

async function run() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.UI_TEST_BROWSER ? { executablePath: process.env.UI_TEST_BROWSER } : {}) });
  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await desktop.goto(baseUrl, { waitUntil: "networkidle" });
    await expectText(desktop, "#workloadTitle", "So sánh ba mẫu báo cáo gọn");
    assert.equal(await desktop.locator("#compactRows [data-project]").count(), 5, "Compact sample must list every project by default.");
    await desktop.screenshot({ path: path.join(outputDirectory, "compact-desktop.png"), fullPage: true });

    await desktop.locator('[data-project="vanh-dai"]').click();
    await expectText(desktop, "#workloadDialogTitle", "Dự án đường Vành đai 3");
    await desktop.locator("#closeWorkloadDialog").click();

    await desktop.getByRole("button", { name: /Mẫu B: Xem song song/ }).click();
    assert.equal(await desktop.locator("#splitTemplate").isVisible(), true, "Split sample should be visible.");
    await desktop.locator('[data-picker="tien-duong"]').click();
    await expectText(desktop, "#splitProjectTitle", "GPMB xã Tiên Dương 2");
    await desktop.screenshot({ path: path.join(outputDirectory, "split-desktop.png"), fullPage: true });

    await desktop.getByRole("button", { name: /Mẫu C: Nhịp độ tuần/ }).click();
    assert.equal(await desktop.locator("#weeklyTemplate").isVisible(), true, "Weekly sample should be visible.");
    assert.equal(await desktop.locator("#weekChart .week-column").count(), 7, "Weekly sample should render seven daily columns.");
    await desktop.locator('[data-week-project="ha-tang"]').click();
    await expectText(desktop, "#weeklyPeopleProject", "Cải tạo hạ tầng khu trung tâm");
    await desktop.getByRole("button", { name: "Hôm nay" }).click();
    await expectText(desktop, "#scopeText", "Hôm nay:");

    await desktop.locator("#departmentFilter").selectOption({ label: "phòng GPMB" });
    assert.equal(await desktop.locator("#weeklyProjectRows [data-week-project]").count(), 2, "Department filter should limit project scope.");

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await mobile.goto(baseUrl, { waitUntil: "networkidle" });
    await mobile.screenshot({ path: path.join(outputDirectory, "compact-mobile.png"), fullPage: true });
    const hasHorizontalOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(hasHorizontalOverflow, false, "Mobile sample must not horizontally overflow.");
    const compactTableNeedsHorizontalScroll = await mobile.locator(".simple-table").evaluate((table) => table.scrollWidth > table.clientWidth + 1);
    assert.equal(compactTableNeedsHorizontalScroll, false, "Compact mobile sample must show every summary field without horizontal scrolling.");
    await mobile.getByRole("button", { name: /Mẫu B: Xem song song/ }).click();
    assert.equal(await mobile.locator("#splitTemplate").isVisible(), true, "Split sample must be reachable on mobile.");
  } finally { await browser.close(); }
}

run().then(() => console.log("workload_report_preview=passed")).catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
