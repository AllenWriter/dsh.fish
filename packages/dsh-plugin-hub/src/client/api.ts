/**
 * The browser half's only way to reach the hub.
 *
 * Every call is same-origin against the host routes: catalog reads are proxied
 * so a WebView restricted to loopback can still browse, and writes go to the
 * host because that is where the installer and the account token live.
 */

const API = '/api/dsh-fish'

export interface AccountState {
  signedIn: boolean
  displayName?: string
  avatarUrl?: string | null
  pendingUserCode?: string
  pendingVerificationUrl?: string
  error?: string
}

export interface InstalledItem {
  artifactId: string
  kind: string
  installedAt: string
  packages: string[]
  files: string[]
}

export interface HubState {
  profile: string
  baseUrl: string
  account: AccountState
  installed: InstalledItem[]
}

export interface CatalogItem {
  id: string
  kind: string
  displayName: string
  summary: string
  verified: boolean
  deprecated: boolean
  installs: number
  sourceUrl: string
  author?: { name: string; url?: string }
  license?: string
}

export interface ArtifactDetail extends CatalogItem {
  readmeMarkdown?: string
  readmeLocale?: string
  readmeMachineTranslated?: boolean
  sourceDocBase?: string
  sourceAssetBase?: string
  availableLocales?: readonly string[]
  publishedAt?: string
}

export interface InstallPlanPreview {
  artifactId: string
  profile: string
  commands: string[]
  warnings: string[]
  requiresBuildAllowance: boolean
}

export interface WriteOutcome {
  artifactId: string
  steps: { summary: string; applied: boolean }[]
  restartRequired: boolean
  credentialsNeeded?: string[]
}

export interface DeviceLogin {
  userCode: string
  verificationUrl: string
  expiresAt: string
}

/** Carries the host's failure code so the UI can react to a refusal by name. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function request<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const value = (await response.json()) as T & { error?: string; code?: string }
  if (!response.ok) throw new ApiError(value.error ?? `HTTP ${response.status}`, value.code)
  return value
}

export function catalogQuery(query: string, kind: string, locale?: string): string {
  const params = new URLSearchParams()
  if (query.trim() !== '') params.set('q', query.trim())
  if (kind !== '') params.set('kind', kind)
  if (locale !== undefined && locale.trim() !== '') params.set('locale', locale.trim())
  const suffix = params.toString()
  return suffix === '' ? '/catalog' : `/catalog?${suffix}`
}

export function detailQuery(artifactId: string, locale?: string): string {
  const params = new URLSearchParams({ artifactId })
  if (locale !== undefined && locale.trim() !== '') params.set('locale', locale.trim())
  return `/detail?${params.toString()}`
}
