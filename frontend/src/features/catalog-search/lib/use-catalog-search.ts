import { useEffect, useState } from 'react'
import type { Artifact } from '@/entities/artifact/model/types'
import { searchCatalog } from '../api/search-catalog'

const DEBOUNCE_MS = 200

/**
 * Debounced live hits for one query string.
 *
 * An empty query is idle, not an empty result set. A failed request is
 * reported rather than rendered as "nothing matched".
 */
export function useCatalogSearch(query: string, locale: string): {
  hits: readonly Artifact[]
  error: boolean
} {
  const [hits, setHits] = useState<readonly Artifact[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    const text = query.trim()
    if (text === '') {
      setHits([])
      setError(false)
      return
    }

    setHits([])
    setError(false)
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void searchCatalog(text, controller.signal, locale)
        .then((items) => {
          setHits(items)
          setError(false)
        })
        .catch((caught: unknown) => {
          if (controller.signal.aborted) return
          setHits([])
          setError(true)
          console.error('catalog_search_failed', caught)
        })
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, locale])

  return { hits, error }
}
