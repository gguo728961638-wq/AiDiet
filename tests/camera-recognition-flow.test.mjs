import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = [
  "灵光.html",
  "ios/AiDiet/Resources/灵光.html",
];

for (const file of files) {
  const html = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const processMatch = html.match(/function processCapturedPhoto\(dataUrl\) \{([\s\S]*?)\n    \}/);

  assert.ok(processMatch, `${file} should define processCapturedPhoto`);
  assert.doesNotMatch(processMatch[1], /\bshowResult\(/, `${file} native camera flow must not call removed showResult`);
  assert.doesNotMatch(processMatch[1], /\brecognizeFood\(/, `${file} native camera flow must not call removed recognizeFood`);
  assert.match(processMatch[1], /\brunRecognitionFromImage\(/, `${file} native camera flow should use the current AI recognition pipeline`);

  assert.match(html, /async function runRecognitionFromImage\(/, `${file} should share recognition routing through runRecognitionFromImage`);
  assert.match(html, /applyRecognitionToPending\(aiResult/, `${file} should connect AI result to pending recognition state`);
  assert.match(html, /window\.location\.hash = "result"/, `${file} should route to result after recognition`);

  const startCameraMatch = html.match(/async function startCamera\(\) \{([\s\S]*?)\n    \}/);
  assert.ok(startCameraMatch, `${file} should define startCamera`);
  assert.doesNotMatch(startCameraMatch[1], /\btriggerNativeCamera\(\)/, `${file} should not auto-open native camera when entering camera route`);

  const captureMatch = html.match(/async function captureAndRecognize\(\) \{([\s\S]*?)\n    \}/);
  assert.ok(captureMatch, `${file} should define captureAndRecognize`);
  assert.match(captureMatch[1], /\btriggerNativeCamera\(\)/, `${file} shutter should open native camera/file picker when no stream is available`);
}

console.log("camera recognition flow is connected");
