import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { IconDefaults, type Icon, type IconWeight } from './index'

/**
 * Glyph introspection, for tests only.
 *
 * Phosphor consumes `weight` to pick which paths to draw and does not forward it
 * as an attribute, so no test can assert on the prop it passed. What a test can
 * assert on is the drawing: `glyphPaths` renders a glyph at a weight and returns
 * the path data, which is the thing a reader actually sees. Two weights of the
 * same mark return different data, and two different marks return different data,
 * which is enough to prove both that a mark is present and that it is filled.
 */
export function glyphPaths(glyph: Icon, weight: IconWeight = 'regular'): readonly string[] {
  const html = renderToStaticMarkup(
    createElement(IconDefaults, null, createElement(glyph, { weight })),
  )
  return [...html.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map((match) => match[1] ?? '')
}

/** Whether `html` draws `glyph` at `weight`. */
export function drawsGlyph(html: string, glyph: Icon, weight: IconWeight = 'regular'): boolean {
  const paths = glyphPaths(glyph, weight)
  return paths.length > 0 && paths.every((path) => html.includes(path))
}
