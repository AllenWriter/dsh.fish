import type { MDXComponents } from 'mdx/types'
import type { ComponentType, JSX, ReactNode } from 'react'
import { LocaleLink } from '@/shared/ui/locale-link'
import { CopyButton } from '@/shared/ui/copy-button'
import { cn } from '@/shared/lib/utils'
import { Callout, normalizeCalloutType } from '@/shared/ui/docs-callout'

/**
 * Shared MDX tag map for first-party long-form pages (product docs and blog).
 *
 * Visual rules match the catalog readme renderer (underline links, no accent
 * spent on every href, fences copy through the shared button) but headings are
 * not demoted: the page owns `<h1>` from frontmatter, so MDX `#` is `<h2>`.
 *
 * Fences named `tip` / `info` / `warning` (and the rest) render as callouts,
 * matching Docusaurus admonitions and GitHub alerts so authors can write
 * ```tip without a React import.
 */
type IntrinsicMdxComponents = Partial<{
  [Tag in keyof JSX.IntrinsicElements]: ComponentType<
    JSX.IntrinsicElements[Tag]
  >
}>

export function proseMdxComponents(): IntrinsicMdxComponents {
  return {
    h1: (props) => (
      <h2
        {...props}
        className="mt-12 mb-4 scroll-mt-20 text-2xl font-semibold tracking-tight text-balance first:mt-0"
      />
    ),
    h2: (props) => (
      <h2
        {...props}
        className="mt-10 mb-4 scroll-mt-20 text-lg font-semibold tracking-tight text-balance first:mt-0"
      />
    ),
    h3: (props) => (
      <h3
        {...props}
        className="mt-8 mb-2 scroll-mt-20 text-base font-semibold tracking-tight text-balance"
      />
    ),
    h4: (props) => (
      <h4
        {...props}
        className="mt-7 mb-2 scroll-mt-20 text-sm font-semibold tracking-tight"
      />
    ),
    p: (props) => (
      <p {...props} className="my-4 text-pretty first:mt-0 last:mb-0" />
    ),
    a: ({ href, children, ...props }) => {
      if (
        href !== undefined &&
        href.startsWith('/') &&
        !href.startsWith('//')
      ) {
        return (
          <LocaleLink
            to={href}
            className="font-medium text-foreground underline decoration-border-strong underline-offset-[3px] transition-colors hover:decoration-foreground"
          >
            {children}
          </LocaleLink>
        )
      }
      return (
        <a
          href={href}
          {...(href !== undefined && href.startsWith('#')
            ? {}
            : { target: '_blank', rel: 'noreferrer noopener' })}
          className="font-medium text-foreground underline decoration-border-strong underline-offset-[3px] transition-colors hover:decoration-foreground"
          {...props}
        >
          {children}
        </a>
      )
    },
    ul: (props) => (
      <ul {...props} className="my-4 list-disc space-y-1.5 ps-5" />
    ),
    ol: (props) => (
      <ol {...props} className="my-4 list-decimal space-y-1.5 ps-5" />
    ),
    li: (props) => <li {...props} className="[overflow-wrap:anywhere]" />,
    blockquote: ({ children, ...props }) => {
      const lead = collectText(children).trim()
      const gfm = lead.match(
        /^\[!(TIP|NOTE|INFO|WARNING|CAUTION|DANGER|IMPORTANT)\]\s*([\s\S]*)$/i,
      )
      if (gfm) {
        return (
          <Callout type={gfm[1].toLowerCase()}>
            {gfm[2].trim() ? <p>{gfm[2].trim()}</p> : null}
          </Callout>
        )
      }
      const named = lead.match(
        /^(tip|info|note|warning|caution|danger|success|important)\b[:：]?\s*([\s\S]*)$/i,
      )
      if (named) {
        return (
          <Callout type={named[1].toLowerCase()}>
            {named[2].trim() ? <p>{named[2].trim()}</p> : null}
          </Callout>
        )
      }
      return (
        <blockquote
          {...props}
          className="my-4 border-l-2 border-border-strong pl-4 text-muted-foreground"
        >
          {children}
        </blockquote>
      )
    },
    img: ({ alt, ...props }) => (
      <img
        {...props}
        alt={alt ?? ''}
        className="my-6 h-auto w-full rounded-xl border border-border bg-card"
      />
    ),
    hr: () => <hr className="my-8 border-t border-border" />,
    table: ({ children }) => (
      <div className="my-5 max-w-full min-w-0 overflow-x-auto rounded-xl border border-border [&_tbody_tr:last-child>td]:border-0 [scrollbar-width:thin]">
        <table className="min-w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: (props) => (
      <th
        {...props}
        className="border-b border-border bg-muted/50 px-3 py-2 text-left font-medium"
      />
    ),
    td: (props) => (
      <td {...props} className="border-b border-border px-3 py-2 align-top" />
    ),
    pre: ({ children }) => <CodeFence>{children}</CodeFence>,
    code: ({ children, className, ...props }) => (
      <code
        className={cn(
          'rounded bg-muted px-1.5 py-0.5 font-mono text-[0.875em] [pre_&]:bg-transparent [pre_&]:p-0 [pre_&]:text-[13px]',
          className,
        )}
        {...props}
      >
        {children}
      </code>
    ),
  }
}

function CodeFence({ children }: { children?: ReactNode }) {
  const code = collectText(children)
  const lang = fenceLanguage(children)
  const callout = lang ? normalizeCalloutType(lang) : undefined
  if (callout) {
    return (
      <Callout type={callout}>
        {code.split(/\n\n+/).map((para, index) => (
          <p key={index}>{para}</p>
        ))}
      </Callout>
    )
  }

  return (
    <div className="my-5 min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-3 py-1.5">
        <span className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {lang || 'text'}
        </span>
        {code === '' ? null : (
          <CopyButton
            text={code}
            className="size-7 border-0 bg-transparent hover:bg-muted"
          />
        )}
      </div>
      <pre className="max-w-full min-w-0 overflow-x-auto p-4 font-mono text-[13px] leading-relaxed [scrollbar-width:thin]">
        {children}
      </pre>
    </div>
  )
}

function fenceLanguage(node: ReactNode): string | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = fenceLanguage(child)
      if (found) return found
    }
    return undefined
  }
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const className = (node as { props?: { className?: string } }).props?.className
    const match = className?.match(/language-([A-Za-z0-9_+-]+)/)
    if (match) return match[1]
    return fenceLanguage((node as { props?: { children?: ReactNode } }).props?.children)
  }
  return undefined
}

function collectText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(collectText).join('')
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: ReactNode } }).props
    return collectText(props?.children)
  }
  return ''
}

export function asMdxComponents(
  components: IntrinsicMdxComponents,
  extra?: MDXComponents,
): MDXComponents {
  // @types/mdx derives intrinsic props from the global JSX namespace, while
  // React 19 exports JSX from `react`. Keep the renderer locally type-safe and
  // bridge those structurally equivalent maps only at the package boundary.
  return { ...components, ...extra } as unknown as MDXComponents
}
