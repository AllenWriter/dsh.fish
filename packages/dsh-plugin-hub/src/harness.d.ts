/**
 * Ambient declarations for the harness modules this plugin binds to.
 *
 * These are `peerDependencies`: the harness supplies the real implementations
 * at runtime, and a plugin must bind to the host's copy rather than bundling
 * its own — two `dsh-tools` instances would mean two registries and the tools
 * would register into one the agent never reads.
 *
 * They are declared locally because the harness is in developer preview and
 * `@deepseek-ai/dsh-tools` is not yet installable standalone from npm (its own
 * `@deepseek-ai/dsh-type-meta` dependency is unpublished). Only the surface
 * this plugin actually uses is declared, so the shapes stay checkable; when the
 * upstream packages publish completely, delete this file and add them back as
 * devDependencies.
 */

declare module '@deepseek-ai/cordis' {
  export interface Logger {
    info?(message: string): void
    warn?(message: string): void
    error?(message: string): void
  }

  export interface ToolRegistry {
    register(definition: unknown): () => void
  }

  /** One HTTP route on the client's own origin. `prefix` also matches `path/*`. */
  export interface WebRoute {
    kind: 'exact' | 'prefix'
    path: string
    handler: (
      req: import('node:http').IncomingMessage,
      res: import('node:http').ServerResponse,
    ) => void | Promise<void>
  }

  export interface WebServer {
    register(route: WebRoute): () => void
  }

  export interface Context {
    tools: ToolRegistry
    /**
     * Only present in a composition that serves a browser client, which is why
     * it is reached through `ctx.inject` rather than this plugin's `inject`
     * list: a headless profile must still load the `hub_*` tools.
     */
    webServer: WebServer
    logger?: Logger
    get(key: string): unknown
    inject(services: readonly string[], callback: (ctx: Context) => void): void
    effect(setup: () => () => void, label?: string): () => void
  }
}

/**
 * The browser half's surface.
 *
 * The real slot and locale services are heavily generic over a composition-wide
 * slot map, which a standalone plugin cannot reconstruct; declared here is the
 * subset this section uses, typed against its own dictionary keys so a missing
 * translation is still a compile error.
 */
declare module '@deepseek-ai/dsh-client-runtime/client' {
  export type Translate<K extends string> = (
    key: K,
    vars?: Record<string, string | number>,
  ) => string

  export interface SlotRegistration {
    name: string
    id: string
    order?: number
    label?: () => string
    locale?: string
  }

  export interface SlotRegistry {
    inject(name: string, register: () => () => void): void
    register(options: SlotRegistration, component: unknown): () => void
  }

  export interface LocaleService {
    register(namespace: string, dictionaries: Record<string, Record<string, string>>): () => void
    bind<K extends string>(namespace: string): Translate<K>
  }

  export interface ClientContext {
    slots: SlotRegistry
    locale: LocaleService
    effect(setup: () => () => void, label?: string): () => void
  }
}

declare module '@deepseek-ai/dsh-client-locale/client' {}
declare module '@deepseek-ai/dsh-client-ui-settings/client' {}

declare module '@deepseek-ai/dsh-tools' {
  /** The execution view a tool body receives. */
  export interface ToolRunContext {
    readonly callId: string
    readonly name: string
    readonly signal: AbortSignal
  }

  export interface ContentPart {
    type: 'text'
    text: string
  }

  type ScalarSpec =
    | { type: 'string'; required?: boolean; description?: string; enum?: readonly string[] }
    | { type: 'number'; required?: boolean; description?: string }
    | { type: 'integer'; required?: boolean; description?: string }
    | { type: 'boolean'; required?: boolean; description?: string }

  export type ParameterSpec = Record<string, ScalarSpec>

  /** Maps the parameter DSL onto the argument object a body receives. */
  type ArgType<S> = S extends { type: 'string'; enum: readonly (infer E)[] }
    ? E
    : S extends { type: 'string' }
      ? string
      : S extends { type: 'number' | 'integer' }
        ? number
        : S extends { type: 'boolean' }
          ? boolean
          : never

  type InferArgs<P extends ParameterSpec> = {
    [K in keyof P as P[K] extends { required: true } ? K : never]: ArgType<P[K]>
  } & {
    [K in keyof P as P[K] extends { required: true } ? never : K]?: ArgType<P[K]>
  }

  export interface ToolDefinition<P extends ParameterSpec, R> {
    name: string
    description: string
    parameters: P
    output: {
      schema: { type: string }
      render: (args: InferArgs<P>, value: R) => ContentPart[]
    }
    timeoutMs?: number
    execute: (args: InferArgs<P>, exec: ToolRunContext) => Promise<R> | R
  }

  export function defineTool<P extends ParameterSpec, R>(
    definition: ToolDefinition<P, R>,
  ): ToolDefinition<P, R>
}
