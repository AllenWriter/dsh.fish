import { defineConfig } from 'tsdown'

/**
 * Bundle the installer from `dsh-hub/install` (the plugin's built export).
 * The plugin package must be built first; the workspace `prepare` order
 * builds `dsh-hub` before this package.
 */
export default defineConfig({
  entry: ['src/cli.ts'],
  outDir: 'lib',
  format: ['esm'],
  dts: false,
  clean: true,
  target: 'node20',
  deps: {
    alwaysBundle: ['dsh-hub'],
  },
})
