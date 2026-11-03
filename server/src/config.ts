import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const logLevels = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;

/** The built client, as `npm run build` leaves it. The same path works from src/ and from dist/. */
const defaultClientDir = fileURLToPath(
  new URL('../../client/dist', import.meta.url),
);

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(logLevels).default('info'),
  TRUSTED_PROXY_COUNT: z.coerce.number().int().min(0).default(0),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  CLIENT_DIR: z.string().default(defaultClientDir),
});

export interface Config {
  port: number;
  logLevel: (typeof logLevels)[number];
  /** How many proxies sit in front of the server. 0 means none. */
  trustedProxyCount: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  /** Where the built client is. The server skips it if it is missing, as in development. */
  clientDir: string;
}

export class ConfigError extends Error {}

/**
 * Reads the settings from the environment once. A setting that is unset or empty
 * takes its default. A bad value throws a ConfigError that names the setting.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const set = Object.fromEntries(
    Object.entries(env).filter(
      ([, value]) => value !== undefined && value !== '',
    ),
  );
  const result = envSchema.safeParse(set);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new ConfigError(`Invalid configuration. ${problems}`);
  }
  const value = result.data;
  return {
    port: value.PORT,
    logLevel: value.LOG_LEVEL,
    trustedProxyCount: value.TRUSTED_PROXY_COUNT,
    rateLimitWindowMs: value.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: value.RATE_LIMIT_MAX,
    clientDir: resolve(value.CLIENT_DIR),
  };
}
