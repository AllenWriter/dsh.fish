<div align="center">
  <img src="frontend/public/icons/whale-brand.png" alt="dsh.fish logo" width="96" />
  <h1>dsh.fish</h1>
  <p><strong><a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> 的插件注册中心。<br/>发现、信任并安装插件——来自网页、终端，或你的智能体。</strong></p>

  <p>
    <a href="https://dsh.fish"><img src="https://img.shields.io/badge/hub-dsh.fish-0b6bcb" alt="dsh.fish hub" /></a>
    <a href="https://github.com/stvlynn/dsh.fish/actions/workflows/ci.yml"><img src="https://github.com/stvlynn/dsh.fish/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="https://www.npmjs.com/package/@dsh-fish/cli"><img src="https://img.shields.io/npm/v/@dsh-fish/cli" alt="npm @dsh-fish/cli" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license" /></a>
    <a href="https://discord.gg/PwZDHH4mv3"><img src="https://img.shields.io/badge/discord-join-5865F2?logo=discord&logoColor=white" alt="Discord" /></a>
  </p>

  <p>
    <a href="README.md">English</a> · <strong>简体中文</strong> · <a href="README.ja.md">日本語</a>
  </p>

  <img src=".github/assets/home-zh-cn-light.png" alt="dsh.fish 目录首页" width="900" />
</div>

---

DeepSeek Harness 以「万物皆插件」为理念构建，却没有自带注册中心——其
README 只是建议作者为仓库打上 `dsh-plugin` 话题标签，发现工作便止步于此。
dsh.fish 把这个话题变成了一个可搜索、多语言的目录，并附带一份共享的、
机器可执行的安装计划。

## 功能特性

- **类型化目录** —— bundle、profile、skill 与 agent 预设，通过探测 harness 实际能加载的内容来分类，而不是依赖自报的标签。
- **透明的信任信号** —— 每个工件都带有公开且可复现的质量评分(S/A/B/C)、维护状态，以及 7 天/30 天的 star 增速。评分公式由 [`GET /api/v1/scoring`](https://dsh.fish/api/v1/scoring) 直接提供，而不是藏在一篇博客文章里。
- **不止于热门，更看崛起** —— 每次抓取的指标快照驱动 `rising` 排序，让本周 star 数正在上涨的项目浮出水面。
- **一份安装计划，三个入口** —— 同一份由领域层拥有的计划，在网页上渲染为可复制的命令，在 CLI 中执行，并通过 hub 插件在 harness 内部运行。三者不可能彼此偏离。
- **精确到提交的溯源** —— 每个工件都展示它被索引时的确切 commit，并链接回 GitHub。
- **真正的 API** —— 版本化的 REST 端点，外加带有 ETag 同步契约的全目录快照，供镜像和机器人使用。
- **十种语言，一等公民** —— SSR 页面、按语言拆分的 Atom feed、每个插件页面的 hreflang 与结构化数据、按插件生成的 OG 卡片和 shields 风格的 README 徽章。

## 截图

<div align="center">
  <img src=".github/assets/browse-rising-light.png" alt="按正在崛起排序浏览目录" width="700" />
  <p><em>按类型、分类、热度浏览——或者看看此刻正在崛起的。</em></p>
  <img src=".github/assets/plugin-detail-light.png" alt="插件详情页，含评分、安装面板和 README 徽章" width="700" />
  <p><em>每个插件页面都有:质量评分、安装面板、commit 溯源，以及可复制的 README 徽章。</em></p>
</div>

## 快速开始

**浏览** **[dsh.fish](https://dsh.fish)** 上的目录——搜索、按类型和分类
筛选、阅读安装计划、复制命令。

**终端** —— CLI 会为你应用安装计划:

```sh
npx @dsh-fish/cli add <artifact-id>
```

`add` / `find` / `list` / `remove` / `update` 与 [skills CLI](https://github.com/vercel-labs/skills)
的命令词汇一致，并会真正把 skill、预设、bundle 和 profile 写入
`$DSH_HOME`。

**在 harness 内部** —— 只需添加一次 hub 插件:

```sh
dsh plugin --profile web add @dsh-fish/hub
```

它会注册 `hub_search`、`hub_show`、`hub_install`、`hub_list`、`hub_remove`、
`hub_update` 和 `hub_account`，让智能体无需离开会话即可发现并安装工件。
登录使用 OAuth 设备流(device flow)。

`<profile>` 就是 harness 启动的那个配置档。桌面端有自己的配置档：
[Local DSH](https://github.com/stvlynn/local-dsh) 启动的是 `local-dsh`，
因此要用它自带的 launcher，并写这个配置档名。

```sh
dsh plugin --profile local-dsh add @dsh-fish/hub
```

**要发布插件?** 为你的仓库打上 **`dsh-plugin`** 话题标签。每小时一次的
抓取会检查其 `package.json`、`SKILL.md` 或 `agent.cordis.yml`，并分类出
harness 实际能加载的内容。

## 索引内容

| 类型             | 是什么                                   | 如何安装                                    |
| ---------------- | ---------------------------------------- | ------------------------------------------- |
| **Bundle**       | 声明了 `dsh.bundle.patch` 的 npm 包      | `dsh plugin --profile <p> add <spec>`       |
| **Profile**      | 有序的 `dsh.profile.bundles` 堆栈        | 按顺序为每个 bundle 执行一次 `add`          |
| **Skill**        | `SKILL.md` bundle 或扁平的 Markdown      | 文件写入 `$DSH_HOME/skills` 之下            |
| **Agent preset** | 存放一个 `agent.cordis.yml` 的目录       | 写入 `$DSH_HOME/.agent-presets/<id>`        |

## 仓库结构

```
backend/    领域驱动设计(DDD):domain、application、infrastructure、interfaces
frontend/   特性切片设计(FSD):app、pages、widgets、features、entities、shared
packages/
  dsh-plugin-hub/   `@dsh-fish/hub` —— 用户安装进 harness 的 bundle
  dsh-cli/          `@dsh-fish/cli` —— `npx @dsh-fish/cli add <id>`
docs/       架构、分层约定、运维、ADR
```

前后两半部署为**同一个 Cloudflare Worker**:Hono 负责 `/api/*`,React Router
SSR 负责其余所有页面，D1 存放目录数据，KV 存放会话，另有一个 Cron Trigger
每小时重新抓取一次。

## 开发

```sh
pnpm install
pnpm run dev    # http://localhost:5173
```

质量门禁:`pnpm run typecheck && pnpm run test && pnpm run test:e2e && pnpm run build`。

部署、绑定与密钥:[`docs/operations/deployment.md`](docs/operations/deployment.md)。
约定与架构:[`AGENTS.md`](AGENTS.md)、[`docs/project/architecture.md`](docs/project/architecture.md)、[`docs/decisions/`](docs/decisions/README.md)。

## 社区

- **源码与问题反馈** —— [github.com/stvlynn/dsh.fish](https://github.com/stvlynn/dsh.fish)
- **Discord** —— [discord.gg/PwZDHH4mv3](https://discord.gg/PwZDHH4mv3)

## 许可证

[MIT](LICENSE)
