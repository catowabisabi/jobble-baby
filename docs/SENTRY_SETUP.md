# Sentry Crash Reporting Setup

## Overview
@sentry/react-native provides crash reporting and performance monitoring for Jobble Baby.

## Installation
`npm install @sentry/react-native --legacy-peer-deps`

## Configuration

### 1. App.tsx
Import and initialize Sentry at app entry point:
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  enableAutoPerformanceTracing: true,
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  reactNavigationV5Instrumentation: true,
});
```

Wrap App with Sentry.ReactNativeProfiler:
```typescript
export default Sentry.NativeProfiler(App);
```

### 2. Environment Variables
Add to eas.json or .env:
- `SENTRY_DSN`: DSN from sentry.io project settings

### 3. EAS Build Sourcemaps
Add to eas-build.yml:
```yaml
- name: Build iOS
  steps:
    - run: |
        eas build:inspect --platform ios --output ./build-results
      env:
        SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    - run: npx sentry-cli releases propose-sourcemaps
```

## GitHub Secrets Required
- `SENTRY_AUTH_TOKEN`: Auth token from sentry.io (settings → auth tokens)
- `SENTRY_ORG`: Organization slug
- `SENTRY_PROJECT`: Project name (com.jobblebaby.app)

## Verification
After setup, test by triggering a JS error — it should appear in Sentry dashboard within ~30 seconds for production builds.
