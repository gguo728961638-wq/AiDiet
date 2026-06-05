import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../ai-diet-home.html", import.meta.url), "utf8");
const routeMatches = [...html.matchAll(/data-route="([^"]+)"/g)].map((match) => match[1]);
const uniqueRoutes = [...new Set(routeMatches)].sort();

assert.match(html, /const routableRoutes = new Set\(/, "defines routable route set");
assert.match(html, /function renderDetailPage\(/, "defines detail page renderer");
assert.match(html, /class="page-content detail-content"/, "defines a visible detail page template");

const routableSetSource = html.match(/const routableRoutes = new Set\(\[([\s\S]*?)\]\);/)?.[1] || "";
const routableRoutes = [...routableSetSource.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

for (const route of uniqueRoutes) {
  if (route.includes("${")) continue;
  if (route.startsWith("meal-")) continue;
  assert.ok(
    routableRoutes.includes(route),
    `route "${route}" should be handled by routableRoutes`
  );
}

console.log(`all ${uniqueRoutes.length} declared routes are covered`);
