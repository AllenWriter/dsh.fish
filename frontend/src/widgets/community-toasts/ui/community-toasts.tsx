import { useEffect, useMemo, useState } from 'react'
import { githubAvatarUrl } from '@/entities/artifact/lib/github-avatar'
import { useT } from '@/shared/config/i18n'
import {
  HUB_DISCORD_URL,
  HUB_ISSUES_URL,
  MAINTAINER_GITHUB_URL,
  MAINTAINER_X_URL,
} from '@/shared/config/site'
import { Avatar } from '@/shared/ui/avatar'
import { DiscordIcon, GithubIcon, type Icon } from '@/shared/ui/icon'
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
  /** The mark of the place the toast leads to, unless a portrait speaks instead. */
  icon?: Icon
  /**
   * A person, where the destination is one.
   *
   * The feed toast invites the reader to follow the maintainer, not a brand,
   * so its leading slot is their portrait — the same GitHub-derived avatar the
   * catalog draws for every author — rather than the platform's glyph.
   */
  portrait?: string
  titleKey: string
  actionKey: string
  href: string
  /** A destination off this site opens in its own tab. */
  external: boolean
}

/** The maintainer's portrait, at 2× the size of the slot it fills. */
const MAINTAINER_PORTRAIT = githubAvatarUrl(MAINTAINER_GITHUB_URL, 56)

/**
 * The three invitations, each identified by the mark of the place it leads to.
 *
 * Order is the order they arrive in, and it goes from the widest audience to
 * the narrowest: a room anyone can join, one person to follow, then the issue
 * tracker for the reader who has something specific to say.
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
    portrait: MAINTAINER_PORTRAIT,
    titleKey: 'community.x.title',
    actionKey: 'community.x.action',
    href: MAINTAINER_X_URL,
    external: true,
  },
  {
    id: 'feedback',
    icon: GithubIcon,
    titleKey: 'community.feedback.title',
    actionKey: 'community.feedback.action',
    href: HUB_ISSUES_URL,
    external: true,
  },
]

export interface CommunityToastsProps {
  /** Ids the reader has already retired, read from the cookie by the loader. */
  dismissed: readonly CommunityToastId[]
}

/**
 * Site-wide invitations to the project's community, its author's feed and its
 * issue tracker.
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
          icon: toast.portrait ? (
            <Avatar src={toast.portrait} name="Steven Lynn" size="sm" />
          ) : (
            toast.icon && <toast.icon className="size-4" weight="bold" />
          ),
          title: t(toast.titleKey),
          action: {
            label: t(toast.actionKey),
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
