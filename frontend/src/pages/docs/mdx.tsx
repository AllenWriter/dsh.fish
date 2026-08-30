import type { MDXComponents } from 'mdx/types'
import { DocsVideo } from '@/widgets/docs-media'
import { asMdxComponents, proseMdxComponents } from '@/shared/ui/mdx-prose'

/**
 * MDX tag map for first-party product docs.
 *
 * Prose tags are shared with the blog. DocsVideo stays here: only product
 * docs embed the controlled clips.
 */
export function docsMdxComponents(extra?: MDXComponents): MDXComponents {
  return asMdxComponents(proseMdxComponents(), { DocsVideo, ...extra })
}
