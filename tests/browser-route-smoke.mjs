import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appUrl = pathToFileURL(resolve(__dirname, "../ai-diet-home.html")).href;
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const routes = [
  ["home", 'data-active-route="home"', "今天"],
  ["profile", 'data-active-route="profile"', "我的"],
  ["plan-settings", 'data-active-route="detail"', "目标设置"],
  ["camera-hold", 'data-active-route="camera"', "AI 正在识别食物"],
  ["result-final", 'data-active-route="result"', "识别完成"],
  ["meals", 'data-active-route="detail"', "今天 2 餐"],
  ["meal-lunch-chicken-salad", 'data-active-route="detail"', "526"],
  ["meal-breakfast-oatmeal-latte", 'data-active-route="detail"', "186"],
  ["calendar", 'data-active-route="detail"', "data-calendar-meals"],
  ["settings", 'data-active-route="detail"', "设置"],
  ["body-data", 'data-active-route="detail"', "体重趋势"],
  ["diet-preference", 'data-active-route="detail"', "低碳轻食"],
  ["reminders", 'data-active-route="detail"', "提醒管理"],
  ["sync", 'data-active-route="detail"', "Apple Health"],
  ["enhance", 'data-active-route="detail"', "识别增强"],
  ["more", 'data-active-route="detail"', "更多操作"],
  ["album", 'data-active-route="detail"', "选择照片"],
  ["manual", 'data-active-route="detail"', "记录一餐"]
];

for (const [route, activeMarker, expectedText] of routes) {
  const userDataDir = mkdtempSync(resolve(tmpdir(), "ai-diet-route-"));
  try {
    const dom = execFileSync(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--user-data-dir=${userDataDir}`,
      "--virtual-time-budget=1000",
      "--dump-dom",
      `${appUrl}#${route}`
    ], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });

    assert.ok(dom.includes(activeMarker), `${route} should activate ${activeMarker}`);
    assert.ok(dom.includes(expectedText), `${route} should render ${expectedText}`);
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

console.log(`browser smoke checked ${routes.length} routes`);
