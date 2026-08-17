import { githubAvatarUrl, githubLogin } from '../lib/github-avatar'
import { useT } from '@/shared/config/i18n'
import { Avatar } from '@/shared/ui/avatar'
import { ExternalLinkIcon, GithubIcon } from '@/shared/ui/icon'
import { cn } from '@/shared/lib/utils'

/**
 * The repository author, as a card in the plugin-page header.
 *
 * The portrait is beui's Avatar. A GitHub profile URL is also GitHub's
 * `{login}.png`, so the picture and the outbound link are the same fact;
 * anyone else is initials in the same clipped slot. The name is the one
 * string the catalog stored; the outbound mark says whether that URL is
 * GitHub or somewhere else, without repeating the word already in the heading.
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
    'flex h-full flex-col justify-center rounded-xl border border-border bg-card p-5',
    author.url && 'press hover:border-border-strong',
    className,
  )

  const identity = (
    <span className="mt-3 flex items-center gap-3">
      <Avatar src={avatarSrc} name={author.name} size="xl" />
      <span className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
        {author.name}
      </span>
      {author.url ? (
        github ? (
          <GithubIcon className="size-4 shrink-0 text-muted-foreground" weight="bold" />
        ) : (
          <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" weight="bold" />
        )
      ) : null}
    </span>
  )

  if (author.url) {
    return (
      <a href={author.url} target="_blank" rel="noreferrer noopener ugc" className={frame}>
        <h2 className="text-xs font-medium text-muted-foreground">{t('artifact.author')}</h2>
        {identity}
      </a>
    )
  }

  return (
    <section className={frame}>
      <h2 className="text-xs font-medium text-muted-foreground">{t('artifact.author')}</h2>
      {identity}
    </section>
  )
}
