/**
 * The icon set, named by meaning.
 *
 * Every glyph the product uses is chosen here and nowhere else. A component
 * imports `SearchIcon`, not `MagnifyingGlassIcon`, so replacing a glyph — or the
 * whole library — is an edit to this file rather than a search across the app.
 * It is also what keeps one set on every surface: there is no second place a
 * different library could be reached from.
 *
 * One concept, one alias. Where two roles genuinely share a meaning they share
 * the alias too, rather than growing a synonym that would let the two drift
 * apart.
 *
 * GitHub and Discord are the exception: those two are official brand marks,
 * wrapped in `brand-icons.tsx`, because Phosphor's redraws are not the logos
 * a reader recognises. Everything else in this file is Phosphor.
 */
export { GithubIcon, DiscordIcon } from './brand-icons'

export {
  // Navigation and destinations.
  LaptopIcon as BrandIcon,
  NewspaperIcon as BlogIcon,
  CompassIcon as BrowseIcon,
  BookOpenTextIcon as DocsIcon,
  UploadSimpleIcon as SubmitIcon,
  SquaresFourIcon as DashboardIcon,
  HouseIcon as HomeIcon,
  ArrowRightIcon as ForwardIcon,
  CaretLeftIcon as PreviousPageIcon,
  // Also the breadcrumb separator: both point one step further into the trail.
  CaretRightIcon as NextPageIcon,
  QuestionIcon as UnknownPageIcon,

  // Controls.
  MagnifyingGlassIcon as SearchIcon,
  SortAscendingIcon as SortIcon,
  ListIcon as MenuIcon,
  XIcon as CloseIcon,
  CopyIcon as CopyIcon,
  CheckIcon as ConfirmIcon,
  ProhibitIcon as DenyIcon,
  TranslateIcon as LanguageIcon,
  SunIcon as LightThemeIcon,
  MoonIcon as DarkThemeIcon,
  ArrowSquareOutIcon as ExternalLinkIcon,
  ShuffleIcon as ShuffleIcon,

  // Account, and the places the project and its maintainer can be reached.
  SignInIcon as SignInIcon,
  SignOutIcon as SignOutIcon,
  ChatCircleIcon as ConnectIcon,
  XLogoIcon as XIcon,
  EnvelopeSimpleIcon as EmailIcon,

  // Facts a catalog row carries.
  SealCheckIcon as VerifiedIcon,
  StarIcon as StarsIcon,
  CloudArrowDownIcon as DownloadsIcon,
  DownloadSimpleIcon as InstallsIcon,
  ScalesIcon as LicenseIcon,
  ClockCounterClockwiseIcon as UpdatedIcon,
  GaugeIcon as ScoreIcon,
  TrendUpIcon as RisingIcon,
  GitCommitIcon as CommitIcon,

  // Installing.
  TerminalWindowIcon as CliIcon,
  RobotIcon as AgentIcon,
  ChatTextIcon as AskIcon,
  SidebarSimpleIcon as AskPanelClosedIcon,
  SidebarIcon as AskPanelOpenIcon,
  ThumbsUpIcon as HelpfulIcon,
  ThumbsDownIcon as UnhelpfulIcon,

  // Outcomes and states.
  WarningIcon as WarningIcon,
  WarningCircleIcon as ErrorIcon,
  LightbulbIcon as TipIcon,
  InfoIcon as InfoIcon,
  ClockIcon as PendingIcon,
  CheckCircleIcon as ApprovedIcon,
  XCircleIcon as RejectedIcon,
  ShieldCheckIcon as SecureIcon,

  // Artifact kinds.
  PackageIcon as BundleIcon,
  StackIcon as ProfileIcon,
  LightningIcon as SkillIcon,
  SlidersHorizontalIcon as AgentPresetIcon,

  // Categories. One mark per browse id, none of them the same drawing as a kind.
  LayoutIcon as UiCategoryIcon,
  ChartBarIcon as UsageCategoryIcon,
  PaletteIcon as ThemeCategoryIcon,
  BrainIcon as ModelCategoryIcon,
  IdentificationCardIcon as IdentityCategoryIcon,
  ChatsCircleIcon as SessionCategoryIcon,
  HardDrivesIcon as MemoryCategoryIcon,
  WrenchIcon as ToolsCategoryIcon,
  GlobeIcon as BrowserCategoryIcon,
  EyeIcon as VisionCategoryIcon,
  MicrophoneIcon as VoiceCategoryIcon,
  DatabaseIcon as DocsCategoryIcon,
  PuzzlePieceIcon as SkillCategoryIcon,
  FlowArrowIcon as WorkflowCategoryIcon,
  GitBranchIcon as GitCategoryIcon,
  BellIcon as NotifyCategoryIcon,
  CodeBlockIcon as DevCategoryIcon,
  LockKeyIcon as SecurityCategoryIcon,
  CloudIcon as RemoteCategoryIcon,
  StorefrontIcon as MarketCategoryIcon,
  ConfettiIcon as FunCategoryIcon,
  DotsThreeCircleIcon as OtherCategoryIcon,
} from '@phosphor-icons/react'
