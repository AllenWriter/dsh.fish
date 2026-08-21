import { describe, expect, it } from 'vitest'
import { inferTopics, isTopic, normalizeSearchText } from './topic.js'

describe('artifact topics', () => {
  it('normalizes full-width and mixed-case search text', () => {
    expect(normalizeSearchText('  ＣＯＤＥ   Review  ')).toBe('code review')
  })

  it('recognizes high-intent phrases across scripts', () => {
    expect(inferTopics({ text: '为 Agent 提供长期记忆和知识库。' })).toContain('memory')
    expect(inferTopics({ text: 'Pull request code review automation.' })).toContain('code-review')
    expect(inferTopics({ text: '画像認識と OCR を追加します。' })).toContain('vision-ocr')
    expect(inferTopics({ text: 'Оркестрация агентов и субагентов.' })).toContain('multi-agent')
  })

  it('keeps the public topic vocabulary closed', () => {
    expect(isTopic('web-search')).toBe(true)
    expect(isTopic('anything')).toBe(false)
  })
})
