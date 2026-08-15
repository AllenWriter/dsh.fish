import type { Route } from './+types/docs-page'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/motion/tabs'
import { t } from '@/shared/config/messages'

export function meta(): Route.MetaDescriptors {
  return [
    { title: `${t('docs.title')} — ${t('app.name')}` },
    { name: 'description', content: t('app.description') },
  ]
}

/**
 * Author-facing reference: exactly what a source must contain for each artifact
 * kind before the indexer will list it. Every snippet here mirrors what
 * `classifyPackage` and the GitHub indexer actually look for, so following the
 * page is sufficient to get indexed.
 */
export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">{t('docs.title')}</h1>
      <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
        Tag your repository with the <Code>dsh-plugin</Code> topic, or submit it directly. The
        registry reads your real manifest — what it lists is what the harness would load.
      </p>

      <Tabs defaultValue="bundle" variant="underline" className="mt-10">
        <TabsList className="flex-wrap">
          <TabsTrigger value="bundle">Bundle</TabsTrigger>
          <TabsTrigger value="skill">Skill</TabsTrigger>
          <TabsTrigger value="mcp">MCP server</TabsTrigger>
          <TabsTrigger value="preset">Agent preset</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="bundle">
          <Section
            title="A bundle declares dsh.bundle"
            body="A package without that declaration still installs, but the harness activates no layer for it — so the registry does not list it as a plugin either."
            code={`{
  "name": "dsh-hello-plugin",
  "version": "0.1.0",
  "type": "module",
  "files": ["index.js", "cordis.patch.yml"],
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}`}
          />
          <Note>
            Publishing to npm ships prebuilt code, so users need no build allowance. A git install
            fetches sources: add a self-contained <Code>prepare</Code> script, and expect users to
            allowlist it.
          </Note>
        </TabsContent>

        <TabsContent value="skill">
          <Section
            title="A skill is a SKILL.md with frontmatter"
            body="name must be kebab-case and description is required — the provider drops a skill missing either."
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
            title="An MCP server is a client row"
            body="The registry stores credential references, never values. Declare the environment variable names your server needs and the harness resolves them through ctx.credentials."
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
            title="An agent preset is one agent.cordis.yml"
            body="Put it at the repository root (or in the submitted subdirectory). The directory name becomes the preset id."
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
            title="A profile lists bundles in order"
            body="Later layers win per row, and a patch replaces a row's whole config rather than deep-merging it — so order is meaningful."
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

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">{children}</code>
  )
}
