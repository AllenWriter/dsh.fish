import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DocsMarkdown } from './body'
import { tocFromDocsMarkdown } from './toc'

/**
 * Standing proof that dropping MDX did not drop docs affordances.
 *
 * Callouts now come from a Markdown convention (named fences, GitHub alerts,
 * a leading type word) rather than a JSX tag, headings carry the same ids the
 * right-hand TOC links to, and a tag inside a fence stays a code sample. The
 * fixtures are the real guides, so a content edit that needs a renderer change
 * fails here rather than in production.
 */
function render(markdown: string) {
  return renderToStaticMarkup(<DocsMarkdown markdown={markdown} />)
}

const ADMONITIONS = readFileSync('content/docs/docusaurus-admonitions.mdx', 'utf8')
const MINTLIFY = readFileSync('content/docs/dify-docs-engineering.mdx', 'utf8')

describe('DocsMarkdown', () => {
  it('renders named fences, GitHub alerts and a leading type word as callouts', () => {
    const html = render(ADMONITIONS)

    for (const kind of ['tip', 'info', 'warning', 'danger', 'success', 'note']) {
      expect(html, kind).toContain(`data-callout="${kind}"`)
    }
    // A real language fence keeps the code chrome instead.
    expect(html).toContain('<pre')
    expect(html).toContain('export const n = 1')
  })

  it('keeps a fenced Mintlify example as code, not a rendered tag', () => {
    const html = render(MINTLIFY)

    expect(html).toContain('&lt;Info&gt;')
    expect(html).not.toContain('data-callout')
  })

  it('drops frontmatter and gives every heading its TOC anchor', () => {
    const html = render(MINTLIFY)

    expect(html).not.toContain('description:')
    const toc = tocFromDocsMarkdown(MINTLIFY)
    expect(toc.length).toBeGreaterThan(0)
    for (const item of toc) {
      expect(html, item.url).toContain(`id="${item.url.slice(1)}"`)
    }
  })

  it('never turns raw HTML in a body into live markup', () => {
    // Same rule as the blog body renderer: first-party Markdown is not a JSX
    // surface, so a stray tag is inert text rather than an element.
    const html = render('# T\n\n<div onclick="x()">boxed</div>\n')

    expect(html).not.toMatch(/<div[^>]*onclick/)
    expect(html).toContain('&lt;div onclick=&quot;x()&quot;&gt;')
  })
})
