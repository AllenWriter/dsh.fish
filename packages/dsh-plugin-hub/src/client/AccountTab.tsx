import { useEffect, useRef, useState } from 'react'

import { ApiError, request, type AccountState, type DeviceLogin, type HubState } from './api.js'
import type { HubTranslate } from './locale.js'

const POLL_INTERVAL_MS = 3000

/**
 * Sign-in, by device flow.
 *
 * The verification URL is rendered as an ordinary link with `target="_blank"`
 * rather than navigated to in place. A desktop shell hosting this UI keeps its
 * WebView on loopback and hands external `https` links to the system browser,
 * which is where the reader's session and password manager already are; a
 * same-window navigation would strand them in a window with no address bar.
 *
 * Approval happens out of band, so state is polled while it is outstanding.
 * The device code and the resulting token stay host side.
 */
export function AccountTab({ t }: { t: HubTranslate }): JSX.Element {
  const [account, setAccount] = useState<AccountState | undefined>(undefined)
  const [login, setLogin] = useState<DeviceLogin | undefined>(undefined)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const reload = (): void => {
    request<HubState>('/state').then(
      (state) => {
        setAccount(state.account)
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

  return <div className="dshFish__panelBody">
    {error !== undefined && <p className="dshFish__error" role="alert">{error}</p>}

    {account?.signedIn === true
      ? <>
          <p>{t('account.signedIn', { name: account.displayName ?? '' })}</p>
          <button
            className="dshFish__buttonQuiet"
            type="button"
            onClick={() => {
              request('/account/logout', {}).then(
                () => { setLogin(undefined); reload() },
                (failure: unknown) => { setError(describe(failure, t)) },
              )
            }}
          >{t('account.logout')}</button>
        </>
      : <>
          <p>{t('account.signedOut')}</p>
          {login === undefined
            ? <button
                className="dshFish__button"
                type="button"
                disabled={starting}
                onClick={() => {
                  setStarting(true)
                  setError(undefined)
                  request<DeviceLogin>('/account/login', {}).then(
                    (started) => { setStarting(false); setLogin(started) },
                    (failure: unknown) => { setStarting(false); setError(describe(failure, t)) },
                  )
                }}
              >{starting ? t('account.starting') : t('account.login')}</button>
            : <div className="dshFish__device">
                <p className="dshFish__code">{t('account.code', { code: login.userCode })}</p>
                <a
                  className="dshFish__link"
                  href={login.verificationUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >{t('account.open')}</a>
                <p className="dshFish__meta" role="status">{t('account.waiting')}</p>
              </div>}
        </>}
  </div>
}

function describe(failure: unknown, t: HubTranslate): string {
  if (failure instanceof ApiError) return failure.message
  return t('error.generic')
}
