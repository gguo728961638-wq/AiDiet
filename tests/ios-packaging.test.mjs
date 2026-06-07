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

const launchScreen = read("ios/AiDiet/Resources/LaunchScreen.storyboard");
assert.match(launchScreen, /targetRuntime="iOS\.CocoaTouch"/, "LaunchScreen storyboard uses an iOS target runtime Xcode can compile");
assert.doesNotMatch(launchScreen, /targetRuntime="AppleSDK"/, "LaunchScreen storyboard should not use unsupported AppleSDK runtime");

const viewController = read("ios/AiDiet/ViewController.swift");
const htmlBaseName = bundledHtml.replace(/\.html$/, "");
assert.match(viewController, new RegExp(`forResource: "${htmlBaseName}"`), "WKWebView loads the actual bundled HTML filename");
assert.match(viewController, /picker\.dismiss\(animated: true\) \{ \[weak self\] in\s+self\?\.imagePickerCompletion\?\(nil\)\s+self\?\.imagePickerCompletion = nil\s+\}/s, "image picker cancel closure safely handles weak self");
assert.match(viewController, /defaultWebpagePreferences\.allowsContentJavaScript = true/, "WKWebView enables JavaScript using the modern API");
assert.match(viewController, /#if targetEnvironment\(macCatalyst\)[\s\S]*runOpenPanelWith parameters: WKOpenPanelParameters[\s\S]*#endif/, "open panel delegate is only compiled where WKOpenPanelParameters is available");

const project = read("ios/AiDiet.xcodeproj/project.pbxproj");
assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER = "\$\(BUNDLE_ID\)";/, "Bundle ID is driven by GitHub secret");
assert.match(project, /DEVELOPMENT_TEAM = "\$\(DEVELOPMENT_TEAM\)";/, "Development team is driven by GitHub secret");
assert.match(project, /CODE_SIGN_STYLE = Manual;/, "Release signing is manual for CI export");
assert.doesNotMatch(project, /path = "Resources\//, "resources group children should use paths relative to the Resources group");
const pbxObjectIds = [...project.matchAll(/^\s*([A-F0-9]{24})\s+\/\*.*\*\/\s*=\s*\{/gm)].map((match) => match[1]);
assert.equal(new Set(pbxObjectIds).size, pbxObjectIds.length, "Xcode project object IDs should be unique");

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
assert.match(workflow, /TARGET_NAME="\$\{APP_SCHEME\}"/, "signed workflow provides TARGET_NAME for Xcode product expansion");

const unsignedWorkflow = read(".github/workflows/ios-unsigned.yml");
assert.match(unsignedWorkflow, /name: Build iOS Unsigned/, "unsigned workflow has a clear name");
assert.match(unsignedWorkflow, /xcodebuild[\s\S]*build/, "unsigned workflow builds the iOS app");
assert.match(unsignedWorkflow, /-scheme "\$\{APP_TARGET\}"/, "unsigned workflow builds the explicit scheme required by xcodebuild with derivedDataPath");
assert.match(unsignedWorkflow, /TARGET_NAME="\$\{APP_TARGET\}"/, "unsigned workflow provides TARGET_NAME for Xcode product expansion");
assert.match(unsignedWorkflow, /BUNDLE_ID="\$\{UNSIGNED_BUNDLE_ID\}"/, "unsigned workflow provides BUNDLE_ID for Xcode build setting expansion");
assert.match(unsignedWorkflow, /tee "\$\{EXPORT_PATH\}\/xcodebuild\.log"/, "unsigned workflow captures xcodebuild output to a log file");
assert.match(unsignedWorkflow, /if: always\(\)/, "unsigned workflow uploads diagnostics even after failures");
assert.match(unsignedWorkflow, /CODE_SIGNING_ALLOWED=NO/, "unsigned workflow disables code signing");
assert.match(unsignedWorkflow, /actions\/upload-artifact@v4/, "unsigned workflow uploads unsigned artifacts");
assert.doesNotMatch(unsignedWorkflow, /secrets\.(IOS_CERTIFICATE_P12_BASE64|IOS_CERTIFICATE_PASSWORD|IOS_PROVISIONING_PROFILE_BASE64|APPLE_TEAM_ID|BUNDLE_ID)/, "unsigned workflow should not depend on Apple signing secrets");

console.log("iOS packaging wiring is present");
