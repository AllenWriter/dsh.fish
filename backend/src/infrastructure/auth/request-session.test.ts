import { describe, expect, it } from 'vitest'
import { bearerCredential, sessionTokenFromCredential } from './request-session.js'

describe('bearerCredential', () => {
  it('reads a Bearer token and ignores other schemes', () => {
    expect(bearerCredential('Bearer abc')).toBe('abc')
    expect(bearerCredential('bearer abc')).toBe('abc')
    expect(bearerCredential('Basic abc')).toBeUndefined()
    expect(bearerCredential('Bearer ')).toBeUndefined()
    expect(bearerCredential(null)).toBeUndefined()
  })
})

describe('sessionTokenFromCredential', () => {
  it('uses the raw device-grant access_token as the session key', () => {
    expect(sessionTokenFromCredential('plain-session-token')).toBe('plain-session-token')
  })

  it('strips the HMAC suffix from a signed cookie-shaped bearer value', () => {
    expect(sessionTokenFromCredential('session.hmac-suffix')).toBe('session')
  })
})
