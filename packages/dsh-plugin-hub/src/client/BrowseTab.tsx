import { useEffect, useState } from 'react'

import {
  ApiError,
  catalogQuery,
  request,
  type CatalogItem,
  type HubState,
  type WriteOutcome,
} from './api.js'
import { DownloadIcon, ExternalLinkIcon, SpinnerIcon, TrashIcon, VerifiedIcon } from './Icons.js'
import { detectLocale, type HubLocaleKey, type HubTranslate } from './locale.js'
import { ReadmeModal } from './ReadmeModal.js'

const KINDS = ['bundle', 'profile', 'skill', 'agent-preset'] as const

export function BrowseTab({ t }: { t: HubTranslate }): JSX.Element {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('')
  const [items, setItems] = useState<CatalogItem[] | undefined>(undefined)
  const [installedIds, setInstalledIds] = useState<ReadonlySet<string>>(() => new Set())
  const [busyId, setBusyId] = useState<string | undefined>(undefined)
  const [outcome, setOutcome] = useState<WriteOutcome | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)

  const locale = detectLocale()

  const reloadInstalled = (): void => {
    request<HubState>('/state').then(
      (state) => {
        setInstalledIds(new Set(state.installed.map((item) => item.artifactId)))
      },
      () => undefined,
    )
  }

  const search = (nextKind = kind): void => {
    setError(undefined)
    request<{ items: CatalogItem[] }>(catalogQuery(query, nextKind, locale)).then(
      (result) => { setItems(result.items) },
      (failure: unknown) => { setError(describe(failure, t)) },
    )
  }

  useEffect(() => {
    search()
    reloadInstalled()
  }, [])

  const install = (item: CatalogItem): void => {
    setBusyId(item.id)
    setError(undefined)
    setOutcome(undefined)
    request<WriteOutcome>('/install', { artifactId: item.id, allowBuildScripts: true }).then(
      (result) => {
        setBusyId(undefined)
        setOutcome(result)
        setInstalledIds((prev) => new Set([...prev, item.id]))
        reloadInstalled()
      },
      (failure: unknown) => {
        setBusyId(undefined)
        setError(describe(failure, t))
      },
    )
  }

  const uninstall = (item: CatalogItem): void => {
    setBusyId(item.id)
    setError(undefined)
    setOutcome(undefined)
    request<WriteOutcome>('/remove', { artifactId: item.id }).then(
      (result) => {
        setBusyId(undefined)
        setOutcome(result)
        setInstalledIds((prev) => {
          const next = new Set(prev)
          next.delete(item.id)
          return next
        })
        reloadInstalled()
      },
      (failure: unknown) => {
        setBusyId(undefined)
        setError(describe(failure, t))
      },
    )
  }

  return (
    <div className="dshFish__panelBody">
      <form
        className="dshFish__search"
        onSubmit={(event) => {
          event.preventDefault()
          search()
        }}
      >
        <label className="dshFish__srOnly" htmlFor="dsh-fish-search">
          {t('search.label')}
        </label>
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
          onChange={(event) => {
            setKind(event.target.value)
            search(event.target.value)
          }}
        >
          <option value="">{t('kind.all')}</option>
          {KINDS.map((value) => (
            <option key={value} value={value}>
              {t(`kind.${value}`)}
            </option>
          ))}
        </select>
        <button className="dshFish__button" type="submit">
          {t('search.submit')}
        </button>
      </form>

      {error !== undefined && (
        <p className="dshFish__error" role="alert">
          {error}
        </p>
      )}

      {outcome !== undefined && (
        <p className="dshFish__notice" role="status">
          {outcome.restartRequired ? t('restart.required') : ''}
        </p>
      )}

      {items !== undefined && items.length === 0 && (
        <p className="dshFish__empty">{t('browse.empty')}</p>
      )}

      <ul className="dshFish__list">
        {(items ?? []).map((item) => {
          const isInstalled = installedIds.has(item.id)
          const isBusy = busyId === item.id
          const kindKey = `kind.${item.kind}` as HubLocaleKey

          return (
            <li
              className="dshFish__card dshFish__card--clickable"
              key={item.id}
              tabIndex={0}
              role="button"
              aria-label={item.displayName}
              onClick={() => { setSelectedItem(item) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (e.target === e.currentTarget) {
                    e.preventDefault()
                    setSelectedItem(item)
                  }
                }
              }}
            >
              <div className="dshFish__cardHead">
                <span className="dshFish__cardName">{item.displayName}</span>
                <span className="dshFish__tag dshFish__tag--kind">{t(kindKey)}</span>
                {item.verified && (
                  <span className="dshFish__tag dshFish__tag--verified">
                    <VerifiedIcon size={12} />
                    {t('browse.verified')}
                  </span>
                )}
                {item.deprecated && (
                  <span className="dshFish__tag dshFish__tag--deprecated">
                    {t('browse.deprecated')}
                  </span>
                )}
              </div>

              <p className="dshFish__cardSummary">{item.summary}</p>

              <div className="dshFish__cardFoot">
                <span className="dshFish__meta">
                  {t('browse.installs', { count: item.installs })}
                </span>
                {item.sourceUrl && (
                  <a
                    className="dshFish__link dshFish__link--source"
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={(e) => { e.stopPropagation() }}
                  >
                    <span>{t('browse.source')}</span>
                    <ExternalLinkIcon size={11} />
                  </a>
                )}
                <div className="dshFish__cardActions">
                  {isInstalled ? (
                    <button
                      className="dshFish__buttonQuiet dshFish__button--destructive"
                      type="button"
                      disabled={busyId !== undefined}
                      onClick={(e) => {
                        e.stopPropagation()
                        uninstall(item)
                      }}
                    >
                      {isBusy ? <SpinnerIcon size={13} /> : <TrashIcon size={13} />}
                      <span>{isBusy ? t('browse.uninstalling') : t('browse.uninstall')}</span>
                    </button>
                  ) : (
                    <button
                      className="dshFish__button dshFish__button--primary"
                      type="button"
                      disabled={busyId !== undefined}
                      onClick={(e) => {
                        e.stopPropagation()
                        install(item)
                      }}
                    >
                      {isBusy ? <SpinnerIcon size={13} /> : <DownloadIcon size={13} />}
                      <span>{isBusy ? t('browse.installing') : t('browse.install')}</span>
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {selectedItem !== null && (
        <ReadmeModal
          item={selectedItem}
          locale={locale}
          isInstalled={installedIds.has(selectedItem.id)}
          isBusy={busyId === selectedItem.id}
          onClose={() => { setSelectedItem(null) }}
          onInstall={install}
          onUninstall={uninstall}
          t={t}
        />
      )}
    </div>
  )
}

function describe(failure: unknown, t: HubTranslate): string {
  if (failure instanceof ApiError) return failure.message
  return t('error.generic')
}
