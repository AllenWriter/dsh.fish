import { githubAvatarUrl, githubLogin } from '../lib/github-avatar'
import { useT } from '@/shared/config/i18n'
import { Avatar } from '@/shared/ui/avatar'
import { ExternalLinkIcon, GithubIcon } from '@/shared/ui/icon'
import { cn } from '@/shared/lib/utils'

/**
 * The repository author, in the plugin-page header.
 *
 * One row, sized to its content: the header has no other fact to put beside
 * the title, so a taller card would only be empty space next to it.
 *
 * The portrait is beui's Avatar. A GitHub profile URL is also GitHub's
 * `{login}.png`, so the picture and the outbound link are the same fact;
 * anyone else is initials in the same clipped slot. The mark says whether
 * that URL is GitHub or somewhere else.
 */
export function AuthorCard({
  author,
  className,
}: {
  author: { name: string; url?: string }
  className?: string
}) {
  const t = useT()
  const avatarSrc = githubAvatarUrl(author.url)
  const github = githubLogin(author.url) !== undefined
  const frame = cn(
    'flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3',
    author.url && 'press hover:border-border-strong',
    className,
  )

  const identity = (
    <>
      <Avatar src={avatarSrc} name={author.name} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{t('artifact.author')}</span>
        <span className="block truncate text-sm font-medium">{author.name}</span>
      </span>
      {author.url ? (
        github ? (
          <GithubIcon className="size-4 shrink-0 text-muted-foreground" weight="bold" />
        ) : (
          <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" weight="bold" />
        )
      ) : null}
    </>
  )

  if (author.url) {
    return (
      <a href={author.url} target="_blank" rel="noreferrer noopener ugc" className={frame}>
        {identity}
      </a>
    )
  }

  return <div className={frame}>{identity}</div>
}
