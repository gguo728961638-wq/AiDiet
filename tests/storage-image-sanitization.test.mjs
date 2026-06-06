import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = [
  "灵光.html",
  "ios/AiDiet/Resources/灵光.html",
  "android/app/src/main/assets/ai-diet-home.html",
];

for (const file of files) {
  const html = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

  assert.match(html, /function sanitizeStateForStorage\(/, `${file} should sanitize state before localStorage writes`);
  assert.match(html, /function sanitizeStoredImage\(/, `${file} should sanitize large data URL images`);
  assert.match(html, /localStorage\.setItem\("aiDietAppState", JSON\.stringify\(sanitizeStateForStorage\(appState\)\)\)/, `${file} saveState should not persist raw appState`);
  assert.match(html, /image\.indexOf\("data:image\/"\) === 0 && image\.length > 220000/, `${file} should drop oversized uploaded images before persistence`);
}

console.log("large uploaded images are sanitized before storage");
