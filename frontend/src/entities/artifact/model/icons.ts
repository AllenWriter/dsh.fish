import { type ArtifactKind } from './types'
import {
  AgentPresetIcon,
  BundleIcon,
  BrowserCategoryIcon,
  DevCategoryIcon,
  DocsCategoryIcon,
  FunCategoryIcon,
  GitCategoryIcon,
  HookBridgeIcon,
  IdentityCategoryIcon,
  MarketCategoryIcon,
  McpServerIcon,
  MemoryCategoryIcon,
  ModelCategoryIcon,
  NotifyCategoryIcon,
  OtherCategoryIcon,
  ProfileIcon,
  RemoteCategoryIcon,
  SecurityCategoryIcon,
  SessionCategoryIcon,
  SkillCategoryIcon,
  SkillIcon,
  ThemeCategoryIcon,
  ToolsCategoryIcon,
  UiCategoryIcon,
  UsageCategoryIcon,
  VisionCategoryIcon,
  VoiceCategoryIcon,
  WorkflowCategoryIcon,
  type Icon,
} from '@/shared/ui/icon'

/**
 * A glyph for every artifact kind.
 *
 * The kind chip has always been colourless on purpose — six hues encoded nothing
 * a reader could learn, and colour is spent on the verified badge and the primary
 * action instead. A glyph is the opposite trade: one mark per kind, it survives
 * translation into ten languages where the word does not, and it stays legible
 * without colour vision. Kinds gain a shape and still do not gain a hue.
 *
 * Each mark names the install mechanism `install-plan.ts` owns for that kind,
 * which is the fact the chip exists to carry: a bundle is a package, a profile is
 * a stack of them, an MCP server is a connection to something external, a preset
 * is a configuration, a hook bridge spans two tools.
 *
 * Keyed by the `ArtifactKind` union, so adding a kind to the taxonomy fails the
 * typecheck here rather than rendering a chip with a hole in it.
 */
const KIND_ICON: Readonly<Record<ArtifactKind, Icon>> = Object.freeze({
  bundle: BundleIcon,
  profile: ProfileIcon,
  skill: SkillIcon,
  'mcp-server': McpServerIcon,
  'agent-preset': AgentPresetIcon,
  'hook-bridge': HookBridgeIcon,
})

/**
 * A glyph for every category.
 *
 * Categories answer "what is it for", and they arrive as a wall of small pills in
 * the filter rail, on a plugin page and in the footer. A pill a reader can find
 * by shape is the difference between scanning the taxonomy and reading it.
 *
 * A category id is a `Slug`, not a literal union, so this map cannot be made
 * exhaustive by type the way `KIND_ICON` is. `icons.test.ts` walks the taxonomy
 * instead and fails when it grows past this map.
 *
 * Kind `skill` and category `skill` share a word, not a mark: Lightning vs
 * PuzzlePiece, so the chip and the pill still name different facts.
 */
const CATEGORY_ICON: Readonly<Record<string, Icon>> = Object.freeze({
  ui: UiCategoryIcon,
  usage: UsageCategoryIcon,
  theme: ThemeCategoryIcon,
  model: ModelCategoryIcon,
  identity: IdentityCategoryIcon,
  session: SessionCategoryIcon,
  memory: MemoryCategoryIcon,
  tools: ToolsCategoryIcon,
  browser: BrowserCategoryIcon,
  vision: VisionCategoryIcon,
  voice: VoiceCategoryIcon,
  docs: DocsCategoryIcon,
  skill: SkillCategoryIcon,
  workflow: WorkflowCategoryIcon,
  git: GitCategoryIcon,
  notify: NotifyCategoryIcon,
  dev: DevCategoryIcon,
  security: SecurityCategoryIcon,
  remote: RemoteCategoryIcon,
  market: MarketCategoryIcon,
  fun: FunCategoryIcon,
  other: OtherCategoryIcon,
})

export function kindIcon(kind: ArtifactKind): Icon {
  return KIND_ICON[kind]
}

/**
 * The glyph for a category id, or nothing when the taxonomy names one this map
 * does not.
 *
 * `undefined` rather than a stand-in mark: the icon is decorative and the pill's
 * label carries the meaning, so the honest render for an unmapped category is no
 * icon at all. A stand-in would look deliberate and hide the gap the test exists
 * to catch.
 */
export function categoryIcon(id: string): Icon | undefined {
  return CATEGORY_ICON[id]
}
