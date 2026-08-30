import type { MDXComponents } from 'mdx/types'
import { asMdxComponents, proseMdxComponents } from '@/shared/ui/mdx-prose'

export function blogMdxComponents(extra?: MDXComponents): MDXComponents {
  return asMdxComponents(proseMdxComponents(), extra)
}
