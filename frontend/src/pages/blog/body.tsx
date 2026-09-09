import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { blogMarkdownComponents } from './mdx'
import { stripFrontmatter } from './parse'

export function BlogMarkdown({ markdown }: { markdown: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={blogMarkdownComponents()}>
      {stripFrontmatter(markdown)}
    </Markdown>
  )
}
