import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appUrl = pathToFileURL(resolve(__dirname, "../ai-diet-home.html")).href;
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9231 + Math.floor(Math.random() * 500);
const userDataDir = mkdtempSync(resolve(tmpdir(), "ai-diet-click-"));

const child = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  "--window-size=430,932",
  `${appUrl}#home`
], { stdio: "ignore" });

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function getWebSocketUrl() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const tab = tabs.find((item) => item.url.includes("ai-diet-home.html"));
      if (tab?.webSocketDebuggerUrl) return tab.webSocketDebuggerUrl;
    } catch {
      await sleep(100);
    }
  }
  throw new Error("Chrome DevTools endpoint did not start");
}

async function main() {
  const ws = new WebSocket(await getWebSocketUrl());
  await new Promise((resolveOpen) => ws.addEventListener("open", resolveOpen, { once: true }));
  let id = 0;
  const pending = new Map();

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });

  function cdp(method, params = {}) {
    id += 1;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolveMessage) => pending.set(id, resolveMessage));
  }

  async function evaluate(expression) {
    const response = await cdp("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (response.result.exceptionDetails) {
      const details = response.result.exceptionDetails;
      const message = details.exception?.description || details.text || "Runtime.evaluate failed";
      throw new Error(message);
    }
    return response.result.result.value;
  }

  await cdp("Runtime.enable");
  await cdp("Page.enable");
  await cdp("Page.navigate", { url: `${appUrl}#home` });
  await sleep(500);
  await evaluate(`localStorage.removeItem("aiDietAppState")`);
  await cdp("Page.navigate", { url: `${appUrl}#home` });
  await sleep(500);

  async function clickRoute(route) {
    await evaluate(`
      (() => {
        const node = document.querySelector('[data-route="${route}"]');
        if (!node) throw new Error('missing route ${route}');
        node.click();
      })()
    `);
    await sleep(350);
  }

  async function routeState() {
    return evaluate("document.body.dataset.activeRoute");
  }

  await clickRoute("meals");
  assert.equal(await routeState(), "detail", "meals click opens detail page");
  assert.ok(await evaluate("document.querySelector('[data-detail-title]')?.textContent.includes('今天 2 餐')"));

  await clickRoute("meal-lunch-chicken-salad");
  assert.equal(await routeState(), "detail", "meal card click opens detail page");
  assert.ok(await evaluate("document.querySelector('[data-detail-title]')?.textContent.includes('鸡胸沙拉')"));

  await clickRoute("home");
  assert.equal(await routeState(), "home", "home click opens home");

  await clickRoute("profile");
  assert.equal(await routeState(), "profile", "profile click opens profile");

  await clickRoute("plan-settings");
  assert.equal(await routeState(), "detail", "plan settings card opens detail page");
  assert.ok(await evaluate("document.querySelector('[data-detail-title]')?.textContent.includes('目标设置')"));
  await evaluate(`
    (() => {
      document.querySelector('[data-plan-field="targetCalories"]').value = "1650";
      document.querySelector('[data-plan-field="targetWeight"]').value = "53.5";
      document.querySelector('[data-action="save-plan"]').click();
    })()
  `);
  await sleep(300);
  assert.ok(await evaluate("document.querySelector('[data-plan-feedback]')?.textContent.includes('已保存')"));
  await clickRoute("home");
  assert.ok(await evaluate("document.querySelector('.progress-text')?.textContent.includes('目标 1650 kcal')"));

  await clickRoute("settings");
  assert.equal(await routeState(), "detail", "settings click opens detail page");
  assert.ok(await evaluate("document.querySelector('[data-detail-title]')?.textContent.includes('设置')"));

  await clickRoute("calendar");
  assert.equal(await routeState(), "detail", "calendar click opens detail page");
  assert.ok(await evaluate("document.querySelector('[data-detail-title]')?.textContent.includes('日历')"));
  await evaluate(`
    (() => {
      const node = document.querySelector('[data-calendar-date="2026-06-03"]');
      if (!node) throw new Error('missing calendar date');
      node.click();
    })()
  `);
  await sleep(300);
  assert.ok(await evaluate("document.querySelector('[data-calendar-meals]')?.textContent.includes('蒸鱼糙米饭')"));

  await clickRoute("camera");
  await sleep(2600);
  assert.equal(await routeState(), "result", "camera flow auto-opens result");
  assert.ok(await evaluate("document.querySelector('.result-title')?.textContent.includes('鸡胸沙拉')"));

  await clickRoute("home");
  assert.equal(await routeState(), "home", "add recognition returns home");

  ws.close();
}

try {
  await main();
  console.log("browser click smoke passed");
} finally {
  child.kill();
  await sleep(500);
  try {
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    // Chrome can briefly hold profile locks on Windows; the temp profile is disposable.
  }
}
