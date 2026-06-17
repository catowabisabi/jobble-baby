#!/bin/bash
# Jobble Baby — App Store / Play Store Submission Checklist
# Run from JobbleBaby/ directory
set -e
cd "$(dirname "$0")"

echo "============================================================"
echo "  Jobble Baby — Submission Checklist"
echo "============================================================"
echo ""

# 1. Code audit
echo "[1/7] Running pre-submission audit..."
node scripts/pre-submission-audit.js
echo ""

# 2. Check EAS credentials
echo "[2/7] Checking EAS credentials..."
echo "  Run: eas credentials --project-id com.jobblebaby.app"
echo "  If not configured, run: eas credentials --project-id com.jobblebaby.app --platform ios"
echo "  And:  eas credentials --project-id com.jobblebaby.app --platform android"
echo ""

# 3. Privacy policy
echo "[3/7] Privacy policy URL..."
echo "  Current: jobblebaby.com/privacy (placeholder - DEPLOY THIS!)"
echo "  Deploy privacy policy to a real URL before submitting."
echo ""

# 4. iOS build
echo "[4/7] iOS Build..."
echo "  Development:  eas build --platform ios --profile development"
echo "  Production:   eas build --platform ios --profile production"
echo "  After build:  eas submit --platform ios --latest"
echo ""

# 5. Android build
echo "[5/7] Android Build..."
echo "  APK (internal):  eas build --platform android --profile preview"
echo "  AAB (production): eas build --platform android --profile production"
echo "  After build:     eas submit --platform android --latest"
echo ""

# 6. App Store Connect
echo "[6/7] App Store Connect Setup..."
echo "  1. Go to https://appstoreconnect.apple.com"
echo "  2. Create new app with bundle ID: com.jobblebaby.app"
echo "  3. Fill in metadata (description, keywords, screenshots)"
echo "  4. Use screenshots from docs/screenshots/"
echo ""

# 7. Play Console
echo "[7/7] Play Console Setup..."
echo "  1. Go to https://play.google.com/console"
echo "  2. Create new app with package: com.jobblebaby.app"
echo "  3. Fill in store listing (description, screenshots)"
echo "  4. Upload AAB from eas build output"
echo ""

echo "============================================================"
echo "  ALL CODE READY — Good luck with submission!"
echo "============================================================"
