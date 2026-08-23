import { useEffect, useId, useRef, useState } from 'react'

import { AccountTab } from './AccountTab.js'
import { request, type HubState } from './api.js'
import { BrowseTab } from './BrowseTab.js'
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

  useEffect(() => {
    request<HubState>('/state').then(
      (state) => { setProfile(state.profile) },
      () => undefined,
    )
  }, [])

  useEffect(() => {
    setVisitedIds((previous) => {
      if (previous.has(activeId)) return previous
      return new Set([...previous, activeId])
    })
  }, [activeId])

  return <section className="dshFish">
    <h2 className="dshFish__heading">dsh.fish</h2>
    {profile !== undefined && <p className="dshFish__intro">{t('intro', { profile })}</p>}

    <div className="dshFish__tabs" role="tablist" aria-label={t('tabs.aria')}>
      {TABS.map((tab, index) => {
        const selected = tab.id === activeId
        return <button
          ref={(element) => { tabRefs.current[index] = element }}
          id={`${tabsId}-tab-${tab.id}`}
          key={tab.id}
          type="button"
          role="tab"
          className="dshFish__tab"
          aria-selected={selected}
          aria-controls={`${tabsId}-panel-${tab.id}`}
          data-active={selected ? 'true' : undefined}
          tabIndex={selected ? 0 : -1}
          onClick={() => { setActiveId(tab.id) }}
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
        >{t(tab.label)}</button>
      })}
    </div>

    {TABS.filter((tab) => tab.id === activeId || visitedIds.has(tab.id)).map((tab) => {
      const selected = tab.id === activeId
      return <div
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
    })}
  </section>
}
