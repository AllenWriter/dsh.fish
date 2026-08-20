import { describe, expect, it } from 'vitest'
import { applyAskEvent, emptyAskSession, startTurn } from './ask-session'
import { parseSseFrame } from '../api/ask-stream'

describe('ask session', () => {
  it('concatenates deltas and keeps queryId on follow-up', () => {
    let session = startTurn(emptyAskSession(), 'What is this?', 't1')
    session = applyAskEvent(session, { type: 'delta', text: 'Hello ' }, 'qid-1')
    session = applyAskEvent(session, { type: 'delta', text: 'world.' }, 'qid-1')
    session = applyAskEvent(session, { type: 'done' }, 'qid-1')
    expect(session.queryId).toBe('qid-1')
    expect(session.turns[0]?.answer).toBe('Hello world.')
    expect(session.turns[0]?.status).toBe('complete')

    session = startTurn(session, 'And the license?', 't2')
    session = applyAskEvent(session, { type: 'delta', text: 'MIT.' }, session.queryId)
    expect(session.queryId).toBe('qid-1')
    expect(session.turns).toHaveLength(2)
  })
})

describe('SSE parser', () => {
  it('reads mapped events from frames', () => {
    expect(parseSseFrame('event: file\ndata: {"repo":"acme/hello","path":"a.ts"}')).toEqual({
      type: 'file',
      repo: 'acme/hello',
      path: 'a.ts',
    })
    expect(parseSseFrame('event: delta\ndata: {"text":"Hi"}')).toEqual({
      type: 'delta',
      text: 'Hi',
    })
    expect(parseSseFrame('event: done\ndata: {}')).toEqual({ type: 'done' })
  })
})
