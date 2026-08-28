import { useState, type ReactNode } from 'react'

export interface MarkdownViewProps {
  source: string
  docBase?: string
  assetBase?: string
  className?: string
}

export function MarkdownView({
  source,
  docBase,
  assetBase,
  className = '',
}: MarkdownViewProps): JSX.Element {
  if (!source || source.trim() === '') {
    return <div className={`dshFish__prose ${className}`} />
  }

  const elements = parseMarkdown(source, docBase, assetBase)

  return <div className={`dshFish__prose ${className}`}>{elements}</div>
}

function resolveUrl(url: string, base?: string): string {
  const trimmed = url.trim()
  if (trimmed === '' || trimmed.startsWith('#')) return trimmed
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('//')) {
    if (/^(https?:|mailto:|#)/i.test(trimmed)) return trimmed
    return ''
  }
  if (!base) return trimmed
  try {
    return new URL(trimmed.replace(/^\/+/, ''), base).toString()
  } catch {
    return ''
  }
}

/**
 * Parses inline markdown:
 * - Badges / Linked images: [![alt](imgUrl)](linkUrl)
 * - Images: ![alt](imgUrl)
 * - Links: [text](linkUrl)
 * - Autolinks: https://...
 * - Inline code: `code`
 * - Bold: **text** / __text__
 * - Italic: *text* / _text_
 * - Strikethrough: ~~text~~
 * - HTML tags & entities: <br/>, &amp;, &lt;, &gt;, etc.
 */
export function renderInline(text: string, docBase?: string, assetBase?: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let index = 0
  let key = 0

  while (index < text.length) {
    // 1. Linked Image Badge: [![alt](imgSrc)](linkUrl)
    if (text.startsWith('[![', index)) {
      const altClose = text.indexOf(']', index + 3)
      if (altClose !== -1 && text[altClose + 1] === '(') {
        const imgClose = text.indexOf(')', altClose + 2)
        if (imgClose !== -1 && text.slice(imgClose + 1, imgClose + 3) === '](') {
          const linkClose = text.indexOf(')', imgClose + 3)
          if (linkClose !== -1) {
            const alt = text.slice(index + 3, altClose)
            const rawImg = text.slice(altClose + 2, imgClose).trim()
            const rawLink = text.slice(imgClose + 3, linkClose).trim()
            const resolvedImg = resolveUrl(rawImg, assetBase)
            const resolvedLink = resolveUrl(rawLink, docBase)

            if (resolvedImg && /^https?:/i.test(resolvedImg)) {
              const img = (
                <img
                  key={key++}
                  src={resolvedImg}
                  alt={alt}
                  loading="lazy"
                  decoding="async"
                  className="dshFish__badgeImg"
                />
              )
              if (resolvedLink && /^(https?:|mailto:|#)/i.test(resolvedLink)) {
                nodes.push(
                  <a
                    key={key++}
                    href={resolvedLink}
                    target={resolvedLink.startsWith('#') ? undefined : '_blank'}
                    rel={resolvedLink.startsWith('#') ? undefined : 'noreferrer noopener nofollow'}
                    className="dshFish__badgeLink"
                  >
                    {img}
                  </a>,
                )
              } else {
                nodes.push(img)
              }
              index = linkClose + 1
              continue
            }
          }
        }
      }
    }

    // 2. Standalone Image: ![alt](src)
    if (text.startsWith('![', index)) {
      const altClose = text.indexOf(']', index + 2)
      if (altClose !== -1 && text[altClose + 1] === '(') {
        const srcClose = text.indexOf(')', altClose + 2)
        if (srcClose !== -1) {
          const alt = text.slice(index + 2, altClose)
          const rawSrc = text.slice(altClose + 2, srcClose).trim()
          const resolvedSrc = resolveUrl(rawSrc, assetBase)
          if (resolvedSrc && /^https?:/i.test(resolvedSrc)) {
            nodes.push(
              <img
                key={key++}
                src={resolvedSrc}
                alt={alt}
                loading="lazy"
                decoding="async"
                className="dshFish__proseImg"
              />,
            )
          }
          index = srcClose + 1
          continue
        }
      }
    }

    // 3. Inline code: `code`
    if (text[index] === '`') {
      const end = text.indexOf('`', index + 1)
      if (end !== -1) {
        nodes.push(
          <code key={key++} className="dshFish__codeInline">
            {text.slice(index + 1, end)}
          </code>,
        )
        index = end + 1
        continue
      }
    }

    // 4. Standard Link: [text](url)
    if (text[index] === '[') {
      const textClose = text.indexOf(']', index + 1)
      if (textClose !== -1 && text[textClose + 1] === '(') {
        const urlClose = text.indexOf(')', textClose + 2)
        if (urlClose !== -1) {
          const linkText = text.slice(index + 1, textClose)
          const rawUrl = text.slice(textClose + 2, urlClose).trim()
          const resolvedUrl = resolveUrl(rawUrl, docBase)
          if (resolvedUrl && /^(https?:|mailto:|#)/i.test(resolvedUrl)) {
            nodes.push(
              <a
                key={key++}
                href={resolvedUrl}
                target={resolvedUrl.startsWith('#') ? undefined : '_blank'}
                rel={resolvedUrl.startsWith('#') ? undefined : 'noreferrer noopener nofollow'}
                className="dshFish__link"
              >
                {renderInline(linkText, docBase, assetBase)}
              </a>,
            )
          } else {
            nodes.push(
              <span key={key++}>{renderInline(linkText, docBase, assetBase)}</span>,
            )
          }
          index = urlClose + 1
          continue
        }
      }
    }

    // 5. Autolink: https://... or http://...
    if (text.startsWith('https://', index) || text.startsWith('http://', index)) {
      const match = text.slice(index).match(/^(https?:\/\/[^\s<>)"]+)/)
      if (match && match[1]) {
        const fullUrl = match[1]
        // Trim trailing punctuation like . or , or )
        const cleanUrl = fullUrl.replace(/[.,;:)]+$/, '')
        nodes.push(
          <a
            key={key++}
            href={cleanUrl}
            target="_blank"
            rel="noreferrer noopener nofollow"
            className="dshFish__link"
          >
            {cleanUrl}
          </a>,
        )
        index += cleanUrl.length
        continue
      }
    }

    // 6. Bold: **text** or __text__
    if (text.startsWith('**', index) || text.startsWith('__', index)) {
      const marker = text.slice(index, index + 2)
      const end = text.indexOf(marker, index + 2)
      if (end !== -1) {
        const boldText = text.slice(index + 2, end)
        nodes.push(
          <strong key={key++}>{renderInline(boldText, docBase, assetBase)}</strong>,
        )
        index = end + 2
        continue
      }
    }

    // 7. Strikethrough: ~~text~~
    if (text.startsWith('~~', index)) {
      const end = text.indexOf('~~', index + 2)
      if (end !== -1) {
        const strikeText = text.slice(index + 2, end)
        nodes.push(<del key={key++}>{renderInline(strikeText, docBase, assetBase)}</del>)
        index = end + 2
        continue
      }
    }

    // 8. Italic: *text* or _text_
    const currentChar = text[index]
    const nextChar = text[index + 1]
    if (
      (currentChar === '*' || currentChar === '_') &&
      nextChar !== undefined &&
      nextChar !== ' ' &&
      nextChar !== '\t' &&
      nextChar !== '\n'
    ) {
      const marker = currentChar
      const end = text.indexOf(marker, index + 1)
      if (end !== -1 && text[end - 1] !== ' ' && text[end - 1] !== '\t') {
        const italicText = text.slice(index + 1, end)
        nodes.push(<em key={key++}>{renderInline(italicText, docBase, assetBase)}</em>)
        index = end + 1
        continue
      }
    }

    // 9. HTML tag stripping / rendering for safe common tags (<br>, <img>, etc.)
    if (text[index] === '<') {
      // Check for <br> or <br/>
      if (/^<br\s*\/?>/i.test(text.slice(index))) {
        const match = text.slice(index).match(/^<br\s*\/?>/i)
        nodes.push(<br key={key++} />)
        index += match ? match[0].length : 4
        continue
      }
      // Check for HTML comments: <!-- ... -->
      if (text.startsWith('<!--', index)) {
        const commentEnd = text.indexOf('-->', index + 4)
        if (commentEnd !== -1) {
          index = commentEnd + 3
          continue
        }
      }
      // Check for <img src="..." alt="..." />
      const imgMatch = text.slice(index).match(/^<img\s+([^>]*)\/?>/i)
      if (imgMatch && imgMatch[0] && imgMatch[1]) {
        const attrs = imgMatch[1]
        const srcMatch = attrs.match(/src=["']([^"']+)["']/i)
        const altMatch = attrs.match(/alt=["']([^"']*)["']/i)
        if (srcMatch && srcMatch[1]) {
          const resolvedSrc = resolveUrl(srcMatch[1], assetBase)
          if (resolvedSrc && /^https?:/i.test(resolvedSrc)) {
            nodes.push(
              <img
                key={key++}
                src={resolvedSrc}
                alt={altMatch?.[1] ?? ''}
                loading="lazy"
                decoding="async"
                className="dshFish__proseImg"
              />,
            )
          }
        }
        index += imgMatch[0].length
        continue
      }
      // Strip generic HTML tags: <tag ...> or </tag>
      const genericTag = text.slice(index).match(/^<\/?[a-zA-Z0-9_-]+(?:\s+[^>]*?)?>/)
      if (genericTag && genericTag[0]) {
        index += genericTag[0].length
        continue
      }
    }

    // Character span until next special marker
    let nextSpecial = index + 1
    while (nextSpecial < text.length) {
      const c = text[nextSpecial]
      if (
        c === '`' ||
        c === '[' ||
        c === '*' ||
        c === '_' ||
        c === '<' ||
        c === '~' ||
        (c === '!' && text[nextSpecial + 1] === '[') ||
        (c === 'h' && (text.startsWith('https://', nextSpecial) || text.startsWith('http://', nextSpecial)))
      ) {
        break
      }
      nextSpecial++
    }

    nodes.push(text.slice(index, nextSpecial))
    index = nextSpecial
  }

  return nodes
}

export function parseMarkdown(
  source: string,
  docBase?: string,
  assetBase?: string,
): JSX.Element[] {
  // Normalize newlines and strip HTML comments
  const cleanSource = source
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')

  const lines = cleanSource.split('\n')
  const blocks: JSX.Element[] = []
  let index = 0
  let blockKey = 0

  while (index < lines.length) {
    const rawLine = lines[index] ?? ''
    const trimmed = rawLine.trim()

    // 1. Skip empty lines
    if (trimmed === '') {
      index++
      continue
    }

    // 2. Code Fence: ```lang or ~~~lang
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      const marker = trimmed.slice(0, 3)
      const lang = trimmed.slice(3).trim()
      const codeLines: string[] = []
      index++
      while (index < lines.length && !lines[index]?.trim().startsWith(marker)) {
        codeLines.push(lines[index] ?? '')
        index++
      }
      if (index < lines.length) index++ // Consume closing fence
      const code = codeLines.join('\n')
      blocks.push(<CodeBlock key={blockKey++} code={code} lang={lang} />)
      continue
    }

    // 3. Headings: # H1, ## H2, ..., ###### H6
    const headingMatch = trimmed.match(/^(#{1,6})(?:\s+(.*?))?(?:\s+#+)?$/)
    if (headingMatch && headingMatch[1]) {
      const level = headingMatch[1].length
      const headingContent = headingMatch[2]?.trim() ?? ''
      const Tag = (`h${Math.min(6, level + 1)}` as keyof JSX.IntrinsicElements)
      blocks.push(
        <Tag key={blockKey++} className={`dshFish__h${level}`}>
          {renderInline(headingContent, docBase, assetBase)}
        </Tag>,
      )
      index++
      continue
    }

    // 4. Horizontal Rule: ---, ***, ___
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(trimmed)) {
      blocks.push(<hr key={blockKey++} className="dshFish__hr" />)
      index++
      continue
    }

    // 5. Blockquotes: > quote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = []
      while (index < lines.length && (lines[index]?.trim().startsWith('>') || (lines[index]?.trim() !== '' && quoteLines.length > 0 && !lines[index]?.trim().startsWith('#') && !lines[index]?.trim().startsWith('```')))) {
        const qLine = lines[index]?.trim() ?? ''
        if (qLine.startsWith('>')) {
          quoteLines.push(qLine.replace(/^>\s?/, ''))
        } else if (qLine === '') {
          break
        } else {
          quoteLines.push(qLine)
        }
        index++
      }
      blocks.push(
        <blockquote key={blockKey++} className="dshFish__blockquote">
          {renderInline(quoteLines.join(' '), docBase, assetBase)}
        </blockquote>,
      )
      continue
    }

    // 6. Unordered Lists: - item, * item, + item, including task lists [ ] / [x]
    if (/^(\s*)[-*+]\s+(.*)$/.test(rawLine)) {
      const listItems: JSX.Element[] = []
      let itemKey = 0
      while (index < lines.length && /^(\s*)[-*+]\s+(.*)$/.test(lines[index] ?? '')) {
        const itemLine = lines[index] ?? ''
        const match = itemLine.match(/^(\s*)[-*+]\s+(.*)$/)
        if (match && match[2] !== undefined) {
          const itemText = match[2]
          // Check task checkbox: [ ] or [x]
          if (itemText.startsWith('[ ] ') || itemText.startsWith('[x] ') || itemText.startsWith('[X] ')) {
            const isChecked = !itemText.startsWith('[ ] ')
            const taskContent = itemText.slice(4)
            listItems.push(
              <li key={itemKey++} className="dshFish__taskItem">
                <input
                  type="checkbox"
                  checked={isChecked}
                  readOnly
                  className="dshFish__checkbox"
                />
                <span>{renderInline(taskContent, docBase, assetBase)}</span>
              </li>,
            )
          } else {
            listItems.push(
              <li key={itemKey++}>{renderInline(itemText, docBase, assetBase)}</li>,
            )
          }
        }
        index++
      }
      blocks.push(
        <ul key={blockKey++} className="dshFish__ul">
          {listItems}
        </ul>,
      )
      continue
    }

    // 7. Ordered Lists: 1. item, 2. item
    if (/^\s*\d+\.\s+(.*)$/.test(rawLine)) {
      const listItems: JSX.Element[] = []
      let itemKey = 0
      while (index < lines.length && /^\s*\d+\.\s+(.*)$/.test(lines[index] ?? '')) {
        const itemLine = lines[index] ?? ''
        const match = itemLine.match(/^\s*\d+\.\s+(.*)$/)
        if (match && match[1] !== undefined) {
          listItems.push(
            <li key={itemKey++}>{renderInline(match[1], docBase, assetBase)}</li>,
          )
        }
        index++
      }
      blocks.push(
        <ol key={blockKey++} className="dshFish__ol">
          {listItems}
        </ol>,
      )
      continue
    }

    // 8. Tables: | col1 | col2 | or col1 | col2
    if (trimmed.includes('|') && (index + 1 < lines.length && lines[index + 1]?.includes('|') && lines[index + 1]?.includes('-'))) {
      const tableLines: string[] = []
      while (index < lines.length && (lines[index]?.trim().includes('|') || lines[index]?.trim().startsWith('|-'))) {
        tableLines.push(lines[index]?.trim() ?? '')
        index++
      }
      if (tableLines.length >= 2) {
        const headerCells = parseTableRow(tableLines[0] ?? '')
        // Skip delimiter line (index 1)
        const rowLines = tableLines.slice(2)
        const rows = rowLines.map(parseTableRow)
        blocks.push(
          <div key={blockKey++} className="dshFish__tableWrapper">
            <table className="dshFish__table">
              <thead>
                <tr>
                  {headerCells.map((cell, i) => (
                    <th key={i}>{renderInline(cell, docBase, assetBase)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c}>{renderInline(cell, docBase, assetBase)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        )
        continue
      }
    }

    // 9. Standard Paragraph (consume continuous prose lines)
    const paragraphLines: string[] = []
    while (
      index < lines.length &&
      lines[index]?.trim() !== '' &&
      !lines[index]?.trim().startsWith('```') &&
      !lines[index]?.trim().startsWith('~~~') &&
      !lines[index]?.trim().match(/^#{1,6}(\s+|$)/) &&
      !lines[index]?.trim().startsWith('>') &&
      !/^(\s*)[-*+]\s+/.test(lines[index] ?? '') &&
      !/^\s*\d+\.\s+/.test(lines[index] ?? '') &&
      !/^(\*{3,}|-{3,}|_{3,})\s*$/.test(lines[index]?.trim() ?? '')
    ) {
      paragraphLines.push(lines[index]?.trim() ?? '')
      index++
    }

    if (paragraphLines.length > 0) {
      blocks.push(
        <p key={blockKey++} className="dshFish__p">
          {renderInline(paragraphLines.join(' '), docBase, assetBase)}
        </p>,
      )
    } else {
      // Guaranteed progress to avoid infinite loops on unmatched lines
      const fallbackLine = lines[index]?.trim() ?? ''
      if (fallbackLine !== '') {
        blocks.push(
          <p key={blockKey++} className="dshFish__p">
            {renderInline(fallbackLine, docBase, assetBase)}
          </p>,
        )
      }
      index++
    }
  }

  return blocks
}

function parseTableRow(line: string): string[] {
  let cleaned = line.trim()
  if (cleaned.startsWith('|')) cleaned = cleaned.slice(1)
  if (cleaned.endsWith('|')) cleaned = cleaned.slice(0, -1)
  return cleaned.split('|').map((c) => c.trim())
}

function CodeBlock({ code, lang }: { code: string; lang?: string }): JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(code).then(() => {
        setCopied(true)
        setTimeout(() => { setCopied(false) }, 2000)
      })
    }
  }

  return (
    <div className="dshFish__codeBlock">
      <div className="dshFish__codeBlockHead">
        {lang ? <span className="dshFish__codeLang">{lang}</span> : <span />}
        <button
          type="button"
          className="dshFish__codeCopyBtn"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="dshFish__pre">
        <code>{code}</code>
      </pre>
    </div>
  )
}
