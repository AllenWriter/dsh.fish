import type { Route } from './+types/docs-page'
import { hubContext } from '@/shared/api/hub-context'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/motion/tabs'
import { KindIcon } from '@/entities/artifact/ui/kind-icon'
import { kindLabelKey, type ArtifactKind } from '@/entities/artifact/model/types'
import { requireLocale, translate, useT } from '@/shared/config/i18n'
import { breadcrumbLd, errorMeta, pageMeta } from '@/shared/lib/seo'

export function meta({ loaderData, params }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData) return errorMeta(params.locale)
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

export function loader({ context, params }: Route.LoaderArgs) {
  return {
    locale: requireLocale(params.locale),
    origin: context.get(hubContext).container.config.baseUrl,
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
export default function DocsPage() {
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
    </div>
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
