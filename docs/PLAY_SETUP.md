# Google Play Console API Setup Guide

This guide walks you through configuring the Google Play Publisher API for automated APK uploads.

## Prerequisites

- Google Play Console account (paid, one-time $25)
- Google Cloud project with billing enabled
- Python 3.8+ with pip

---

## Step 1: Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the **Google Play Developer API**:
   - Go to APIs & Services → Library
   - Search for "Google Play Developer API"
   - Click Enable

---

## Step 2: Create a Service Account

1. Go to APIs & Services → Credentials → Create Credentials → Service Account
2. Name it `play-console-uploader`
3. Grant no specific roles yet (we'll do this in Play Console)
4. Create a JSON key:
   - Click on the service account
   - Keys → Add Key → JSON
   - Download the JSON file (keep it secure!)

---

## Step 3: Grant Play Console Access to Service Account

1. Go to Google Play Console → Settings → API Access
2. Find your service account under "Service Accounts"
3. Click "Grant Access"
4. Select these roles:
   - **Release Manager** (for uploading APKs)
   - **Finance** (for viewing financial reports, optional)
5. Click Apply

---

## Step 4: Convert JSON Key to Base64

The service account JSON key must be stored as a base64-encoded string in GitHub Secrets:

```bash
# macOS / Linux
base64 -i service-account-key.json | tr -d '\n'

# Windows (PowerShell)
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("service-account-key.json"))
```

---

## Step 5: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret:

| Secret Name | Value |
|-------------|-------|
| `PLAY_SERVICE_ACCOUNT_JSON` | Base64-encoded service account JSON key |
| `PLAY_PACKAGE_NAME` | `com.jobblebaby.app` |

---

## Step 6: Test Locally

```bash
# Install dependencies
pip install google-api-python-client google-auth

# Set environment variable
export PLAY_SERVICE_ACCOUNT_JSON="$(base64 -i service-account-key.json | tr -d '\n')"

# Test upload (dry run - won't actually submit)
python3 scripts/play-console-upload.py --apk android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Troubleshooting

### "The caller does not have permission" error
- Ensure the service account has been granted access in Play Console → Settings → API Access
- Wait 1-2 hours after granting access for permissions to propagate

### "Invalid credentials" error
- Verify the JSON key is valid and not expired
- Ensure the service account email matches what's in Play Console

### "Package not found" error
- The app must first be created in Play Console manually
- Go to Play Console → All apps → Create app
- Then the API can be used to manage it

---

## Files in This Setup

- `scripts/play-console-upload.py` — Python script for uploading APKs
- `docs/PLAY_SETUP.md` — This guide

---

## Usage in CI/CD

The Play Console upload script can be added to GitHub Actions:

```yaml
- name: Upload to Play Console
  run: python3 scripts/play-console-upload.py --apk android/app/build/outputs/apk/release/app-release.apk --track internal --submit
  env:
    PLAY_SERVICE_ACCOUNT_JSON: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
```