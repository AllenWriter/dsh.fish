/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HubSection } from './HubSection.js'
import { type HubState } from './api.js'
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
    vi.useRealTimers()
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

  it('installs silently directly on Install button click and switches button to Uninstall', async () => {
    let installedList: Array<{ artifactId: string; kind: string; installedAt: string; packages: string[]; files: string[] }> = []

    stubFetch({
      'GET /state': () => ({
        body: {
          ...STATE,
          installed: installedList,
        },
      }),
      'GET /catalog': { body: { total: 1, items: [CARD] } },
      'POST /install': () => {
        installedList = [{
          artifactId: 'release-notes',
          kind: 'bundle',
          installedAt: new Date().toISOString(),
          packages: ['@acme/release-notes'],
          files: [],
        }]
        return {
          body: {
            artifactId: 'release-notes',
            steps: [{ summary: 'installed', applied: true }],
            restartRequired: false,
          },
        }
      },
    })
    render(<HubSection t={translate} />)

    const installBtn = await screen.findByRole('button', { name: 'Install' })
    expect(installBtn).toBeDefined()

    fireEvent.click(installBtn)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Uninstall' })).toBeDefined()
    })
  })

  it('opens readme preview modal when clicking on a card and fetches detail', async () => {
    stubFetch({
      'GET /state': { body: STATE },
      'GET /catalog': { body: { total: 1, items: [CARD] } },
      'GET /detail': {
        body: {
          ...CARD,
          readmeMarkdown: '# Release Notes Plugin\n\nThis is the documentation for release notes plugin.',
          readmeLocale: 'en',
          readmeMachineTranslated: false,
        },
      },
    })
    render(<HubSection t={translate} />)

    const card = await screen.findByRole('button', { name: 'Release notes' })
    fireEvent.click(card)

    expect(await screen.findByRole('dialog')).toBeDefined()
    expect(await screen.findByText('Release Notes Plugin')).toBeDefined()
    expect(await screen.findByText(/This is the documentation/)).toBeDefined()

    const closeBtn = screen.getByRole('button', { name: 'Close' })
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('renders user avatar and tooltip when signed in', async () => {
    const signedInState = {
      ...STATE,
      account: {
        signedIn: true,
        displayName: 'Alice Cooper',
        avatarUrl: 'https://example.com/avatar.png',
      },
    }

    stubFetch({
      'GET /state': { body: signedInState },
      'GET /catalog': { body: { total: 0, items: [] } },
    })

    render(<HubSection t={translate} />)

    screen.getByRole('tab', { name: 'Account' }).click()

    expect(await screen.findByText('Alice Cooper')).toBeDefined()
    expect(screen.getByText('Connected dsh.fish account')).toBeDefined()
    const avatar = screen.getByLabelText("Alice Cooper's avatar")
    expect(avatar).toBeDefined()

    // Hover avatar to trigger tooltip
    fireEvent.mouseEnter(avatar.parentElement!)
    expect(await screen.findByRole('tooltip')).toBeDefined()
    expect(screen.getByText(/Signed in as Alice Cooper/)).toBeDefined()
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

    const link = await screen.findByRole('link', { name: /Open the verification page/ })
    expect(link.getAttribute('href')).toBe('https://dsh.fish/device?user_code=WXYZ-1234')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(await screen.findByText(/WXYZ-1234/)).toBeDefined()
  })

  it('checks for plugin updates and shows update banner when available', async () => {
    stubFetch({
      'GET /state': { body: { ...STATE, version: '0.4.0' } },
      'GET /catalog': { body: { total: 0, items: [] } },
      'GET /check-update': {
        body: {
          currentVersion: '0.4.0',
          latestVersion: '0.5.0',
          hasUpdate: true,
        },
      },
      'POST /self-update': {
        body: {
          applied: true,
          restartRequired: true,
        },
      },
    })
    render(<HubSection t={translate} />)

    expect(await screen.findByText('v0.4.0')).toBeDefined()
    const checkBtn = screen.getByRole('button', { name: 'Check for updates' })
    fireEvent.click(checkBtn)

    expect(await screen.findByText(/New version: v0.5.0/)).toBeDefined()
    const upgradeBtn = screen.getByRole('button', { name: 'Update now' })
    fireEvent.click(upgradeBtn)

    expect(await screen.findByText('Updated successfully. Restart DSH to apply.')).toBeDefined()
  })

  it('replaces waiting with the host error when the token poll fails', async () => {
    let account: HubState['account'] = { signedIn: false }
    stubFetch({
      'GET /state': () => ({
        body: { ...STATE, account },
      }),
      'GET /catalog': { body: { total: 0, items: [] } },
      'POST /account/login': {
        body: {
          userCode: '43085132',
          verificationUrl: 'https://dsh.fish/device?user_code=43085132',
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
        },
      },
    })
    render(<HubSection t={translate} />)

    screen.getByRole('tab', { name: 'Account' }).click()
    ;(await screen.findByRole('button', { name: 'Sign in' })).click()
    expect(await screen.findByText(/Waiting for you to approve/)).toBeDefined()

    account = { signedIn: false, error: 'Device authorization failed.' }
    expect(
      await screen.findByText('Device authorization failed.', {}, { timeout: 4000 }),
    ).toBeDefined()
    expect(screen.queryByText(/Waiting for you to approve/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDefined()
  })
})

describe('dictionaries', () => {
  it('translates every key in both languages', () => {
    expect(Object.keys(dictionaries.zh).sort()).toEqual(Object.keys(dictionaries.en).sort())
  })
})
