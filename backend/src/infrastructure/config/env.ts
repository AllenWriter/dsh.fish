import type { D1Database, KVNamespace } from '@cloudflare/workers-types'

/**
 * The Worker's binding surface. One declaration shared by the API, the
 * scheduled crawler and the React Router server build.
 */
export interface HubEnv {
  /** D1 database holding both the catalog and Better Auth's own tables. */
  readonly DB: D1Database
  /** KV namespace used as Better Auth secondary storage and for rate limiting. */
  readonly KV: KVNamespace
  /** Absolute origin the site is served from, e.g. `https://dsh.fish`. */
  readonly PUBLIC_BASE_URL: string
  readonly BETTER_AUTH_SECRET: string
  readonly GITHUB_CLIENT_ID?: string
  readonly GITHUB_CLIENT_SECRET?: string
  /**
   * Token the crawler uses against the GitHub API. Read-only, public data only;
   * without it the crawler still runs but at the far lower anonymous rate limit.
   */
  readonly GITHUB_TOKEN?: string
  /** Comma-separated account emails granted administrator rights. */
  readonly ADMIN_EMAILS?: string
}

export interface HubConfig {
  readonly baseUrl: string
  readonly adminEmails: readonly string[]
  readonly githubToken?: string
}

export function readConfig(env: HubEnv): HubConfig {
  const baseUrl = (env.PUBLIC_BASE_URL ?? '').trim().replace(/\/+$/, '')
  if (baseUrl === '') {
    // Fail loud rather than defaulting: a wrong origin silently breaks OAuth
    // callbacks and cookie scoping, which is far harder to diagnose later.
    throw new Error('PUBLIC_BASE_URL is required.')
  }
  return {
    baseUrl,
    adminEmails: (env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry !== ''),
    ...(env.GITHUB_TOKEN === undefined ? {} : { githubToken: env.GITHUB_TOKEN }),
  }
}
