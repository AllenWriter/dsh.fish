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
import zhTWJson from './zh-TW.json'
import jaJson from './ja.json'
import koJson from './ko.json'
import esJson from './es.json'
import frJson from './fr.json'
import deJson from './de.json'
import ptBRJson from './pt-BR.json'
import ruJson from './ru.json'

export type MessageKey = keyof typeof enJson

/** Shape every language must satisfy: same keys as English, no gaps. */
export type Catalog = Readonly<Record<MessageKey, string>>

export const en: Catalog = enJson
export const zhCN: Catalog = zhCNJson
export const zhTW: Catalog = zhTWJson
export const ja: Catalog = jaJson
export const ko: Catalog = koJson
export const es: Catalog = esJson
export const fr: Catalog = frJson
export const de: Catalog = deJson
export const ptBR: Catalog = ptBRJson
export const ru: Catalog = ruJson
