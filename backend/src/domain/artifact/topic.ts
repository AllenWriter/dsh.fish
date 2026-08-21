import aliases from './topic-aliases.json'

export const TOPIC_IDS = [
  'memory',
  'code-review',
  'web-search',
  'vision-ocr',
  'multi-agent',
  'ui-themes',
] as const

export type TopicId = (typeof TOPIC_IDS)[number]

export interface Topic {
  readonly id: TopicId
  readonly labelKey: string
  readonly order: number
}

export const TOPICS: readonly Topic[] = Object.freeze(
  TOPIC_IDS.map((id, order) => ({ id, labelKey: `topic.${id}.label`, order })),
)

const TOPIC_SET = new Set<string>(TOPIC_IDS)

export function isTopic(raw: string | undefined): raw is TopicId {
  return raw !== undefined && TOPIC_SET.has(raw)
}

export interface TopicHints {
  readonly keywords?: readonly string[]
  readonly text?: string
}

/** Unicode-normalized text shared by topic inference and FTS documents. */
export function normalizeSearchText(raw: string): string {
  return raw.normalize('NFKC').toLocaleLowerCase('und').replace(/\s+/g, ' ').trim()
}

/** Stable, curated search vocabulary for one topic in every supported language. */
export function topicAliases(topic: TopicId): readonly string[] {
  return aliases[topic]
}

/**
 * Derive high-intent topics without replacing the publisher's own keywords.
 * Keywords score above prose; matching is phrase-aware so CJK text does not
 * depend on whitespace tokenization.
 */
export function inferTopics(hints: TopicHints): readonly TopicId[] {
  const keywordText = normalizeSearchText((hints.keywords ?? []).join(' '))
  const prose = normalizeSearchText(hints.text ?? '')
  const scores = new Map<TopicId, number>()

  for (const topic of TOPIC_IDS) {
    for (const alias of topicAliases(topic)) {
      const normalized = normalizeSearchText(alias)
      if (keywordText.includes(normalized)) {
        scores.set(topic, (scores.get(topic) ?? 0) + 2)
      }
      if (prose.includes(normalized)) {
        scores.set(topic, (scores.get(topic) ?? 0) + 1)
      }
    }
  }

  return TOPICS.filter((topic) => scores.has(topic.id))
    .sort(
      (left, right) =>
        (scores.get(right.id) ?? 0) - (scores.get(left.id) ?? 0) || left.order - right.order,
    )
    .slice(0, 3)
    .map((topic) => topic.id)
}

export function topicSearchText(topics: readonly TopicId[]): string {
  return topics.flatMap((topic) => [topic, ...topicAliases(topic)]).join(' ')
}
