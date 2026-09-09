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

/**
 * Sanitized WeChat archive fragment. Inline styles are intentional — do not
 * strip them in CSS. Images already point at `/blog/wechat/<slug>/images/…`.
 */
export function BlogWechatHtml({ html }: { html: string }) {
  return (
    <div
      className="wechat-html-body max-w-none [&_img]:h-auto [&_img]:max-w-full"
      // HTML is sanitized in the loader (prepareWechatHtmlBody) before reaching here.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
