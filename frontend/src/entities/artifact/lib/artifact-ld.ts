import { localeDefinition, translate, type Locale } from '@/shared/config/i18n'
import { SCHEMA, absoluteUrl, clampDescription, interactionLd, type Ld } from '@/shared/lib/seo'
import { kindLabelKey } from '../model/types'
import type { ArtifactDetail } from '../model/types'

/**
 * One indexed plugin, as structured data.
 *
 * `SoftwareApplication` rather than `SoftwareSourceCode`: what the page offers
 * is an installable thing with a runtime and an install command, and the
 * repository it was read from is carried as `codeRepository` on the same node.
 *
 * It lives with the entity rather than in `shared/lib/seo` because it is the
 * one structured-data node that has to know what an artifact is — its kind, its
 * source, the counters the crawler measured.
 *
 * Every field is something the indexer actually read. Deliberately absent:
 * `offers` and `aggregateRating`. Both would unlock a richer result, and both
 * would be a claim this registry has no data for.
 */
export function artifactLd(
  origin: string,
  locale: Locale,
  artifact: ArtifactDetail,
  installCommands: readonly string[] = [],
): Ld {
  const url = absoluteUrl(origin, locale, `/a/${artifact.id}`)

  // A plan's steps include comment lines ("# Copy the composition to …"), which
  // are instructions to a reader, not commands. Publishing one as
  // `softwareHelp` would tell a machine that `#` is how you install this.
  const command = installCommands.find((entry) => !entry.trimStart().startsWith('#'))

  const interactions = [
    ...(artifact.stats.installs > 0 ? [interactionLd('InstallAction', artifact.stats.installs)] : []),
    ...(artifact.stats.downloads > 0
      ? [interactionLd('DownloadAction', artifact.stats.downloads)]
      : []),
    ...(artifact.stats.stars > 0 ? [interactionLd('LikeAction', artifact.stats.stars)] : []),
  ]

  return {
    '@context': SCHEMA,
    '@type': 'SoftwareApplication',
    '@id': `${url}#software`,
    name: artifact.displayName,
    url,
    // Longer than a meta description: this one is read by a machine, not shown
    // in a 160-character result snippet.
    description: clampDescription(artifact.summary, 300),
    applicationCategory: 'DeveloperApplication',
    applicationSubCategory: translate(locale, kindLabelKey(artifact.kind)),
    operatingSystem: 'Linux, macOS, Windows',
    softwareRequirements: translate(locale, 'nav.harness'),
    codeRepository: artifact.sourceUrl,
    datePublished: artifact.publishedAt,
    dateModified: artifact.updatedAt,
    inLanguage: localeDefinition(locale).tag,
    isPartOf: { '@id': `${origin}/#website` },
    ...(artifact.license === undefined ? {} : { license: artifact.license }),
    ...(artifact.keywords.length === 0 ? {} : { keywords: artifact.keywords.join(', ') }),
    ...(artifact.author === undefined
      ? {}
      : {
          author: {
            '@type': 'Person',
            name: artifact.author.name,
            ...(artifact.author.url === undefined ? {} : { url: artifact.author.url }),
          },
        }),
    ...(command === undefined ? {} : { softwareHelp: command }),
    ...(interactions.length === 0 ? {} : { interactionStatistic: interactions }),
  }
}
