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

## End-to-end tests

- Cover the most important user journeys only.
- Keep them stable and fast enough to run in CI.
- Use deterministic test data.

Plugin-detail markdown rendering is an exception to "journeys only": a
third-party readme is the unique content of `/a/:id`, and its layout is
resolution-dependent. `pnpm run test:e2e` runs Playwright against the real
SSR app at six device sizes (iPhone SE 320, Galaxy S8 360, iPhone SE 3rd
gen 375, Pixel 7 412, iPhone 14 Pro Max 430, iPad Mini 768). The suite
seeds a kitchen-sink readme onto the local D1 `dsh-postgres-mcp` row so
tables, fences, images and long tokens are present to measure.

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

Install the browser once with `pnpm exec playwright install --with-deps chromium`.

## Test data

- Use factories, not fixtures, for test data.
- Avoid shared mutable state between tests.

## Naming

- Test descriptions should read like specifications: `it('rejects a negative amount')`.
- Group tests by behavior, not by method name.

## Coverage

- Aim for high coverage of domain and application layers.
- Do not chase 100% coverage at the expense of meaningful tests.
