import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'https://placeholder@o123456.ingest.sentry.io/1234567',
  environment: process.env.EXPO_PUBLIC_APP_ENV || 'development',
  tracesSampleRate: 0.1,
});
