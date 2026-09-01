import { useState } from 'react'
import { CopyIcon, ConfirmIcon, EmailIcon, ConnectIcon } from '@/shared/ui/icon'
import { useT } from '@/shared/config/i18n'
import { CONTACT_EMAIL, CONTACT_WECHAT } from '@/shared/config/site'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/motion/popover'

/**
 * Public contact, not a sign-in.
 *
 * The old account menu sent readers to GitHub OAuth. This site is a personal
 * blog: the same slot now opens email and WeChat so a reader can reach Jens.
 */
export function AccountMenu() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyWechat() {
    try {
      await navigator.clipboard.writeText(CONTACT_WECHAT)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen} side="bottom" align="end" sideOffset={12}>
      <PopoverTrigger>
        <button
          type="button"
          aria-label={t('nav.connect')}
          className="press inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground sm:px-4"
        >
          <ConnectIcon className="size-4" weight="bold" />
          <span className="hidden sm:inline">{t('nav.connect')}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-2">
        <p className="px-2 pb-1 pt-1 text-xs font-medium text-muted-foreground">
          {t('connect.title')}
        </p>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="flex items-start gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted"
        >
          <EmailIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" weight="bold" />
          <span className="min-w-0">
            <span className="block font-medium">{t('connect.email')}</span>
            <span className="block truncate text-xs text-muted-foreground">{CONTACT_EMAIL}</span>
          </span>
        </a>

        <div className="flex items-start gap-2.5 rounded-lg px-2 py-2 text-sm">
          <span className="mt-0.5 grid size-4 shrink-0 place-items-center text-xs font-semibold text-muted-foreground">
            W
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{t('connect.wechat')}</span>
            <span className="block truncate font-mono text-xs text-muted-foreground">
              {CONTACT_WECHAT}
            </span>
          </span>
          <button
            type="button"
            onClick={() => void copyWechat()}
            aria-label={copied ? t('connect.copied') : t('connect.copy')}
            className="press mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {copied ? (
              <ConfirmIcon className="size-4" weight="bold" />
            ) : (
              <CopyIcon className="size-4" weight="bold" />
            )}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
