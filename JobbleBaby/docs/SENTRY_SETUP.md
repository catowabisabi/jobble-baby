# Sentry Setup Guide

This guide walks through setting up Sentry for crash reporting and performance monitoring in Jobble Baby.

## Prerequisites

- Sentry account at https://sentry.io
- Expo SDK 56
- Node.js 18+

## Step 1: Create Sentry Account and Project

1. Go to https://sentry.io and sign up for a free account
2. After signing in, click "Projects" in the sidebar
3. Click "Create Project" button
4. Select "React Native" as the platform
5. Name your project (e.g., "jobble-baby")
6. Copy the DSN URL from the project settings - it will look like:
   ```
   https://abc123@o123456.ingest.sentry.io/7890123
   ```

## Step 2: Add SENTRY_DSN Secret to EAS

Add your Sentry DSN as an EAS secret:

```bash
eas secret:create --name SENTRY_DSN --value "https://your-dsn-here@o123456.ingest.sentry.io/1234567" --scope production
```

For development builds, you can also set it locally via environment variable:

```bash
export EXPO_PUBLIC_SENTRY_DSN="https://your-dsn-here@o123456.ingest.sentry.io/1234567"
```

## Step 3: Install Required Packages

The required packages are already installed:

- `@sentry/react-native` - Core Sentry SDK
- `@sentry/expo` - Expo integration plugin

If you need to reinstall:

```bash
npm install @sentry/react-native @sentry/expo
```

## Step 4: Verify Configuration

The following files are configured for Sentry:

- `sentry.client.config.ts` - Client-side Sentry configuration
- `sentry.edge.config.ts` - Edge runtime configuration
- `app/_layout.tsx` - ErrorBoundary wrapper around the app
- `app.json` - Sentry Expo plugin configuration
- `eas.json` - Environment variables for builds

## Testing in Local Development

To test Sentry in local development:

1. Set the environment variable:
   ```bash
   export EXPO_PUBLIC_SENTRY_DSN="https://your-dsn-here@o123456.ingest.sentry.io/1234567"
   export SENTRY_ENABLED=1
   ```

2. Start the development server:
   ```bash
   npx expo start
   ```

3. The Sentry SDK will initialize in development mode with `environment: 'development'`

## Viewing Errors

1. Go to your Sentry dashboard at https://sentry.io
2. Select your project ("jobble-baby")
3. View the "Issues" tab for crash reports
4. View the "Performance" tab for traces and performance metrics

## Configuration Options

The following environment variables control Sentry behavior:

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN URL | Placeholder DSN |
| `EXPO_PUBLIC_APP_ENV` | Environment name | `development` or `production` |
| `SENTRY_ENABLED` | Enable/disable Sentry | Auto-detected |

## Troubleshooting

### No errors appearing

- Verify the DSN is correct and matches your Sentry project
- Check that `EXPO_PUBLIC_SENTRY_DSN` is set in your environment
- Check the browser console for Sentry initialization messages

### Build errors

- Ensure `@sentry/react-native` and `@sentry/expo` are in package.json
- Run `npx expo install --fix` to ensure dependencies are compatible
- Clear metro cache: `npx expo start --clear`

### TypeScript errors

- Run `npx tsc --noEmit` to check for type errors
- Ensure TypeScript is version 5.0+
