import type { ArtifactKind } from '@/entities/artifact/model/types'
import type { MessageKey } from '@/shared/config/i18n'

export type DocsSeparatorKey = Extract<
  MessageKey,
  | 'docs.nav.ai'
  | 'docs.nav.selfHosted'
  | 'docs.nav.accounts'
  | 'docs.nav.site'
  | 'docs.nav.finance'
  | 'docs.nav.product'
>

export type DocsNavNode =
  | { readonly type: 'separator'; readonly titleKey: DocsSeparatorKey }
  | {
      readonly type: 'page'
      readonly url: string
      readonly title: string
      readonly kind?: ArtifactKind
    }

export interface DocsTocItem {
  readonly title: string
  readonly url: string
  readonly depth: number
}
