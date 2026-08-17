import { defineConfig } from 'tsdown'

/**
 * Self-contained build.
 *
 * A git install of this package runs `prepare`, and the harness docs are clear
 * that such a build must not assume a sibling monorepo checkout — so this
 * config transpiles `src/` on its own, with no project references.
 */
export default defineConfig({
  entry: ['src/index.ts', 'src/install.ts'],
  outDir: 'lib',
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node20',
  external: [/^@deepseek-ai\//, /^node:/],
})
