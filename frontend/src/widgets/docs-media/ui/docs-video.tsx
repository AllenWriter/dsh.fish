import type { ReactNode } from 'react'

type DocsVideoProps = {
  src: string
  poster: string
  title: string
  caption: string
  transcriptLabel: string
  children: ReactNode
}

export function DocsVideo({
  src,
  poster,
  title,
  caption,
  transcriptLabel,
  children,
}: DocsVideoProps) {
  return (
    <figure className="my-8 overflow-hidden rounded-2xl border border-border bg-card">
      <video
        aria-label={title}
        className="aspect-video h-auto w-full bg-black object-cover"
        controls
        playsInline
        preload="metadata"
        poster={poster}
        width={1920}
        height={1080}
      >
        <source src={src} type="video/mp4" />
      </video>
      <figcaption className="border-t border-border px-5 py-4">
        <p className="m-0 font-medium text-foreground">{title}</p>
        <p className="mb-0 mt-1 text-sm text-muted-foreground">{caption}</p>
        <details className="mt-3 text-sm text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">
            {transcriptLabel}
          </summary>
          <div className="mt-2 space-y-2">{children}</div>
        </details>
      </figcaption>
    </figure>
  )
}
