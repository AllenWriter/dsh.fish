/**
 * Copy for the settings section, in the languages the harness UI ships.
 *
 * These live with the plugin rather than in the website's message catalogs: the
 * section renders inside the harness client and follows the harness locale, and
 * a bundle installed into a profile has no access to the site's build.
 */

const zh = {
  nav: 'dsh.fish',
  intro: '从 dsh.fish 浏览并安装 harness 构件，写入当前配置档 {profile}。',
  'tabs.aria': 'dsh.fish 插件站',
  'tab.browse': '浏览',
  'tab.installed': '已安装',
  'tab.account': '账号',
  'search.label': '搜索构件',
  'search.placeholder': '例如 postgres、代码审查',
  'search.submit': '搜索',
  'kind.all': '全部类型',
  'kind.bundle': 'Bundle',
  'kind.profile': 'Profile',
  'kind.skill': 'Skill',
  'kind.agent-preset': 'Agent 预设',
  'browse.empty': '没有匹配的构件。',
  'browse.verified': '已验证',
  'browse.deprecated': '已弃用',
  'browse.installs': '{count} 次安装',
  'browse.source': '查看源仓库',
  'browse.plan': '查看安装计划',
  'browse.install': '安装',
  'browse.installing': '正在安装…',
  'plan.title': '{artifact} 的安装计划',
  'plan.commands': '将要执行',
  'plan.warnings': '注意',
  'plan.buildRefused': '这个包会在安装时从源码构建，也就是在智能体沙箱之外运行它自己的代码。只有你信任来源时才继续。',
  'plan.allowBuild': '允许构建脚本并安装',
  'plan.confirm': '安装',
  'plan.cancel': '取消',
  'installed.empty': '这个配置档还没有通过 dsh.fish 安装任何构件。',
  'installed.at': '安装于 {date}',
  'installed.remove': '移除',
  'installed.removing': '正在移除…',
  'account.signedOut': '未登录。登录后可以评分，并访问需要账号的构件。',
  'account.signedIn': '已登录：{name}',
  'account.login': '登录',
  'account.logout': '退出登录',
  'account.starting': '正在获取设备码…',
  'account.code': '在浏览器中输入这个代码：{code}',
  'account.open': '打开验证页面',
  'account.waiting': '等待你在浏览器中批准…',
  'restart.required': '重启 DSH 后生效。',
  'error.generic': '操作失败，请重试。',
} as const

const en = {
  nav: 'dsh.fish',
  intro: 'Browse and install harness artifacts from dsh.fish into profile {profile}.',
  'tabs.aria': 'dsh.fish plugin station',
  'tab.browse': 'Browse',
  'tab.installed': 'Installed',
  'tab.account': 'Account',
  'search.label': 'Search artifacts',
  'search.placeholder': 'e.g. postgres, code review',
  'search.submit': 'Search',
  'kind.all': 'All kinds',
  'kind.bundle': 'Bundle',
  'kind.profile': 'Profile',
  'kind.skill': 'Skill',
  'kind.agent-preset': 'Agent preset',
  'browse.empty': 'No artifact matches.',
  'browse.verified': 'Verified',
  'browse.deprecated': 'Deprecated',
  'browse.installs': '{count} installs',
  'browse.source': 'View source',
  'browse.plan': 'Show install plan',
  'browse.install': 'Install',
  'browse.installing': 'Installing…',
  'plan.title': 'Install plan for {artifact}',
  'plan.commands': 'What will run',
  'plan.warnings': 'Heads up',
  'plan.buildRefused': 'This package builds from source on install, which runs its own code outside the agent sandbox. Continue only if you trust the source.',
  'plan.allowBuild': 'Allow build scripts and install',
  'plan.confirm': 'Install',
  'plan.cancel': 'Cancel',
  'installed.empty': 'Nothing installed from dsh.fish in this profile yet.',
  'installed.at': 'Installed {date}',
  'installed.remove': 'Remove',
  'installed.removing': 'Removing…',
  'account.signedOut': 'Not signed in. Signing in lets you rate artifacts and reach ones that need an account.',
  'account.signedIn': 'Signed in as {name}',
  'account.login': 'Sign in',
  'account.logout': 'Sign out',
  'account.starting': 'Requesting a device code…',
  'account.code': 'Enter this code in your browser: {code}',
  'account.open': 'Open the verification page',
  'account.waiting': 'Waiting for you to approve in the browser…',
  'restart.required': 'Restart DSH to load it.',
  'error.generic': 'That did not work. Try again.',
} as const

export const LOCALE_NS = 'settings.dshFish'

export type HubLocaleKey = keyof typeof en

export type HubTranslate = (
  key: HubLocaleKey,
  vars?: Record<string, string | number>,
) => string

export const dictionaries: Record<'zh' | 'en', Record<HubLocaleKey, string>> = { zh, en }
