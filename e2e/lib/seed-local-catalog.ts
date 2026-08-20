import { writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { kitchenSinkReadme, KITCHEN_SINK_ARTIFACT_ID } from './kitchen-sink-readme.ts'
import { sqlString } from './sql.ts'

/**
 * Apply catalogue migrations and the kitchen-sink readme to the local D1 that
 * the Vite Cloudflare plugin is already persisting. Must run *after* the
 * dev server has created that SQLite file — wrangler CLI and Vite share
 * `.wrangler/state/v3/d1`, but Vite will mint an empty Durable Object on
 * first boot if the file is not yet there.
 */
export function seedLocalCatalog(root: string): void {
  const frontend = resolve(root, 'frontend')
  ensureDevVars(frontend)

  wrangler(frontend, 'd1 migrations apply dsh-fish-db --local')

  const combined = [
    readFileSync(resolve(root, 'backend/scripts/seed-local.sql'), 'utf8'),
    `UPDATE artifacts SET readme_markdown = ${sqlString(kitchenSinkReadme())} WHERE id = ${sqlString(KITCHEN_SINK_ARTIFACT_ID)};`,
    '',
  ].join('\n')
  const sqlPath = resolve(root, 'e2e/.generated-kitchen-sink.sql')
  writeFileSync(sqlPath, combined)
  wrangler(frontend, `d1 execute dsh-fish-db --local --file ${sqlPath}`)
}

/**
 * Write local Worker vars the e2e server must see at boot — notably
 * `ARTIFACT_ASK_ENABLED=true`. Call this *before* spawning Vite; Wrangler
 * reads `.dev.vars` once when the isolate starts.
 */
export function prepareE2eDevVars(root: string): void {
  ensureDevVars(resolve(root, 'frontend'))
}

function ensureDevVars(frontend: string): void {
  const path = resolve(frontend, '.dev.vars')
  const required: Record<string, string> = {
    PUBLIC_BASE_URL: 'http://localhost:5173',
    BETTER_AUTH_SECRET: 'e2e-test-secret-not-for-production',
    ARTIFACT_ASK_ENABLED: 'true',
  }
  let existing = ''
  try {
    existing = readFileSync(path, 'utf8')
  } catch {
    writeFileSync(path, Object.entries(required).map(([key, value]) => `${key}=${value}`).join('\n') + '\n')
    return
  }
  let next = existing
  for (const [key, value] of Object.entries(required)) {
    const line = `${key}=${value}`
    const pattern = new RegExp(`^${key}=.*$`, 'm')
    if (pattern.test(next)) {
      // Ask must be on for the artifact-ask Playwright project; other keys
      // keep whatever the developer already set.
      if (key === 'ARTIFACT_ASK_ENABLED') next = next.replace(pattern, line)
      continue
    }
    next = `${next.replace(/\s*$/, '\n')}${line}\n`
  }
  if (next !== existing) writeFileSync(path, next)
}

function wrangler(frontend: string, args: string): void {
  execSync(`pnpm exec wrangler ${args}`, {
    cwd: frontend,
    stdio: 'inherit',
    env: { ...process.env, CI: '1' },
  })
}
