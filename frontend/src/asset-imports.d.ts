/**
 * Asset imports only the Worker build can express.
 *
 * `?inline` turns a binary file into a base64 data URI at build time — how the
 * OG renderer ships its fonts and brand mark without a filesystem — and the
 * Cloudflare Vite plugin hands a `.wasm` file to the Worker as an already
 * compiled module. Neither has a static type on its own, so both are declared
 * here.
 */
declare module '*.ttf?inline' {
  const dataUri: string
  export default dataUri
}

declare module '*.png?inline' {
  const dataUri: string
  export default dataUri
}

declare module '*.wasm' {
  const module: WebAssembly.Module
  export default module
}
