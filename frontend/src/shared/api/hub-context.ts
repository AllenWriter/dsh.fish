import { createContext } from 'react-router'
import type { Container } from '@dsh-fish/backend/infrastructure/container.js'
import type { HubEnv } from '@dsh-fish/backend/infrastructure/config/env.js'

/**
 * Per-request server context.
 *
 * Loaders reach the application layer through this rather than through `fetch`
 * back into the same Worker: same-origin deployment means a server-rendered
 * page can call a use case directly, so an artifact page costs one D1 read
 * instead of a self-request plus a second container build.
 */
export const hubContext = createContext<{
  container: Container
  env: HubEnv
  ctx: ExecutionContext
}>()
