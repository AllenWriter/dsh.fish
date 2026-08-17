# @dsh-fish/cli

Install [dsh.fish](https://dsh.fish) artifacts from a terminal. The command on
an artifact page is this binary; it applies the same install plan the website
renders and the `dsh-hub` plugin executes.

Command names follow the [skills CLI](https://github.com/vercel-labs/skills)
(`add`, `find`, `list`, `remove`, `update`, `init`) so the vocabulary is the
one people already use to install agent skills. This CLI writes into DeepSeek
Harness (`$DSH_HOME`), not into `.claude/skills` or other agent trees.

## Install an artifact

```sh
npx @dsh-fish/cli add release-notes
npx @dsh-fish/cli add https://dsh.fish/a/release-notes --profile web
npx @dsh-fish/cli add acme/notes
```

`add` resolves a hub id, a dsh.fish URL, or `owner/repo` against the catalog,
then runs the plan: files under `$DSH_HOME`, package-manager adds, and profile
patch rows.

Git packages that build from source are refused until you pass
`--allow-build-scripts`. That flag is permission to run the package's `prepare`
script on this machine, outside the agent sandbox — the CLI will not grant it
because you passed `--yes`.

## Other commands

| Command | What it does |
|---|---|
| `find [query]` | Search the catalog (`--kind` restricts to one type). |
| `show <source>` | One artifact and the commands installing it would run. |
| `list` | Artifacts this machine installed through the CLI or the hub plugin. |
| `remove <id>` | Reverse the recorded files, patch rows and packages. |
| `update [id]` | Re-apply the current plan. |
| `init [name]` | Write a `SKILL.md` the hub indexer will accept. |
| `login` / `logout` / `whoami` | Device-grant account, same token as the hub plugin. |

```sh
npx @dsh-fish/cli find postgres --kind mcp-server
npx @dsh-fish/cli list --json
npx @dsh-fish/cli remove release-notes
npx @dsh-fish/cli init my-skill
```

## Options

| Option | Description |
|---|---|
| `--profile, -p` | Harness profile (default `$DSH_PROFILE` or `web`). |
| `--registry` | Hub origin (default `$DSH_FISH_URL` or `https://dsh.fish`). |
| `--kind, -k` | Restrict `find` to one artifact kind. |
| `--allow-build-scripts` | Permit a git package to run its prepare script. |
| `--json` | Machine-readable output. |
| `--yes, -y` | Skip confirmation prompts. Does not grant build scripts. |

## License

MIT
