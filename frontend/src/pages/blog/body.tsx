import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { blogMarkdownComponents } from './mdx'
import { stripFrontmatter, stripLeadingMarkdownImage } from './parse'

export function BlogMarkdown({
  markdown,
  stripLeadingImage = false,
}: {
  markdown: string
  stripLeadingImage?: boolean
}) {
  const source = stripLeadingImage
    ? stripLeadingMarkdownImage(markdown)
    : markdown
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={blogMarkdownComponents()}>
      {stripFrontmatter(source)}
    </Markdown>
  )
}
