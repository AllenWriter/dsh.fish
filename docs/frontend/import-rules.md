# Import Rules

FSD is only useful if imports are enforced. Follow these rules strictly.

## Layer direction

Imports can only go from a higher layer to a lower layer:

```
app -> pages -> widgets -> features -> entities -> shared
```

- `shared` cannot import from any other layer.
- `entities` cannot import from `features`, `widgets`, `pages`, or `app`.
- `features` cannot import from `widgets`, `pages`, or `app`.

## Slice isolation

- A slice can import from the public API of any slice in a lower layer.
- A slice in the same layer should not import from another slice in the same layer. If it must, ask the user whether the two slices should be merged or whether a shared abstraction should be extracted.

## Public API only

- Import only from a slice's root `index.ts`.
- Never import from `ui/`, `model/`, `lib/`, `api/`, or `config/` directly.

## Examples

```ts
// ✅ Good: page imports from widgets and features
import { Header } from 'widgets/header'
import { AddToCartButton } from 'features/add-to-cart'

// ✅ Good: feature imports from entities and shared
import { type Order } from 'entities/order'
import { Button } from 'shared/ui'

// ❌ Bad: feature imports from another feature
import { useSearch } from 'features/search'

// ❌ Bad: shared imports from entities
import { type User } from 'entities/user'

// ❌ Bad: importing internals
import { internalHelper } from 'features/add-to-cart/lib/internalHelper'
```

## Exceptions

Exceptions must be documented in [`docs/project/architecture.md`](../project/architecture.md) and approved by the user.

### Product docs, the blog, sitemap, markdown negotiation, and llms.txt

`pages/seo` and `pages/markdown` may import from `pages/docs` and `pages/blog` so every slug is enumerated once, from the MDX tree:

- `pages/markdown` imports the docs **public API** (`productDocsMarkdown`) — bundled source text, no Fumadocs.
- `pages/markdown` imports the blog **public API** (`blogMarkdown`, `supportsBlogMarkdown`) the same way.
- `pages/seo` imports `productDocsMarkdown` / `productDocsPaths` from the docs public API for `/docs/llms-full.txt`.
- `pages/seo` imports `docsSitemapEntries`, `docsNav`, and `docsSitemapPaths` from `pages/docs/source`. Those helpers cannot live on the docs public API: `defineDocs` is a Vite macro, and the markdown unit tests import `@/pages/docs` without the plugin.
- `pages/seo` imports `blogSitemapEntries`, `listBlogPosts`, and `blogPostPaths` from `pages/blog/source` for the same reason.
- `pages/home` imports `blogPostCards` from `pages/blog/source` so the homepage grid is that collection, not a second list.

Do not copy the slug list into the sitemap, the markdown handler, or llms.txt.
