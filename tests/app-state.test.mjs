import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../ai-diet-home.html", import.meta.url), "utf8");

assert.match(html, /const appState = /, "defines shared appState");
assert.match(html, /function renderHome\(/, "renders home from shared state");
assert.match(html, /function renderProfile\(/, "renders profile from shared state");
assert.match(html, /function renderResult\(/, "renders result from shared state");
assert.match(html, /function addRecognitionToToday\(/, "adds recognition result into today's records");
assert.match(html, /data-meal-list/, "home meal list is a rendered data target");
assert.match(html, /data-action="add-recognition"/, "result primary action writes to shared state");

console.log("shared app state wiring is present");
