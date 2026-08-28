import { useEffect, useState } from 'react'

import { ApiError, request, type CatalogItem, type HubState, type InstalledItem, type WriteOutcome } from './api.js'
import { SpinnerIcon, TrashIcon } from './Icons.js'
import { detectLocale, type HubLocaleKey, type HubTranslate } from './locale.js'
import { ReadmeModal } from './ReadmeModal.js'

/**
 * What this profile installed from the hub.
 *
 * The list is the host's lockfile, the same record `hub_list` and
 * `@dsh-fish/cli list` read — so an artifact an agent installed mid-session
 * shows up here, and one removed here disappears from the tools.
 */
export function InstalledTab({ t }: { t: HubTranslate }): JSX.Element {
  const [items, setItems] = useState<InstalledItem[] | undefined>(undefined)
  const [busyId, setBusyId] = useState<string | undefined>(undefined)
  const [restartRequired, setRestartRequired] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)

  const locale = detectLocale()

  const reload = (): void => {
    request<HubState>('/state').then(
      (state) => { setItems(state.installed) },
      (failure: unknown) => { setError(describe(failure, t)) },
    )
  }

  useEffect(() => { reload() }, [])

  const handleUninstall = (item: CatalogItem | InstalledItem): void => {
    const artifactId = 'id' in item ? item.id : item.artifactId
    setBusyId(artifactId)
    setError(undefined)
    request<WriteOutcome>('/remove', { artifactId }).then(
      (outcome) => {
        setBusyId(undefined)
        setRestartRequired(outcome.restartRequired)
        if (selectedItem?.id === artifactId) {
          setSelectedItem(null)
        }
        reload()
      },
      (failure: unknown) => {
        setBusyId(undefined)
        setError(describe(failure, t))
      },
    )
  }

  const handleInstall = (item: CatalogItem): void => {
    setBusyId(item.id)
    setError(undefined)
    request<WriteOutcome>('/install', { artifactId: item.id, allowBuildScripts: true }).then(
      (outcome) => {
        setBusyId(undefined)
        setRestartRequired(outcome.restartRequired)
        reload()
      },
      (failure: unknown) => {
        setBusyId(undefined)
        setError(describe(failure, t))
      },
    )
  }

  return (
    <div className="dshFish__panelBody">
      {error !== undefined && (
        <p className="dshFish__error" role="alert">
          {error}
        </p>
      )}
      {restartRequired && (
        <p className="dshFish__notice" role="status">
          {t('restart.required')}
        </p>
      )}

      {items !== undefined && items.length === 0 && (
        <p className="dshFish__empty">{t('installed.empty')}</p>
      )}

      <ul className="dshFish__list">
        {(items ?? []).map((item) => {
          const isBusy = busyId === item.artifactId
          const kindKey = `kind.${item.kind}` as HubLocaleKey

          return (
            <li
              className="dshFish__card dshFish__card--clickable"
              key={item.artifactId}
              tabIndex={0}
              role="button"
              aria-label={item.artifactId}
              onClick={() => {
                setSelectedItem({
                  id: item.artifactId,
                  kind: item.kind,
                  displayName: item.artifactId,
                  summary: '',
                  verified: false,
                  deprecated: false,
                  installs: 0,
                  sourceUrl: '',
                })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (e.target === e.currentTarget) {
                    e.preventDefault()
                    setSelectedItem({
                      id: item.artifactId,
                      kind: item.kind,
                      displayName: item.artifactId,
                      summary: '',
                      verified: false,
                      deprecated: false,
                      installs: 0,
                      sourceUrl: '',
                    })
                  }
                }
              }}
            >
              <div className="dshFish__cardHead">
                <span className="dshFish__cardName">{item.artifactId}</span>
                <span className="dshFish__tag dshFish__tag--kind">{t(kindKey)}</span>
              </div>
              <div className="dshFish__cardFoot">
                <span className="dshFish__meta">
                  {t('installed.at', { date: new Date(item.installedAt).toLocaleDateString() })}
                </span>
                <div className="dshFish__cardActions">
                  <button
                    className="dshFish__buttonQuiet dshFish__button--destructive"
                    type="button"
                    disabled={busyId !== undefined}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUninstall(item)
                    }}
                  >
                    {isBusy ? <SpinnerIcon size={13} /> : <TrashIcon size={13} />}
                    <span>{isBusy ? t('installed.removing') : t('installed.remove')}</span>
                  </button>
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
          isInstalled={true}
          isBusy={busyId === selectedItem.id}
          onClose={() => { setSelectedItem(null) }}
          onInstall={handleInstall}
          onUninstall={handleUninstall}
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
