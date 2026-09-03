import type { MDXComponents } from 'mdx/types'
import type { Components } from 'react-markdown'
import { asMdxComponents, proseMdxComponents } from '@/shared/ui/mdx-prose'
import { headingIdFactory, markdownChildText } from './toc'

export function blogMdxComponents(extra?: MDXComponents): MDXComponents {
  return asMdxComponents(proseMdxComponents(), extra)
}

/**
 * react-markdown tag map. Same visual components as compiled MDX, plus
 * GitHub-style heading ids so the on-this-page rail can jump.
 */
export function blogMarkdownComponents(): Components {
  const base = proseMdxComponents()
  const idFor = headingIdFactory()

  function heading(tag: 'h1' | 'h2' | 'h3' | 'h4') {
    const Original = base[tag]!
    return (props: { node?: unknown; children?: unknown } & Record<string, unknown>) => {
      const { node: _node, children, ...rest } = props
      const text = markdownChildText(children)
      return (
        <Original {...rest} id={text === '' ? undefined : idFor(text)}>
          {children as never}
        </Original>
      )
    }
  }

  const components: Record<string, unknown> = {}
  for (const [tag, Original] of Object.entries(base)) {
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') continue
    components[tag] = (props: { node?: unknown } & Record<string, unknown>) => {
      const { node: _node, ...rest } = props
      return <Original {...rest} />
    }
  }

  return {
    ...components,
    h1: heading('h1'),
    h2: heading('h2'),
    h3: heading('h3'),
    h4: heading('h4'),
  } as Components
}
