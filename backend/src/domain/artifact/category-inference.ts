import type { Slug } from '../shared/slug.js'
import { CATEGORIES, knownCategories, normalizeCategories } from './category.js'

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
 * is better left to `other` than invented.
 */
const TOKENS: Readonly<Record<string, readonly string[]>> = {
  coding: [
    'code', 'coding', 'codegen', 'compiler', 'debug', 'debugger', 'editor', 'git',
    'github', 'gitlab', 'ide', 'java', 'javascript', 'lint', 'linter', 'lsp',
    'python', 'refactor', 'refactoring', 'repo', 'repository', 'rust', 'typescript',
  ],
  research: [
    'citation', 'crawler', 'doc', 'docs', 'documentation', 'knowledge', 'paper',
    'papers', 'rag', 'reference', 'research', 'retrieval', 'scraper', 'scraping',
    'search', 'summarize', 'wiki',
  ],
  data: [
    'analytics', 'csv', 'data', 'database', 'dataset', 'duckdb', 'etl', 'excel',
    'mongodb', 'mysql', 'pandas', 'postgres', 'postgresql', 'redis', 'spreadsheet',
    'sql', 'sqlite', 'warehouse',
  ],
  devops: [
    'ansible', 'aws', 'azure', 'ci', 'cloud', 'container', 'deploy', 'deployment',
    'devops', 'docker', 'gcp', 'infra', 'infrastructure', 'k8s', 'kubernetes',
    'monitoring', 'nginx', 'observability', 'serverless', 'terraform',
  ],
  productivity: [
    'automation', 'calendar', 'memo', 'note', 'notes', 'notion', 'obsidian',
    'planner', 'productivity', 'reminder', 'task', 'tasks', 'todo', 'workflow',
  ],
  communication: [
    'chat', 'dingtalk', 'discord', 'email', 'feishu', 'gmail', 'imap', 'mail',
    'notification', 'notifications', 'slack', 'sms', 'telegram', 'wechat', 'whatsapp',
  ],
  design: [
    'animation', 'art', 'canvas', 'design', 'diagram', 'diagrams', 'figma', 'icon',
    'icons', 'illustration', 'image', 'images', 'photo', 'sketch', 'svg', 'video',
  ],
  security: [
    'audit', 'auth', 'authentication', 'authorization', 'crypto', 'encryption',
    'pentest', 'permission', 'permissions', 'sandbox', 'sast', 'secret', 'secrets',
    'security', 'vulnerability',
  ],
  testing: [
    'coverage', 'cypress', 'e2e', 'fixture', 'jest', 'mock', 'playwright', 'pytest',
    'tdd', 'test', 'testing', 'tests', 'vitest',
  ],
  models: [
    'anthropic', 'embedding', 'embeddings', 'fine-tuning', 'gemini', 'gpt',
    'inference', 'llm', 'llms', 'ollama', 'openai', 'prompt', 'prompts', 'token',
    'tokenizer',
  ],
  ui: [
    'component', 'components', 'css', 'dashboard', 'frontend', 'gui', 'react',
    'skin', 'skins', 'svelte', 'tailwind', 'terminal', 'theme', 'themes', 'tui',
    'ui', 'ux', 'vue', 'widget',
  ],
}

/**
 * Words every row in this catalog carries, so they separate nothing.
 *
 * `claude` and `codex` sit here rather than under `models` on purpose: in a
 * DeepSeek Harness catalog they name what a plugin bridges *from*, not what it
 * is about, and they appear in a large share of descriptions.
 */
const STOP_TOKENS: ReadonlySet<string> = new Set([
  'agent', 'agents', 'ai', 'claude', 'codex', 'cursor', 'deepseek', 'dsh',
  'harness', 'hook', 'hooks', 'mcp', 'plugin', 'plugins', 'server', 'skill', 'skills',
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
  return raw
    .toLowerCase()
    .split(/[^a-z0-9+-]+/)
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
 * A declaration the author actually wrote wins outright — they know what they
 * built — and inference only fills the gap it leaves. `normalizeCategories`
 * then guarantees the floor, so no path produces a row that no filter reaches.
 */
export function resolveCategories(
  declared: readonly string[],
  hints: CategoryHints,
): readonly Slug[] {
  const authored = knownCategories(declared)
  return authored.length > 0 ? authored : normalizeCategories(inferCategories(hints))
}
