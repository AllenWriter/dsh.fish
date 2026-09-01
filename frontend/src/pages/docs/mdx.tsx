import type { MDXComponents } from 'mdx/types'
import { DocsVideo } from '@/widgets/docs-media'
import { asMdxComponents, proseMdxComponents } from '@/shared/ui/mdx-prose'
import {
  Callout,
  Caution,
  Danger,
  Info,
  Note,
  Tip,
  Warning,
} from '@/shared/ui/docs-callout'

/**
 * MDX tag map for first-party product docs.
 *
 * Prose tags are shared with the blog. DocsVideo stays here: only product
 * docs embed the controlled clips. Callout / Tip / Info / Warning are
 * available as MDX tags; ```tip fences also render as callouts.
 */
export function docsMdxComponents(extra?: MDXComponents): MDXComponents {
  return asMdxComponents(proseMdxComponents(), {
    DocsVideo,
    Callout,
    Tip,
    Info,
    Note,
    Warning,
    Caution,
    Danger,
    ...extra,
  })
}
