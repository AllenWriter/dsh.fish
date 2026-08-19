import { useEffect, useMemo, useState } from 'react'
import { useT } from '@/shared/config/i18n'
import { FEEDBACK_EMAIL, HUB_DISCORD_URL, MAINTAINER_X_URL } from '@/shared/config/site'
import { DiscordIcon, EmailIcon, XIcon, type Icon } from '@/shared/ui/icon'
import { ToastStack, type ToastItem } from '@/shared/ui/motion/toast-stack'
import { writeDismissedToasts, type CommunityToastId } from '../model/dismissal'

/**
 * How long the page has to itself before the stack arrives, in ms.
 *
 * These toasts are an aside, not the reason anyone opened the page. Letting
 * the content paint and settle first is what keeps them an invitation rather
 * than an interruption, and it means they never compete with the first frame.
 */
const REVEAL_DELAY_MS = 900

interface CommunityToast {
  id: CommunityToastId
  icon: Icon
  titleKey: string
  actionKey: string
  actionParams?: Record<string, string>
  href: string
  /** A destination off this site opens in its own tab. */
  external: boolean
}

/**
 * The three invitations, each identified by the mark of the place it leads to.
 *
 * Order is the order they arrive in, and it goes from the widest audience to
 * the narrowest: a room anyone can join, one person to follow, then an inbox
 * for the reader who has something specific to say.
 */
const TOASTS: readonly CommunityToast[] = [
  {
    id: 'discord',
    icon: DiscordIcon,
    titleKey: 'community.discord.title',
    actionKey: 'community.discord.action',
    href: HUB_DISCORD_URL,
    external: true,
  },
  {
    id: 'x',
    icon: XIcon,
    titleKey: 'community.x.title',
    actionKey: 'community.x.action',
    href: MAINTAINER_X_URL,
    external: true,
  },
  {
    id: 'feedback',
    icon: EmailIcon,
    titleKey: 'community.feedback.title',
    actionKey: 'community.feedback.action',
    actionParams: { email: FEEDBACK_EMAIL },
    href: `mailto:${FEEDBACK_EMAIL}`,
    external: false,
  },
]

export interface CommunityToastsProps {
  /** Ids the reader has already retired, read from the cookie by the loader. */
  dismissed: readonly CommunityToastId[]
}

/**
 * Site-wide invitations to the project's community, its author's feed and its
 * inbox.
 *
 * Dismissal is per toast and permanent, so the whole surface is something a
 * reader can end for good with three clicks and never see again. It lives
 * outside `<Outlet>` in `app/root.tsx`, so navigating the catalog neither
 * re-plays the entrance nor resurrects a dismissed toast.
 */
export function CommunityToasts({ dismissed }: CommunityToastsProps) {
  const t = useT()
  const [retired, setRetired] = useState<readonly CommunityToastId[]>([])
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), REVEAL_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  /** What this reader has not already retired in an earlier session. */
  const offered = useMemo(
    () => TOASTS.filter((toast) => !dismissed.includes(toast.id)),
    [dismissed],
  )

  const items = useMemo<ToastItem<CommunityToastId>[]>(
    () =>
      offered
        .filter((toast) => !retired.includes(toast.id))
        .map((toast) => ({
          id: toast.id,
          icon: <toast.icon className="size-4" weight="bold" />,
          title: t(toast.titleKey),
          action: {
            label: t(toast.actionKey, toast.actionParams),
            href: toast.href,
            external: toast.external,
          },
        })),
    [offered, retired, t],
  )

  // Nothing left to offer: no live region, no fixed layer, no listeners.
  if (offered.length === 0) return null

  /** Remember a decision without changing what is on screen. */
  const record = (id: CommunityToastId) => {
    writeDismissedToasts([...dismissed, ...retired, id])
  }

  return (
    <ToastStack
      // Empty until the delay elapses, so the region exists before its first
      // child does and the live announcement is an addition rather than the
      // region's own arrival.
      toasts={revealed ? items : []}
      onDismiss={(id) => {
        record(id)
        setRetired((current) => [...current, id])
      }}
      // Acting on a toast retires it too, but only in the cookie: taking it
      // off screen mid-click would cancel the navigation it was clicked for.
      onAction={record}
      labels={{ region: t('community.region'), dismiss: t('community.dismiss') }}
    />
  )
}
