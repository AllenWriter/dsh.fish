# dsh-hub

Search [dsh.fish](https://dsh.fish) and install any harness artifact from inside
your agent.

## Install

```sh
dsh plugin --profile web add github:stvlynn/dsh.fish#main
```

This package is TypeScript, so a git install runs its `prepare` script to build
`lib/`. pnpm ≥10 refuses that until you allow it — copy the package key pnpm
prints into your profile's `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  dsh-hub: true
```

Then re-run the `add`. That allowance is permission to execute this package's
code on your machine at install time, outside the agent's sandbox — pin a commit
so a later push cannot change what runs.

## Tools

| Tool | What it does |
|---|---|
| `hub_search` | Search the registry by text and artifact kind. |
| `hub_show` | One artifact in detail, including exactly what installing it would do. |
| `hub_install` | Apply the install plan on this machine. |
| `hub_list` | Artifacts this machine already installed through the hub. |
| `hub_remove` | Reverse a recorded install (files, patch rows, packages). |
| `hub_update` | Re-apply the current plan for an installed artifact. |
| `hub_account` | Sign in via the OAuth device flow, check status, or sign out. |
| `hub_reviews` | Community ratings: the site's 1–5 scale, average, distribution, comments. |
| `hub_rate` | Rate an installed artifact 1–5 stars, optionally with a public comment. |

## Ratings and reviews

The site runs a 1–5 star scale (1 = broken or misleading, 5 = excellent) that
the artifact pages render read-only. `hub_reviews` reads it anonymously;
`hub_rate` writes it and needs sign-in. A rating always speaks for the
signed-in account, and rating again overwrites the earlier one.

The tools carry their own rules in their descriptions, which the agent reads:
rate only what this machine actually installed and used, from firsthand
evidence, never fabricate experience, and tell the user when a rating is left.
After an install or usage that clearly worked or failed, the agent is expected
to *offer* a rating — the decision and the stars stay the user's call.

## Signing in

Reading the catalog needs no account. Signing in attributes installs to you and
is required for anything account-shaped later.

`hub_account` with `action: "login"` starts an RFC 8628 device grant: the plugin
requests a code, shows you a URL, and polls until you approve in a browser. The
token is written to `$DSH_HOME/.dsh-fish-token.json` with mode 0600 and is never
logged.

A device token is deliberately weaker than a browser session — it can read the
catalog, resolve install plans and rate artifacts as you, but it cannot submit
or claim artifacts.

## Safety

`hub_install` refuses any plan whose package step needs a build allowance unless
the caller passes `allowBuildScripts: true`. That step runs the package's own
code at install time, outside the agent sandbox, so the agent must not grant it
on your behalf — it has to come back and ask.

File-writing steps are fenced to the resolved `$DSH_HOME`; a plan that tries to
escape it is refused.

Successful installs are recorded in `$DSH_HOME/.dsh-fish-lock.json`, which is
what `hub_list`, `hub_remove` and `hub_update` (and the matching CLI commands)
read. The same lockfile is shared with `@dsh-fish/cli`.

## Configuration

```yaml
- id: hub
  name: dsh-hub
  config:
    baseUrl: https://dsh.fish   # a self-hosted deployment only changes this
    targetProfile: current      # or a specific profile name
```

## License

MIT
