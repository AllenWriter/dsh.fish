import { authClient } from './auth-client'

export type DeviceCodeStatus = 'pending' | 'approved' | 'denied'

export type ClaimDeviceCodeResult =
  | { readonly ok: true; readonly status: DeviceCodeStatus }
  | { readonly ok: false }

export type DecideDeviceCodeResult = { readonly ok: true } | { readonly ok: false }

/**
 * The browser half of Better Auth's device grant.
 *
 * `GET /api/auth/device` is not a lookup. While the reader is signed in it
 * binds the pending user code to this session; `POST /device/approve` and
 * `POST /device/deny` then refuse any code that session has not claimed
 * (`DEVICE_CODE_NOT_CLAIMED`).
 */
export interface DeviceGrantClient {
  claim(userCode: string): Promise<{
    data?: { status?: string } | null
    error?: unknown
  }>
  approve(userCode: string): Promise<{ error?: unknown }>
  deny(userCode: string): Promise<{ error?: unknown }>
}

const betterAuthDeviceGrant: DeviceGrantClient = {
  claim: (userCode) => authClient.device({ query: { user_code: userCode } }),
  approve: (userCode) => authClient.device.approve({ userCode }),
  deny: (userCode) => authClient.device.deny({ userCode }),
}

export async function claimDeviceCode(
  userCode: string,
  client: DeviceGrantClient = betterAuthDeviceGrant,
): Promise<ClaimDeviceCodeResult> {
  const result = await client.claim(userCode)
  if (result.error) return { ok: false }
  const status = result.data?.status
  if (status !== 'pending' && status !== 'approved' && status !== 'denied') {
    return { ok: false }
  }
  return { ok: true, status }
}

export async function decideDeviceCode(
  userCode: string,
  approve: boolean,
  client: DeviceGrantClient = betterAuthDeviceGrant,
): Promise<DecideDeviceCodeResult> {
  const result = approve ? await client.approve(userCode) : await client.deny(userCode)
  if (result.error) return { ok: false }
  return { ok: true }
}
