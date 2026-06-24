import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { chromium } from "playwright-core";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "verification");
fs.mkdirSync(outDir, { recursive: true });

function analyzePng(file) {
  if (!fs.existsSync(file)) return null;
  const png = PNG.sync.read(fs.readFileSync(file));
  let nonDark = 0;
  let colored = 0;
  const total = png.width * png.height;
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const lum = r + g + b;
    if (lum > 34) nonDark += 1;
    if (Math.max(r, g, b) - Math.min(r, g, b) > 14 && lum > 44) colored += 1;
  }
  return {
    width: png.width,
    height: png.height,
    nonDarkFraction: Number((nonDark / total).toFixed(4)),
    coloredFraction: Number((colored / total).toFixed(4)),
  };
}

async function safeScreenshot(page, file) {
  if (process.env.CAPTURE_SCREENSHOTS !== "1") {
    return { ok: false, skipped: true };
  }
  try {
    const session = await page.context().newCDPSession(page);
    const shot = await session.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
    await session.detach();
    return { ok: true, analysis: analyzePng(file) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function readState(page) {
  return await page.evaluate(() => ({
    title: document.querySelector("#sceneTitle")?.textContent,
    status: document.querySelector("#statusText")?.textContent,
    splats: document.querySelector("#splatsValue")?.textContent,
    mode: document.querySelector("#modeValue")?.textContent,
  }));
}

const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const url = process.env.DEMO_URL || "http://127.0.0.1:8788/";

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: [
    "--ignore-gpu-blocklist",
    "--enable-webgl",
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
  ],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
const failedResponses = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
});

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector("#splatCanvas", { timeout: 60000 });
await page.waitForFunction(() => document.querySelector("#statusText")?.textContent === "ready", null, { timeout: 120000 });
await page.waitForTimeout(800);

const buildingState = await readState(page);
const buildingShot = await safeScreenshot(page, path.join(outDir, "desktop-building.png"));

await page.locator("button[data-scene=rocket]").click({ force: true });
await page.waitForTimeout(800);
const rocketState = await readState(page);
const rocketShot = await safeScreenshot(page, path.join(outDir, "desktop-rocket.png"));

await page.locator("button[data-scene=building]").click({ force: true });
await page.waitForTimeout(800);
const backState = await readState(page);

await page.locator("#walkButton").click({ force: true });
await page.waitForTimeout(200);
const yBeforeSpace = await page.evaluate(() => window.__HC3DGS_DEMO__?.getCameraY?.());
await page.keyboard.down("Space");
await page.waitForTimeout(450);
await page.keyboard.up("Space");
await page.waitForTimeout(120);
const yAfterSpace = await page.evaluate(() => window.__HC3DGS_DEMO__?.getCameraY?.());
await page.keyboard.down("Control");
await page.waitForTimeout(450);
await page.keyboard.up("Control");
await page.waitForTimeout(120);
const yAfterControl = await page.evaluate(() => window.__HC3DGS_DEMO__?.getCameraY?.());
await page.keyboard.press("F");
await page.waitForTimeout(120);

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
const mobileShot = await safeScreenshot(page, path.join(outDir, "mobile-building.png"));

await browser.close();

const passed =
  buildingState.status === "ready" &&
  rocketState.status === "ready" &&
  backState.status === "ready" &&
  buildingState.title === "HITSZ Main Building" &&
  rocketState.title === "Campus Rocket" &&
  backState.title === "HITSZ Main Building" &&
  yAfterSpace > yBeforeSpace + 0.05 &&
  yAfterControl < yAfterSpace - 0.05;

const report = {
  passed,
  states: {
    building: buildingState,
    rocket: rocketState,
    back: backState,
  },
  movement: {
    yBeforeSpace,
    yAfterSpace,
    yAfterControl,
    spaceDelta: Number((yAfterSpace - yBeforeSpace).toFixed(4)),
    controlDelta: Number((yAfterControl - yAfterSpace).toFixed(4)),
  },
  screenshots: {
    building: buildingShot,
    rocket: rocketShot,
    mobile: mobileShot,
  },
  errors,
  failedResponses,
};

fs.writeFileSync(path.join(outDir, "playwright_report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

if (!passed) process.exitCode = 1;
