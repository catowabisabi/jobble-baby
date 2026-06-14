#!/bin/bash
# Dispatch cycle 343: GitHub Actions CI/CD Pipeline
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby

cat > .hermes/autoloop/_dispatch_cycle343.sh << 'SCRIPT'
#!/bin/bash
set -e
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby

echo "=== TODO #343: GitHub Actions CI/CD Pipeline ==="
echo "Keywords: bottle_teat_flow_rate, sleepregression, developmental_trajectory"

# Create .github/workflows/ directory
mkdir -p .github/workflows

# Create EAS build workflow
cat > .github/workflows/eas-build.yml << 'EOF'
name: EAS Build & Release

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - uses: expo/expo-github-actions@v1
        with:
          eas-version: latest
          packager: npm
      - name: EAS Build iOS
        run: eas build --platform ios --profile preview --non-interactive
        env:
          EAS_BUILD_CONTEXT: ${{ toJson(github) }}
      - name: EAS Build Android
        run: eas build --platform android --profile preview --non-interactive
        env:
          EAS_BUILD_CONTEXT: ${{ toJson(github) }}
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: eas-builds
          path: android/app/build/outputs/apk/*.apk
          retention-days: 7

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm test --if-present
      - uses: expo/expo-github-actions@v1
        with:
          packager: npm
EOF

# Create testFlight-release.yml for TestFlight internal testing
cat > .github/workflows/testflight-release.yml << 'EOF'
name: TestFlight Internal Testing

on:
  push:
    branches: [master]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - uses: expo/expo-github-actions@v1
        with:
          eas-version: latest
          packager: npm
      - name: Submit to TestFlight
        run: eas submit --platform ios --profile preview --latest --non-interactive
        env:
          EAS_BUILD_CONTEXT: ${{ toJson(github) }}
          EXPO_APPLE_TEAM_ID: ${{ secrets.EXPO_APPLE_TEAM_ID }}
          EXPO_APPLE_ID: ${{ secrets.EXPO_APPLE_ID }}
          EXPO_APPLE_PASSWORD: ${{ secrets.EXPO_APPLE_APP_PASSWORD }}
EOF

echo "Created GitHub Actions workflows"

# Verify files created
ls -la .github/workflows/

echo "=== Dispatch TODO #343 complete ==="
echo "Files created:"
echo "  - .github/workflows/eas-build.yml"
echo "  - .github/workflows/testflight-release.yml"
echo ""
echo "Note: User needs to configure EAS_BUILD_CONTEXT secret in GitHub repo settings."
echo "Note: User needs to configure EXPO_APPLE_TEAM_ID, EXPO_APPLE_ID, EXPO_APPLE_PASSWORD secrets."
SCRIPT

chmod +x .hermes/autoloop/_dispatch_cycle343.sh
echo "Dispatch script written"