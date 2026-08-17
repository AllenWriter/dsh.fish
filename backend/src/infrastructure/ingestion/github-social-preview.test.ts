import { afterEach, describe, expect, it, vi } from 'vitest'
import { GitHubSocialPreview } from './github-social-preview.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GitHubSocialPreview', () => {
  it('prefers an uploaded Social preview over the generated card', async () => {
    const custom =
      'https://repository-images.githubusercontent.com/70107786/4602445c-10a2-4903-a360-c96d70531f67'
    vi.stubGlobal('fetch', async () =>
      Response.json({
        data: {
          repository: {
            usesCustomOpenGraphImage: true,
            openGraphImageUrl: custom,
          },
        },
      }),
    )

    await expect(new GitHubSocialPreview().read('acme', 'plugin')).resolves.toBe(custom)
  })

  it('falls back to the generated card when GitHub has no upload', async () => {
    vi.stubGlobal('fetch', async () =>
      Response.json({
        data: {
          repository: {
            usesCustomOpenGraphImage: false,
            openGraphImageUrl: 'https://avatars.githubusercontent.com/u/1',
          },
        },
      }),
    )

    await expect(new GitHubSocialPreview().read('acme', 'plugin', 'c0ffee')).resolves.toBe(
      'https://opengraph.githubassets.com/c0ffee/acme/plugin',
    )
  })

  it('never stores an avatar, even if GitHub marks it custom', async () => {
    vi.stubGlobal('fetch', async () =>
      Response.json({
        data: {
          repository: {
            usesCustomOpenGraphImage: true,
            openGraphImageUrl: 'https://avatars.githubusercontent.com/u/1',
          },
        },
      }),
    )

    await expect(new GitHubSocialPreview().read('acme', 'plugin')).resolves.toBe(
      'https://opengraph.githubassets.com/preview/acme/plugin',
    )
  })
})
