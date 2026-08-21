import { estimateTokens } from './negotiate'

/**
 * A markdown variant of a page.
 *
 * Headers follow the Markdown-for-Agents conventions: `Vary: Accept` so caches
 * keep the two variants apart, `x-markdown-tokens` so an agent can budget its
 * context window without tokenizing first, and a content signal naming the
 * uses the catalog explicitly welcomes.
 */
export function markdownResponse(markdown: string): Response {
  return new Response(markdown, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      vary: 'accept',
      'cache-control': 'public, max-age=300',
      'x-markdown-tokens': String(estimateTokens(markdown)),
      'content-signal': 'ai-train=no, search=yes, ai-input=yes, use=reference',
    },
  })
}
