/**
 * Where the end-to-end dev server listens.
 *
 * One definition, because three places need it and they must agree: the
 * Playwright config (base URL and readiness probe), the dev server it starts,
 * and any suite that has to name the origin before it has navigated — setting
 * a cookie, for instance, which cannot be done relative to `about:blank`.
 */
export const E2E_PORT = process.env.E2E_PORT ?? '5173'

export const E2E_ORIGIN = `http://localhost:${E2E_PORT}`
