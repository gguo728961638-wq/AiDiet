#!/bin/bash
set -e

echo "=== Xcode version ==="
xcodebuild -version

echo "=== Project list ==="
cd ios
xcodebuild -project AiDiet.xcodeproj -list

echo "=== Building archive ==="
xcodebuild -project AiDiet.xcodeproj -scheme AiDiet -configuration Release -sdk iphoneos -destination "generic/platform=iOS" -archivePath build/AiDiet.xcarchive archive

echo "=== Exporting IPA ==="
xcodebuild -exportArchive -archivePath build/AiDiet.xcarchive -exportOptionsPlist exportOptions.plist -exportPath build/output

echo "=== Done ==="
ls -la build/output/
