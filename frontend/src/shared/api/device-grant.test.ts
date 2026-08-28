import { describe, expect, it, vi } from 'vitest'
import {
  claimDeviceCode,
  decideDeviceCode,
  type DeviceGrantClient,
} from './device-grant'

function client(overrides: Partial<DeviceGrantClient> = {}): DeviceGrantClient {
  return {
    claim: vi.fn(async () => ({ data: { status: 'pending' } })),
    approve: vi.fn(async () => ({})),
    deny: vi.fn(async () => ({})),
    ...overrides,
  }
}

describe('claimDeviceCode', () => {
  it('binds the user code to this session via GET /device', async () => {
    const grant = client()
    await expect(claimDeviceCode('22504919', grant)).resolves.toEqual({
      ok: true,
      status: 'pending',
    })
    expect(grant.claim).toHaveBeenCalledWith('22504919')
  })

  it('fails when Better Auth rejects the code', async () => {
    const grant = client({
      claim: vi.fn(async () => ({
        error: { error: 'invalid_request', error_description: 'Invalid user code' },
      })),
    })
    await expect(claimDeviceCode('00000000', grant)).resolves.toEqual({ ok: false })
  })

  it('fails when the response has no status, so approve is never offered for a void claim', async () => {
    const grant = client({ claim: vi.fn(async () => ({ data: {} })) })
    await expect(claimDeviceCode('22504919', grant)).resolves.toEqual({ ok: false })
  })
})

describe('decideDeviceCode', () => {
  it('approves only after a separate claim; this helper never claims', async () => {
    const grant = client()
    await expect(decideDeviceCode('22504919', true, grant)).resolves.toEqual({ ok: true })
    expect(grant.approve).toHaveBeenCalledWith('22504919')
    expect(grant.claim).not.toHaveBeenCalled()
    expect(grant.deny).not.toHaveBeenCalled()
  })

  it('denies the claimed code', async () => {
    const grant = client()
    await expect(decideDeviceCode('22504919', false, grant)).resolves.toEqual({ ok: true })
    expect(grant.deny).toHaveBeenCalledWith('22504919')
    expect(grant.approve).not.toHaveBeenCalled()
  })

  it('fails when Better Auth has not bound the code to this session', async () => {
    const grant = client({
      approve: vi.fn(async () => ({
        error: {
          error: 'invalid_request',
          error_description:
            'Device code has not been claimed by a verifying session; call `GET /device` with the `user_code` while signed in before approving or denying',
        },
      })),
    })
    await expect(decideDeviceCode('22504919', true, grant)).resolves.toEqual({ ok: false })
  })
})
