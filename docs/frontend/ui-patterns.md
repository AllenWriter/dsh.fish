# UI Patterns

This document defines how UI is written in this project. The goal is a consistent, maintainable, and accessible interface.

## Language

- All user-facing copy must be in English unless the user explicitly asks for another language.
- All code, comments, prop names, and CSS custom properties must be in English.

## No hardcoded strings

- Every user-facing string must come from a centralized source: i18n keys, design-system tokens, or a constants file.
- Do not write labels, placeholders, or error messages directly in components.

```tsx
// ✅ Good
import { t } from 'shared/i18n';

<Button>{t('order.submit')}</Button>
```

```tsx
// ❌ Bad
<Button>Submit order</Button>
```

## No redundant copy

- Do not repeat information already shown by a title, icon, selected state, or surrounding section.
- Prefer concise labels over explanatory text when the state is self-evident.
- Remove disabled placeholder actions unless they teach a real next step.

```tsx
// ❌ Bad
<div>
  <h1>Orders</h1>
  <p>This section shows your orders.</p>
</div>
```

```tsx
// ✅ Good
<div>
  <h1>{t('orders.title')}</h1>
  <OrderList />
</div>
```

## Semantic styling

- Use semantic design tokens instead of physical colors.
- ❌ Avoid: `bg-white`, `text-black`, `zinc-500`.
- ✅ Prefer: `bg-bg`, `text-text`, `border-border`, `text-muted`.
- Theme differences must live in one place (global theme file or CSS variables). Do not scatter `dark:` or media queries across components.

### Colour is scarce; shape is not

The palette is a near-neutral ground and exactly one accent, and the accent is spent
on two things only: the primary action and a verified badge. Do not give a taxonomy
entry a hue — six kind colours encode nothing a reader can learn and compete with the
one accent.

A glyph is the opposite trade and is encouraged: it is one mark per entry, it
survives translation into ten languages where the word does not, and it stays
legible without colour vision. So a kind or a category is told apart by its word and
its mark, never by a colour.

Where a state does use the accent, it must also change shape or weight, so the state
is never carried by hue alone.

## Functional icons

