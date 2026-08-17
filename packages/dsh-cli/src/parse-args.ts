export const DEFAULT_REGISTRY = 'https://dsh.fish'
export const DEFAULT_PROFILE = 'web'

export interface CliFlags {
  readonly registry: string
  readonly profile: string
  readonly json: boolean
  readonly yes: boolean
  readonly allowBuildScripts: boolean
  readonly kind?: string
  readonly help: boolean
  readonly version: boolean
}

export interface CliRequest {
  readonly command: string
  readonly positional: string[]
  readonly flags: CliFlags
}

const KINDS = new Set([
  'bundle',
  'profile',
  'skill',
  'mcp-server',
  'agent-preset',
  'hook-bridge',
])

/**
 * Parse `dsh-fish <command> [args…]` the way the skills CLI does: a small
 * flag set, no framework, so `--help` on a subcommand never runs the command.
 */
export function parseArgv(argv: string[]): CliRequest {
  const positional: string[] = []
  let registry = process.env['DSH_FISH_URL']?.replace(/\/+$/, '') || DEFAULT_REGISTRY
  let profile = process.env['DSH_PROFILE']?.trim() || DEFAULT_PROFILE
  let json = false
  let yes = false
  let allowBuildScripts = false
  let kind: string | undefined
  let help = false
  let version = false

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!
    if (token === '--help' || token === '-h') {
      help = true
      continue
    }
    if (token === '--version' || token === '-v') {
      version = true
      continue
    }
    if (token === '--json') {
      json = true
      continue
    }
    if (token === '--yes' || token === '-y') {
      yes = true
      continue
    }
    if (token === '--allow-build-scripts') {
      allowBuildScripts = true
      continue
    }
    if (token === '--registry') {
      registry = requireValue(argv, index, '--registry').replace(/\/+$/, '')
      index += 1
      continue
    }
    if (token === '--profile' || token === '-p') {
      profile = requireValue(argv, index, token)
      index += 1
      continue
    }
    if (token === '--kind' || token === '-k') {
      kind = requireValue(argv, index, token)
      if (!KINDS.has(kind)) {
        throw new UsageError(`Unknown kind "${kind}".`)
      }
      index += 1
      continue
    }
    if (token.startsWith('-')) {
      throw new UsageError(`Unknown option ${token}.`)
    }
    positional.push(token)
  }

  const command = positional[0] ?? ''
  return {
    command,
    positional: positional.slice(1),
    flags: {
      registry,
      profile,
      json,
      yes,
      allowBuildScripts,
      ...(kind === undefined ? {} : { kind }),
      help,
      version,
    },
  }
}

export class UsageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UsageError'
  }
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1]
  if (value === undefined || value.startsWith('-')) {
    throw new UsageError(`${flag} needs a value.`)
  }
  return value
}
