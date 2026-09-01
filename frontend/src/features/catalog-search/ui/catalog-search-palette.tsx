import { CommandPalette, type CommandItem } from '@/shared/ui/motion/command-palette'
import { useT } from '@/shared/config/i18n'

/**
 * Header search. The catalog used to be queried here; this site is a
 * personal blog, so the palette is just the destinations already in the bar.
 */
export function CatalogSearchPalette({
  commands,
  open,
  onOpenChange,
}: {
  commands: readonly CommandItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()

  return (
    <CommandPalette
      items={[...commands]}
      open={open}
      onOpenChange={onOpenChange}
      placeholder={t('nav.search')}
      emptyMessage={t('blog.empty')}
    />
  )
}
