const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "C:/Users/Hi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "tmp", "mobile-topbar-3.4.145.png");
const url = process.env.PREVIEW_URL || pathToFileURL(path.join(root, "index.html")).href;

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 455, height: 842 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("phuc-thinh-current-account-v1", "account-admin");
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.body.classList.contains("is-authenticated"), null, { timeout: 15000 });
    await page.locator("#topbarVisualScene").waitFor({ state: "visible" });
    const metrics = await page.evaluate(() => {
      const topbar = document.querySelector(".topbar");
      const scene = document.querySelector("#topbarVisualScene");
      const topbarRect = topbar.getBoundingClientRect();
      const sceneRect = scene.getBoundingClientRect();
      const style = getComputedStyle(scene);
      return {
        topbarHeight: topbarRect.height,
        sceneWidth: sceneRect.width,
        sceneHeight: sceneRect.height,
        objectFit: style.objectFit,
        objectPosition: style.objectPosition,
        naturalWidth: scene.naturalWidth,
        naturalHeight: scene.naturalHeight,
      };
    });
    console.log(`mobile_topbar_metrics=${JSON.stringify(metrics)}`);
    assert.equal(metrics.topbarHeight, 72, "Mobile topbar must render at 72px.");
    assert.ok(metrics.sceneWidth >= 450 && metrics.sceneHeight >= 71, "Theme scene must fill the mobile header inside its 1px border.");
    assert.equal(metrics.objectFit, "cover", "Theme scene must cover instead of shrinking to a strip.");
    assert.equal(metrics.objectPosition, "50% 50%", "Theme scene must use a balanced center crop.");
    assert.deepEqual([metrics.naturalWidth, metrics.naturalHeight], [1920, 86]);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await page.screenshot({ path: output, fullPage: false });
    console.log(`mobile_topbar_ui=passed (${JSON.stringify(metrics)})`);
    console.log(output);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
