import type { Slug } from '../shared/slug.js'
import { CATEGORIES, knownCategories, normalizeCategories } from './category.js'
import { normalizeSearchText } from './topic.js'

/**
 * What a row can be categorised from when its author declared nothing.
 *
 * Almost no plugin declares `dsh.hub.categories`: the harness never asks for
 * it, so an author has no reason to write it. Left at that, the crawler fills
 * the catalog with rows no category filter can reach. These are the signals
 * that are always present instead — GitHub topics, npm keywords, and the one
 * sentence every source has.
 */
export interface CategoryHints {
  /** Repository topics or package keywords. */
  readonly keywords?: readonly string[]
  /** Free text: a description, a summary, a skill's frontmatter line. */
  readonly text?: string
}

/**
 * Tokens that name a category, by category.
 *
 * Deliberately concrete: tool names, ecosystem names and the nouns people
 * actually put in a repository description. A guess this table cannot support
 * is better left to `other` than invented. Words that appear in almost every
 * dsh plugin (`llm`, `theme` as a UI chrome word, `mcp`) stay out — they
 * separate nothing.
 */
const TOKENS: Readonly<Record<string, readonly string[]>> = {
  ui: [
    'command-palette', 'composer', 'dashboard', 'frontend', 'gui', 'hud',
    'layout', 'sidebar', 'spotlight', 'statusbar', 'tui', 'ui', 'ux', 'widget',
    'widgets',
  ],
  usage: [
    'billing', 'cost', 'costs', 'meter', 'quota', 'quotas', 'token-usage',
    'usage',
  ],
  theme: [
    'appearance', 'catppuccin', 'palette', 'skin', 'skins', 'theme', 'themes',
  ],
  model: [
    'anthropic', 'failover', 'gemini', 'inference', 'ollama', 'openai',
    'provider', 'providers', 'routing',
  ],
  identity: [
    'identity', 'persona', 'personas', 'profile-switch',
  ],
  session: [
    'chat-history', 'message-edit', 'rewind', 'session', 'sessions', 'transcript',
    'turn', 'turns',
  ],
  memory: [
    'knowledge-base', 'knowledge-graph', 'layered-memory', 'memento', 'memories',
    'memory', 'rag', 'recall', 'remember',
  ],
  tools: [
    'calculator', 'capability', 'capabilities', 'ops-kit', 'tavily', 'tooling',
    'toolkit', 'tools',
  ],
  browser: [
    'browser', 'crawler', 'playwright', 'scraper', 'scraping', 'web-search',
    'webbrowser',
  ],
  vision: [
    'image-understanding', 'multimodal', 'ocr', 'vision', 'vlm',
  ],
  voice: [
    'audio', 'speech', 'stt', 'tts', 'voice',
  ],
  docs: [
    'csv', 'database', 'dataset', 'docx', 'duckdb', 'excel', 'mongodb', 'mysql',
    'pandas', 'pdf', 'postgres', 'postgresql', 'redis', 'spreadsheet', 'sql',
    'sqlite', 'warehouse',
  ],
  skill: [
    'skill-pack', 'skill-picker', 'skillpack',
  ],
  workflow: [
    'auto-continue', 'automation', 'dag', 'orchestrate', 'orchestration', 'pipeline',
    'task-dag', 'workflow', 'workflows',
  ],
  git: [
    'code-review', 'commit', 'commits', 'diff', 'diffs', 'git', 'github',
    'gitlab', 'pull-request', 'refactor', 'review',
  ],
  notify: [
    'dingtalk', 'discord', 'feishu', 'im', 'notification', 'notifications',
    'notify', 'slack', 'telegram', 'wechat', 'whatsapp',
  ],
  dev: [
    'debugger', 'docker', 'ide', 'kubernetes', 'lsp', 'runtime', 'sysmon',
    'terminal', 'terraform',
  ],
  security: [
    'audit', 'encryption', 'mcpguard', 'pentest', 'permission', 'permissions',
    'pii', 'redact', 'redaction', 'sandbox', 'sast', 'secret', 'secrets',
    'security', 'vulnerability',
  ],
  remote: [
    'lan', 'mobile', 'remote', 'ssh',
  ],
  market: [
    'marketplace', 'plugin-hub', 'plugin-manager', 'plugin-market',
  ],
  fun: [
    'game', 'games', 'meme', 'memes', 'pet', 'pets',
  ],
}

/**
 * Words every row in this catalog carries, so they separate nothing.
 *
 * `claude` and `codex` name what a plugin bridges *from*, not what it is
 * about. `llm` / `prompt` fire on almost every description. `mcp` is a kind,
 * not a purpose. `skill` / `skills` collide with the kind of the same name.
 */
const STOP_TOKENS: ReadonlySet<string> = new Set([
  'agent', 'agents', 'ai', 'claude', 'codex', 'cursor', 'deepseek', 'dsh',
  'harness', 'hook', 'hooks', 'llm', 'llms', 'mcp', 'plugin', 'plugins',
  'prompt', 'prompts', 'server', 'skill', 'skills',
])

/** How many categories one row may be inferred into. */
const MAX_INFERRED = 3

/** A keyword is a deliberate label; prose is incidental, so it counts for less. */
const KEYWORD_WEIGHT = 2
const TEXT_WEIGHT = 1

const CATEGORY_BY_TOKEN = new Map<string, string>()
for (const [categoryId, tokens] of Object.entries(TOKENS)) {
  for (const token of tokens) {
    CATEGORY_BY_TOKEN.set(token, categoryId)
  }
}

function tokenize(raw: string): readonly string[] {
  return normalizeSearchText(raw)
    .split(/[^\p{L}\p{N}+#-]+/u)
    .flatMap((word) => (word.includes('-') ? [word, ...word.split('-')] : [word]))
    .filter((word) => word.length > 1 && !STOP_TOKENS.has(word))
}

/**
 * Read categories out of a row's own vocabulary.
 *
 * Scoring, not first-match: a repository described as "postgres schema diffs
 * for code review" names two categories, and hiding one behind the other would
 * misfile it. Ties break on the canonical taxonomy order, so the result is
 * stable across runs — a crawl that reordered a row's categories every sweep
 * would rewrite the join table for no reason.
 */
export function inferCategories(hints: CategoryHints): readonly Slug[] {
  const scores = new Map<string, number>()

  const add = (token: string, weight: number) => {
    const categoryId = CATEGORY_BY_TOKEN.get(token)
    if (categoryId === undefined) return
    scores.set(categoryId, (scores.get(categoryId) ?? 0) + weight)
  }

  for (const keyword of hints.keywords ?? []) {
    for (const token of tokenize(keyword)) add(token, KEYWORD_WEIGHT)
  }
  if (hints.text !== undefined) {
    for (const token of tokenize(hints.text)) add(token, TEXT_WEIGHT)
  }

  return CATEGORIES.filter((entry) => scores.has(entry.id))
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || a.order - b.order)
    .slice(0, MAX_INFERRED)
    .map((entry) => entry.id)
}

/**
 * The categories a crawled row lands in.
 *
 * Author declaration wins, then a curated-list label, then inference from the
 * row's own vocabulary. `normalizeCategories` is the floor, so no path
 * produces a row that no filter reaches.
 */
export function resolveCategories(
  declared: readonly string[],
  hints: CategoryHints,
  curated: readonly string[] = [],
): readonly Slug[] {
  const authored = knownCategories(declared)
  if (authored.length > 0) return authored
  const fromList = knownCategories(curated)
  if (fromList.length > 0) return fromList
  return normalizeCategories(inferCategories(hints))
}
