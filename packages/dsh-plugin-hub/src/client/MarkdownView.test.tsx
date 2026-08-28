/**
 * @vitest-environment jsdom
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MarkdownView } from './MarkdownView.js'

describe('MarkdownView', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders headings from h1 to h6', () => {
    const markdown = `# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6`

    render(<MarkdownView source={markdown} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Heading 1' })).toBeDefined()
    expect(screen.getByRole('heading', { level: 3, name: 'Heading 2' })).toBeDefined()
    expect(screen.getByRole('heading', { level: 4, name: 'Heading 3' })).toBeDefined()
    expect(screen.getByRole('heading', { level: 5, name: 'Heading 4' })).toBeDefined()
    expect(screen.getByRole('heading', { level: 6, name: 'Heading 5' })).toBeDefined()
    expect(screen.getByRole('heading', { level: 6, name: 'Heading 6' })).toBeDefined()
  })

  it('renders linked image badges without breaking', () => {
    const markdown =
      '[![NPM Version](https://img.shields.io/npm/v/@dsh-fish/hub.svg)](https://www.npmjs.com/package/@dsh-fish/hub) [![License](https://img.shields.io/npm/l/@dsh-fish/hub.svg)](https://github.com/stvlynn/dsh.fish/blob/main/LICENSE)'

    render(<MarkdownView source={markdown} />)

    const links = screen.getAllByRole('link')
    expect(links.length).toBe(2)
    expect(links[0]?.getAttribute('href')).toBe('https://www.npmjs.com/package/@dsh-fish/hub')
    expect(links[1]?.getAttribute('href')).toBe(
      'https://github.com/stvlynn/dsh.fish/blob/main/LICENSE',
    )
  })

  it('renders code blocks with language tag and inline code', () => {
    const markdown = `Here is \`inline code\`:

\`\`\`typescript
const a = 1;
console.log(a);
\`\`\`
`

    render(<MarkdownView source={markdown} />)

    expect(screen.getByText('inline code')).toBeDefined()
    expect(screen.getByText('typescript')).toBeDefined()
    expect(screen.getByText(/const a = 1;/)).toBeDefined()
  })

  it('renders lists and task lists', () => {
    const markdown = `- Item 1
- Item 2
- [x] Task done
- [ ] Task pending`

    render(<MarkdownView source={markdown} />)

    expect(screen.getByText('Item 1')).toBeDefined()
    expect(screen.getByText('Item 2')).toBeDefined()
    expect(screen.getByText('Task done')).toBeDefined()
    expect(screen.getByText('Task pending')).toBeDefined()
  })

  it('renders tables properly', () => {
    const markdown = `| Tool | Description |
|---|---|
| \`hub_search\` | Search registry |
| \`hub_install\` | Install artifact |`

    render(<MarkdownView source={markdown} />)

    expect(screen.getByText('Tool')).toBeDefined()
    expect(screen.getByText('hub_search')).toBeDefined()
    expect(screen.getByText('Search registry')).toBeDefined()
    expect(screen.getByText('hub_install')).toBeDefined()
  })

  it('never hangs or enters infinite loops on malformed or edge-case markdown', () => {
    const weirdMarkdown = `#
###
<!-- comment -->
<div align="center">
  <img src="https://example.com/logo.png" alt="Logo" />
</div>
>
| unclosed table
---
* 
`
    const { container } = render(<MarkdownView source={weirdMarkdown} />)
    expect(container).toBeDefined()
  })

  it('resolves relative docBase and assetBase', () => {
    const markdown = `[Guide](docs/guide.md) ![Icon](assets/icon.png)`

    render(
      <MarkdownView
        source={markdown}
        docBase="https://github.com/owner/repo/blob/main/"
        assetBase="https://raw.githubusercontent.com/owner/repo/main/"
      />,
    )

    const link = screen.getByRole('link', { name: 'Guide' })
    expect(link.getAttribute('href')).toBe('https://github.com/owner/repo/blob/main/docs/guide.md')

    const img = screen.getByAltText('Icon')
    expect(img.getAttribute('src')).toBe(
      'https://raw.githubusercontent.com/owner/repo/main/assets/icon.png',
    )
  })
})
