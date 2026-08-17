import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { kitchenSinkReadme, KITCHEN_SINK_ARTIFACT_ID } from './lib/kitchen-sink-readme'
import { sqlString } from './lib/sql'

const root = process.cwd()
const frontend = resolve(root, 'frontend')

/**
 * Bring the local D1 catalogue to a known state and overwrite one GitHub-sourced
 * artifact's readme with the kitchen-sink document the mobile tests measure.
 *
 * Commands run in `frontend/` so they share wrangler's default persist directory
 * with `react-router dev` (`.wrangler/state` next to `wrangler.jsonc`).
 */
export default function globalSetup(): void {
  ensureDevVars()
  wrangler('d1 migrations apply dsh-fish-db --local')
  wrangler(`d1 execute dsh-fish-db --local --file ${resolve(root, 'backend/scripts/seed-local.sql')}`)

  const sqlPath = resolve(root, 'e2e/.generated-kitchen-sink.sql')
  writeFileSync(
    sqlPath,
    `UPDATE artifacts SET readme_markdown = ${sqlString(kitchenSinkReadme())} WHERE id = ${sqlString(KITCHEN_SINK_ARTIFACT_ID)};\n`,
  )
  wrangler(`d1 execute dsh-fish-db --local --file ${sqlPath}`)
}

function ensureDevVars(): void {
  const path = resolve(frontend, '.dev.vars')
  try {
    writeFileSync(
      path,
      [
        'PUBLIC_BASE_URL=http://localhost:5173',
        'BETTER_AUTH_SECRET=e2e-test-secret-not-for-production',
        '',
      ].join('\n'),
      { flag: 'wx' },
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
}

function wrangler(args: string): void {
  execSync(`pnpm exec wrangler ${args}`, { cwd: frontend, stdio: 'inherit' })
}
