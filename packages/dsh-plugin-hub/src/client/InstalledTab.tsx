import { useEffect, useState } from 'react'

import { ApiError, request, type HubState, type InstalledItem, type WriteOutcome } from './api.js'
import type { HubLocaleKey, HubTranslate } from './locale.js'

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

  const reload = (): void => {
    request<HubState>('/state').then(
      (state) => { setItems(state.installed) },
      (failure: unknown) => { setError(describe(failure, t)) },
    )
  }

  useEffect(() => { reload() }, [])

  return <div className="dshFish__panelBody">
    {error !== undefined && <p className="dshFish__error" role="alert">{error}</p>}
    {restartRequired && <p className="dshFish__notice" role="status">{t('restart.required')}</p>}

    {items !== undefined && items.length === 0 && <p className="dshFish__empty">{t('installed.empty')}</p>}

    <ul className="dshFish__list">
      {(items ?? []).map((item) => <li className="dshFish__card" key={item.artifactId}>
        <div className="dshFish__cardHead">
          <span className="dshFish__cardName">{item.artifactId}</span>
          <span className="dshFish__tag">{t(`kind.${item.kind}` as HubLocaleKey)}</span>
        </div>
        <div className="dshFish__cardFoot">
          <span className="dshFish__meta">
            {t('installed.at', { date: new Date(item.installedAt).toLocaleDateString() })}
          </span>
          <button
            className="dshFish__buttonQuiet"
            type="button"
            disabled={busyId !== undefined}
            onClick={() => {
              setBusyId(item.artifactId)
              setError(undefined)
              request<WriteOutcome>('/remove', { artifactId: item.artifactId }).then(
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
            }}
          >{busyId === item.artifactId ? t('installed.removing') : t('installed.remove')}</button>
        </div>
      </li>)}
    </ul>
  </div>
}

function describe(failure: unknown, t: HubTranslate): string {
  if (failure instanceof ApiError) return failure.message
  return t('error.generic')
}
