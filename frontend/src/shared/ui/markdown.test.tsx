import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Markdown } from './markdown'

/**
 * The readme is a crawl of somebody else's repository, so these tests are the
 * standing proof that rendering it cannot be turned against a visitor. They
 * assert on the emitted markup rather than on the renderer's configuration:
 * a future refactor that quietly re-enables raw HTML has to fail here.
 */
function render(markdown: string, bases?: { docBase?: string; assetBase?: string }) {
  return renderToStaticMarkup(<Markdown source={markdown} {...bases} />)
}

const GITHUB = {
  docBase: 'https://github.com/acme/thing/blob/HEAD/',
  assetBase: 'https://github.com/acme/thing/raw/HEAD/',
}

describe('Markdown safety', () => {
  it('drops raw HTML instead of rendering or printing it', () => {
    const html = render('Hello\n\n<script>alert(1)</script>\n\n<div onclick="x()">boxed</div>')

    expect(html).toContain('Hello')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onclick')
    // Not escaped-and-shown either — the tags are gone, not quoted at the reader.
    expect(html).not.toContain('&lt;script')
  })

  it('empties a javascript: url on a link and an image', () => {
    const html = render('[click](javascript:alert(1))\n\n![shot](javascript:alert(2))')

    expect(html.toLowerCase()).not.toContain('javascript:')
    // The author's link text survives; only the false affordance goes.
    expect(html).toContain('click')
  })

  it('keeps a data: image out, even with a base to resolve against', () => {
    const html = render('![x](data:text/html;base64,PHNjcmlwdD4=)', GITHUB)

    expect(html).not.toContain('data:text/html')
  })
})

describe('Markdown relative paths', () => {
  it('resolves a relative link to the source tree and an image to raw bytes', () => {
    const html = render('[guide](docs/guide.md)\n\n![shot](docs/hero.png)', GITHUB)

    expect(html).toContain('href="https://github.com/acme/thing/blob/HEAD/docs/guide.md"')
    expect(html).toContain('src="https://github.com/acme/thing/raw/HEAD/docs/hero.png"')
  })

  it('treats a leading slash as repository-root relative, not origin relative', () => {
    const html = render('![logo](/assets/logo.png)', GITHUB)

    expect(html).toContain('src="https://github.com/acme/thing/raw/HEAD/assets/logo.png"')
  })

  it('leaves an absolute url alone', () => {
    const html = render('[npm](https://www.npmjs.com/package/x)', GITHUB)

    expect(html).toContain('href="https://www.npmjs.com/package/x"')
  })

  it('renders an unresolvable relative link as text and drops its image', () => {
    const html = render('[guide](docs/guide.md)\n\n![shot](docs/hero.png)')

    expect(html).toContain('guide')
    expect(html).not.toContain('<a ')
    expect(html).not.toContain('<img')
  })

  it('keeps an in-page anchor, and gives headings the ids it needs', () => {
    const html = render('# Getting Started\n\n[jump](#getting-started)')

    expect(html).toContain('id="getting-started"')
    expect(html).toContain('href="#getting-started"')
    // An in-page link must not open a new tab.
    expect(html).not.toMatch(/<a[^>]*href="#getting-started"[^>]*target=/)
  })
})

describe('Markdown structure', () => {
  it('demotes readme headings below the page and section headings', () => {
    const html = render('# Title\n\n## Section\n\n### Detail')

    expect(html).toContain('<h3')
    expect(html).toContain('<h4')
    expect(html).toContain('<h5')
    expect(html).not.toContain('<h1')
    expect(html).not.toContain('<h2')
  })

  it('renders gfm tables, task lists and strikethrough', () => {
    const html = render(
      '| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n\n~~gone~~',
    )

    expect(html).toContain('<table')
    expect(html).toContain('<th')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('<del')
  })

  it('carries a fence through to a copy affordance, and leaves inline code alone', () => {
    const html = render('```sh\npnpm add thing\n```\n\nUse `thing` here.')

    expect(html).toContain('<pre')
    expect(html).toContain('pnpm add thing')
    expect(html).toContain('aria-label="Copy"')
    // One fence, one button — inline code gets no copy control.
    expect(html.match(/aria-label="Copy"/g)).toHaveLength(1)
  })
})
