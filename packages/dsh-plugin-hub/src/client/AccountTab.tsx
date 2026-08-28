import { useEffect, useRef, useState } from 'react'

import {
  ApiError,
  request,
  type AccountState,
  type DeviceLogin,
  type HubState,
  type SelfUpdateResult,
  type UpdateCheckResult,
} from './api.js'
import { Avatar } from './Avatar.js'
import { ExternalLinkIcon, SpinnerIcon } from './Icons.js'
import type { HubTranslate } from './locale.js'
import { Tooltip } from './Tooltip.js'

const POLL_INTERVAL_MS = 3000

/**
 * Sign-in, by device flow, and plugin maintenance.
 */
export function AccountTab({ t }: { t: HubTranslate }): JSX.Element {
  const [account, setAccount] = useState<AccountState | undefined>(undefined)
  const [version, setVersion] = useState<string | undefined>(undefined)
  const [login, setLogin] = useState<DeviceLogin | undefined>(undefined)
  const [starting, setStarting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | undefined>(undefined)
  const [updating, setUpdating] = useState(false)
  const [updateNotice, setUpdateNotice] = useState<string | undefined>(undefined)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const reload = (): void => {
    request<HubState>('/state').then(
      (state) => {
        setAccount(state.account)
        if (state.version) setVersion(state.version)
        if (state.account.signedIn) {
          setLogin(undefined)
          setError(undefined)
          return
        }
        if (state.account.error !== undefined) {
          setLogin(undefined)
          setError(state.account.error)
        }
      },
      (failure: unknown) => { setError(describe(failure, t)) },
    )
  }

  useEffect(() => { reload() }, [])

  useEffect(() => {
    if (login === undefined || account?.signedIn === true) return
    timer.current = setInterval(reload, POLL_INTERVAL_MS)
    return () => { clearInterval(timer.current) }
  }, [login, account?.signedIn])

  const handleLogout = (): void => {
    setLoggingOut(true)
    request('/account/logout', {}).then(
      () => {
        setLoggingOut(false)
        setLogin(undefined)
        reload()
      },
      (failure: unknown) => {
        setLoggingOut(false)
        setError(describe(failure, t))
      },
    )
  }

  const handleLogin = (): void => {
    setStarting(true)
    setError(undefined)
    request<DeviceLogin>('/account/login', {}).then(
      (started) => {
        setStarting(false)
        setLogin(started)
      },
      (failure: unknown) => {
        setStarting(false)
        setError(describe(failure, t))
      },
    )
  }

  const handleCheckUpdate = (): void => {
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

  const handleApplyUpdate = (): void => {
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
    <div className="dshFish__panelBody">
      {error !== undefined && (
        <p className="dshFish__error" role="alert">
          {error}
        </p>
      )}

      {account?.signedIn === true ? (
        <div className="dshFish__accountCard">
          <div className="dshFish__accountInfo">
            <Tooltip
              content={t('account.tooltip', { name: account.displayName ?? '' })}
              position="bottom"
            >
              <div className="dshFish__avatarTrigger">
                <Avatar
                  src={account.avatarUrl}
                  name={account.displayName}
                  size={46}
                  alt={t('account.avatar', { name: account.displayName ?? '' })}
                />
              </div>
            </Tooltip>
            <div className="dshFish__accountText">
              <span className="dshFish__accountName">{account.displayName}</span>
              <span className="dshFish__accountSub">{t('account.connected')}</span>
            </div>
          </div>
          <button
            className="dshFish__buttonQuiet dshFish__button--destructive"
            type="button"
            disabled={loggingOut}
            onClick={handleLogout}
          >
            {loggingOut && <SpinnerIcon size={13} />}
            <span>{t('account.logout')}</span>
          </button>
        </div>
      ) : (
        <div className="dshFish__signedOut">
          <p className="dshFish__intro">{t('account.signedOut')}</p>
          {login === undefined ? (
            <button
              className="dshFish__button dshFish__button--primary"
              type="button"
              disabled={starting}
              onClick={handleLogin}
            >
              {starting && <SpinnerIcon size={13} />}
              <span>{starting ? t('account.starting') : t('account.login')}</span>
            </button>
          ) : (
            <div className="dshFish__device">
              <p className="dshFish__code">
                {t('account.code', { code: login.userCode })}
              </p>
              <a
                className="dshFish__link dshFish__link--source"
                href={login.verificationUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                <span>{t('account.open')}</span>
                <ExternalLinkIcon size={12} />
              </a>
              <div className="dshFish__waitingRow">
                <SpinnerIcon size={14} />
                <p className="dshFish__meta" role="status">
                  {t('account.waiting')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="dshFish__pluginSection">
        <h4 className="dshFish__sectionTitle">{t('plugin.about')}</h4>
        <div className="dshFish__pluginCard">
          <div className="dshFish__pluginInfo">
            <span className="dshFish__pluginName">@dsh-fish/hub</span>
            {version && (
              <span className="dshFish__meta">
                {t('plugin.version', { version })}
              </span>
            )}
          </div>
          <div className="dshFish__pluginActions">
            {updateResult?.hasUpdate ? (
              <button
                className="dshFish__button dshFish__button--primary"
                type="button"
                disabled={updating}
                onClick={handleApplyUpdate}
              >
                {updating ? <SpinnerIcon size={13} /> : null}
                <span>
                  {updating
                    ? t('update.upgrading')
                    : `${t('update.upgrade')} (${updateResult.latestVersion})`}
                </span>
              </button>
            ) : (
              <button
                className="dshFish__button"
                type="button"
                disabled={checkingUpdate}
                onClick={handleCheckUpdate}
              >
                {checkingUpdate ? <SpinnerIcon size={13} /> : null}
                <span>{checkingUpdate ? t('update.checking') : t('update.check')}</span>
              </button>
            )}
          </div>
        </div>
        {updateNotice && (
          <p className="dshFish__notice" role="status">
            {updateNotice}
          </p>
        )}
      </div>
    </div>
  )
}

function describe(failure: unknown, t: HubTranslate): string {
  if (failure instanceof ApiError) return failure.message
  return t('error.generic')
}
