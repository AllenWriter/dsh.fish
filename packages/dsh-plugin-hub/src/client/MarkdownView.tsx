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

  const elements = parseMarkdownBlocks(source, docBase, assetBase)

  return (
    <div className={`dshFish__prose ${className}`}>
      {elements}
    </div>
  )
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

function renderInline(text: string, docBase?: string, assetBase?: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let index = 0
  let key = 0

  while (index < text.length) {
    // 1. Inline code: `code`
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

    // 2. Images: ![alt](src)
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

    // 3. Links: [text](url)
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
            nodes.push(<span key={key++}>{linkText}</span>)
          }
          index = urlClose + 1
          continue
        }
      }
    }

    // 4. Bold: **text** or __text__
    if (text.startsWith('**', index) || text.startsWith('__', index)) {
      const marker = text.slice(index, index + 2)
      const end = text.indexOf(marker, index + 2)
      if (end !== -1) {
        const boldText = text.slice(index + 2, end)
        nodes.push(
          <strong key={key++}>
            {renderInline(boldText, docBase, assetBase)}
          </strong>,
        )
        index = end + 2
        continue
      }
    }

    // 5. Italic: *text* or _text_ (ensure not followed by space or part of bold)
    const currentChar = text[index]
    const nextChar = text[index + 1]
    if ((currentChar === '*' || currentChar === '_') && nextChar !== undefined && nextChar !== ' ') {
      const marker = currentChar
      const end = text.indexOf(marker, index + 1)
      if (end !== -1 && text[end - 1] !== ' ') {
        const italicText = text.slice(index + 1, end)
        nodes.push(
          <em key={key++}>
            {renderInline(italicText, docBase, assetBase)}
          </em>,
        )
        index = end + 1
        continue
      }
    }

    // Normal character run
    let nextSpecial = index + 1
    while (nextSpecial < text.length) {
      const char = text[nextSpecial]
      if (
        char === '`' ||
        char === '[' ||
        char === '*' ||
        char === '_' ||
        (char === '!' && text[nextSpecial + 1] === '[')
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

function parseMarkdownBlocks(
  source: string,
  docBase?: string,
  assetBase?: string,
): JSX.Element[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: JSX.Element[] = []
  let index = 0
  let blockKey = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''

    // Empty lines
    if (line.trim() === '') {
      index++
      continue
    }

    // 1. Code Fence: ```lang
    if (line.trim().startsWith('```')) {
      const fenceMarker = line.trim().slice(0, 3)
      const lang = line.trim().slice(3).trim()
      const codeLines: string[] = []
      index++
      while (index < lines.length && !lines[index]?.trim().startsWith(fenceMarker)) {
        codeLines.push(lines[index] ?? '')
        index++
      }
      if (index < lines.length) index++ // consume closing fence
      const code = codeLines.join('\n')
      blocks.push(
        <CodeBlock key={blockKey++} code={code} lang={lang} />,
      )
      continue
    }

    // 2. Headings: # H1, ## H2, etc.
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch && headingMatch[1] && headingMatch[2] !== undefined) {
      const level = headingMatch[1].length
      const headingContent = headingMatch[2].trim()
      const Tag = (`h${Math.min(6, level + 1)}` as keyof JSX.IntrinsicElements)
      blocks.push(
        <Tag key={blockKey++} className={`dshFish__h${level}`}>
          {renderInline(headingContent, docBase, assetBase)}
        </Tag>,
      )
      index++
      continue
    }

    // 3. Horizontal rule: ---, ***, ___
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) {
      blocks.push(<hr key={blockKey++} className="dshFish__hr" />)
      index++
      continue
    }

    // 4. Blockquote: > ...
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = []
      while (index < lines.length && lines[index]?.trim().startsWith('>')) {
        quoteLines.push(lines[index]?.trim().replace(/^>\s?/, '') ?? '')
        index++
      }
      blocks.push(
        <blockquote key={blockKey++} className="dshFish__blockquote">
          {renderInline(quoteLines.join(' '), docBase, assetBase)}
        </blockquote>,
      )
      continue
    }

    // 5. Unordered list: - or *
    if (/^(\s*)[-*+]\s+(.*)$/.test(line)) {
      const listItems: JSX.Element[] = []
      let itemKey = 0
      while (index < lines.length && /^(\s*)[-*+]\s+(.*)$/.test(lines[index] ?? '')) {
        const itemLine = lines[index] ?? ''
        const match = itemLine.match(/^(\s*)[-*+]\s+(.*)$/)
        if (match && match[2] !== undefined) {
          listItems.push(
            <li key={itemKey++}>
              {renderInline(match[2], docBase, assetBase)}
            </li>,
          )
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

    // 6. Ordered list: 1. 2.
    if (/^\s*\d+\.\s+(.*)$/.test(line)) {
      const listItems: JSX.Element[] = []
      let itemKey = 0
      while (index < lines.length && /^\s*\d+\.\s+(.*)$/.test(lines[index] ?? '')) {
        const itemLine = lines[index] ?? ''
        const match = itemLine.match(/^\s*\d+\.\s+(.*)$/)
        if (match && match[1] !== undefined) {
          listItems.push(
            <li key={itemKey++}>
              {renderInline(match[1], docBase, assetBase)}
            </li>,
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

    // 7. Table: | col1 | col2 |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = []
      while (
        index < lines.length &&
        lines[index]?.trim().startsWith('|') &&
        lines[index]?.trim().endsWith('|')
      ) {
        tableLines.push(lines[index]?.trim() ?? '')
        index++
      }
      if (tableLines.length >= 2) {
        const headerCells = parseTableRow(tableLines[0] ?? '')
        const rows = tableLines.slice(2).map(parseTableRow)
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

    // 8. Paragraph
    const paragraphLines: string[] = []
    while (
      index < lines.length &&
      lines[index]?.trim() !== '' &&
      !lines[index]?.trim().startsWith('```') &&
      !lines[index]?.trim().startsWith('#') &&
      !lines[index]?.trim().startsWith('>') &&
      !/^(\s*)[-*+]\s+/.test(lines[index] ?? '') &&
      !/^\s*\d+\.\s+/.test(lines[index] ?? '') &&
      !/^(\*{3,}|-{3,}|_{3,})\s*$/.test(lines[index]?.trim() ?? '')
    ) {
      paragraphLines.push(lines[index] ?? '')
      index++
    }

    if (paragraphLines.length > 0) {
      blocks.push(
        <p key={blockKey++} className="dshFish__p">
          {renderInline(paragraphLines.join(' '), docBase, assetBase)}
        </p>,
      )
    }
  }

  return blocks
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim()
  const cells = trimmed
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim())
  return cells
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
