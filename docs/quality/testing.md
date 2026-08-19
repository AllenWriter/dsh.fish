# Testing

## Test pyramid

1. **Unit tests** — fast, isolated tests for domain logic and pure functions.
2. **Integration tests** — verify repositories, external-service clients, and API endpoints against real or test doubles.
3. **End-to-end tests** — verify critical user journeys through the full stack.

## Unit tests

- Place unit tests next to the source file or in a `__tests__` directory.
- Test domain invariants and edge cases thoroughly.
- Do not test framework code.

## Integration tests

- Use a test database or in-memory equivalent.
- Reset state between tests.
- Test the boundary between layers (e.g., repository mapping).

README localization tests cover three boundaries without calling a paid model:

- ingestion and ownership-verified submission schedule localization only after
  a catalog write with a non-empty README;
- the detail use case serves only a completed translation whose source hash
  matches the current README;
- the OpenCode Go client pins the endpoint/model/auth request, walks the model
  fallback chain on 429/5xx, and rejects malformed, empty or failed
  chat-completions responses;
- the stock backfill advances durable pages, becomes a no-op when complete,
  never advances its cursor after a scheduling failure, and reschedules stale
  terminal failures on every run;
- the schema test pins the D1 table to its migration and journal entry.

`wrangler types` and `wrangler deploy --dry-run` validate the real Agent
binding and Cron configuration. A bounded live request verifies production-key
and model availability; model quality remains an operational evaluation, not a
deterministic unit test.

## End-to-end tests

- Cover the most important user journeys only.
- Keep them stable and fast enough to run in CI.
- Use deterministic test data.

`pnpm run test:e2e` runs Playwright. Five project groups share one config:

**Plugin-detail markdown** is an exception to "journeys only": a third-party
readme is the unique content of `/a/:id`, and its layout is resolution-dependent.
The suite runs against the real SSR app at six device sizes (iPhone SE 320,
Galaxy S8 360, iPhone SE 3rd gen 375, Pixel 7 412, iPhone 14 Pro Max 430,
iPad Mini 768). It seeds a kitchen-sink readme onto the local D1
`dsh-postgres-mcp` row so tables, fences, images and long tokens are present
to measure.

The tests assert:

- GFM structure (demoted headings, tables, fences, task lists) and that raw
  HTML never reaches the DOM.
- The *page* does not scroll sideways; wide tables and fences scroll inside
  themselves.
- A 1600px screenshot shrinks to the column; inline badges stay inline.
- Below the `lg` breakpoint the install panel stacks under the readme.

Visual baselines of the first fold are stored for iPhone SE (3rd gen) and Pixel 7.
Update them with `pnpm exec playwright test --update-snapshots`.

Device projects force Chromium (`defaultBrowserType: 'chromium'`). Playwright's
iPhone presets default to WebKit; CI only installs Chromium, and the suite is
asserting CSS-pixel layout, not engine differences.

**Catalog-card Social preview** (`e2e/catalog-og/`) is a fixture page that uses
the same `--artifact-og-*` tokens as `app.css`. Playwright fulfills
`/og-card-preview.html` and its PNGs from that folder (the spec cannot import
`node:` modules — the loader is ESM and those compile to `require`). It asserts
image opacity, blur and title contrast, and writes treatment screenshots. Run
that project alone with `pnpm exec playwright test --project=catalog-og`.

**Icon system** (`e2e/icons/`) is split by pointer rather than by width, because
most of it needs the navigation bar that is hidden below `md` while the menu toggle
and the 44px hit areas only exist under a coarse pointer. `icons` runs at
1280×900; `icons-touch` runs on one phone — a hit area is CSS pixels and does not
vary with the viewport, so the readme suite's device matrix is not repeated.

Marks are compared as the path data read out of the served document, never against
a path the test knows (`e2e/lib/icons.ts`). Two renderings of one glyph at one
weight match; anything else does not. A library upgrade that redraws nothing a
reader can see therefore does not fail the suite.

The suite asserts what only a browser can show:

- One library reached the page: every icon with a non-zero box is on Phosphor's
  256-unit grid, in `currentColor`, and hidden from assistive technology.
- A selected state changes the drawing and not merely the colour.
- The same fact wears the same mark everywhere a reader meets it.
- The footer covers the whole taxonomy in one page, with every mark distinct and
  none shared between kinds and categories.
- The outbound links — the source repository and the Discord community — carry
  their own mark in the bar and in the footer, and open in a new tab.
- Icon-only controls reach 40px on a mouse and 44px on a thumb without stealing
  each other's clicks.

Interactions wait on hydration before clicking: `domcontentloaded` returns while
the page is still the server's HTML, and the theme and menu toggles only know their
state after an effect. `awaitHydration` uses the account slot, which is blank until
the session resolves in the browser. The clipboard is stubbed, because headless
Chromium's is unreliable and the subject is the mark that swaps after a successful
write.

**Community toasts** (`e2e/community-toasts/`) runs at 1280×900, once. The stack is
fixed to one corner at one width, so the readme suite's device matrix would assert
the same thing six times.

The unit test (`widgets/community-toasts/model/dismissal.test.ts`) proves the
cookie can be read back. What only a browser can show is the rest:

- The three destinations are real anchors — Discord, the maintainer's feed, and a
  `mailto:` — and the two off-site ones open in their own tab with `noopener`.
- Dismissing writes the cookie, and a reload comes back as a *smaller* stack,
  because the loader never offered the retired toast again. A reader who has
  closed all three gets no live region at all.
- The stack survives a client-side navigation without replaying its entrance.
- Copy follows the URL's language, region label included.
- A reader who asked for reduced motion is never displaced: every row's computed
  transform stays `none` or the identity matrix across the whole entrance.

That last test emulates the preference with `page.emulateMedia` and asserts the
media query is in force before reading anything from it. Declaring it as a
`test.use` fixture is not enough to trust — a preference that silently failed to
apply would leave the test asserting the unreduced path and passing anyway.

Pagination is covered by a unit test, not here: the seed holds seven rows against a
page size of twenty-four, so a browser never reaches a second page.

Install the browser once with `pnpm exec playwright install --with-deps chromium`.

## Design tokens

`frontend/src/app/styles/palette.test.ts` parses `app.css` — it never restates a
colour — and asserts what a stylesheet cannot check for itself: every value is inside
sRGB, every foreground/background pair the UI renders meets its WCAG threshold, the
accent and neutral hues have not drifted, the three stacked surfaces stay
distinguishable, and the dark block says the same thing in both places the cascade
forces it to be written.

Borders are deliberately absent from the contrast table. `--line` and `--line-strong`
draw structure and hover feedback on surfaces a reader identifies by their content,
so holding them to a component threshold would make the interface heavier for no
accessibility gain.

The `catalog-og` fixture reads its tokens out of `app.css` for the same reason. It
used to restate them, which is how it ended up asserting contrast against a palette
the product had already left behind.

## Test data

- Use factories, not fixtures, for test data.
- Avoid shared mutable state between tests.

A factory shared by more than one test file lives beside the model it builds, named
`*.fixture.ts` so the Vitest `include` glob does not collect it as a suite. It must
be typed against the real contract — `artifact.fixture.ts` returns the backend's
`ArtifactSummaryDto`, so a renamed field breaks the typecheck there exactly as it
does in a component.

Nothing in the app may import a fixture.

## Naming

- Test descriptions should read like specifications: `it('rejects a negative amount')`.
- Group tests by behavior, not by method name.

## Coverage

- Aim for high coverage of domain and application layers.
- Do not chase 100% coverage at the expense of meaningful tests.
