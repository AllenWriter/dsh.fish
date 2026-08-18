import type { ReactNode } from 'react'
import { kindLabelKey, type ArtifactDetail } from '@/entities/artifact/model/types'
import { DEFAULT_LOCALE, translate } from '@/shared/config/i18n'
import { GRADE_HEX } from '@/shared/lib/badge'
import { compactNumber } from '@/shared/lib/format'
import { OG_FONT_FAMILY, OG_THEME, WHALE_ICON } from '@/shared/lib/og'
import { clampDescription } from '@/shared/lib/seo'

/** Open Graph's canonical size — the same canvas the committed site card uses. */
export const OG_CARD_SIZE = { width: 1200, height: 630 } as const

/**
 * The per-artifact social card, as a satori tree.
 *
 * Same visual language as `scripts/build-og-image.mjs`: the dark ground of the
 * committed site card, the whale and wordmark top-left, IBM Plex Sans for
 * everything. What the site card carries as artwork, this card spends on the
 * artifact itself — name, kind, summary and the numbers a reader weighs before
 * clicking through: grade, stars, downloads.
 *
 * The strings are English on purpose. One PNG serves every language variant of
 * the page (the `og:title` and `og:description` beside it stay localized), and
 * re-rendering per language would mint nine near-identical bitmaps per
 * artifact. They still come from the catalogs, not from literals here.
 */
export function artifactOgCard(artifact: ArtifactDetail): ReactNode {
  const gradeColor = GRADE_HEX[artifact.grade]

  return (
    <div
      style={{
        width: OG_CARD_SIZE.width,
        height: OG_CARD_SIZE.height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        backgroundColor: OG_THEME.background,
        color: OG_THEME.foreground,
        fontFamily: OG_FONT_FAMILY,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={WHALE_ICON} width={48} height={48} alt="" />
          <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>dsh.fish</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {artifact.deprecated ? (
            <span style={{ fontSize: 22, color: '#e5534b' }}>
              {translate(DEFAULT_LOCALE, 'artifact.deprecated')}
            </span>
          ) : null}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              border: `2px solid ${gradeColor}`,
              borderRadius: 14,
              padding: '8px 20px',
              fontSize: 30,
              fontWeight: 600,
              color: gradeColor,
            }}
          >
            {`${artifact.grade} · ${artifact.score}`}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <span style={{ fontSize: 26, fontWeight: 600, color: OG_THEME.primary }}>
          {translate(DEFAULT_LOCALE, kindLabelKey(artifact.kind))}
        </span>
        <span style={{ fontSize: 68, fontWeight: 600, letterSpacing: -2, lineHeight: 1.1 }}>
          {clampDescription(artifact.displayName, 44)}
        </span>
        <span style={{ fontSize: 27, lineHeight: 1.35, color: OG_THEME.muted }}>
          {clampDescription(artifact.summary, 140)}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 26,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {artifact.stats.stars > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StarIcon />
              <span style={{ fontWeight: 600 }}>{compactNumber(artifact.stats.stars)}</span>
              <span style={{ color: OG_THEME.muted }}>
                {translate(DEFAULT_LOCALE, 'artifact.stars')}
              </span>
            </div>
          ) : null}
          {artifact.stats.downloads > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DownloadsIcon />
              <span style={{ fontWeight: 600 }}>{compactNumber(artifact.stats.downloads)}</span>
              <span style={{ color: OG_THEME.muted }}>
                {translate(DEFAULT_LOCALE, 'artifact.downloads')}
              </span>
            </div>
          ) : null}
        </div>
        <span style={{ color: OG_THEME.muted }}>{translate(DEFAULT_LOCALE, 'app.tagline')}</span>
      </div>
    </div>
  )
}

/** The star a catalog card uses for the same number, drawn as a path: satori has no icon font. */
function StarIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={OG_THEME.muted}>
      <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.57l-5.9 3.1 1.13-6.57L2.45 9.44l6.6-.96L12 2.5z" />
    </svg>
  )
}

function DownloadsIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3.5v11m0 0l-4.25-4.25M12 14.5l4.25-4.25M4.5 20.5h15"
        stroke={OG_THEME.muted}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
