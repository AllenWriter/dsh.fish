import { useEffect, useState } from 'react'
import { detailQuery, request, type ArtifactDetail, type CatalogItem } from './api.js'
import { CloseIcon, DownloadIcon, ExternalLinkIcon, SpinnerIcon, TrashIcon, VerifiedIcon } from './Icons.js'
import type { HubLocaleKey, HubTranslate } from './locale.js'
import { MarkdownView } from './MarkdownView.js'

export interface ReadmeModalProps {
  item: CatalogItem | null
  locale: string
  isInstalled: boolean
  isBusy: boolean
  onClose: () => void
  onInstall: (item: CatalogItem) => void
  onUninstall: (item: CatalogItem) => void
  t: HubTranslate
}

export function ReadmeModal({
  item,
  locale,
  isInstalled,
  isBusy,
  onClose,
  onInstall,
  onUninstall,
  t,
}: ReadmeModalProps): JSX.Element | null {
  const [detail, setDetail] = useState<ArtifactDetail | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!item) {
      setDetail(undefined)
      return
    }

    setLoading(true)
    setError(undefined)

    request<ArtifactDetail>(detailQuery(item.id, locale)).then(
      (result) => {
        setDetail(result)
        setLoading(false)
      },
      () => {
        setError(t('error.generic'))
        setLoading(false)
      },
    )
  }, [item, locale, t])

  useEffect(() => {
    if (!item) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => { window.removeEventListener('keydown', handleKeyDown) }
  }, [item, onClose])

  if (!item) return null

  const currentDisplayName = detail?.displayName ?? item.displayName
  const currentSummary = detail?.summary ?? item.summary
  const kindKey = `kind.${item.kind}` as HubLocaleKey

  return (
    <div
      className="dshFish__modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dsh-fish-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="dshFish__modal">
        <div className="dshFish__modalHead">
          <div className="dshFish__modalHeadTitle">
            <h3 id="dsh-fish-modal-title" className="dshFish__modalTitle">
              {currentDisplayName}
            </h3>
            <div className="dshFish__modalBadges">
              <span className="dshFish__tag dshFish__tag--kind">{t(kindKey)}</span>
              {item.verified && (
                <span className="dshFish__tag dshFish__tag--verified">
                  <VerifiedIcon size={12} />
                  {t('browse.verified')}
                </span>
              )}
              {item.deprecated && (
                <span className="dshFish__tag dshFish__tag--deprecated">
                  {t('browse.deprecated')}
                </span>
              )}
              {detail?.readmeMachineTranslated && (
                <span className="dshFish__tag dshFish__tag--ai">
                  {t('modal.translated')}
                </span>
              )}
            </div>
          </div>
          <div className="dshFish__modalHeadActions">
            {isInstalled ? (
              <button
                type="button"
                className="dshFish__buttonQuiet dshFish__button--destructive"
                disabled={isBusy}
                onClick={() => { onUninstall(item) }}
              >
                {isBusy ? <SpinnerIcon size={13} /> : <TrashIcon size={13} />}
                <span>{isBusy ? t('browse.uninstalling') : t('browse.uninstall')}</span>
              </button>
            ) : (
              <button
                type="button"
                className="dshFish__button dshFish__button--primary"
                disabled={isBusy}
                onClick={() => { onInstall(item) }}
              >
                {isBusy ? <SpinnerIcon size={13} /> : <DownloadIcon size={13} />}
                <span>{isBusy ? t('browse.installing') : t('browse.install')}</span>
              </button>
            )}
            <button
              type="button"
              className="dshFish__modalClose"
              onClick={onClose}
              aria-label={t('modal.close')}
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>

        <div className="dshFish__modalMeta">
          <p className="dshFish__modalSummary">{currentSummary}</p>
          <div className="dshFish__modalMetaRow">
            <span className="dshFish__meta">
              {t('browse.installs', { count: item.installs })}
            </span>
            {detail?.author?.name && (
              <span className="dshFish__meta">
                {t('modal.author', { name: detail.author.name })}
              </span>
            )}
            {detail?.license && (
              <span className="dshFish__meta">
                {t('modal.license', { license: detail.license })}
              </span>
            )}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="dshFish__link dshFish__link--source"
              >
                <span>{t('modal.source')}</span>
                <ExternalLinkIcon size={11} />
              </a>
            )}
          </div>
        </div>

        <div className="dshFish__modalBody">
          {loading ? (
            <div className="dshFish__modalLoading">
              <SpinnerIcon size={20} />
              <span>{t('modal.loading')}</span>
            </div>
          ) : error ? (
            <p className="dshFish__error">{error}</p>
          ) : detail?.readmeMarkdown ? (
            <MarkdownView
              source={detail.readmeMarkdown}
              docBase={detail.sourceDocBase}
              assetBase={detail.sourceAssetBase}
            />
          ) : (
            <p className="dshFish__empty">{t('modal.noReadme')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
