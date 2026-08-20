import { cloudflare } from '@cloudflare/vite-plugin'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { fumadocsMdx } from 'fumadocs-mdx/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    // Compile MDX at build time so the Worker never `eval`s or reads the
    // content directory at runtime. Must run before the React Router plugin
    // so `defineDocs` in page modules is rewritten to static imports.
    fumadocsMdx({
      macro: {
        include: ['src/pages/docs/**/*.ts', 'src/pages/docs/**/*.tsx'],
      },
      // Build-time Shiki would bake GitHub light/dark token spans into every
      // fence. The catalog readme is plain mono on `--card`; product docs
      // match that. Highlighting at runtime is forbidden on the Worker.
      globalOptions: {
        mdxOptions: {
          rehypeCodeOptions: false,
          remarkCodeTabOptions: false,
        },
      },
    }),
    // Runs dev and preview inside workerd, so local behavior matches production
    // bindings rather than a Node emulation of them.
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
})
