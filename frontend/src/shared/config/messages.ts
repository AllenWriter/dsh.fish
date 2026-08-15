/**
 * Every user-facing string in the product, keyed.
 *
 * `CLAUDE.md` forbids hardcoded copy in components, so this module is the one
 * place text lives. The backend never sends prose either: it sends keys
 * (`artifactKind.bundle.label`, `install.warning.buildAllowance`) that resolve
 * here, which is what lets the catalog stay language-neutral in the database.
 */
export const messages = {
  'app.name': 'dsh.fish',
  'app.tagline': 'The plugin hub for DeepSeek Harness',
  'app.description':
    'Discover, distribute and install bundles, skills, MCP servers, agent presets, hook bridges and profiles for dsh.',

  'nav.browse': 'Browse',
  'nav.docs': 'Docs',
  'nav.submit': 'Submit',
  'nav.dashboard': 'Dashboard',
  'nav.signIn': 'Sign in',
  'nav.signOut': 'Sign out',
  'nav.search': 'Search plugins',
  'nav.searchHint': 'Press ⌘K',

  'artifactKind.bundle.label': 'Bundle',
  'artifactKind.bundle.description':
    'An npm package declaring dsh.bundle — the unit `dsh plugin add` installs.',
  'artifactKind.profile.label': 'Profile',
  'artifactKind.profile.description': 'A whole runnable composition: an ordered stack of bundles.',
  'artifactKind.skill.label': 'Skill',
  'artifactKind.skill.description':
    'Reusable agent instructions the model loads on demand, as SKILL.md.',
  'artifactKind.mcpServer.label': 'MCP server',
  'artifactKind.mcpServer.description':
    'An external Model Context Protocol server mounted as native tools.',
  'artifactKind.agentPreset.label': 'Agent preset',
  'artifactKind.agentPreset.description':
    'A composition of tools, prompt sections and persona for one agent.',
  'artifactKind.hookBridge.label': 'Hook bridge',
  'artifactKind.hookBridge.description':
    'Runs your existing Claude Code or Codex shell hooks inside dsh.',

  'category.coding': 'Coding',
  'category.research': 'Research',
  'category.data': 'Data',
  'category.devops': 'DevOps',
  'category.productivity': 'Productivity',
  'category.communication': 'Communication',
  'category.design': 'Design',
  'category.security': 'Security',
  'category.testing': 'Testing',
  'category.models': 'Models',
  'category.ui': 'Interface',
  'category.other': 'Other',

  'home.heroTitle': 'Everything is a plugin.',
  'home.heroSubtitle':
    'Search the harness ecosystem and install any of it with one command — or let your agent do it.',
  'home.searchPlaceholder': 'Search bundles, skills, MCP servers…',
  'home.browseAll': 'Browse everything',
  'home.installHub': 'Install the hub plugin',
  'home.trending': 'Trending',
  'home.recentlyUpdated': 'Recently updated',
  'home.byKind': 'By type',
  'home.statsArtifacts': 'artifacts indexed',

  'browse.title': 'Browse',
  'browse.filters': 'Filters',
  'browse.kind': 'Type',
  'browse.category': 'Category',
  'browse.verifiedOnly': 'Verified only',
  'browse.sort': 'Sort',
  'browse.sort.relevance': 'Relevance',
  'browse.sort.popular': 'Popular',
  'browse.sort.recent': 'Recently updated',
  'browse.sort.name': 'Name',
  'browse.empty': 'Nothing matches those filters yet.',
  'browse.emptyHint': 'Try removing a filter, or submit a plugin you know of.',
  'browse.resultCount': 'results',
  'browse.clearFilters': 'Clear filters',

  'artifact.verified': 'Verified',
  'artifact.verifiedTitle': 'The author proved they control this source.',
  'artifact.deprecated': 'Deprecated',
  'artifact.installs': 'installs',
  'artifact.stars': 'stars',
  'artifact.downloads': 'weekly downloads',
  'artifact.source': 'Source',
  'artifact.license': 'License',
  'artifact.updated': 'Updated',
  'artifact.readme': 'Readme',
  'artifact.install': 'Install',
  'artifact.noReadme': 'This artifact ships no readme.',

  'install.title': 'Install',
  'install.viaPlugin': 'Via hub plugin',
  'install.viaCli': 'Via CLI',
  'install.viaPluginBody':
    'With the hub plugin installed, ask your agent to install it by name — it resolves the same plan shown here.',
  'install.profileLabel': 'Profile',
  'install.copy': 'Copy',
  'install.copied': 'Copied',
  'install.credentials': 'Credentials this artifact needs',
  'install.credentialsBody':
    'Set these as environment variables or through `ctx.credentials`. The registry only ever stores the reference, never the value.',
  'install.warning.buildAllowance':
    'This package builds from source on install. pnpm will ask you to allow its build script — that is permission to run the package’s code on your machine, outside the agent sandbox. Only allow sources you trust.',
  'install.warning.unpinnedGitSpec':
    'This source has no pinned commit, so a later push upstream changes what installs. Prefer pinning a commit.',
  'install.warning.profileOrder':
    'Bundles apply in listed order and later layers win per row. Install them in the order shown.',
  'install.warning.credentialsNeeded':
    'This server needs credentials before it will connect.',
  'install.warning.hookExecutesShell':
    'Hook bridges run your existing shell hooks on harness lifecycle events.',

  'submit.title': 'Submit a plugin',
  'submit.body':
    'Point the registry at an npm package or a GitHub repository. It is indexed by the same reader the crawler uses, so what lands is exactly what the harness would load.',
  'submit.kind': 'Type',
  'submit.source': 'Source',
  'submit.sourcePlaceholder': 'github:owner/repo or npm:@scope/package',
  'submit.note': 'Note for reviewers',
  'submit.action': 'Submit',
  'submit.approved': 'Approved and published — you own this artifact.',
  'submit.pending': 'Submitted. It will appear once a maintainer reviews it.',
  'submit.signInRequired': 'Sign in to submit a plugin.',

  'auth.signInTitle': 'Sign in',
  'auth.signInSubtitle': 'Publish plugins, claim what you maintain, and authorize your harness.',
  'auth.withGithub': 'Continue with GitHub',
  'auth.withEmail': 'Continue with email',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.signUp': 'Create an account',
  'auth.haveAccount': 'Already have an account?',
  'auth.failed': 'Sign-in failed. Check your details and try again.',

  'device.title': 'Authorize your harness',
  'device.subtitle': 'Enter the code shown in your terminal.',
  'device.codeLabel': 'Device code',
  'device.approve': 'Authorize',
  'device.deny': 'Deny',
  'device.approved': 'Authorized. You can return to your terminal.',
  'device.denied': 'Denied. Nothing was authorized.',
  'device.invalid': 'That code is not valid or has expired.',
  'device.signInFirst': 'Sign in first, then enter the code from your terminal.',
  'device.grantExplain':
    'Approving lets that harness read the catalog and resolve install plans as you. It cannot submit or claim plugins on your behalf.',

  'dashboard.title': 'Dashboard',
  'dashboard.mySubmissions': 'My submissions',
  'dashboard.myArtifacts': 'Artifacts I maintain',
  'dashboard.noSubmissions': 'No submissions yet.',
  'dashboard.status.pending': 'Pending review',
  'dashboard.status.approved': 'Published',
  'dashboard.status.rejected': 'Rejected',

  'docs.title': 'Publishing to dsh.fish',
  'notFound.title': 'Nothing here',
  'notFound.body': 'That page does not exist.',
  'notFound.home': 'Back to the hub',

  'common.loading': 'Loading',
  'common.error': 'Something went wrong.',
  'common.retry': 'Retry',
} as const

export type MessageKey = keyof typeof messages

/** Resolve a key. An unknown key returns the key itself, which is loud in review. */
export function t(key: string): string {
  return (messages as Record<string, string>)[key] ?? key
}