Every functional mark comes from [Phosphor](https://phosphoricons.com) through
`shared/ui/icon`. No component imports `@phosphor-icons/react` directly.

### One place names the marks

`shared/ui/icon/icons.ts` re-exports each glyph under the name of what it means —
`SearchIcon`, `VerifiedIcon`, `CliIcon`, `BundleIcon` — and is the only file that
mentions the library. Reach for a semantic alias, add one there when a new concept
needs a mark, and never introduce a second icon library.

One concept, one alias. Where two roles share a meaning they share the alias too;
a synonym would let the two drift apart. An install warning and a deprecated badge
are both `WarningIcon`.

### Weight follows the text beside it

A Phosphor weight is a fixed fraction of the rendered size, so the choice is a rule
rather than a judgement:

| Where the mark sits | Weight | Stroke |
| --- | --- | --- |
| Beside body copy at 400 | `regular` | 1.5px at 24px |
| Beside a label at 500–600, and on icon-only controls | `bold` | 2.25px at 24px |
| Selected, applied, or affirmed | `fill` | solid |

`ICON_WEIGHT` in `shared/ui/icon/icon.tsx` names these three roles. `regular` is the
document default; state the others at the call site.

`fill` is a state and not an emphasis. Colour must change with it, so a selected
filter, an active tab, the current navigation link and a verified badge are each
told apart twice — by shape and by colour — and neither channel carries the state
alone.

### Defaults come from the document, not the call site

`IconDefaults` wraps the app in `root.tsx` and supplies:

- `size="1em"`, so an unstyled glyph matches the cap height of its text. A `size-*`
  class still wins where a control needs an exact box.
- `color="currentColor"`, so hover, active and disabled are CSS colour changes on
  one SVG. Never a second asset per state.
- `aria-hidden`, because every mark here accompanies a visible label or an
  `aria-label` on its control. Do not repeat it at call sites. A mark that ever
  does need announcing overrides `aria-hidden` and passes `alt`.

### What earns a mark

A mark earns its place when it speeds recognition of a repeated, scannable item, or
when it names an action. Taxonomy entries and controls qualify; a section heading
that appears once does not, and neither does free text such as an artifact's
keywords, which has no taxonomy behind it to learn.

### Kinds and categories

`entities/artifact/model/icons.ts` owns the two taxonomy maps. `KIND_ICON` is keyed
by the `ArtifactKind` union, so a new kind fails the typecheck; category ids are
slugs and cannot be, so `icons.test.ts` walks the taxonomy instead and fails when it
grows past the map. `categoryIcon` returns `undefined` for an unmapped id rather
than a stand-in, which would look deliberate and hide the gap.

Kinds gain a shape and still no hue — see the colour rule below. Each mark names the
install mechanism the kind owns, and it follows that kind through the chip, the
filter rail, the footer, the home chips, the collection heading, the breadcrumb and
the docs tab. Do not use a different glyph for the same kind in a new place.

### Stateful marks

An icon that swaps with state goes through `shared/ui/icon-swap.tsx`, which
crossfades opacity, scale and blur on a bounceless spring and reduces to a plain
fade under `prefers-reduced-motion`. Do not hand-roll a second crossfade.

Motion is never the only channel. A swap always accompanies a changed label,
`aria-expanded`, or `aria-selected`.

Marks are otherwise static. Do not animate an icon that is only identifying
something.

### Hit areas

An icon-only control takes `.hit-area`, which extends the target to 44px under a
coarse pointer and 40px under a fine one without changing how the control looks.
Keep adjacent centres at least as far apart as the target is wide.

## Brand icons

The dsh.fish brand uses the generated, faceless blue-whale assets in
`frontend/public/icons/`, not handwritten inline SVG:

- Use `whale-brand.png` beside the product name and in generated social cards.
- Keep the whale itself free of marketplace metaphors. The plugin ecosystem is
  expressed at social-card scale by the central whale node, five surrounding
  plugin tiles, and their restrained orbital paths in
  `.github/assets/social-preview-background.png`.
- Do not add storefront, shopping, puzzle-piece, package-box, or install-arrow
  symbols to the whale mark.
- `whale-success.png` is the same mark at a compact size, used only for
  celebratory success states; do not introduce a second whale pose.
- Keep the image decorative when adjacent copy already names the product or
  state: use an empty `alt` and hide it from assistive technology.
- Generate PNG favicon derivatives from `whale-brand.png`; do not maintain a
  second hand-drawn logo in SVG.

This rule is limited to brand artwork. Functional controls use Phosphor through
`shared/ui/icon`, as above. Invisible SVG filter definitions and SVG
security/layout test fixtures are not icons and must remain structural code.

## Catalog card Social preview

A GitHub Social preview is a texture behind the card, not a second title.

- Render it only when `artifact.ogImageUrl` is present. Do not invent a placeholder image.
- Mark it decorative: `aria-hidden` on the layer, empty `alt` on the `img`.
- Drive opacity, blur, saturation and the scrim from `--artifact-og-*` in `app.css`.
- Hover may shift opacity only, only under `@media (hover: hover) and (pointer: fine)`, and not under `prefers-reduced-motion`.
- Animate `opacity` only. Do not animate `blur` or `transform` on hover.

## Animated counts

User-facing counts (stars, downloads, the home total) go through
`shared/ui/animated-number.tsx`, which wraps `@number-flow/react`.

- Format with `compactNumberParts` in `shared/lib/format.ts`. Do not pass
  `notation: 'compact'` to NumberFlow — ICU compact notation hydrates
  differently on the Worker and in the browser.
- Pin `locales="en"` and explicit `minimumFractionDigits` / `maximumFractionDigits`.
- Keep `font-variant-numeric: tabular-nums` so changing digits do not shift layout.
- First paint is static. Do not add extra entrance motion around the number.

## Components are small and focused

- A component should do one thing.
- Extract a new component when a file grows beyond ~300 lines or when a block is reused.
- Components receive data and callbacks through props; they do not fetch their own data unless they live in a feature slice and that is the slice's explicit responsibility.

## Layout rules

- Use Flexbox to partition the screen into stable regions (header, content, footer).
- Only designated containers scroll. Do not allow the body or arbitrary containers to scroll.
- Set `min-height: 0` on every flex container that participates in the scroll chain, and `min-width: 0` on every grid or flex child that must shrink below its content's intrinsic size (a readme table, a code fence).
- The page root should fill the viewport (`min-h-dvh` / `h-dvh`).

## Accessibility

- Use semantic HTML (`button`, `a`, `label`, `nav`, `main`).
- Every interactive element must have an accessible name.
- Do not build fake buttons or links with `div` + click handlers.
