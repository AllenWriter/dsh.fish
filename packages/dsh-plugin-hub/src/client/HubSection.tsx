import { useEffect, useId, useRef, useState } from 'react'

import { AccountTab } from './AccountTab.js'
import { request, type HubState, type SelfUpdateResult, type UpdateCheckResult } from './api.js'
import { BrowseTab } from './BrowseTab.js'
import { SpinnerIcon } from './Icons.js'
import { InstalledTab } from './InstalledTab.js'
import type { HubLocaleKey, HubTranslate } from './locale.js'

type TabId = 'browse' | 'installed' | 'account'

const TABS: ReadonlyArray<{ id: TabId; label: HubLocaleKey }> = [
  { id: 'browse', label: 'tab.browse' },
  { id: 'installed', label: 'tab.installed' },
  { id: 'account', label: 'tab.account' },
]

export function HubSection({ t }: { t: HubTranslate }): JSX.Element {
  const tabsId = useId()
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [activeId, setActiveId] = useState<TabId>('browse')
  const [visitedIds, setVisitedIds] = useState<ReadonlySet<TabId>>(() => new Set(['browse']))
  const [profile, setProfile] = useState<string | undefined>(undefined)
  const [version, setVersion] = useState<string | undefined>(undefined)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | undefined>(undefined)
  const [updating, setUpdating] = useState(false)
  const [updateNotice, setUpdateNotice] = useState<string | undefined>(undefined)

  useEffect(() => {
    request<HubState>('/state').then(
      (state) => {
        setProfile(state.profile)
        if (state.version) setVersion(state.version)
      },
      () => undefined,
    )
  }, [])

  useEffect(() => {
    setVisitedIds((previous) => {
      if (previous.has(activeId)) return previous
      return new Set([...previous, activeId])
    })
  }, [activeId])

  const checkForUpdate = (): void => {
    setCheckingUpdate(true)
    setUpdateNotice(undefined)
    request<UpdateCheckResult>('/check-update').then(
      (res) => {
        setCheckingUpdate(false)
        setUpdateResult(res)
        if (!res.hasUpdate) {
          setUpdateNotice(t('update.upToDate', { version: res.currentVersion }))
        }
      },
      () => {
        setCheckingUpdate(false)
        setUpdateNotice(t('update.failed'))
      },
    )
  }

  const applyUpdate = (): void => {
    setUpdating(true)
    request<SelfUpdateResult>('/self-update', {}).then(
      () => {
        setUpdating(false)
        setUpdateResult(undefined)
        setUpdateNotice(t('update.success'))
      },
      () => {
        setUpdating(false)
        setUpdateNotice(t('update.failed'))
      },
    )
  }

  return (
    <section className="dshFish">
      <div className="dshFish__header">
        <div className="dshFish__headerTitleRow">
          <h2 className="dshFish__heading">dsh.fish</h2>
          {version && <span className="dshFish__versionBadge">v{version}</span>}
          <button
            className="dshFish__checkUpdateBtn"
            type="button"
            disabled={checkingUpdate || updating}
            onClick={checkForUpdate}
          >
            {checkingUpdate ? (
              <>
                <SpinnerIcon size={12} />
                <span>{t('update.checking')}</span>
              </>
            ) : (
              <span>{t('update.check')}</span>
            )}
          </button>
        </div>

        {profile !== undefined && (
          <p className="dshFish__intro">{t('intro', { profile })}</p>
        )}

        {updateResult?.hasUpdate && (
          <div className="dshFish__updateBanner">
            <span>{t('update.available', { version: updateResult.latestVersion })}</span>
            <button
              className="dshFish__button dshFish__button--primary dshFish__button--sm"
              type="button"
              disabled={updating}
              onClick={applyUpdate}
            >
              {updating && <SpinnerIcon size={12} />}
              <span>{updating ? t('update.upgrading') : t('update.upgrade')}</span>
            </button>
          </div>
        )}

        {updateNotice && (
          <p className="dshFish__notice" role="status">
            {updateNotice}
          </p>
        )}
      </div>

      <div className="dshFish__tabs" role="tablist" aria-label={t('tabs.aria')}>
        {TABS.map((tab, index) => {
          const selected = tab.id === activeId
          return (
            <button
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              id={`${tabsId}-tab-${tab.id}`}
              key={tab.id}
              type="button"
              role="tab"
              className="dshFish__tab"
              aria-selected={selected}
              aria-controls={`${tabsId}-panel-${tab.id}`}
              data-active={selected ? 'true' : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                setActiveId(tab.id)
              }}
              onKeyDown={(event) => {
                let nextIndex: number
                switch (event.key) {
                  case 'ArrowRight':
                    nextIndex = (index + 1) % TABS.length
                    break
                  case 'ArrowLeft':
                    nextIndex = (index - 1 + TABS.length) % TABS.length
                    break
                  case 'Home':
                    nextIndex = 0
                    break
                  case 'End':
                    nextIndex = TABS.length - 1
                    break
                  default:
                    return
                }
                event.preventDefault()
                const nextTab = TABS[nextIndex]
                if (nextTab === undefined) return
                setActiveId(nextTab.id)
                tabRefs.current[nextIndex]?.focus()
              }}
            >
              {t(tab.label)}
            </button>
          )
        })}
      </div>

      {TABS.filter((tab) => tab.id === activeId || visitedIds.has(tab.id)).map((tab) => {
        const selected = tab.id === activeId
        return (
          <div
            id={`${tabsId}-panel-${tab.id}`}
            key={tab.id}
            className="dshFish__panel"
            role="tabpanel"
            aria-labelledby={`${tabsId}-tab-${tab.id}`}
            hidden={!selected}
          >
            {tab.id === 'browse' && <BrowseTab t={t} />}
            {tab.id === 'installed' && <InstalledTab t={t} />}
            {tab.id === 'account' && <AccountTab t={t} />}
          </div>
        )
      })}
    </section>
  )
}
