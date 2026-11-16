import 'server-only';
import { z } from 'zod';

const schema = z.object({
  MASTER_CLIENT_ID: z.coerce
    .number({ error: 'MASTER_CLIENT_ID must be the numeric client id this portal serves.' })
    .int()
    .positive('MASTER_CLIENT_ID must be the numeric client id this portal serves.'),
  REMOTE_API_BASE_URL: z.url().default('http://172.198.160.73/clients/api/'),
  REMOTE_API_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
  BBPS_BILLERS_URL: z.string().default(''),
  BBPS_FETCH_BILL_URL: z.string().default(''),
  BBPS_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  PG_REDIRECT_BASE_URL: z.string().default(''),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters.'),
  APP_TIMEZONE: z.string().default('Asia/Kolkata'),
  STORAGE_PATH: z.string().default('./.data'),
  /** DEMO_MODE=true answers every remote call from built-in sample data (see server/demo). Never for production. */
  DEMO_MODE: z.string().default('').transform((v) => /^(1|true|yes)$/i.test(v.trim())),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

/**
 * Server configuration, read and checked once on first use rather than at import, so
 * `next build` does not need production secrets. A missing or malformed variable fails
 * loudly with every problem listed, instead of surfacing later as a confusing upstream error.
 */
export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid server environment — check .env.local:\n${problems}`);
  }
  if (parsed.data.DEMO_MODE) {
    console.warn('[demo] DEMO_MODE is ON — the remote payments API is NOT used; all data is built-in sample data. Do not run this in production.');
  }
  cached = {
    ...parsed.data,
    BBPS_BILLERS_URL: parsed.data.BBPS_BILLERS_URL || (parsed.data.DEMO_MODE ? 'demo://billers' : ''),
    BBPS_FETCH_BILL_URL: parsed.data.BBPS_FETCH_BILL_URL || (parsed.data.DEMO_MODE ? 'demo://fetch-bill' : ''),
    REMOTE_API_BASE_URL: parsed.data.REMOTE_API_BASE_URL.replace(/\/?$/, '/'),
    PG_REDIRECT_BASE_URL: parsed.data.PG_REDIRECT_BASE_URL.trim().replace(/\/+$/, ''),
  };
  return cached;
}

/**
 * The one tenant this portal serves on the shared remote API. It is fixed here and never
 * taken from the browser: the remote hosts other businesses behind the same endpoints, so
 * a client id from a request would let a caller read or write another tenant's data.
 */
export const masterClientId = () => env().MASTER_CLIENT_ID;
