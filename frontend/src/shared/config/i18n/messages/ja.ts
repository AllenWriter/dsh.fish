import type { Catalog } from './en'

/** Japanese. */
export const ja: Catalog = {
  'app.name': 'dsh.fish',
  'app.tagline': 'DeepSeek Harness のプラグインハブ',
  'app.description':
    'dsh 向けのバンドル、スキル、MCP サーバー、エージェントプリセット、フックブリッジ、プロファイルを見つけて配布し、インストールできます。',

  'nav.browse': '一覧',
  'nav.docs': 'ドキュメント',
  'nav.submit': '登録',
  'nav.dashboard': 'ダッシュボード',
  'nav.signIn': 'ログイン',
  'nav.signOut': 'ログアウト',
  'nav.search': 'プラグインを検索',
  'nav.searchHint': '⌘K を押す',
  'nav.language': '言語',
  'nav.menu': 'メニュー',
  'nav.harness': 'DeepSeek Harness',

  'a11y.skipToContent': '本文へスキップ',
  'theme.toLight': 'ライトテーマに切り替える',
  'theme.toDark': 'ダークテーマに切り替える',

  'artifactKind.bundle.label': 'バンドル',
  'artifactKind.bundle.description':
    'dsh.bundle を宣言した npm パッケージ。`dsh plugin add` がインストールする単位です。',
  'artifactKind.bundle.plural': 'バンドル',
  'artifactKind.profile.label': 'プロファイル',
  'artifactKind.profile.description': 'そのまま動く一式の構成。順序を持つバンドルのスタックです。',
  'artifactKind.profile.plural': 'プロファイル',
  'artifactKind.skill.label': 'スキル',
  'artifactKind.skill.description':
    'SKILL.md として必要なときに読み込まれる、再利用可能なエージェント向け指示です。',
  'artifactKind.skill.plural': 'スキル',
  'artifactKind.mcpServer.label': 'MCP サーバー',
  'artifactKind.mcpServer.description':
    'ネイティブツールとしてマウントされる外部の Model Context Protocol サーバーです。',
  'artifactKind.mcpServer.plural': 'MCP サーバー',
  'artifactKind.agentPreset.label': 'エージェントプリセット',
  'artifactKind.agentPreset.description':
    '1 つのエージェント向けにツール、プロンプト、ペルソナをまとめた構成です。',
  'artifactKind.agentPreset.plural': 'エージェントプリセット',
  'artifactKind.hookBridge.label': 'フックブリッジ',
  'artifactKind.hookBridge.description':
    '既存の Claude Code や Codex のシェルフックを dsh 内で実行します。',
  'artifactKind.hookBridge.plural': 'フックブリッジ',

  'category.coding': 'コーディング',
  'category.research': 'リサーチ',
  'category.data': 'データ',
  'category.devops': 'DevOps',
  'category.productivity': '生産性',
  'category.communication': 'コミュニケーション',
  'category.design': 'デザイン',
  'category.security': 'セキュリティ',
  'category.testing': 'テスト',
  'category.models': 'モデル',
  'category.ui': 'インターフェース',
  'category.other': 'その他',

  'home.heroTitle': 'すべてはプラグイン。',
  'home.heroSubtitle':
    'DeepSeek Harness 向けのバンドル、スキル、MCP サーバー、プリセット。コマンドを 1 つコピーするか、エージェントに任せてください。',
  'home.searchPlaceholder': 'postgres、コードレビュー、ブラウザ…',
  'home.searchAction': '検索',
  'home.browseAll': 'すべて見る',
  'home.installHub': 'ハブプラグインを入れる',
  'home.trending': '人気',
  'home.recentlyUpdated': '最近の更新',
  'home.byKind': 'タイプ別',
  'home.statsArtifacts': '件を収録',
  'home.seeRecent': '変更点を見る',

  'browse.title': '一覧',
  'browse.filters': 'フィルター',
  'browse.kind': 'タイプ',
  'browse.category': 'カテゴリ',
  'browse.verifiedOnly': '認証済みのみ',
  'browse.sort': '並び替え',
  'browse.sort.relevance': '関連度',
  'browse.sort.popular': '人気',
  'browse.sort.recent': '最近の更新',
  'browse.sort.name': '名前',
  'browse.empty': 'その条件に一致するものはまだありません。',
  'browse.emptyHint': 'フィルターを 1 つ外すか、ご存じのプラグインを登録してみてください。',
  'browse.resultCount': '件',
  'browse.clearFilters': 'フィルターを消す',
  'browse.searchTitle': '「{query}」の検索結果',
  'browse.previous': '前のページ',
  'browse.next': '次のページ',
  'browse.pagination': 'ページ送り',

  'collection.kind.title': 'DeepSeek Harness 向けの{kind}',
  'collection.kind.description':
    'DeepSeek Harness 向けに{kind}を {count} 件収録しています。インストール手順を確認して、コマンドを 1 つコピーするだけです。',
  'collection.category.title': '{category}向け DeepSeek Harness プラグイン',
  'collection.category.description':
    '{category}のための DeepSeek Harness プラグイン {count} 件。バンドル、スキル、MCP サーバー、エージェントプリセットに、解決済みのインストール手順が付きます。',
  'collection.everything': 'すべてのプラグイン',

  'artifact.verified': '認証済み',
  'artifact.verifiedTitle': '作者がこのソースの管理権限を証明しています。',
  'artifact.deprecated': '非推奨',
  'artifact.installs': 'インストール',
  'artifact.stars': 'スター',
  'artifact.downloads': '週間ダウンロード',
  'artifact.source': 'ソース',
  'artifact.license': 'ライセンス',
  'artifact.updated': '更新',
  'artifact.readme': 'Readme',
  'artifact.install': 'インストール',
  'artifact.noReadme': 'この項目には readme がありません。',
  'artifact.categories': 'カテゴリ',
  'artifact.keywords': 'キーワード',

  'install.title': 'インストール',
  'install.viaPlugin': 'ハブプラグイン経由',
  'install.viaCli': 'CLI 経由',
  'install.viaPluginBody':
    'ハブプラグインを入れておけば、名前を伝えるだけでエージェントが入れてくれます。ここに表示されているのと同じ手順を解決します。',
  'install.profileLabel': 'プロファイル',
  'install.credentials': 'この項目に必要な認証情報',
  'install.credentialsBody':
    '環境変数として設定するか、`ctx.credentials` 経由で渡してください。レジストリが保存するのは参照だけで、値は保存しません。',
  'install.warning.buildAllowance':
    'このパッケージはインストール時にソースからビルドします。pnpm がビルドスクリプトの許可を求めますが、それはエージェントのサンドボックス外で、あなたのマシン上でパッケージのコードを実行する許可です。信頼できるソースにのみ許可してください。',
  'install.warning.unpinnedGitSpec':
    'このソースはコミットを固定していないため、上流に push があるとインストール内容が変わります。コミットの固定を推奨します。',
  'install.warning.profileOrder':
    'バンドルは並び順に適用され、同じ行は後の層が優先されます。表示された順にインストールしてください。',
  'install.warning.credentialsNeeded': 'このサーバーは接続前に認証情報が必要です。',
  'install.warning.hookExecutesShell':
    'フックブリッジは Harness のライフサイクルイベントで既存のシェルフックを実行します。',

  'submit.title': 'プラグインを登録',
  'submit.body':
    'npm パッケージか GitHub リポジトリをレジストリに指定してください。クローラーと同じリーダーで読み取るため、登録される内容は Harness が実際に読み込むものと一致します。',
  'submit.kind': 'タイプ',
  'submit.source': 'ソース',
  'submit.sourcePlaceholder': 'github:owner/repo または npm:@scope/package',
  'submit.note': 'レビュー担当者へのメモ',
  'submit.action': '登録',
  'submit.approved': '承認・公開されました。この項目はあなたのものです。',
  'submit.pending': '登録しました。メンテナーの確認後に表示されます。',
  'submit.signInRequired': 'プラグインの登録にはログインが必要です。',

  'auth.signInTitle': 'ログイン',
  'auth.signInSubtitle':
    'プラグインを公開し、自分が保守しているものを認証し、Harness を認可します。',
  'auth.withGithub': 'GitHub で続ける',
  'auth.withEmail': 'メールで続ける',
  'auth.email': 'メールアドレス',
  'auth.password': 'パスワード',
  'auth.signUp': 'アカウントを作成',
  'auth.haveAccount': 'すでにアカウントをお持ちですか？',
  'auth.failed': 'ログインに失敗しました。入力内容を確認して再試行してください。',
  'account.menu': 'アカウント',

  'device.title': 'Harness を認可する',
  'device.subtitle': 'ターミナルに表示されたコードを入力してください。',
  'device.codeLabel': 'デバイスコード',
  'device.approve': '認可する',
  'device.deny': '拒否する',
  'device.approved': '認可しました。ターミナルに戻れます。',
  'device.denied': '拒否しました。何も認可されていません。',
  'device.invalid': 'そのコードは無効か、有効期限が切れています。',
  'device.signInFirst': '先にログインしてから、ターミナルのコードを入力してください。',
  'device.grantExplain':
    '認可すると、その Harness はあなたとしてカタログを読み、インストール手順を解決できます。あなたの代わりに登録や所有権の主張はできません。',

  'dashboard.title': 'ダッシュボード',
  'dashboard.mySubmissions': '自分の登録',
  'dashboard.myArtifacts': '保守している項目',
  'dashboard.noSubmissions': 'まだ登録はありません。',
  'dashboard.status.pending': 'レビュー待ち',
  'dashboard.status.approved': '公開済み',
  'dashboard.status.rejected': '却下',

  'docs.title': 'dsh.fish に公開する',
  'docs.intro':
    'リポジトリに dsh-plugin トピックを付けるか、直接登録してください。レジストリは実際のマニフェストを読むので、掲載される内容は Harness が読み込むものそのものです。',
  'docs.bundle.title': 'バンドルは dsh.bundle を宣言する',
  'docs.bundle.body':
    'その宣言がなくてもパッケージはインストールできますが、Harness はレイヤーを有効化しません。だからレジストリもプラグインとして掲載しません。',
  'docs.bundle.note':
    'npm に公開するとビルド済みコードが配布されるため、利用者にビルド許可は不要です。git インストールはソースを取得するので、自己完結した prepare スクリプトを用意し、利用者による許可が必要になる前提で設計してください。',
  'docs.skill.title': 'スキルは frontmatter 付きの SKILL.md',
  'docs.skill.body':
    'name は kebab-case、description は必須です。どちらかが欠けるとプロバイダーはそのスキルを捨てます。',
  'docs.mcp.title': 'MCP サーバーはクライアント 1 行',
  'docs.mcp.body':
    'レジストリが保存するのは認証情報の参照だけで、値は保存しません。サーバーが必要とする環境変数名を宣言すれば、Harness が ctx.credentials 経由で解決します。',
  'docs.preset.title': 'エージェントプリセットは agent.cordis.yml 1 つ',
  'docs.preset.body':
    'リポジトリのルート（または登録時に指定したサブディレクトリ）に置いてください。ディレクトリ名がプリセット id になります。',
  'docs.profile.title': 'プロファイルはバンドルを順に並べる',
  'docs.profile.body':
    '同じ行は後の層が優先され、patch は行の設定を深くマージせず丸ごと置き換えます。だから順序に意味があります。',

  'notFound.title': 'ここには何もありません',
  'notFound.body': 'そのページは存在しません。',
  'notFound.home': 'ハブに戻る',

  'common.copy': 'コピー',
  'common.copied': 'コピーしました',
  'common.loading': '読み込み中',
  'common.error': '問題が発生しました。',
  'common.retry': '再試行',

  'seo.home.title': '{name} — {tagline}',
  'seo.browse.description':
    'DeepSeek Harness 向けに収録されたバンドル、スキル、MCP サーバー、エージェントプリセット、フックブリッジ、プロファイルをまとめて検索できます。',
  'seo.artifact.description':
    '{summary} DeepSeek Harness 向けの{kind}。コマンドを 1 つコピーするだけで入ります。',
  'seo.docs.description':
    'dsh.fish のクローラーがバンドル、スキル、MCP サーバー、エージェントプリセット、プロファイルとして収録するために、リポジトリや npm パッケージが宣言すべき内容。',
}
