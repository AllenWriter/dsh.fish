import type { ComponentType } from 'react'
import { LocaleLink } from '@/shared/ui/locale-link'
import { CopyButton } from '@/shared/ui/copy-button'
import { cn } from '@/shared/lib/utils'

type MdxTagMap = Record<string, ComponentType<Record<string, unknown>> | undefined>

/**
 * MDX tag map for first-party product docs.
 *
 * Visual rules match the catalog readme renderer (underline links, no accent
 * spent on every href, fences copy through the shared button) but headings are
 * not demoted: this page owns `<h1>` from frontmatter, so MDX `#` is `<h2>`.
 */
export function docsMdxComponents(extra?: MdxTagMap): MdxTagMap {
  return {
    h1: (props) => (
      <h2 {...props} className="mt-12 mb-4 scroll-mt-20 text-2xl font-semibold tracking-tight text-balance first:mt-0" />
    ),
    h2: (props) => (
      <h2
        {...props}
        className="mt-11 mb-4 scroll-mt-20 border-t border-border pt-8 text-lg font-semibold tracking-tight text-balance first:border-0 first:pt-0 first:mt-0"
      />
    ),
    h3: (props) => (
      <h3 {...props} className="mt-8 mb-2 scroll-mt-20 text-base font-semibold tracking-tight text-balance" />
    ),
    h4: (props) => (
      <h4 {...props} className="mt-7 mb-2 scroll-mt-20 text-sm font-semibold tracking-tight" />
    ),
    p: (props) => <p {...props} className="my-4 text-pretty first:mt-0 last:mb-0" />,
    a: ({ href, children, ...props }) => {
      if (href !== undefined && href.startsWith('/') && !href.startsWith('//')) {
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
    ul: (props) => <ul {...props} className="my-4 list-disc space-y-1.5 ps-5" />,
    ol: (props) => <ol {...props} className="my-4 list-decimal space-y-1.5 ps-5" />,
    li: (props) => <li {...props} className="[overflow-wrap:anywhere]" />,
    blockquote: (props) => (
      <blockquote {...props} className="my-4 border-l-2 border-border-strong pl-4 text-muted-foreground" />
    ),
    hr: () => <hr className="my-8 border-t border-border" />,
    table: ({ children }) => (
      <div className="my-5 max-w-full min-w-0 overflow-x-auto rounded-xl border border-border [&_tbody_tr:last-child>td]:border-0 [scrollbar-width:thin]">
        <table className="min-w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: (props) => (
      <th {...props} className="border-b border-border bg-muted/50 px-3 py-2 text-left font-medium" />
    ),
    td: (props) => <td {...props} className="border-b border-border px-3 py-2 align-top" />,
    pre: ({ children, ...props }) => <CodeFence {...props}>{children}</CodeFence>,
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
    ...extra,
  }
}

function CodeFence({ children }: { children?: React.ReactNode }) {
  const code = collectText(children)
  return (
    <div className="relative my-5 min-w-0 max-w-full">
      <pre className="max-w-full min-w-0 overflow-x-auto rounded-xl border border-border bg-card p-4 pr-12 font-mono text-[13px] leading-relaxed [scrollbar-width:thin]">
        {children}
      </pre>
      {code === '' ? null : (
        <CopyButton
          text={code}
          className="absolute right-2.5 top-2.5"
        />
      )}
    </div>
  )
}

function collectText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(collectText).join('')
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: React.ReactNode } }).props
    return collectText(props?.children)
  }
  return ''
}
