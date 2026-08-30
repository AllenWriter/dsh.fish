/**
 * Message catalogs. Copy lives in JSON so it is data, not code; this module
 * is the typed seam.
 *
 * English is the source of truth: `MessageKey` is derived from `en.json`, and
 * every other file is assigned as `Catalog` so a missing key fails the
 * typecheck. Extra keys, blanks and placeholder drift are caught by
 * `i18n.test.ts`.
 *
 * Product names (dsh, DeepSeek Harness, MCP, SKILL.md) stay as written in
 * every language — they are identifiers, not prose.
 */
import enJson from './en.json'
import zhCNJson from './zh-CN.json'
import jaJson from './ja.json'

export type MessageKey = keyof typeof enJson

/** Shape every language must satisfy: same keys as English, no gaps. */
export type Catalog = Readonly<Record<MessageKey, string>>

export const en: Catalog = enJson
export const zhCN: Catalog = zhCNJson
export const ja: Catalog = jaJson
