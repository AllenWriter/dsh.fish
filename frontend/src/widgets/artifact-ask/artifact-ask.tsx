import { useState, useSyncExternalStore, type ReactNode } from 'react'
import type { ArtifactDetail } from '@/entities/artifact/model/types'
import { AskArtifactPanel } from '@/features/ask-artifact'
import { useT } from '@/shared/config/i18n'
import { AskIcon } from '@/shared/ui/icon'
import { BottomSheet } from '@/shared/ui/motion/bottom-sheet'
import { Drawer } from '@/shared/ui/motion/drawer'

const LG_QUERY = '(min-width: 1024px)'

/**
 * Rail entry to the Ada-backed ask panel. Hidden entirely when ask is not
 * available — no disabled tease for npm or a flagged-off Worker.
 */
export function ArtifactAsk({
  artifactId,
  ask,
}: {
  artifactId: string
  ask: ArtifactDetail['ask']
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const desktop = useMinWidthLg()

  if (!ask.available) return null

  const panel = (
    <AskArtifactPanel artifactId={artifactId} className="flex min-h-0 flex-1 flex-col p-4" />
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:border-border-strong"
      >
        <span className="inline-flex items-center gap-2">
          <AskIcon className="size-4 text-muted-foreground" weight="bold" />
          {t('ask.open')}
        </span>
      </button>
      {desktop ? (
        <Drawer
          open={open}
          onOpenChange={setOpen}
          side="right"
          ariaLabel={t('ask.title')}
          className="w-[28rem] max-w-[100vw] bg-card"
        >
          <AskPanelChrome title={t('ask.title')} onClose={() => setOpen(false)}>
            {panel}
          </AskPanelChrome>
        </Drawer>
      ) : (
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title={t('ask.title')}
          snapPoints={[0.72, 0.94]}
          className="bg-card"
        >
          {panel}
        </BottomSheet>
      )}
    </>
  )
}

function AskPanelChrome({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const t = useT()
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {t('ask.close')}
        </button>
      </header>
      {children}
    </div>
  )
}

function useMinWidthLg(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia(LG_QUERY)
      media.addEventListener('change', onStoreChange)
      return () => media.removeEventListener('change', onStoreChange)
    },
    () => window.matchMedia(LG_QUERY).matches,
    () => false,
  )
}
