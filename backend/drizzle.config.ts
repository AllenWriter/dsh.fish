import { defineConfig } from 'drizzle-kit'

/**
 * Migrations are generated here and applied by wrangler against D1, so the
 * output directory is what `wrangler.jsonc` points its `migrations_dir` at.
 */
export default defineConfig({
  schema: './src/infrastructure/persistence/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
})
