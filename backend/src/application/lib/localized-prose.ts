import type { ReadmeTranslation } from '../../domain/artifact/readme-translation.js'
import type { SummaryTranslation } from '../../domain/artifact/summary-translation.js'

/**
 * Generated README still on the row: the current completed translation, or
 * the previous completed body retained while a replacement is pending or failed.
 */
export function translatedReadme(
  translation: ReadmeTranslation | undefined,
): { readonly markdown: string; readonly locale: string } | undefined {
  if (translation === undefined || !hasProse(translation.markdown)) return undefined
  return { markdown: translation.markdown, locale: translation.locale }
}

/**
 * Generated summary still on the row. Same retain-until-replaced rule as
 * `translatedReadme`.
 */
export function translatedSummary(translation: SummaryTranslation | undefined): string | undefined {
  if (translation === undefined || !hasProse(translation.text)) return undefined
  return translation.text
}

function hasProse(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== ''
}
