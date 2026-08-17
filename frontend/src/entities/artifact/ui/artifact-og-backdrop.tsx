import { useState } from 'react'

/**
 * Decorative Social-preview layer for a catalog card.
 *
 * Hidden from AT (`aria-hidden`, empty alt): the card's title already names
 * the artifact. A stale GitHub URL is dropped rather than shown as a broken
 * image — that is the image failing, not a default picture standing in.
 */
export function ArtifactOgBackdrop({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null

  return (
    <div className="artifact-og" aria-hidden>
      <img src={src} alt="" onError={() => setFailed(true)} />
    </div>
  )
}
