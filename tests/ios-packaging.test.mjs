import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const resourcesDir = new URL("../ios/AiDiet/Resources/", import.meta.url);
const bundledHtml = readdirSync(resourcesDir).find((name) => name.endsWith(".html"));

assert.ok(existsSync(new URL("../ios/AiDiet.xcodeproj/project.pbxproj", import.meta.url)), "iOS Xcode project exists");
assert.ok(bundledHtml, "bundled HTML resource exists");
assert.ok(existsSync(new URL("../.github/workflows/ios-ipa.yml", import.meta.url)), "GitHub Actions IPA workflow exists");
assert.ok(existsSync(new URL("../.github/workflows/ios-unsigned.yml", import.meta.url)), "GitHub Actions unsigned iOS workflow exists");

const plist = read("ios/AiDiet/Info.plist");
assert.match(plist, /<key>NSCameraUsageDescription<\/key>\s*<string>[^<]+<\/string>/, "camera usage description is valid XML");
assert.match(plist, /<key>NSPhotoLibraryUsageDescription<\/key>\s*<string>[^<]+<\/string>/, "photo library usage description is valid XML");
assert.doesNotMatch(plist, /\?\/string>/, "Info.plist should not contain broken string tags");

const viewController = read("ios/AiDiet/ViewController.swift");
const htmlBaseName = bundledHtml.replace(/\.html$/, "");
assert.match(viewController, new RegExp(`forResource: "${htmlBaseName}"`), "WKWebView loads the actual bundled HTML filename");

const project = read("ios/AiDiet.xcodeproj/project.pbxproj");
assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER = "\$\(BUNDLE_ID\)";/, "Bundle ID is driven by GitHub secret");
assert.match(project, /DEVELOPMENT_TEAM = "\$\(DEVELOPMENT_TEAM\)";/, "Development team is driven by GitHub secret");
assert.match(project, /CODE_SIGN_STYLE = Manual;/, "Release signing is manual for CI export");

const workflow = read(".github/workflows/ios-ipa.yml");
for (const secret of [
  "IOS_CERTIFICATE_P12_BASE64",
  "IOS_CERTIFICATE_PASSWORD",
  "IOS_PROVISIONING_PROFILE_BASE64",
  "APPLE_TEAM_ID",
  "BUNDLE_ID"
]) {
  assert.match(workflow, new RegExp(`secrets\\.${secret}`), `workflow references ${secret}`);
}
assert.match(workflow, /security create-keychain/, "workflow creates a temporary signing keychain");
assert.match(workflow, /xcodebuild[\s\S]*archive/, "workflow archives the iOS app");
assert.match(workflow, /xcodebuild -exportArchive/, "workflow exports an IPA");
assert.match(workflow, /actions\/upload-artifact@v4/, "workflow uploads the IPA artifact");

const unsignedWorkflow = read(".github/workflows/ios-unsigned.yml");
assert.match(unsignedWorkflow, /name: Build iOS Unsigned/, "unsigned workflow has a clear name");
assert.match(unsignedWorkflow, /xcodebuild[\s\S]*archive/, "unsigned workflow archives the iOS app");
assert.match(unsignedWorkflow, /CODE_SIGNING_ALLOWED=NO/, "unsigned workflow disables code signing");
assert.match(unsignedWorkflow, /actions\/upload-artifact@v4/, "unsigned workflow uploads unsigned artifacts");
assert.doesNotMatch(unsignedWorkflow, /secrets\.(IOS_CERTIFICATE_P12_BASE64|IOS_CERTIFICATE_PASSWORD|IOS_PROVISIONING_PROFILE_BASE64|APPLE_TEAM_ID|BUNDLE_ID)/, "unsigned workflow should not depend on Apple signing secrets");

console.log("iOS packaging wiring is present");
