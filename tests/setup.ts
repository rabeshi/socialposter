process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.AUTH_SECRET ??= "test-auth-secret-must-be-at-least-32-chars";
process.env.CRON_SECRET ??= "test-cron-secret-value";
process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/test";
process.env.DIRECT_URL ??= "postgresql://user:pass@localhost:5432/test";
process.env.TOKEN_ENCRYPTION_KEY ??= "test-token-encryption-key-32-chars!!";
process.env.SIMULATION_MODE ??= "true";
