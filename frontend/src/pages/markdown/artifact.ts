import { translate, localizedPath, type Locale } from '@/shared/config/i18n'
import {
  kindLabelKey,
  type ArtifactDetail,
  type InstallPlanDto,
} from '@/entities/artifact/model/types'
import { artifactLd } from '@/entities/artifact/lib/artifact-ld'

/**
 * The markdown variant of a plugin page.
 *
 * Layout follows the Markdown-for-Agents contract: YAML frontmatter from the
 * page's meta, the content body, then the page's JSON-LD as a fenced block.
 * The body is the locale-selected README Markdown from the catalog — either a
 * current generated translation or the untouched upstream source while that
 * translation is unavailable.
 */
export function artifactMarkdown(
  origin: string,
  locale: Locale,
  artifact: ArtifactDetail,
  plan: InstallPlanDto,
): string {
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(locale, key, params)

  const lines: string[] = [
    '---',
    `title: ${artifact.displayName}`,
    `description: ${oneLine(artifact.summary)}`,
    `image: ${origin}/a/${artifact.id}/og.png`,
    '---',
    '',
    `# ${artifact.displayName}`,
    '',
    artifact.summary,
    '',
    `- **${t('browse.kind')}:** ${t(kindLabelKey(artifact.kind))}`,
  ]

  if (artifact.author) {
    const author = artifact.author.url
      ? `[${artifact.author.name}](${artifact.author.url})`
      : artifact.author.name
    lines.push(`- **${t('artifact.author')}:** ${author}`)
  }
  lines.push(`- **${t('artifact.source')}:** ${artifact.sourceUrl}`)
  if (artifact.license) lines.push(`- **${t('artifact.license')}:** ${artifact.license}`)
  if (artifact.stats.stars > 0) lines.push(`- **${t('artifact.stars')}:** ${artifact.stats.stars}`)
  if (artifact.stats.downloads > 0)
    lines.push(`- **${t('artifact.downloads')}:** ${artifact.stats.downloads}`)
  lines.push(
    `- **${t('artifact.score')}:** ${artifact.score} (${artifact.grade})`,
    `- **${t('artifact.maintenanceLabel')}:** ${t(`artifact.maintenance.${artifact.maintenanceStatus}`)}`,
  )
  if (artifact.verified) lines.push(`- **${t('artifact.verified')}** ✓`)
  if (artifact.sourceCommitUrl && artifact.sourceCommitSha) {
    lines.push(
      `- **${t('artifact.indexedCommit')}:** [${artifact.sourceCommitSha.slice(0, 7)}](${artifact.sourceCommitUrl})`,
    )
  }
  lines.push(`- **${t('artifact.updated')}:** ${artifact.updatedAt}`)

  lines.push(
    '',
    `## ${t('install.title')}`,
    '',
    '```sh',
    `npx @dsh-fish/cli add ${artifact.id}`,
    '```',
  )
  for (const command of plan.manualCommands) {
    lines.push('', '```sh', command, '```')
  }

  if (artifact.readmeMarkdown !== undefined && artifact.readmeMarkdown.trim() !== '') {
    lines.push('', `## ${t('artifact.readme')}`)
    if (artifact.readmeMachineTranslated) {
      lines.push('', `_${t('artifact.readmeMachineTranslated')}_`)
    }
    lines.push('', artifact.readmeMarkdown.trim())
  }

  lines.push(
    '',
    '```json',
    JSON.stringify(artifactLd(origin, locale, artifact, plan.manualCommands), null, 2),
    '```',
    '',
  )

  return lines.join('\n')
}

/** One listing entry: the name links to the plugin page, the summary follows. */
export function listingItemMarkdown(
  origin: string,
  locale: Locale,
  item: { id: string; displayName: string; summary: string },
): string {
  const url = `${origin}${localizedPath(locale, `/a/${item.id}`)}`
  return `- [${item.displayName}](${url}) — ${oneLine(item.summary)}`
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
