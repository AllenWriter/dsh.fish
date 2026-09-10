import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider } from '@/shared/config/i18n'
import { ChatPoster } from './chat-poster'
import { CHAT_POSTER_STORAGE_KEY } from '../model/dismissal'

describe('ChatPoster', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders nothing on the server before client reveal', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider locale="zh-CN">
        <ChatPoster />
      </LocaleProvider>,
    )
    expect(html).toBe('')
  })

  it('uses a stable localStorage key', () => {
    expect(CHAT_POSTER_STORAGE_KEY).toBe('xiaojuren.chat-poster.dismissed')
  })
})
