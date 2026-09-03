# pages

This layer contains page components that map to URLs.

## What goes here

- One folder per route/page.
- Page composition: combine widgets and features into a complete screen.
- Reading route parameters and passing them to child components.
- Page-level layout skeleton (header / left / main / right / footer).

## What does NOT go here

- Reusable UI components.
- Business logic or direct API calls.
- Deep prop drilling; prefer composing features/widgets.

## Dependencies

`pages` can import from `widgets`, `features`, `entities`, `shared`.

Product docs are the `docs` slice: Markdown lives in `frontend/content/docs/`
(outside this tree), the splat route and the manifest-backed source live here,
bodies come from the ASSETS binding, and chrome lives in
`widgets/docs-shell`. See
[`docs/decisions/adr-0005-product-docs-with-fumadocs.md`](../../../docs/decisions/adr-0005-product-docs-with-fumadocs.md).

The editorial blog is the `blog` slice: MDX lives in `frontend/content/blog/`,
the splat route and collection source live here, and chrome lives in
`widgets/blog-shell`. See
[`docs/decisions/adr-0007-editorial-blog.md`](../../../docs/decisions/adr-0007-editorial-blog.md).
