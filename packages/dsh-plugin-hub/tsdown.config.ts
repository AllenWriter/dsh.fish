import { defineConfig } from 'tsdown'

/**
 * Self-contained build.
 *
 * A git install of this package runs `prepare`, and the harness docs are clear
 * that such a build must not assume a sibling monorepo checkout — so this
 * config transpiles `src/` on its own, with no project references.
 */
export default defineConfig({
  // Named so the two `index` entries do not collide, and so the client half
  // lands on the `lib/client.js` path `dsh.client` resolves.
  entry: {
    index: 'src/index.ts',
    install: 'src/install.ts',
    client: 'src/client/index.tsx',
  },
  outDir: 'lib',
  format: ['esm'],
  dts: { emitDtsOnly: false },
  clean: true,
  target: 'node20',
  // React and the client packages come from the harness client bundle: a
  // second React in this chunk would be a second renderer.
  external: [/^@deepseek-ai\//, /^node:/, /^react(\/|$)/],
})
