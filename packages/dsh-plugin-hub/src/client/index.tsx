/**
 * dsh.fish in the harness settings.
 *
 * The browser half of the bundle: it renders a settings section and calls the
 * host routes this same package registers. It owns no install logic — the
 * installer, the catalog credentials and the account token stay host side, so
 * the section is a view over what the `hub_*` tools already do.
 *
 * @module @dsh-fish/hub/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'

import { HubSection } from './HubSection.js'
import { dictionaries, LOCALE_NS, type HubLocaleKey } from './locale.js'
import { styles } from './styles.js'

export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(LOCALE_NS, dictionaries), 'dsh.fish: dictionaries')
  const t = ctx.locale.bind<HubLocaleKey>(LOCALE_NS)

  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset['plugin'] = '@dsh-fish/hub'
    style.textContent = styles
    document.head.append(style)
    return () => { style.remove() }
  }, 'dsh.fish: styles')

  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'dsh-fish',
        order: 30,
        label: () => t('nav'),
        locale: LOCALE_NS,
      },
      HubSection,
    ),
  )
}
