import { localizedPath, splitLocalePath } from '@/shared/config/i18n'

/**
 * Nio Radio episodes used to live under life / tech / finance / travel.
 * They now live at `/blog/podcast/{slug}`. Old URLs 301 here so live
 * bookmarks, locale prefixes, and `.md` aliases keep working.
 */
const MOVED_BLOG_POSTS = new Set([
  'finance/airlines-dont-make-money-on-tickets',
  'finance/australia-delivery-gigs',
  'finance/bullshit-jobs',
  'finance/diamonds-are-forever',
  'finance/first-listed-company',
  'finance/first-listed-company-collapse',
  'finance/hermes-vanished-fortune',
  'finance/nobel-econ-tech-explosion',
  'finance/trump-bankruptcy-comeback',
  'finance/trump-family-prequel',
  'finance/trump-rise-part-2',
  'finance/us-railroad-bubble',
  'life/art-of-war-sun-tzu',
  'life/ask-and-then-what',
  'life/aspirin-thousand-year-secret',
  'life/common-thinking-fallacies',
  'life/edison-the-man',
  'life/fanta-wwii-black-history',
  'life/gunpowder-and-fireworks',
  'life/how-atomic-bomb-was-made',
  'life/how-atomic-bomb-was-made-part-2',
  'life/ice-to-fridge-part-1',
  'life/ice-to-fridge-part-2',
  'life/killing-superbugs',
  'life/liuyang-fireworks-capital',
  'life/musk-family-education',
  'life/newton-other-side',
  'life/penicillin-accident',
  'life/riddle-quiz-1',
  'life/riddle-quiz-2',
  'life/salmon-on-the-altar',
  'life/secret-of-glass',
  'life/sparta-300',
  'life/speak-clearly-first',
  'life/story-of-msg',
  'life/thinking-traps',
  'life/watermelon-summer-god',
  'life/why-carrots-for-eyes',
  'life/why-steak-is-rare',
  'life/world-cup-football',
  'tech/blue-led-invention',
  'tech/how-internet-was-born',
  'tech/how-internet-was-born-part-2',
  'tech/jensen-huang-nvidia-01',
  'tech/mars-immigration',
  'tech/moon-landing-hard-tech',
  'tech/musk-spacex-legend',
  'tech/starliner-space-rescue',
  'tech/why-220v-and-110v',
  'tech/wwii-computing-war-part-1',
  'tech/wwii-computing-war-part-2',
  'tech/wwii-computing-war-part-3',
  'travel/japan-trip-notes',
])

export function movedBlogPostRedirect(pathname: string, search = ''): string | undefined {
  const { locale, path } = splitLocalePath(pathname)
  const match = /^\/blog\/(tech|life|finance|travel)\/([\w-]+)(\.md)?$/.exec(path)
  if (match === null) return undefined
  if (!MOVED_BLOG_POSTS.has(`${match[1]}/${match[2]}`)) return undefined
  return `${localizedPath(locale, `/blog/podcast/${match[2]}${match[3] ?? ''}`)}${search}`
}
