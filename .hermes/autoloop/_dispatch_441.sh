#!/bin/bash
# Dispatch cycle 441 - Sentry crash reporting
cat > /tmp/task_390.txt << 'TASK'
# Sisyphus Task — Cycle 441
# Priority: P2
# Project: Jobble Baby

Add Sentry crash reporting and monitoring to the app.

Files to create/modify:
1. JobbleBaby/package.json: add @sentry/react-native as dev dependency (npm install --save-dev @sentry/react-native)
2. JobbleBaby/sentry.client.config.ts: create Sentry client config with dsn=SENTRY_DSN env var, tracesSampleRate=0.1, environment from Expo config
3. JobbleBaby/sentry.edge.config.ts: create Sentry edge config for expo-router edge runtime
4. JobbleBaby/app/_layout.tsx: import { Sentry.ErrorBoundary } from @sentry/react-native, wrap root layout with ErrorBoundary
5. JobbleBaby/app.json: add sentry plugin section (plugins: ['@sentry/expo'])
6. JobbleBaby/docs/SENTRY_SETUP.md: complete user-facing guide — how to create Sentry account, create project, get DSN, add SENTRY_DSN to eas.json as secret, tested in local dev with SENTRY_ENABLED=1
7. JobbleBaby/.github/workflows/ci.yml: add Sentry commit check step (optional — can skip for now)

Requirements:
- Use @sentry/react-native latest version compatible with Expo SDK 52
- DSN as environment variable SENTRY_DSN (placeholder: 'https://placeholder@o123456.ingest.sentry.io/1234567')
- Enable performance monitoring: tracesSampleRate=0.1
- Set environment: process.env.EXPO_PUBLIC_APP_ENV || 'development'
- App entry in app/_layout.tsx should have ErrorBoundary wrapper
- Run: cd JobbleBaby && npm install --save-dev @sentry/react-native
- TSC must pass: npx tsc --noEmit → 0 errors
- No hardcoded user-facing strings

After implementation:
- npm install in JobbleBaby dir
- TSC 0 errors
TASK

tmux send-keys -t jobble-baby "cat /tmp/task_390.txt | opencode run -m minimax-coding-plan/MiniMax-M2 --dir /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby -- --prompt" Enter
