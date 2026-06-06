import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = [
  "灵光.html",
  "ios/AiDiet/Resources/灵光.html",
  "android/app/src/main/assets/ai-diet-home.html",
];

for (const file of files) {
  const html = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const callMatch = html.match(/async function callAI识别\(messages, _retryCount\) \{([\s\S]*?)\n    \}/);

  assert.ok(callMatch, `${file} should define callAI识别`);
  assert.match(callMatch[1], /response_format:\s*\{\s*type:\s*"json_object"\s*\}/, `${file} should request JSON mode from the API`);
}

console.log("AI API calls request JSON mode");
