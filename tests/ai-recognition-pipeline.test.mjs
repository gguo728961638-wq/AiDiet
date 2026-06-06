import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const htmlFile = existsSync(new URL("../灵光.html", import.meta.url))
  ? "../灵光.html"
  : "../ai-diet-home.html";
const html = readFileSync(new URL(htmlFile, import.meta.url), "utf8");

assert.match(html, /function prepareRecognitionImage\(/, "prepares a high-quality upload image");
assert.match(html, /const RECOGNITION_IMAGE_MAX_EDGE = 1280/, "keeps recognition image quality above thumbnail size");
assert.match(html, /function analyzeImageQuality\(/, "checks blur, brightness, and food subject size before AI");
assert.match(html, /function buildFoodRecognitionPrompt\(/, "builds a strict structured recognition prompt");
assert.match(html, /function parseAIRecognitionResponse\(/, "parses and normalizes structured AI JSON");
assert.match(html, /function calculateConfirmedNutrition\(/, "calculates calories only after user confirmation");
assert.match(html, /function collectConfirmedFoods\(/, "collects user-confirmed foods from the result page");
assert.match(html, /function logRecognitionStep\(/, "logs recognition pipeline details");
assert.match(html, /function getRecognitionCacheKey\(/, "caches repeated recognition requests by image fingerprint");
assert.match(html, /function bestDishCandidate\(/, "uses dish-level candidates before ingredient-level estimates");
assert.match(html, /function normalizeDishCandidates\(/, "normalizes AI dish candidates");

for (const field of [
  "needs_retake",
  "foods",
  "name",
  "category",
  "confidence",
  "portion_level",
  "uncertain",
  "reason"
]) {
  assert.match(html, new RegExp(`"${field}"`), `AI schema includes ${field}`);
}

for (const field of [
  "dish_candidates",
  "visible_ingredients",
  "best_display_name"
]) {
  assert.match(html, new RegExp(`"${field}"`), `AI schema includes dish-level field ${field}`);
}

assert.match(html, /data-recognition-review/, "result page has a user confirmation review section");
assert.match(html, /data-food-name-input/, "users can edit recognized food names");
assert.match(html, /data-portion-select/, "users can adjust recognized food portion levels");
assert.match(html, /data-side-toggle/, "users can confirm side dishes");
assert.match(html, /data-sauce-toggle/, "users can confirm sauces");
assert.match(html, /data-action="confirm-foods"/, "users must confirm before final nutrition is calculated");
assert.match(html, /data-low-confidence/, "result page can surface low-confidence guidance");
assert.doesNotMatch(html, /var maxW = 320/, "recognition upload should not use a 320px thumbnail");
assert.doesNotMatch(html, /timeout:\s*30000/, "recognition API should not block the UI for 30 seconds");
assert.doesNotMatch(html, /foods\.forEach[\s\S]*if \(food\.includeSide\) calories \+= 45[\s\S]*if \(food\.includeSauce\) calories \+= 70/, "side dishes and sauces should not be added once per ingredient");
assert.match(html, /imageSrc && imageSrc\.indexOf\("assets\/food\/"\) === 0[\s\S]*recognizeFoodLocal/, "local fallback should only use deterministic image matches");
assert.match(html, /hasApiResponse[\s\S]*writeRecognitionCache/, "only real API responses should be cached");

console.log("AI recognition pipeline wiring is present");
