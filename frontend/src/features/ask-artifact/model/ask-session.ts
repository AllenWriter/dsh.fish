import type { AskStreamEvent } from '../api/ask-stream'

export interface AskCite {
  readonly repo: string
  readonly path: string
  readonly start: number
  readonly end: number
}

export interface AskFile {
  readonly repo: string
  readonly path: string
}

export interface AskTurn {
  readonly id: string
  readonly question: string
  readonly answer: string
  readonly files: readonly AskFile[]
  readonly cites: readonly AskCite[]
  readonly status: 'streaming' | 'complete' | 'error'
  readonly error?: string
}

export interface AskSession {
  readonly queryId?: string
  readonly turns: readonly AskTurn[]
}

export function emptyAskSession(): AskSession {
  return { turns: [] }
}

export function startTurn(session: AskSession, question: string, id: string): AskSession {
  return {
    ...session,
    turns: [
      ...session.turns,
      { id, question, answer: '', files: [], cites: [], status: 'streaming' },
    ],
  }
}

export function applyAskEvent(session: AskSession, event: AskStreamEvent, queryId?: string): AskSession {
  const next: AskSession = queryId === undefined ? session : { ...session, queryId }
  const turns = [...next.turns]
  const last = turns.at(-1)
  if (last === undefined || last.status !== 'streaming') return next

  switch (event.type) {
    case 'file':
      turns[turns.length - 1] = {
        ...last,
        files: [...last.files, { repo: event.repo, path: event.path }],
      }
      break
    case 'delta':
      turns[turns.length - 1] = { ...last, answer: last.answer + event.text }
      break
    case 'cite':
      turns[turns.length - 1] = {
        ...last,
        cites: [
          ...last.cites,
          { repo: event.repo, path: event.path, start: event.start, end: event.end },
        ],
      }
      break
    case 'done':
      turns[turns.length - 1] = { ...last, status: 'complete' }
      break
    case 'error':
      turns[turns.length - 1] = { ...last, status: 'error', error: event.message }
      break
  }

  return { ...next, turns }
}

export function githubBlobUrl(cite: AskCite): string {
  const lines =
    cite.start === cite.end ? `L${cite.start}` : `L${cite.start}-L${cite.end}`
  return `https://github.com/${cite.repo}/blob/HEAD/${cite.path}#${lines}`
}

export function deepWikiSearchUrl(queryId: string): string {
  return `https://deepwiki.com/search/${encodeURIComponent(queryId)}`
}
