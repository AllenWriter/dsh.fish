import type { Catalog } from './en'

/** German. */
export const de: Catalog = {
  'app.name': 'dsh.fish',
  'app.tagline': 'Der Plugin-Hub für DeepSeek Harness',
  'app.description':
    'Bundles, Skills, MCP-Server, Agent-Presets, Hook-Bridges und Profile für dsh entdecken, verteilen und installieren.',

  'nav.browse': 'Stöbern',
  'nav.docs': 'Doku',
  'nav.submit': 'Einreichen',
  'nav.dashboard': 'Dashboard',
  'nav.signIn': 'Anmelden',
  'nav.signOut': 'Abmelden',
  'nav.search': 'Plugins suchen',
  'nav.searchHint': '⌘K drücken',
  'nav.language': 'Sprache',
  'nav.menu': 'Menü',
  'nav.harness': 'DeepSeek Harness',
  'nav.github': 'GitHub',
  'nav.discord': 'Discord',

  'a11y.skipToContent': 'Zum Inhalt springen',
  'theme.toLight': 'Zum hellen Design wechseln',
  'theme.toDark': 'Zum dunklen Design wechseln',

  'artifactKind.bundle.label': 'Bundle',
  'artifactKind.bundle.description':
    'Ein npm-Paket, das dsh.bundle deklariert — die Einheit, die `dsh plugin add` installiert.',
  'artifactKind.bundle.plural': 'Bundles',
  'artifactKind.profile.label': 'Profil',
  'artifactKind.profile.description':
    'Eine komplett lauffähige Komposition: ein geordneter Stapel von Bundles.',
  'artifactKind.profile.plural': 'Profile',
  'artifactKind.skill.label': 'Skill',
  'artifactKind.skill.description':
    'Wiederverwendbare Agent-Anweisungen, die das Modell bei Bedarf lädt — als SKILL.md.',
  'artifactKind.skill.plural': 'Skills',
  'artifactKind.mcpServer.label': 'MCP-Server',
  'artifactKind.mcpServer.description':
    'Ein externer Model-Context-Protocol-Server, eingebunden als native Tools.',
  'artifactKind.mcpServer.plural': 'MCP-Server',
  'artifactKind.agentPreset.label': 'Agent-Preset',
  'artifactKind.agentPreset.description':
    'Eine Zusammenstellung aus Tools, Prompt-Abschnitten und Persona für einen Agenten.',
  'artifactKind.agentPreset.plural': 'Agent-Presets',
  'artifactKind.hookBridge.label': 'Hook-Bridge',
  'artifactKind.hookBridge.description':
    'Führt deine vorhandenen Claude-Code- oder Codex-Shell-Hooks innerhalb von dsh aus.',
  'artifactKind.hookBridge.plural': 'Hook-Bridges',

  'category.coding': 'Programmierung',
  'category.research': 'Recherche',
  'category.data': 'Daten',
  'category.devops': 'DevOps',
  'category.productivity': 'Produktivität',
  'category.communication': 'Kommunikation',
  'category.design': 'Design',
  'category.security': 'Sicherheit',
  'category.testing': 'Tests',
  'category.models': 'Modelle',
  'category.ui': 'Oberfläche',
  'category.other': 'Sonstiges',

  'home.heroTitle': 'Alles ist ein Plugin.',
  'home.heroSubtitle':
    'Bundles, Skills, MCP-Server und Presets für DeepSeek Harness. Einen Befehl kopieren — oder den Agenten installieren lassen.',
  'home.searchPlaceholder': 'postgres, Code-Review, Browser…',
  'home.searchAction': 'Suchen',
  'home.browseAll': 'Alles durchstöbern',
  'home.installHub': 'Hub-Plugin installieren',
  'home.trending': 'Im Trend',
  'home.recentlyUpdated': 'Kürzlich aktualisiert',
  'home.byKind': 'Nach Typ',
  'home.statsArtifacts': 'Artefakte indexiert',
  'home.seeRecent': 'Ansehen, was sich geändert hat',

  'browse.title': 'Stöbern',
  'browse.filters': 'Filter',
  'browse.kind': 'Typ',
  'browse.category': 'Kategorie',
  'browse.verifiedOnly': 'Nur verifizierte',
  'browse.sort': 'Sortieren',
  'browse.sort.relevance': 'Relevanz',
  'browse.sort.popular': 'Beliebt',
  'browse.sort.recent': 'Kürzlich aktualisiert',
  'browse.sort.name': 'Name',
  'browse.empty': 'Zu diesen Filtern passt noch nichts.',
  'browse.emptyHint': 'Nimm einen Filter weg — oder reiche ein Plugin ein, das du kennst.',
  'browse.resultCount': 'Ergebnisse',
  'browse.clearFilters': 'Filter zurücksetzen',
  'browse.searchTitle': 'Suchergebnisse für „{query}“',
  'browse.previous': 'Vorherige Seite',
  'browse.next': 'Nächste Seite',
  'browse.pagination': 'Seitennavigation',

  'collection.kind.title': '{kind} für DeepSeek Harness',
  'collection.kind.description':
    '{count} {kind} für DeepSeek Harness indexiert. Installationsplan lesen und einen Befehl kopieren.',
  'collection.category.title': '{category}-Plugins für DeepSeek Harness',
  'collection.category.description':
    '{count} DeepSeek-Harness-Plugins für {category}: Bundles, Skills, MCP-Server und Agent-Presets, jeweils mit aufgelöstem Installationsplan.',
  'collection.everything': 'Alle Plugins',

  'artifact.verified': 'Verifiziert',
  'artifact.verifiedTitle': 'Die Autorin oder der Autor hat die Kontrolle über diese Quelle belegt.',
  'artifact.deprecated': 'Veraltet',
  'artifact.installs': 'Installationen',
  'artifact.stars': 'Sterne',
  'artifact.downloads': 'Downloads pro Woche',
  'artifact.source': 'Quelle',
  'artifact.license': 'Lizenz',
  'artifact.updated': 'Aktualisiert',
  'artifact.readme': 'Readme',
  'artifact.install': 'Installieren',
  'artifact.noReadme': 'Dieses Artefakt liefert keine Readme mit.',
  'artifact.categories': 'Kategorien',
  'artifact.keywords': 'Schlagwörter',

  'install.title': 'Installieren',
  'install.viaPlugin': 'Über das Hub-Plugin',
  'install.viaCli': 'Über die CLI',
  'install.viaPluginBody':
    'Ist das Hub-Plugin installiert, bitte deinen Agenten einfach namentlich darum — er löst denselben Plan auf, der hier steht.',
  'install.viaCliBody':
    'Dieser Befehl spricht mit dsh.fish und wendet denselben Plan an wie das Plugin — inklusive Skills, MCP-Zeilen und Presets, die der Harness-Launcher nicht installiert.',
  'install.profileLabel': 'Profil',
  'install.credentials': 'Zugangsdaten, die dieses Artefakt braucht',
  'install.credentialsBody':
    'Setze sie als Umgebungsvariablen oder über `ctx.credentials`. Die Registry speichert nur die Referenz, nie den Wert.',
  'install.warning.buildAllowance':
    'Dieses Paket wird bei der Installation aus dem Quellcode gebaut. pnpm fragt nach der Freigabe des Build-Skripts — das ist die Erlaubnis, den Code des Pakets auf deiner Maschine außerhalb der Agent-Sandbox auszuführen. Gib das nur Quellen frei, denen du vertraust.',
  'install.warning.unpinnedGitSpec':
    'Diese Quelle hat keinen festgelegten Commit; ein späterer Push stromaufwärts ändert, was installiert wird. Lieber einen Commit festnageln.',
  'install.warning.profileOrder':
    'Bundles greifen in der gelisteten Reihenfolge, pro Zeile gewinnt die spätere Schicht. Installiere sie in der gezeigten Reihenfolge.',
  'install.warning.credentialsNeeded':
    'Dieser Server braucht Zugangsdaten, bevor er sich verbindet.',
  'install.warning.hookExecutesShell':
    'Hook-Bridges führen deine vorhandenen Shell-Hooks bei Lifecycle-Ereignissen des Harness aus.',

  'submit.title': 'Plugin einreichen',
  'submit.body':
    'Zeig der Registry ein npm-Paket oder ein GitHub-Repository. Es wird von demselben Reader indexiert, den auch der Crawler nutzt — was ankommt, ist genau das, was der Harness laden würde.',
  'submit.kind': 'Typ',
  'submit.source': 'Quelle',
  'submit.sourcePlaceholder': 'github:owner/repo oder npm:@scope/package',
  'submit.note': 'Hinweis für die Prüfung',
  'submit.action': 'Einreichen',
  'submit.approved': 'Freigegeben und veröffentlicht — dieses Artefakt gehört dir.',
  'submit.pending': 'Eingereicht. Es erscheint, sobald jemand aus dem Team es geprüft hat.',
  'submit.signInRequired': 'Melde dich an, um ein Plugin einzureichen.',

  'auth.signInTitle': 'Anmelden',
  'auth.signInSubtitle':
    'Plugins veröffentlichen, gepflegte Artefakte beanspruchen und den eigenen Harness autorisieren.',
  'auth.withGithub': 'Weiter mit GitHub',
  'auth.withEmail': 'Weiter mit E-Mail',
  'auth.email': 'E-Mail',
  'auth.password': 'Passwort',
  'auth.signUp': 'Konto erstellen',
  'auth.haveAccount': 'Schon ein Konto?',
  'auth.failed': 'Anmeldung fehlgeschlagen. Prüfe deine Angaben und versuch es erneut.',
  'account.menu': 'Konto',

  'device.title': 'Harness autorisieren',
  'device.subtitle': 'Gib den Code ein, der in deinem Terminal steht.',
  'device.codeLabel': 'Gerätecode',
  'device.approve': 'Autorisieren',
  'device.deny': 'Ablehnen',
  'device.approved': 'Autorisiert. Du kannst zurück ins Terminal.',
  'device.denied': 'Abgelehnt. Es wurde nichts autorisiert.',
  'device.invalid': 'Dieser Code ist ungültig oder abgelaufen.',
  'device.signInFirst': 'Melde dich zuerst an und gib dann den Code aus dem Terminal ein.',
  'device.grantExplain':
    'Mit der Freigabe darf dieser Harness den Katalog lesen und Installationspläne als du auflösen. Plugins einreichen oder beanspruchen kann er in deinem Namen nicht.',

  'dashboard.title': 'Dashboard',
  'dashboard.mySubmissions': 'Meine Einreichungen',
  'dashboard.myArtifacts': 'Von mir gepflegte Artefakte',
  'dashboard.noSubmissions': 'Noch keine Einreichungen.',
  'dashboard.status.pending': 'Prüfung ausstehend',
  'dashboard.status.approved': 'Veröffentlicht',
  'dashboard.status.rejected': 'Abgelehnt',

  'docs.title': 'Auf dsh.fish veröffentlichen',
  'docs.intro':
    'Versieh dein Repository mit dem Topic dsh-plugin — oder reiche es direkt ein. Die Registry liest dein echtes Manifest: Was sie listet, ist das, was der Harness laden würde.',
  'docs.bundle.title': 'Ein Bundle deklariert dsh.bundle',
  'docs.bundle.body':
    'Ein Paket ohne diese Deklaration lässt sich zwar installieren, aber der Harness aktiviert keine Schicht dafür — also listet die Registry es auch nicht als Plugin.',
  'docs.bundle.note':
    'Eine Veröffentlichung auf npm liefert fertig gebauten Code aus, niemand muss einen Build freigeben. Eine git-Installation holt die Quellen: Leg ein in sich geschlossenes prepare-Skript an und rechne damit, dass Nutzerinnen und Nutzer es freigeben müssen.',
  'docs.skill.title': 'Ein Skill ist eine SKILL.md mit Frontmatter',
  'docs.skill.body':
    'name muss kebab-case sein und description ist Pflicht — fehlt eines davon, verwirft der Provider den Skill.',
  'docs.mcp.title': 'Ein MCP-Server ist eine Client-Zeile',
  'docs.mcp.body':
    'Die Registry speichert Referenzen auf Zugangsdaten, nie deren Werte. Deklariere die Namen der Umgebungsvariablen, die dein Server braucht; der Harness löst sie über ctx.credentials auf.',
  'docs.preset.title': 'Ein Agent-Preset ist genau eine agent.cordis.yml',
  'docs.preset.body':
    'Leg sie ins Wurzelverzeichnis des Repositories (oder in das eingereichte Unterverzeichnis). Der Verzeichnisname wird zur Preset-ID.',
  'docs.profile.title': 'Ein Profil listet Bundles der Reihe nach',
  'docs.profile.body':
    'Pro Zeile gewinnt die spätere Schicht, und ein Patch ersetzt die gesamte Konfiguration einer Zeile, statt sie tief zu mergen — deshalb ist die Reihenfolge bedeutsam.',

  'notFound.title': 'Hier ist nichts',
  'notFound.body': 'Diese Seite gibt es nicht.',
  'notFound.home': 'Zurück zum Hub',

  'common.copy': 'Kopieren',
  'common.copied': 'Kopiert',
  'common.loading': 'Wird geladen',
  'common.error': 'Etwas ist schiefgelaufen.',
  'common.retry': 'Erneut versuchen',

  'seo.home.title': '{name} — {tagline}',
  'seo.browse.description':
    'Durchsuche alle für DeepSeek Harness indexierten Bundles, Skills, MCP-Server, Agent-Presets, Hook-Bridges und Profile.',
  'seo.artifact.description':
    '{summary} Ein {kind} für DeepSeek Harness — ein Befehl genügt zur Installation.',
  'seo.docs.description':
    'Was ein Repository oder npm-Paket deklarieren muss, damit der Crawler von dsh.fish es als Bundle, Skill, MCP-Server, Agent-Preset oder Profil indexiert.',
}
