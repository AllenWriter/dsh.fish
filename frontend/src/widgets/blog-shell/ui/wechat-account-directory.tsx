import { useT } from '@/shared/config/i18n'
import { cn } from '@/shared/lib/utils'
import { LocaleLink } from '@/shared/ui/locale-link'
import type { BlogAccountNavItem } from '../model/types'

export function WechatAccountDirectory({
  accounts,
  selectedAccount,
  total,
}: {
  accounts: readonly BlogAccountNavItem[]
  selectedAccount?: string
  total: number
}) {
  const t = useT()
  const choices: readonly BlogAccountNavItem[] = [
    { name: t('blog.wechat.allAccounts'), count: total },
    ...accounts,
  ]

  return (
    <section className="mt-10 sm:mt-12" aria-labelledby="wechat-account-directory-title">
      <div className="flex items-end justify-between gap-4">
        <h2
          id="wechat-account-directory-title"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {t('blog.wechat.accounts')}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t('blog.wechat.accountTotal', { count: accounts.length })}
        </p>
      </div>
      <nav aria-label={t('blog.wechat.accounts')} className="mt-3">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {choices.map((choice, index) => {
            const isAll = index === 0
            const active = isAll ? selectedAccount === undefined : choice.name === selectedAccount
            const href = isAll
              ? '/blog/wechat'
              : `/blog/wechat?account=${encodeURIComponent(choice.name)}`
            return (
              <li key={isAll ? 'all' : choice.name}>
                <LocaleLink
                  to={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'press flex min-h-16 flex-col justify-between rounded-xl border px-3 py-2.5 transition-colors',
                    active
                      ? 'border-border-strong bg-card font-semibold text-foreground shadow-sm'
                      : 'border-border bg-muted text-muted-foreground hover:border-border-strong hover:text-foreground',
                  )}
                >
                  <span className="line-clamp-1 text-sm">{choice.name}</span>
                  <span className="mt-1 text-xs font-normal text-muted-foreground">
                    {t('blog.wechat.accountCount', { count: choice.count })}
                  </span>
                </LocaleLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </section>
  )
}
