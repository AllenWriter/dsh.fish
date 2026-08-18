/**
 * Vitest runs on Vite, which serves any file as a string with the `?raw`
 * suffix. The backend tsconfig types against Workers only, so the `vite/client`
 * ambient declaration is not available; this is the one suffix the tests use.
 */
declare module '*.sql?raw' {
  const content: string
  export default content
}
