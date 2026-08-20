/**
 * Outbound ask against a GitHub-sourced artifact. The Worker never forwards
 * Ada's JSON: the port yields a closed set of events the UI can render.
 */
export type AskEvent =
  | { readonly type: 'file'; readonly repo: string; readonly path: string }
  | { readonly type: 'delta'; readonly text: string }
  | {
      readonly type: 'cite'
      readonly repo: string
      readonly path: string
      readonly start: number
      readonly end: number
    }
  | { readonly type: 'done' }
  | { readonly type: 'error'; readonly message: string }

export interface ArtifactAskInput {
  readonly repoName: string
  readonly question: string
  readonly queryId?: string
  readonly source: 'ada.dsh_fish'
}

export interface ArtifactAskSession {
  readonly queryId: string
  readonly events: AsyncIterable<AskEvent>
}

export interface ArtifactAskPort {
  start(input: ArtifactAskInput): Promise<ArtifactAskSession>
}
