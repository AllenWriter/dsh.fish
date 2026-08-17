import type { Page } from '@playwright/test'

export interface OverflowHit {
  tag: string
  id: string
  className: string
  right: number
  width: number
}

/**
 * Elements whose border box sticks past the viewport, ignoring content that is
 * supposed to scroll inside an `overflow-x: auto|scroll` ancestor.
 *
 * A wide GFM table is allowed to be wider than the phone; the page around it
 * is not. Descendants of a horizontal scroller are therefore skipped, and the
 * scroller itself is checked so it has not expanded the layout.
 */
export async function horizontalOverflowHits(page: Page): Promise<OverflowHit[]> {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth
    const hits: OverflowHit[] = []

    function overflowX(el: Element): string {
      return getComputedStyle(el).overflowX
    }

    function isScroller(el: Element): boolean {
      const value = overflowX(el)
      return value === 'auto' || value === 'scroll'
    }

    function insideScroller(el: Element): boolean {
      let parent = el.parentElement
      while (parent) {
        if (isScroller(parent)) return true
        parent = parent.parentElement
      }
      return false
    }

    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      if (insideScroller(el)) continue
      const rect = el.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) continue
      if (rect.right <= limit + 1) continue
      hits.push({
        tag: el.tagName.toLowerCase(),
        id: el.id,
        className: typeof el.className === 'string' ? el.className.slice(0, 120) : '',
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      })
      if (hits.length >= 12) break
    }

    return hits
  })
}

export async function pageScrollWidth(page: Page): Promise<{ clientWidth: number; scrollWidth: number }> {
  return page.evaluate(() => {
    const doc = document.documentElement
    return {
      clientWidth: doc.clientWidth,
      scrollWidth: Math.max(doc.scrollWidth, document.body.scrollWidth),
    }
  })
}
