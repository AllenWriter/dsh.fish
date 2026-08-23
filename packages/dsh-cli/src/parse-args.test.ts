import { afterEach, describe, expect, it } from 'vitest'
import { parseArgv, UsageError } from './parse-args.js'

describe('parseArgv', () => {
  afterEach(() => {
    delete process.env['DSH_PROFILE']
  })

  it('reads the command, ids and install flags', () => {
    const request = parseArgv([
      'add',
      'release-notes',
      '--profile',
      'headless',
      '--allow-build-scripts',
      '--json',
    ])
    expect(request.command).toBe('add')
    expect(request.positional).toEqual(['release-notes'])
    expect(request.flags).toMatchObject({
      profile: 'headless',
      allowBuildScripts: true,
      json: true,
    })
  })

  it('falls back to $DSH_PROFILE, which is what a desktop harness exports', () => {
    process.env['DSH_PROFILE'] = 'local-dsh'
    expect(parseArgv(['list']).flags.profile).toBe('local-dsh')
  })

  it('lets an explicit --profile win over the environment', () => {
    process.env['DSH_PROFILE'] = 'local-dsh'
    expect(parseArgv(['list', '--profile', 'web']).flags.profile).toBe('web')
  })

  it('treats subcommand --help as help, not as an unknown command argument', () => {
    const request = parseArgv(['update', '--help'])
    expect(request.command).toBe('update')
    expect(request.flags.help).toBe(true)
  })

  it('rejects an unknown kind rather than sending it to the API', () => {
    expect(() => parseArgv(['find', 'x', '--kind', 'widget'])).toThrow(UsageError)
  })
})
