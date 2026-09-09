/**
 * High-fidelity WeChat archive HTML for series=wechat posts.
 *
 * Materials ship `article.wechat.html` (full offline page with #js_content).
 * The blog stores a copy under `/blog/wechat/<slug>/article.wechat.html` and
 * prefers that body over Markdown when ASSETS has it. Sanitization keeps
 * inline `style` and common WeChat tags, strips script/iframe/on* handlers.
 */

const FORBIDDEN_TAGS = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'link',
  'meta',
  'base',
  'style',
  'noscript',
  'template',
  'svg',
  'math',
  'foreignobject',
])

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

/** Absolute public path for a wechat post's article HTML asset. */
export function wechatHtmlAssetPath(slug: string): string {
  return `/blog/wechat/${slug}/article.wechat.html`
}

/** Public prefix for images belonging to a wechat post. */
export function wechatImagesPublicPrefix(slug: string): string {
  return `/blog/wechat/${slug}/images/`
}

/**
 * Extract inner HTML of `#js_content`, or return the input when it is already
 * a fragment (no document chrome / no js_content wrapper).
 */
export function extractWechatJsContent(html: string): string {
  const open = /<div\b[^>]*\bid\s*=\s*["']js_content["'][^>]*>/i.exec(html)
  if (open === null) {
    // Already a fragment — drop document chrome if somehow present.
    const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html)
    return body?.[1]?.trim() ?? html.trim()
  }

  const start = open.index + open[0].length
  let i = start
  let depth = 1
  const lower = html.toLowerCase()
  while (i < html.length && depth > 0) {
    const nextOpen = lower.indexOf('<div', i)
    const nextClose = lower.indexOf('</div>', i)
    if (nextClose < 0) break
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1
      i = nextOpen + 4
      continue
    }
    depth -= 1
    if (depth === 0) return html.slice(start, nextClose).trim()
    i = nextClose + 6
  }
  return html.slice(start).trim()
}

/**
 * Rewrite relative `images/...` (and `./images/...`) src/data-src to the
 * absolute ASSETS path for this slug.
 */
export function rewriteWechatImageSrcs(html: string, slug: string): string {
  const prefix = wechatImagesPublicPrefix(slug)
  return html.replace(
    /\b(src|data-src)\s*=\s*(["'])(?:\.\/)?images\//gi,
    (_match, attr: string, quote: string) => `${attr}=${quote}${prefix}`,
  )
}

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '' || trimmed.startsWith('#')) return true
  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/html')
  ) {
    return false
  }
  // Allow data:image for tiny inline icons WeChat sometimes embeds.
  if (lower.startsWith('data:') && !lower.startsWith('data:image/')) return false
  return true
}

function sanitizeOpenTag(tagName: string, rawAttrs: string): string {
  const name = tagName.toLowerCase()
  if (FORBIDDEN_TAGS.has(name)) return ''

  const attrs: string[] = []
  const attrRe =
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match: RegExpExecArray | null
  while ((match = attrRe.exec(rawAttrs)) !== null) {
    const attrName = match[1]!.toLowerCase()
    if (attrName === '/' || attrName.startsWith('on')) continue
    if (attrName === 'srcdoc') continue
    const value = match[2] ?? match[3] ?? match[4] ?? ''
    if (
      (attrName === 'href' ||
        attrName === 'src' ||
        attrName === 'data-src' ||
        attrName === 'xlink:href' ||
        attrName === 'action' ||
        attrName === 'formaction') &&
      !isSafeUrl(value)
    ) {
      continue
    }
    if (match[2] !== undefined) attrs.push(`${match[1]}="${match[2]}"`)
    else if (match[3] !== undefined) attrs.push(`${match[1]}='${match[3]}'`)
    else if (match[4] !== undefined) attrs.push(`${match[1]}=${match[4]}`)
    else attrs.push(match[1]!)
  }

  const attrText = attrs.length > 0 ? ` ${attrs.join(' ')}` : ''
  if (VOID_TAGS.has(name)) return `<${name}${attrText}>`
  return `<${name}${attrText}>`
}

/**
 * Allowlist-ish sanitizer: drop forbidden tags (and their contents for
 * script/style/iframe/noscript), strip on* handlers and unsafe URLs, keep
 * inline `style` and ordinary WeChat markup (section/span/p/img/…).
 */
export function sanitizeWechatHtml(html: string): string {
  let out = html.replace(/<!--[\s\S]*?-->/g, '')

  for (const tag of ['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'textarea']) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), '')
    out = out.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '')
  }

  // Drop remaining forbidden open/close tags; keep their text children.
  out = out.replace(/<\/?([a-zA-Z][\w:-]*)\b[^>]*>/g, (full, tagName: string) => {
    const lower = tagName.toLowerCase()
    if (FORBIDDEN_TAGS.has(lower)) return ''
    if (full.startsWith('</')) return `</${tagName}>`
    const attrsStart = full.indexOf(tagName) + tagName.length
    const rawAttrs = full.slice(attrsStart, full.endsWith('/>') ? -2 : -1)
    return sanitizeOpenTag(tagName, rawAttrs)
  })

  return out
}

/** Full pipeline: extract → rewrite images → sanitize. */
export function prepareWechatHtmlBody(rawHtml: string, slug: string): string {
  const fragment = extractWechatJsContent(rawHtml)
  const rewritten = rewriteWechatImageSrcs(fragment, slug)
  return sanitizeWechatHtml(rewritten)
}

export type BlogWechatHtmlReader = (slug: string) => Promise<string | undefined>

const ASSETS_ORIGIN = 'https://assets.local'

function assertSafeWechatSlug(slug: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(slug) || slug.includes('..')) {
    throw new Error(`Unsafe wechat slug: ${slug}`)
  }
  return slug
}

/** Read `article.wechat.html` for a wechat slug from Worker ASSETS. */
export function assetsWechatHtmlReader(assets: {
  fetch(input: string): Promise<Response>
}): BlogWechatHtmlReader {
  return async (slug) => {
    const safe = assertSafeWechatSlug(slug)
    const response = await assets.fetch(
      `${ASSETS_ORIGIN}${wechatHtmlAssetPath(safe)}`,
    )
    if (!response.ok) return undefined
    return response.text()
  }
}
