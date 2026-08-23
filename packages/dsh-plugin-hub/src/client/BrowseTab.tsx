import { useEffect, useState } from 'react'

import {
  ApiError,
  catalogQuery,
  request,
  type CatalogItem,
  type InstallPlanPreview,
  type WriteOutcome,
} from './api.js'
import type { HubLocaleKey, HubTranslate } from './locale.js'

const KINDS = ['bundle', 'profile', 'skill', 'mcp-server', 'agent-preset', 'hook-bridge'] as const

/**
 * The catalog, and the confirmation in front of an install.
 *
 * Nothing installs from a card directly: selecting an artifact resolves its
 * plan first and shows the commands the host is about to run, because that plan
 * is the only place a build step becomes visible before it happens.
 */
export function BrowseTab({ t }: { t: HubTranslate }): JSX.Element {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('')
  const [items, setItems] = useState<CatalogItem[] | undefined>(undefined)
  const [plan, setPlan] = useState<InstallPlanPreview | undefined>(undefined)
  const [busyId, setBusyId] = useState<string | undefined>(undefined)
  const [outcome, setOutcome] = useState<WriteOutcome | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  const search = (nextKind = kind): void => {
    setError(undefined)
    request<{ items: CatalogItem[] }>(catalogQuery(query, nextKind)).then(
      (result) => { setItems(result.items) },
      (failure: unknown) => { setError(describe(failure, t)) },
    )
  }

  useEffect(() => { search() }, [])

  const install = (artifactId: string, allowBuildScripts: boolean): void => {
    setBusyId(artifactId)
    setError(undefined)
    request<WriteOutcome>('/install', { artifactId, allowBuildScripts }).then(
      (result) => {
        setBusyId(undefined)
        setPlan(undefined)
        setOutcome(result)
      },
      (failure: unknown) => {
        setBusyId(undefined)
        setError(describe(failure, t))
      },
    )
  }

  return <div className="dshFish__panelBody">
    <form
      className="dshFish__search"
      onSubmit={(event) => { event.preventDefault(); search() }}
    >
      <label className="dshFish__srOnly" htmlFor="dsh-fish-search">{t('search.label')}</label>
      <input
        id="dsh-fish-search"
        className="dshFish__input"
        type="search"
        value={query}
        placeholder={t('search.placeholder')}
        onChange={(event) => { setQuery(event.target.value) }}
      />
      <select
        className="dshFish__select"
        value={kind}
        aria-label={t('kind.all')}
        onChange={(event) => { setKind(event.target.value); search(event.target.value) }}
      >
        <option value="">{t('kind.all')}</option>
        {KINDS.map((value) => <option key={value} value={value}>{t(`kind.${value}`)}</option>)}
      </select>
      <button className="dshFish__button" type="submit">{t('search.submit')}</button>
    </form>

    {error !== undefined && <p className="dshFish__error" role="alert">{error}</p>}

    {outcome !== undefined && <p className="dshFish__notice" role="status">
      {outcome.restartRequired ? t('restart.required') : ''}
    </p>}

    {items !== undefined && items.length === 0 && <p className="dshFish__empty">{t('browse.empty')}</p>}

    <ul className="dshFish__list">
      {(items ?? []).map((item) => <li className="dshFish__card" key={item.id}>
        <div className="dshFish__cardHead">
          <span className="dshFish__cardName">{item.displayName}</span>
          <span className="dshFish__tag">{t(`kind.${item.kind}` as HubLocaleKey)}</span>
          {item.verified && <span className="dshFish__tag">{t('browse.verified')}</span>}
          {item.deprecated && <span className="dshFish__tag">{t('browse.deprecated')}</span>}
        </div>
        <p className="dshFish__cardSummary">{item.summary}</p>
        <div className="dshFish__cardFoot">
          <span className="dshFish__meta">{t('browse.installs', { count: item.installs })}</span>
          <a
            className="dshFish__link"
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
          >{t('browse.source')}</a>
          <button
            className="dshFish__button"
            type="button"
            disabled={busyId !== undefined}
            onClick={() => {
              setError(undefined)
              setOutcome(undefined)
              request<InstallPlanPreview>(`/plan?artifactId=${encodeURIComponent(item.id)}`).then(
                (result) => { setPlan(result) },
                (failure: unknown) => { setError(describe(failure, t)) },
              )
            }}
          >{busyId === item.id ? t('browse.installing') : t('browse.plan')}</button>
        </div>

        {plan?.artifactId === item.id && <div className="dshFish__plan">
          <h4 className="dshFish__planTitle">{t('plan.title', { artifact: item.displayName })}</h4>
          <p className="dshFish__meta">{t('plan.commands')}</p>
          <ol className="dshFish__commands">
            {plan.commands.map((command) => <li key={command}><code>{command}</code></li>)}
          </ol>
          {plan.requiresBuildAllowance && <p className="dshFish__warning">{t('plan.buildRefused')}</p>}
          <div className="dshFish__planActions">
            <button
              className="dshFish__button"
              type="button"
              disabled={busyId !== undefined}
              onClick={() => { install(item.id, plan.requiresBuildAllowance) }}
            >{plan.requiresBuildAllowance ? t('plan.allowBuild') : t('plan.confirm')}</button>
            <button
              className="dshFish__buttonQuiet"
              type="button"
              onClick={() => { setPlan(undefined) }}
            >{t('plan.cancel')}</button>
          </div>
        </div>}
      </li>)}
    </ul>
  </div>
}

function describe(failure: unknown, t: HubTranslate): string {
  if (failure instanceof ApiError) return failure.message
  return t('error.generic')
}
