import { mkdir, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { access } from 'node:fs/promises'

export interface InitResult {
  readonly skillName: string
  readonly skillFile: string
  readonly created: boolean
}

/**
 * Write a `SKILL.md` the hub indexer will accept: YAML frontmatter with `name`
 * and `description`, which is the same shape `npx skills init` produces.
 */
export async function initSkill(cwd: string, name: string | undefined): Promise<InitResult> {
  const skillName = name ?? basename(cwd)
  const skillDir = name === undefined ? cwd : join(cwd, skillName)
  const skillFile = join(skillDir, 'SKILL.md')

  try {
    await access(skillFile)
    return { skillName, skillFile, created: false }
  } catch {
    // Missing is the expected case.
  }

  if (name !== undefined) await mkdir(skillDir, { recursive: true })

  const body = `---
name: ${skillName}
description: What this skill does and when to use it
---

# ${skillName}

Instructions for the agent to follow when this skill is activated.

## When to use

Describe the scenarios where this skill should be used.

## Instructions

1. First step
2. Second step
`
  await writeFile(skillFile, body, 'utf8')
  return { skillName, skillFile, created: true }
}
