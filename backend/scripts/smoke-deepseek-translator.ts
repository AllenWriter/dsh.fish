/**
 * One-off smoke test for the DeepSeek README translator against the real API.
 * Usage: DEEPSEEK_API_KEY=... pnpm --filter ./backend exec tsx scripts/smoke-deepseek-translator.ts
 */
import { translateReadmeWithDeepSeek } from '../src/infrastructure/agents/deepseek-readme-translator.js'

const apiKey = process.env.DEEPSEEK_API_KEY
if (!apiKey) throw new Error('DEEPSEEK_API_KEY is required.')

const markdown = [
  '# dsh Example Plugin',
  '',
  'A tiny plugin that prints a greeting.',
  '',
  '## Install',
  '',
  '```fish',
  'fisher install example/greeter',
  '```',
  '',
  'Set `GREETER_NAME` to override the default name.',
].join('\n')

const translated = await translateReadmeWithDeepSeek(apiKey, markdown, 'zh-CN')
console.log('--- translated markdown ---')
console.log(translated)

// A second locale against the same Markdown should hit DeepSeek's automatic
// context cache; watch for prompt_cache_hit_tokens in the usage log.
await translateReadmeWithDeepSeek(apiKey, markdown, 'ja')
