# Structured data

One connected graph, emitted as `application/ld+json` through React Router's
`script:ld+json` meta descriptor.

## The nodes

| Node | Emitted on | Built by |
|---|---|---|
| `WebSite` (+ `SearchAction`) | Home, per language | `websiteLd` |
| `Organization` | Home, per language | `organizationLd` |
| `BreadcrumbList` | Artifact, kind, category, browse, docs, submit | `breadcrumbLd` |
| `CollectionPage` + `ItemList` | Browse, kind, category | `collectionLd` |
| `SoftwareApplication` | Artifact detail | `artifactLd` |

The `Organization.logo` is the square 256×256 whale brand mark. The 1200×630
social card is not used as a logo: it is a sharing canvas with background
artwork and does not satisfy the shape or identity semantics of an organization
mark.

`Organization.sameAs` lists the profiles the project actually maintains: the
`HUB_REPO_URL` repository and the `HUB_DISCORD_URL` community invite, both from
`shared/config/site.ts`. Adding a profile the project does not control would
claim an identity it cannot back.

`WebSite` and `Organization` are emitted **once**, on the home page, and
referenced by `@id` from every other page (`isPartOf`, `publisher`). Repeating
them on every page would restate the same facts a few thousand times per crawl.

## Where the artifact node lives

`artifactLd` is in `entities/artifact/lib/`, not in `shared/lib/seo/`. It is the
one structured-data node that has to know what an artifact is — its kind, its
source, the counters the crawler measured — and `shared` may not import from
`entities`. Everything entity-agnostic stays in `shared/lib/seo`.

## What is deliberately absent

`SoftwareApplication` supports `offers`, which would unlock a richer search
result. It is not emitted, because the hub does not know what a third party's
package costs. Markup that asserts facts a site does not have is ignored at
best and manually penalised at worst.

`aggregateRating` *is* emitted, but only when the reviews API holds at least
one real rating for the artifact (see `artifactLd` — the page loader passes
the aggregate only when `count > 0`). Ratings are written from the dsh harness
and stored by the registry, so the node states a number the site can defend;
an artifact nobody has rated yet carries no rating node, because an
`aggregateRating` over zero ratings would be a claim no one made.

What is emitted alongside both is `interactionStatistic` — install count,
weekly downloads and stars as `InteractionCounter` nodes. Those are measured
numbers, and it is the one place schema.org lets a registry state popularity
without inventing a rating.

`softwareHelp` carries the install command, but only a real one: a plan's
`manualCommands` can include comment lines (`# Copy the composition to …`) that
are instructions to a reader, and publishing one would tell a machine that `#`
is how you install this.

## Language

Every node carries `inLanguage` set to the same tag as `<html lang>` — the
locale registry's `tag` field, so `zh-Hans` rather than `zh-CN`.

The artifact node's `name`, `description` and `keywords` come from the crawled
manifest and stay in whatever language the author wrote. Only the frame around
them is translated: `applicationSubCategory` (the artifact's type),
`softwareRequirements`, and the breadcrumb names. See
[`../frontend/i18n.md`](../frontend/i18n.md) for why the catalog itself is not
translated.

## Adding a node

1. Add a builder to `shared/lib/seo/structured-data.ts` (or to the owning entity
   if it needs domain knowledge) that returns a plain object.
2. Export it from the slice's public API.
3. Pass it in the page's `pageMeta({ jsonLd: [...] })`.

Do not build JSON-LD inline in a page. A node duplicated across two pages drifts
between them, and the drift is invisible until a validator reports it.

## Verifying

The rendered blocks are plain JSON in the response body:

```sh
curl -s http://localhost:5173/ja/a/<id> \
  | grep -o '<script type="application/ld+json">[^<]*' \
  | sed 's/^[^>]*>//' \
  | python3 -m json.tool
```

Against a deployed origin, use Google's Rich Results Test and Schema.org's
validator for the same URLs.
