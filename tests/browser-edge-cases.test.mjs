import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appUrl = pathToFileURL(resolve(__dirname, "../ai-diet-home.html")).href;
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9731 + Math.floor(Math.random() * 500);
const userDataDir = mkdtempSync(resolve(tmpdir(), "ai-diet-edge-"));

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
  await cdp("Page.navigate", { url: `${appUrl}#plan-settings` });
  await sleep(500);

  await evaluate(`
    (() => {
      document.querySelector('[data-plan-field="targetCalories"]').value = "";
      document.querySelector('[data-plan-field="targetWeight"]').value = "";
      document.querySelector('[data-action="save-plan"]').click();
    })()
  `);
  await sleep(300);

  assert.equal(
    await evaluate("JSON.parse(localStorage.getItem('aiDietAppState') || 'null')"),
    null,
    "blank plan values should not be saved as zero"
  );

  await cdp("Page.navigate", { url: `${appUrl}#home` });
  await sleep(300);
  assert.ok(
    await evaluate("document.querySelector('.progress-text')?.textContent.includes('目标 1800 kcal')"),
    "home target calories should stay at the default after blank save"
  );

  await cdp("Page.navigate", { url: `${appUrl}#reminders` });
  await sleep(300);
  await evaluate(`
    (() => {
      const reminder = document.querySelector('[data-field="lunchReminder"]');
      reminder.checked = false;
      reminder.dispatchEvent(new Event('change', { bubbles: true }));
    })()
  `);
  await sleep(300);
  assert.equal(
    await evaluate("JSON.parse(localStorage.getItem('aiDietAppState') || 'null')?.settings?.lunchReminder"),
    false,
    "reminder toggle should persist to shared app state"
  );

  await cdp("Page.navigate", { url: `${appUrl}#reminders` });
  await sleep(300);
  assert.equal(
    await evaluate("document.querySelector('[data-field=\"lunchReminder\"]')?.checked"),
    false,
    "persisted reminder toggle should survive refresh"
  );

  ws.close();
}

try {
  await main();
  console.log("browser edge cases passed");
} finally {
  child.kill();
  await sleep(500);
  try {
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    // Chrome can briefly hold profile locks on Windows; the temp profile is disposable.
  }
}
