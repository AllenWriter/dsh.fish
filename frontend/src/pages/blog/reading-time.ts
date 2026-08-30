/**
 * Display reading time from bundled Markdown. Not emitted as JSON-LD
 * `wordCount` — that field is reserved for a real count we do not invent.
 *
 * Latin words run at 200 wpm. CJK scripts are counted per character at
 * 400 cpm. Mixed posts add the two estimates.
 */
const CJK =
  /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/gu

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
}

export function readingMinutesFromMarkdown(markdown: string): number {
  const body = stripFrontmatter(markdown)
  const cjk = body.match(CJK)?.length ?? 0
  const latin = body
    .replace(CJK, ' ')
    .split(/\s+/)
    .filter((token) => /[A-Za-z0-9]/.test(token)).length
  return Math.max(1, Math.ceil(cjk / 400 + latin / 200))
}
