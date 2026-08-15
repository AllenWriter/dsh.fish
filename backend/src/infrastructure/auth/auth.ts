import { betterAuth } from 'better-auth'
import { bearer, deviceAuthorization } from 'better-auth/plugins'
import { withCloudflare } from 'better-auth-cloudflare'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { drizzle } from 'drizzle-orm/d1'
import type { D1Database, IncomingRequestCfProperties } from '@cloudflare/workers-types'
import * as schema from '../persistence/schema.js'
import type { HubEnv } from '../config/env.js'

/** The client id the `dsh-hub` plugin presents when it starts a device flow. */
export const HUB_CLI_CLIENT_ID = 'dsh-hub-plugin'

/** Path the device-approval page is served from. */
export const DEVICE_VERIFICATION_PATH = '/device'

/** Digits in a device user code. Shared with the approval page's code input. */
export const DEVICE_USER_CODE_LENGTH = 8

/**
 * Better Auth, composed for Cloudflare.
 *
 * The same factory serves two callers: the Worker at runtime (with real D1 and
 * KV bindings) and the Better Auth CLI at schema-generation time (with none).
 * Keeping it one function is what stops the generated migration from drifting
 * away from the configuration that actually runs.
 */
export function createAuth(env?: HubEnv, cf?: IncomingRequestCfProperties, baseURL?: string) {
  const db = env ? drizzle(env.DB, { schema }) : ({} as ReturnType<typeof drizzle>)

  return betterAuth({
    ...(baseURL === undefined ? {} : { baseURL }),
    ...withCloudflare(
      {
        autoDetectIpAddress: true,
        geolocationTracking: false,
        cf: cf ?? ({} as IncomingRequestCfProperties),
        d1: env ? { db, options: { usePlural: true } } : undefined,
        ...(env?.KV === undefined ? {} : { kv: env.KV }),
      },
      {
        emailAndPassword: { enabled: true, requireEmailVerification: false },
        socialProviders:
          env?.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
            ? {
                github: {
                  clientId: env.GITHUB_CLIENT_ID,
                  clientSecret: env.GITHUB_CLIENT_SECRET,
                },
              }
            : {},
        user: {
          additionalFields: {
            // Cached from the GitHub OAuth profile so ownership checks on a
            // submission do not need a live API call on every request.
            githubLogin: { type: 'string', required: false, input: false },
          },
        },
        plugins: [
          // The CLI half of the hub. A harness on a developer machine cannot
          // receive an OAuth redirect, so it asks for a short user code, the
          // human approves it in a browser already signed in, and the plugin
          // polls until it receives a token.
          deviceAuthorization({
            verificationUri: DEVICE_VERIFICATION_PATH,
            expiresIn: '15m',
            interval: '5s',
            validateClient: async (clientId) => clientId === HUB_CLI_CLIENT_ID,
            // Numeric so the approval page can use a one-time-code input and the
            // terminal can print something unambiguous — no O/0 or I/1 to
            // misread off a screen and retype.
            userCodeLength: DEVICE_USER_CODE_LENGTH,
            generateUserCode: () => {
              const digits = new Uint8Array(DEVICE_USER_CODE_LENGTH)
              crypto.getRandomValues(digits)
              return Array.from(digits, (byte) => String(byte % 10)).join('')
            },
          }),
          // Lets the plugin present its token as `Authorization: Bearer <token>`
          // on subsequent catalog calls instead of carrying a browser cookie.
          bearer(),
        ],
        rateLimit: {
          enabled: true,
          // KV's minimum TTL is 60s, so a shorter window cannot be enforced.
          window: 60,
          max: 120,
        },
      },
    ),
    // The CLI has no bindings; give it a bare adapter purely so it can read the
    // configured schema shape.
    ...(env
      ? {}
      : {
          database: drizzleAdapter({} as D1Database, {
            provider: 'sqlite',
            usePlural: true,
          }),
        }),
  })
}

/** Export consumed by `better-auth` CLI schema generation. */
export const auth = createAuth()

export type HubAuth = ReturnType<typeof createAuth>
