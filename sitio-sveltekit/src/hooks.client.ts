import { handleErrorWithSentry, replayIntegration } from "@sentry/sveltekit";
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: 'https://2b0f8d068605d79a5cdb9e3f5ac0af06@o4508549255266304.ingest.us.sentry.io/4508570755465216',

  tracesSampleRate: 1.0,


});

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();
