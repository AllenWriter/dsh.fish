import type { Route } from './+types/docs-page'
import { hubContext } from '@/shared/api/hub-context'
import type { ScoringModelDto } from '@dsh-fish/backend/application/use-case/describe-scoring.js'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/motion/tabs'
import { KindIcon } from '@/entities/artifact/ui/kind-icon'
import {
  kindLabelKey,
  type ArtifactKind,
  type MaintenanceStatus,
} from '@/entities/artifact/model/types'
import { resolveLocale, translate, useT, type Translator } from '@/shared/config/i18n'
import { breadcrumbLd, errorMeta, pageMeta } from '@/shared/lib/seo'

export function meta({ loaderData }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return errorMeta()
  const { origin, locale } = loaderData
  return pageMeta({
    origin,
    locale,
    path: '/docs',
    title: `${translate(locale, 'docs.title')} — ${translate(locale, 'app.name')}`,
    description: translate(locale, 'seo.docs.description'),
    type: 'article',
    jsonLd: [
      breadcrumbLd(origin, locale, [
        { name: translate(locale, 'app.name'), path: '/' },
        { name: translate(locale, 'docs.title'), path: '/docs' },
      ]),
    ],
  })
}

export function loader({ context, request }: Route.LoaderArgs) {
  const { container } = context.get(hubContext)
  return {
    locale: resolveLocale(request),
    origin: container.config.baseUrl,
    // The scoring model as data — the same constant `GET /api/v1/scoring`
    // serializes — so the documented formula can never drift from the executed
    // one. The section below renders values from this object, never literals.
    scoring: container.useCases.describeScoring.execute(),
  }
}

/**
 * The kinds this page documents, and the tab each one owns.
 *
 * `hook-bridge` has no section yet, so the list is written out rather than
 * derived from `ARTIFACT_KINDS`: a tab with no panel behind it would be worse
 * than an absent tab.
 */
const DOCUMENTED_KINDS: readonly { tab: string; kind: ArtifactKind }[] = [
  { tab: 'bundle', kind: 'bundle' },
  { tab: 'skill', kind: 'skill' },
  { tab: 'mcp', kind: 'mcp-server' },
  { tab: 'preset', kind: 'agent-preset' },
  { tab: 'profile', kind: 'profile' },
]

/**
 * Author-facing reference: exactly what a source must contain for each artifact
 * kind before the indexer will list it. Every snippet here mirrors what
 * `classifyPackage` and the GitHub indexer actually look for, so following the
 * page is sufficient to get indexed.
 *
 * The prose is translated; the snippets are not. A JSON key is an identifier,
 * and an identifier that changes with the reader's language is a broken
 * instruction.
 */
