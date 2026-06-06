import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = [
  "灵光.html",
  "ios/AiDiet/Resources/灵光.html",
  "android/app/src/main/assets/ai-diet-home.html",
];

for (const file of files) {
  const html = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

  assert.match(html, /function resetAlbumRecognizeButton\(/, `${file} should centralize album button reset`);
  assert.match(html, /function setAlbumRecognizing\(/, `${file} should centralize album loading state`);
  assert.match(html, /resetAlbumRecognizeButton\(recognizeBtn\)/, `${file} should reset stale album button state after selecting a photo`);
  assert.match(html, /try\s*\{[\s\S]*await recognizeFoodAI\(albumSelectedPhoto, true\)[\s\S]*\}\s*catch\s*\(/, `${file} album recognition should catch async failures`);
  assert.match(html, /finally\s*\{[\s\S]*if \(!didNavigate\) resetAlbumRecognizeButton\(recognizeBtn\)/, `${file} album recognition should unlock the button if it stays on album page`);
  assert.match(html, /timeout:\s*8000/, `${file} should keep API timeout short enough to avoid a no-response feeling`);
}

console.log("album recognition state is recoverable");
