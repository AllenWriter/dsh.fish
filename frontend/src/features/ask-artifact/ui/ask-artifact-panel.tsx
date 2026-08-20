import { useCallback, useId, useState } from 'react'
import { AgentActivity } from '@/shared/ui/agents/agent-activity'
import type { AgentActivityItem } from '@/shared/ui/agents/agent-activity/types'
import { Citations, type CitationItem } from '@/shared/ui/agents/citations'
import { Message, MessageContent, MessageGroup } from '@/shared/ui/agents/message'
import { MessageScroller } from '@/shared/ui/agents/message-scroller'
import { PromptInput } from '@/shared/ui/agents/prompt-input'
import { StreamingResponse } from '@/shared/ui/agents/streaming-response'
import { ThinkingShimmer } from '@/shared/ui/agents/loading-states/thinking-shimmer'
import { Markdown } from '@/shared/ui/markdown'
import { useT } from '@/shared/config/i18n'
import { AskHttpError, startAskStream } from '../api/ask-stream'
import {
  applyAskEvent,
  deepWikiSearchUrl,
  emptyAskSession,
  githubBlobUrl,
  startTurn,
  type AskSession,
  type AskTurn,
} from '../model/ask-session'

/**
 * The ask conversation: composer, streamed answer, scanned paths, cites.
 * `queryId` stays in this tab so a follow-up reuses Ada's thread.
 */
export function AskArtifactPanel({
  artifactId,
  className,
}: {
  artifactId: string
  className?: string
}) {
  const t = useT()
  const idPrefix = useId()
  const [session, setSession] = useState<AskSession>(emptyAskSession)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<string | undefined>()

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (trimmed === '' || busy) return
      const turnId = `${idPrefix}-${session.turns.length}`
      setBanner(undefined)
      setBusy(true)
      setDraft('')
      setSession((current) => startTurn(current, trimmed, turnId))
      try {
        const { queryId, events } = await startAskStream({
          artifactId,
          question: trimmed,
          ...(session.queryId === undefined ? {} : { queryId: session.queryId }),
        })
        for await (const event of events) {
          setSession((current) => applyAskEvent(current, event, queryId))
        }
      } catch (error) {
        const copy =
          error instanceof AskHttpError && error.code === 'RATE_LIMITED'
            ? t('ask.rateLimited')
            : error instanceof AskHttpError && (error.code === 'UNAVAILABLE' || error.status === 503)
              ? t('ask.unavailable')
              : t('ask.error')
        setBanner(copy)
        setDraft(trimmed)
        setSession((current) =>
          applyAskEvent(current, { type: 'error', message: copy }, current.queryId),
        )
      } finally {
        setBusy(false)
      }
    },
    [artifactId, busy, idPrefix, session.queryId, session.turns.length, t],
  )

  return (
    <div className={className}>
      <MessageScroller className="min-h-0 flex-1 px-1" label={t('ask.title')}>
        <MessageGroup spacing="default">
          {session.turns.map((turn) => (
            <AskTurnView key={turn.id} turn={turn} queryId={session.queryId} idPrefix={turn.id} />
          ))}
        </MessageGroup>
      </MessageScroller>
      {banner ? (
        <p className="px-1 py-2 text-sm text-destructive" role="alert">
          {banner}
        </p>
      ) : null}
      <PromptInput
        value={draft}
        onValueChange={setDraft}
        onSubmit={(value) => void send(value)}
        loading={busy}
        disabled={false}
        placeholder={t('ask.placeholder')}
        aria-label={t('ask.placeholder')}
        minRows={2}
        maxRows={6}
        className="mt-3"
      />
    </div>
  )
}

function AskTurnView({
  turn,
  queryId,
  idPrefix,
}: {
  turn: AskTurn
  queryId?: string
  idPrefix: string
}) {
  const t = useT()
  const activity: AgentActivityItem[] = turn.files.map((file, index) => ({
    id: `${turn.id}-file-${index}`,
    type: 'tool',
    action: 'read',
    target: t('ask.scanning', { path: file.path }),
  }))
  const citations: CitationItem[] = turn.cites.map((cite, index) => ({
    id: `${turn.id}-cite-${index}`,
    title: cite.path,
    domain: cite.repo,
    url: githubBlobUrl(cite),
  }))

  return (
    <>
      <Message from="user" animateIn>
        <MessageContent>
          <p className="rounded-2xl bg-muted px-3 py-2 text-sm text-foreground">{turn.question}</p>
        </MessageContent>
      </Message>
      <Message from="assistant" animateIn>
        <MessageContent>
          {activity.length > 0 ? (
            <AgentActivity
              items={activity}
              status={turn.status === 'streaming' ? 'working' : 'complete'}
              defaultOpen
              collapseOnComplete={false}
              className="mb-2"
            />
          ) : turn.status === 'streaming' && turn.answer === '' ? (
            <ThinkingShimmer>{t('ask.thinking')}</ThinkingShimmer>
          ) : null}
          {turn.answer !== '' || turn.status !== 'streaming' ? (
            <StreamingResponse
              status={turn.status === 'error' ? 'error' : turn.status}
              copyText={turn.answer}
              sources={citations}
              showActions={false}
            >
              {turn.answer === '' ? (
                <p className="text-sm text-muted-foreground">
                  {turn.status === 'error' ? (turn.error ?? t('ask.error')) : t('ask.complete')}
                </p>
              ) : (
                <Markdown source={turn.answer} />
              )}
            </StreamingResponse>
          ) : null}
          {citations.length > 0 && turn.status !== 'streaming' ? (
            <Citations citations={citations} idPrefix={idPrefix} className="mt-2" />
          ) : null}
          {turn.status === 'complete' && queryId !== undefined ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('ask.attribution')}{' '}
              <a
                href={deepWikiSearchUrl(queryId)}
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-border underline-offset-2 hover:text-foreground"
              >
                {t('ask.attributionLink')}
              </a>
            </p>
          ) : null}
        </MessageContent>
      </Message>
    </>
  )
}