export default function DocsPage({ loaderData }: Route.ComponentProps) {
  const { scoring } = loaderData
  const t = useT()

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">{t('docs.title')}</h1>
      <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{t('docs.intro')}</p>

      <Tabs defaultValue="bundle" variant="underline" className="mt-10">
        {/* Each tab wears the mark its kind wears in the catalog, so the page
            that explains how to publish a kind is recognisably about the same
            thing as the chip on the row it produces. */}
        <TabsList className="flex-wrap">
          {DOCUMENTED_KINDS.map((entry) => (
            <TabsTrigger key={entry.tab} value={entry.tab}>
              {({ active }) => (
                <>
                  <KindIcon
                    kind={entry.kind}
                    className="size-4"
                    weight={active ? 'fill' : 'bold'}
                  />
                  {t(kindLabelKey(entry.kind))}
                </>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="bundle">
          <Section
            title={t('docs.bundle.title')}
            body={t('docs.bundle.body')}
            code={`{
  "name": "dsh-hello-plugin",
  "version": "0.1.0",
  "type": "module",
  "files": ["index.js", "cordis.patch.yml"],
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}`}
          />
          <Note>{t('docs.bundle.note')}</Note>
        </TabsContent>

        <TabsContent value="skill">
          <Section
            title={t('docs.skill.title')}
            body={t('docs.skill.body')}
            code={`---
name: release-notes
description: Draft release notes from a commit range.
---

# Release notes

Steps the agent should follow…`}
          />
        </TabsContent>

        <TabsContent value="mcp">
          <Section
            title={t('docs.mcp.title')}
            body={t('docs.mcp.body')}
            code={`{
  "dsh": {
    "hub": {
      "kind": "mcp-server",
      "mcp": {
        "serverName": "github",
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "credentials": [{ "envName": "GITHUB_TOKEN", "required": true }]
      }
    }
  }
}`}
          />
        </TabsContent>

        <TabsContent value="preset">
          <Section
            title={t('docs.preset.title')}
            body={t('docs.preset.body')}
            code={`- id: tools
  name: 'dsh-tools'
- id: prompt
  name: 'dsh-system-prompt'
  config:
    persona: ./persona.md`}
          />
        </TabsContent>

        <TabsContent value="profile">
          <Section
            title={t('docs.profile.title')}
            body={t('docs.profile.body')}
            code={`{
  "dsh": {
    "profile": {
      "bundles": ["@deepseek-ai/dsh-base", "dsh-hello-plugin"]
    }
  }
}`}
          />
        </TabsContent>
      </Tabs>

      <ScoringSection scoring={scoring} t={t} />
    </div>
  )
}

/**
 * "How the score works": the published scoring model, rendered as tables.
 *
 * Every number and formula string below comes from the loader's `scoring`
 * object — the same constant `GET /api/v1/scoring` serves — so editing the
 * model in the domain updates this page without touching it. Only the labels
 * are copy; the values are data.
 */
function ScoringSection({ scoring, t }: { scoring: ScoringModelDto; t: Translator }) {
  const { weights, popularity, maintenance, quality, grades } = scoring
  const windows = maintenance.windowsDays as Partial<Record<MaintenanceStatus, number>>

  return (
    <section className="mt-14">
      <h2 className="text-lg font-semibold tracking-tight">{t('docs.scoring.title')}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {t('docs.scoring.body')}
      </p>

      <h3 className="mt-8 text-sm font-semibold tracking-tight">{t('docs.scoring.dimensions')}</h3>
      {/* The blend itself, with the weights inline: the formula a reader can
          recompute a score from. */}
      <p className="mt-3 overflow-x-auto rounded-xl border border-border bg-card p-4 font-mono text-[13px] leading-relaxed">
        score = round({weights.popularity} · popularity + {weights.maintenance} · maintenance +{' '}
        {weights.quality} · quality)
      </p>
      <ScoringTable
        head={[t('docs.scoring.dimension'), t('docs.scoring.weight')]}
        rows={(
          [
            ['popularity', weights.popularity],
            ['maintenance', weights.maintenance],
            ['quality', weights.quality],
          ] as const
        ).map(([dimension, weight]) => [
          t(`docs.scoring.dim.${dimension}`),
          <span key={dimension} className="tabular-nums">
            {weight}
          </span>,
        ])}
      />

      <h3 className="mt-8 text-sm font-semibold tracking-tight">
        {t('docs.scoring.dim.popularity')}
      </h3>
      <dl className="mt-3 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">{t('docs.scoring.rawSignal')}</dt>
        <dd>
          <code className="font-mono text-[13px]">{popularity.raw}</code>
        </dd>
        <dt className="text-muted-foreground">{t('docs.scoring.scale')}</dt>
        <dd>
          <code className="font-mono text-[13px]">{popularity.scale}</code>
        </dd>
        <dt className="text-muted-foreground">{t('docs.scoring.saturation')}</dt>
        <dd className="tabular-nums">{popularity.saturation.toLocaleString('en-US')}</dd>
      </dl>

      <h3 className="mt-8 text-sm font-semibold tracking-tight">
        {t('docs.scoring.dim.maintenance')}
      </h3>
      <ScoringTable
        head={[t('docs.scoring.status'), t('docs.scoring.window'), t('docs.scoring.dimensionScore')]}
        rows={(
          Object.entries(maintenance.dimensionScores) as [MaintenanceStatus, number][]
        ).map(([status, dimensionScore]) => [
          t(`artifact.maintenance.${status}`),
          windows[status] === undefined
            ? t('docs.scoring.beyondWindow')
            : t('docs.scoring.withinDays', { days: windows[status] }),
          <span key={status} className="tabular-nums">
            {dimensionScore}
          </span>,
        ])}
      />

      <h3 className="mt-8 text-sm font-semibold tracking-tight">
        {t('docs.scoring.dim.quality')}
      </h3>
      <ScoringTable
        head={[t('docs.scoring.signal'), t('docs.scoring.points')]}
        rows={(
          [
            ['verified', 'artifact.verified'],
            ['readme', 'artifact.readme'],
            ['license', 'artifact.license'],
            ['author', 'artifact.author'],
          ] as const
        ).map(([signal, labelKey]) => [
          t(labelKey),
          <span key={signal} className="tabular-nums">
            {quality.points[signal]}
          </span>,
        ])}
      />

      <h3 className="mt-8 text-sm font-semibold tracking-tight">{t('docs.scoring.gradesTitle')}</h3>
      <ScoringTable
        head={[t('docs.scoring.grade'), t('docs.scoring.minScore')]}
        rows={[
          ...(Object.entries(grades) as [string, number][]).map(([grade, min]) => [
            grade,
            <span key={grade} className="tabular-nums">
              {min}
            </span>,
          ]),
          // The model names no minimum for the lowest grade: anything under the
          // lowest named threshold is it.
          ['C', t('docs.scoring.belowMin', { score: grades.B })],
        ]}
      />
    </section>
  )
}

/** One small two-or-three-column table of model data. */
function ScoringTable({
  head,
  rows,
}: {
  head: readonly React.ReactNode[]
  rows: readonly (readonly React.ReactNode[])[]
}) {
  return (
    <table className="mt-3 w-full text-left text-sm">
      <thead>
        <tr className="border-b border-border text-xs text-muted-foreground">
          {head.map((cell, index) => (
            <th key={index} scope="col" className="py-1.5 pr-4 font-medium">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-b border-border/60 last:border-0">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="py-1.5 pr-4">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Section({ title, body, code }: { title: string; body: string; code: string }) {
  return (
    <section className="mt-2">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-card p-5 font-mono text-[13px] leading-relaxed">
        {code}
      </pre>
    </section>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-border bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
      {children}
    </p>
  )
}
