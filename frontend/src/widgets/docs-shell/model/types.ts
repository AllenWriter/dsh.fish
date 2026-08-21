import type { ArtifactKind } from '@/entities/artifact/model/types'
import type { MessageKey } from '@/shared/config/i18n'

export type DocsSeparatorKey = Extract<
  MessageKey,
  | 'docs.nav.start'
  | 'docs.nav.plugins'
  | 'docs.nav.develop'
  | 'docs.nav.publish'
  | 'docs.nav.use'
  | 'docs.nav.reference'
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
