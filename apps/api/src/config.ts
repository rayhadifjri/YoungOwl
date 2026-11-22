import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default('0.0.0.0'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  /**
   * Lab mode: loads deliberately vulnerable endpoints so this copy of Young Owl can be attacked
   * from Kali. Never turn it on for the copy that holds your real notes. See docs/lab-mode.md.
   */
  VULN_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  FLAG_DEBUG: z.string().default('YO{d3bug_3ndp01nts_l34k_s3cr3ts}'),
  FLAG_TRAVERSAL: z.string().default('YO{d0t_d0t_sl4sh_w4lks_0ut}'),
  FLAG_RCE: z.string().default('YO{p1ng_0f_d34th_sh3ll}'),
  /**
   * Attack monitor log path (shared, one-way volume). When set, the lab copy (VULN_MODE) classifies
   * suspicious requests and appends them here; the control center reads the same file (mounted
   * read-only) and shows them live. Empty = monitor disabled. See docs/lab-mode.md.
   */
  MONITOR_LOG: z.string().default(''),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    // Fail fast on bad config, without printing secret values.
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const config = parsed.data;
  if (config.VULN_MODE) {
    // Guard rail: lab mode only runs against a database whose name ends in "_lab",
    // so it can't be pointed at the database that holds real data by mistake.
    const dbName = new URL(config.DATABASE_URL).pathname.replace(/^\//, '');
    if (!dbName.endsWith('_lab')) {
      throw new Error(
        `VULN_MODE=true needs a lab database (name ending in "_lab"), got "${dbName}".`,
      );
    }
  }
  return config;
}
