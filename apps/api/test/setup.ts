// Load the repo .env for local runs; CI provides env vars directly.
try {
  process.loadEnvFile(new URL('../../../.env', import.meta.url).pathname);
} catch {
  /* no .env file */
}
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
