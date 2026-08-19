import { describe, expect, it } from 'vitest'
import { COMMUNITY_COOKIE, COMMUNITY_TOAST_IDS, readDismissedToasts } from './dismissal'

describe('readDismissedToasts', () => {
  it('finds nothing when the reader has dismissed nothing', () => {
    expect(readDismissedToasts(null)).toEqual([])
    expect(readDismissedToasts('theme=dark')).toEqual([])
  })

  it('reads the cookie out of a header that carries others too', () => {
    expect(readDismissedToasts(`theme=dark; ${COMMUNITY_COOKIE}=discord.x; other=1`)).toEqual([
      'discord',
      'x',
    ])
  })

  it('reads every id the widget can write', () => {
    const header = `${COMMUNITY_COOKIE}=${COMMUNITY_TOAST_IDS.join('.')}`
    expect(readDismissedToasts(header)).toEqual([...COMMUNITY_TOAST_IDS])
  })

  it('drops an id this build no longer knows, rather than carrying a dead one', () => {
    expect(readDismissedToasts(`${COMMUNITY_COOKIE}=discord.newsletter`)).toEqual(['discord'])
  })

  // The separator is what makes reading unable to fail: no id may contain it,
  // and none may contain a character a cookie value cannot hold either.
  it('uses ids that survive a cookie value intact', () => {
    for (const id of COMMUNITY_TOAST_IDS) {
      expect(id, `${id} must not contain the separator`).not.toContain('.')
      expect(id, `${id} must be a bare cookie-safe token`).toMatch(/^[a-z]+$/)
    }
  })

  it('ignores a cookie whose name merely ends in the same word', () => {
    expect(readDismissedToasts(`not-${COMMUNITY_COOKIE}=discord`)).toEqual([])
  })
})
