import { OnThisPage } from '@/shared/ui/on-this-page'
import type { DocsTocItem } from '../model/types'

export function DocsToc({ toc }: { toc: readonly DocsTocItem[] }) {
  return <OnThisPage items={toc} />
}
