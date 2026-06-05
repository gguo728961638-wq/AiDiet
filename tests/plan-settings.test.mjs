import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../ai-diet-home.html", import.meta.url), "utf8");

assert.match(html, /data-route="plan-settings"/, "profile plan card opens plan settings");
assert.match(html, /function renderPlanSettingsDetail\(/, "plan settings renderer exists");
assert.match(html, /data-plan-field="targetWeight"/, "target weight input exists");
assert.match(html, /data-plan-field="currentWeight"/, "current weight input exists");
assert.match(html, /data-plan-field="targetCalories"/, "target calories input exists");
assert.match(html, /function savePlanSettings\(/, "plan settings save handler exists");

console.log("plan settings wiring is present");
