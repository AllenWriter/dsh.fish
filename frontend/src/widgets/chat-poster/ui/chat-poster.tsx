import { useEffect, useState } from 'react'
import { useT } from '@/shared/config/i18n'
import { CHAT_XMSEX_URL } from '@/shared/config/site'
import { CloseIcon } from '@/shared/ui/icon'
import {
  readChatPosterDismissed,
  writeChatPosterDismissed,
} from '../model/dismissal'

/** Let the page settle before the invitation appears. */
const REVEAL_DELAY_MS = 1200

/**
 * A quiet right-side invitation to chat.xmsex.net (飞鸟集 AI).
 *
 * Desktop-only, dismissible, remembered in localStorage. Hidden until the
 * client has checked dismissal so SSR HTML never flashes a closed poster.
 */
export function ChatPoster() {
  const t = useT()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (readChatPosterDismissed()) return
    const timer = window.setTimeout(() => setVisible(true), REVEAL_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    writeChatPosterDismissed()
    setVisible(false)
  }

  return (
    <aside
      aria-label={t('chatPoster.region')}
      className="pointer-events-none fixed bottom-6 right-4 z-40 hidden w-[15.5rem] md:bottom-8 md:right-6 lg:block"
    >
      <div className="pointer-events-auto relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-4 shadow-lg shadow-black/5 backdrop-blur-md dark:shadow-black/40">
        <button
          type="button"
          onClick={dismiss}
          className="press absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t('chatPoster.dismiss')}
        >
          <CloseIcon className="size-3.5" weight="bold" />
        </button>

        <p className="pr-7 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {t('chatPoster.kicker')}
        </p>
        <p className="mt-2 text-sm font-semibold leading-snug text-foreground">
          {t('chatPoster.title')}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {t('chatPoster.body')}
        </p>
        <a
          href={CHAT_XMSEX_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="press mt-3 inline-flex text-[13px] font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
        >
          {t('chatPoster.action')}
        </a>
      </div>
    </aside>
  )
}
