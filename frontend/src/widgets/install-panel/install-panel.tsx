import { useState } from 'react'
import { AlertTriangle, Check, Copy, KeyRound, Terminal } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/motion/tabs'
import type { ArtifactDetail, InstallPlanDto } from '@/entities/artifact/model/types'
import { t } from '@/shared/config/messages'
import { cn } from '@/shared/lib/utils'

const HUB_PLUGIN_SPEC = 'github:stvlynn/dsh.fish#main'

/**
 * The install surface — the reason the site exists.
 *
 * Both tabs render the *same* server-resolved plan. The CLI tab shows the plan's
 * `manualCommands`; the plugin tab shows the one sentence an agent needs. They
 * cannot drift, because neither is written here: the domain's `buildInstallPlan`
 * produced both.
 */
export function InstallPanel({
  artifact,
  plan,
}: {
  artifact: ArtifactDetail
  plan: InstallPlanDto
}) {
  const credentials =
    plan.steps.filter((step) => step.type === 'require-credential') ?? []

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Terminal className="size-4 text-primary" aria-hidden />
        {t('install.title')}
      </h2>

      <Tabs defaultValue="cli" variant="segment" className="mt-4">
        <TabsList>
          <TabsTrigger value="cli">{t('install.viaCli')}</TabsTrigger>
          <TabsTrigger value="plugin">{t('install.viaPlugin')}</TabsTrigger>
        </TabsList>

        <TabsContent value="cli">
          <div className="space-y-2">
            {plan.manualCommands.map((command, index) => (
              <CopyBlock key={`${command}-${index}`} text={command} />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t('install.profileLabel')}: <code className="font-mono">{plan.profile}</code>
          </p>
        </TabsContent>

        <TabsContent value="plugin">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('install.viaPluginBody')}
          </p>
          <div className="mt-3 space-y-2">
            <CopyBlock text={`dsh plugin --profile ${plan.profile} add ${HUB_PLUGIN_SPEC}`} />
            <CopyBlock text={`install ${artifact.id} from the hub`} muted />
          </div>
        </TabsContent>
      </Tabs>

      {plan.warningKeys.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {plan.warningKeys.map((key) => (
            <li
              key={key}
              className="flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300"
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {credentials.length > 0 ? (
        <div className="mt-5 rounded-xl border border-border p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold">
            <KeyRound className="size-3.5" aria-hidden />
            {t('install.credentials')}
          </h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {credentials.map((step) =>
              step.type === 'require-credential' ? (
                <li
                  key={step.envName}
                  className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-[11px]"
                >
                  {step.envName}
                  {step.required ? null : <span className="text-muted-foreground"> ?</span>}
                </li>
              ) : null,
            )}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {t('install.credentialsBody')}
          </p>
        </div>
      ) : null}
    </section>
  )
}

/**
 * A command the reader will copy.
 *
 * Comment lines in a plan (`# Copy the composition to …`) are instructions, not
 * commands, so they render muted and without a copy affordance — copying a
 * comment into a shell does nothing and would be a small lie.
 */
function CopyBlock({ text, muted = false }: { text: string; muted?: boolean }) {
  const [copied, setCopied] = useState(false)
  const isComment = text.trimStart().startsWith('#')

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-border bg-muted/60 px-3 py-2.5 pr-11 font-mono text-[13px] leading-relaxed',
        (muted || isComment) && 'text-muted-foreground',
      )}
    >
      <pre className="overflow-x-auto whitespace-pre-wrap break-words">{text}</pre>
      {isComment ? null : (
        <button
          type="button"
          aria-label={t('install.copy')}
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            })
          }}
          className="press absolute right-2 top-2 rounded-lg border border-border bg-card p-1.5 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-500" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
        </button>
      )}
    </div>
  )
}
