/**
 * Facts about the site itself that are not user-facing prose.
 *
 * Anything a reader sees belongs in a message catalog; this module holds the
 * identifiers a crawler and a link preview read — the social card, the
 * upstream project this hub serves, and the spec the hub's own plugin installs
 * under. Keeping them here means no component hardcodes a URL either.
 */

/** Social card. Regenerate with `pnpm --filter @dsh-fish/frontend run og:build`. */
export const OG_IMAGE = {
  path: '/og.png',
  width: 1200,
  height: 630,
  type: 'image/png',
} as const

/** Square brand mark for schema.org identity and install surfaces. */
export const BRAND_IMAGE = {
  path: '/icons/whale-brand.png',
  width: 256,
  height: 256,
  type: 'image/png',
} as const

/** The project this registry exists for. */
export const HARNESS_REPO_URL = 'https://github.com/deepseek-ai/deepseek-harness'

/** This registry's own source, used as the publisher's `sameAs`. */
export const HUB_REPO_URL = 'https://github.com/stvlynn/dsh.fish'

/** Where the people who build and publish plugins talk to each other. */
export const HUB_DISCORD_URL = 'https://discord.gg/PwZDHH4mv3'

/** Who maintains the registry. One definition: catalogs interpolate it. */
export const MAINTAINER_NAME = 'Steven Lynn'

/** The maintainer's feed, where what lands in the catalog gets announced. */
export const MAINTAINER_X_URL = 'https://x.com/stv_lynn'

/** The maintainer's GitHub profile, also the source of their public portrait. */
export const MAINTAINER_GITHUB_URL = 'https://github.com/stvlynn'

/** Where a bug report, a correction or a plugin nomination is read. */
export const HUB_ISSUES_URL = `${HUB_REPO_URL}/issues`

/** The spec a reader copies to install the hub's plugin into their harness. */
export const HUB_PLUGIN_SPEC = 'github:stvlynn/dsh.fish#main'

/**
 * How long a description may be before a search engine truncates it.
 *
 * Not a hard rule anywhere — engines measure pixels, not characters — but a
 * description written past this point is written for nobody, so `clamp` cuts
 * on a word boundary rather than letting the crawler cut mid-word.
 */
export const DESCRIPTION_MAX = 160
