import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../ai-diet-home.html", import.meta.url), "utf8");

assert.match(html, /function renderCalendarDetail\(/, "calendar detail renderer exists");
assert.match(html, /class="calendar-grid"/, "calendar grid is rendered");
assert.match(html, /data-calendar-date=/, "calendar day buttons are clickable");
assert.match(html, /data-calendar-meals/, "daily meal area is rendered");
assert.match(html, /function selectCalendarDate\(/, "calendar date click handler exists");

console.log("calendar detail wiring is present");
