import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { initWasm, Resvg } from '@resvg/resvg-wasm'

const require = createRequire(import.meta.url)
const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm')
await initWasm(readFileSync(wasmPath))

const d =
  'M232,156h-4V72a28,28,0,0,0-28-28H56A28,28,0,0,0,28,72v84H24a12,12,0,0,0-12,12v24a28,28,0,0,0,28,28H216a28,28,0,0,0,28-28V168A12,12,0,0,0,232,156ZM52,72a4,4,0,0,1,4-4H200a4,4,0,0,1,4,4v84H52ZM220,192a4,4,0,0,1-4,4H40a4,4,0,0,1-4-4V180H220ZM156,96a12,12,0,0,1-12,12H112a12,12,0,0,1,0-24h32A12,12,0,0,1,156,96Z'

function svgFor(size, radius = 56) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="${size}" height="${size}">
  <rect width="256" height="256" rx="${radius}" fill="#eef1f5"/>
  <g transform="translate(0 6)" fill="#1a1f27"><path d="${d}"/></g>
</svg>`
}

function write(path, size, radius) {
  const png = new Resvg(svgFor(size, radius), { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(path, png)
  console.log(path, png.length)
}

write('/workspace/laptop-avatar.png', 512, 56)
write('/workspace/dsh.fish/frontend/public/icons/laptop-brand.png', 512, 56)
write('/workspace/dsh.fish/frontend/public/favicon-96.png', 96, 48)
write('/workspace/dsh.fish/frontend/public/favicon-48.png', 48, 48)
write('/workspace/dsh.fish/frontend/public/favicon-32.png', 32, 48)
write('/workspace/dsh.fish/frontend/public/apple-touch-icon.png', 180, 48)
