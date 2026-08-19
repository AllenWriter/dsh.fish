import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useT } from '@/shared/config/i18n'
import {
  FEEDBACK_EMAIL,
  HUB_DISCORD_URL,
  MAINTAINER_GITHUB_URL,
  MAINTAINER_NAME,
  MAINTAINER_X_URL,
} from '@/shared/config/site'
import { githubAvatarUrl } from '@/shared/lib/github-avatar'
import { Avatar } from '@/shared/ui/avatar'
import { DiscordIcon, EmailIcon, type Icon } from '@/shared/ui/icon'
import { ToastStack, type ToastItem } from '@/shared/ui/motion/toast-stack'
import { writeDismissedToasts, type CommunityToastId } from '../model/dismissal'

/**
 * How long the page has to itself before the deck arrives, in ms.
 *
 * These toasts are an aside, not the reason anyone opened the page. Letting
 * the content paint and settle first is what keeps them an invitation rather
 * than an interruption, and it means they never compete with the first frame.
 */
const REVEAL_DELAY_MS = 900

/** A glyph in a tinted disc — the leading mark for a place, not a person. */
function Mark({ glyph: Glyph }: { glyph: Icon }) {
  return (
    <span className="grid size-7 place-items-center rounded-full bg-muted text-muted-foreground">
      <Glyph className="size-4" weight="bold" />
    </span>
  )
}

interface CommunityToast {
  id: CommunityToastId
  leading: ReactNode
  titleKey: string
  titleParams?: Record<string, string>
  actionKey: string
  actionParams?: Record<string, string>
  href: string
  /** A destination off this site opens in its own tab. */
  external: boolean
}

/**
 * The deck, front card first.
 *
 * Order runs from the widest audience to the narrowest: a room anyone can
 * join, one person to follow, then an inbox for the reader who has something
 * specific to say. Only the front card is readable, so this is also the order
 * a reader meets them in.
 *
 * The maintainer's card carries his GitHub portrait rather than a logo. The
 * other two lead to a place; this one leads to a person, and a face is what
 * says so.
 */
const TOASTS: readonly CommunityToast[] = [
  {
    id: 'discord',
    leading: <Mark glyph={DiscordIcon} />,
    titleKey: 'community.discord.title',
    actionKey: 'community.discord.action',
    href: HUB_DISCORD_URL,
    external: true,
  },
  {
    id: 'x',
    leading: (
      <Avatar src={githubAvatarUrl(MAINTAINER_GITHUB_URL)} name={MAINTAINER_NAME} size="sm" />
    ),
    titleKey: 'community.x.title',
    titleParams: { name: MAINTAINER_NAME },
    actionKey: 'community.x.action',
    href: MAINTAINER_X_URL,
    external: true,
  },
  {
    id: 'feedback',
    leading: <Mark glyph={EmailIcon} />,
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
 * inbox, stacked as one deck in the corner.
 *
 * Dismissal is per card and permanent, so the whole surface is something a
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
          leading: toast.leading,
          title: t(toast.titleKey, toast.titleParams),
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
