import { cloudflare } from '@cloudflare/vite-plugin'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    // Runs dev and preview inside workerd, so local behavior matches production
    // bindings rather than a Node emulation of them.
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
})
