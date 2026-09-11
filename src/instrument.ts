// Sentry has to initialize BEFORE any other import that it might want to
// patch — that means dotenv (so SENTRY_DSN is loaded), then Sentry.init,
// then everything else. `main.ts` imports this file as its very first
// statement, so anything else in the app runs with the SDK already
// installed.
import { config } from 'dotenv';
config({ path: '.env.local' });

import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Trace 10% of transactions in prod (perf overhead is minimal at
    // that rate); trace everything in dev so localhost errors show up.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Profiling is opt-in per transaction; using 10% keeps overhead
    // negligible and quota manageable on Sentry's free tier.
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.0,
    integrations: [nodeProfilingIntegration()],
    // Never report the local dev noise (unhandled rejections during
    // watch-mode reloads, etc.) unless a DSN was explicitly set.
    enabled: true,
  });
}
