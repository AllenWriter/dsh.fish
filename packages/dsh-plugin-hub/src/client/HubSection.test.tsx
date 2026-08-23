/**
 * @vitest-environment jsdom
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HubSection } from './HubSection.js'
import { dictionaries, type HubLocaleKey } from './locale.js'

/** Renders English copy, and fails loudly on a key with no translation. */
function translate(key: HubLocaleKey, vars?: Record<string, string | number>): string {
  const template = dictionaries.en[key]
  if (template === undefined) throw new Error(`missing key: ${key}`)
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(vars?.[name] ?? ''))
}

interface Route {
  status?: number
  body: unknown
}

function stubFetch(routes: Record<string, Route | (() => Route)>): void {
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    const path = input.replace('/api/dsh-fish', '')
    const key = `${init?.method ?? 'GET'} ${path}`
    const match = routes[key] ?? routes[`${init?.method ?? 'GET'} ${path.split('?')[0]}`]
    if (match === undefined) throw new Error(`unstubbed request: ${key}`)
    const route = typeof match === 'function' ? match() : match
    const status = route.status ?? 200
    return {
      ok: status < 400,
      status,
      json: async () => route.body,
    } as Response
  })
}

const STATE = {
  profile: 'local-dsh',
  baseUrl: 'https://dsh.fish',
  account: { signedIn: false },
  installed: [],
}

const CARD = {
  id: 'release-notes',
  kind: 'bundle',
  displayName: 'Release notes',
  summary: 'Summarise a release.',
  verified: true,
  deprecated: false,
  installs: 12,
  sourceUrl: 'https://github.com/acme/release-notes',
}

describe('HubSection', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('names the profile it will write into, so a desktop install is not mistaken for web', async () => {
    stubFetch({ 'GET /state': { body: STATE }, 'GET /catalog': { body: { total: 0, items: [] } } })
    render(<HubSection t={translate} />)

    await waitFor(() => {
      expect(screen.getByText(/profile local-dsh/)).toBeDefined()
    })
    for (const label of ['Browse', 'Installed', 'Account']) {
      expect(screen.getByRole('tab', { name: label })).toBeDefined()
    }
  })

  it('shows the plan before installing, and refuses a build without consent', async () => {
    stubFetch({
      'GET /state': { body: STATE },
      'GET /catalog': { body: { total: 1, items: [CARD] } },
      'GET /plan': {
        body: {
          artifactId: 'release-notes',
          profile: 'local-dsh',
          commands: ['dsh plugin --profile local-dsh add github:acme/release-notes'],
          warnings: ['buildAllowance'],
          requiresBuildAllowance: true,
        },
      },
    })
    render(<HubSection t={translate} />)

    const plan = await screen.findByRole('button', { name: 'Show install plan' })
    plan.click()

    const commands = await screen.findByText(/dsh plugin --profile local-dsh add/)
    expect(commands).toBeDefined()
    // The install button changes meaning when a build is involved: the reader
    // has to press the one that says so.
    expect(screen.getByRole('button', { name: 'Allow build scripts and install' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Install' })).toBeNull()
  })

  it('offers the device verification URL as an external link, not an in-place navigation', async () => {
    stubFetch({
      'GET /state': { body: STATE },
      'GET /catalog': { body: { total: 0, items: [] } },
      'POST /account/login': {
        body: {
          userCode: 'WXYZ-1234',
          verificationUrl: 'https://dsh.fish/device?user_code=WXYZ-1234',
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
        },
      },
    })
    render(<HubSection t={translate} />)

    screen.getByRole('tab', { name: 'Account' }).click()
    const signIn = await screen.findByRole('button', { name: 'Sign in' })
    signIn.click()

    const link = await screen.findByRole('link', { name: 'Open the verification page' })
    expect(link.getAttribute('href')).toBe('https://dsh.fish/device?user_code=WXYZ-1234')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(await screen.findByText(/WXYZ-1234/)).toBeDefined()
  })
})

describe('dictionaries', () => {
  it('translates every key in both languages', () => {
    expect(Object.keys(dictionaries.zh).sort()).toEqual(Object.keys(dictionaries.en).sort())
  })
})
