import type { Components } from 'react-markdown'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { proseMdxComponents } from '@/shared/ui/mdx-prose'
import { docsHeadingIdFactory, docsMarkdownChildText, stripDocsFrontmatter } from './toc'

/**
 * react-markdown tag map for product docs.
 *
 * The same prose components the blog uses — underlined links, copyable
 * fences, ```tip and `> [!NOTE]` callouts — plus GitHub-style heading ids so
 * the on-this-page rail can jump. The page owns `<h1>` from the manifest
 * title, so a Markdown `#` renders as `<h2>`.
 */
function docsMarkdownComponents(): Components {
  const base = proseMdxComponents()
  const idFor = docsHeadingIdFactory()

  function heading(tag: 'h1' | 'h2' | 'h3' | 'h4') {
    const Original = base[tag]!
    return (props: { node?: unknown; children?: unknown } & Record<string, unknown>) => {
      const { node: _node, children, ...rest } = props
      const text = docsMarkdownChildText(children)
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

export function DocsMarkdown({ markdown }: { markdown: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={docsMarkdownComponents()}>
      {stripDocsFrontmatter(markdown)}
    </Markdown>
  )
}
