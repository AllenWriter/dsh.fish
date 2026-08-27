import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/motion/tabs'
import { CopyButton } from '@/shared/ui/copy-button'
import type { ArtifactDetail, InstallPlanDto } from '@/entities/artifact/model/types'
import { useT } from '@/shared/config/i18n'
import { HUB_PLUGIN_SPEC } from '@/shared/config/site'
import { cn } from '@/shared/lib/utils'
import { AgentIcon, CliIcon, WarningIcon } from '@/shared/ui/icon'

/**
 * The install surface — the reason the site exists.
 *
 * Both tabs render the *same* server-resolved plan. The CLI tab shows the plan's
 * `manualCommands` — the first of which is a real `npx @dsh-fish/cli add`
 * invocation; the plugin tab shows the one sentence an agent needs. They
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
  const t = useT()

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold tracking-tight">{t('install.title')}</h2>

      <Tabs defaultValue="cli" variant="segment" className="mt-4">
        {/* Two routes to the same plan, and the marks say which is which before
            the labels do: a terminal window against the agent that drives it. */}
        <TabsList>
          <TabsTrigger value="cli">
            {({ active }) => (
              <>
                <CliIcon className="size-4" weight={active ? 'fill' : 'bold'} />
                {t('install.viaCli')}
              </>
            )}
          </TabsTrigger>
          <TabsTrigger value="plugin">
            {({ active }) => (
              <>
                <AgentIcon className="size-4" weight={active ? 'fill' : 'bold'} />
                {t('install.viaPlugin')}
              </>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cli">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('install.viaCliBody')}
          </p>
          <div className="mt-3 space-y-2">
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
          <p className="mt-3 text-xs text-muted-foreground">
            {t('install.profileNote', { profile: plan.profile })}
          </p>
        </TabsContent>
      </Tabs>

      {plan.warningKeys.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {plan.warningKeys.map((key) => (
            <li
              key={key}
              className="flex gap-2 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground"
            >
              <WarningIcon className="mt-0.5 size-3.5 shrink-0" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
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
  const isComment = text.trimStart().startsWith('#')

  return (
    <div
      className={cn(
        'group relative rounded-md border border-border bg-muted/60 px-3 py-2.5 pr-11 font-mono text-[13px] leading-relaxed',
        (muted || isComment) && 'text-muted-foreground',
      )}
    >
      <pre className="overflow-x-auto whitespace-pre [scrollbar-width:thin]">{text}</pre>
      {isComment ? null : (
        <CopyButton
          text={text}
          className="absolute right-2 top-2 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        />
      )}
    </div>
  )
}
