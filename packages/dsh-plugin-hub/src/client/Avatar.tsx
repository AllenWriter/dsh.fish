import { useState } from 'react'
import { UserIcon } from './Icons.js'

export interface AvatarProps {
  src?: string | null
  name?: string
  size?: number
  className?: string
  alt?: string
}

export function Avatar({
  src,
  name,
  size = 36,
  className = '',
  alt,
}: AvatarProps): JSX.Element {
  const [errored, setErrored] = useState(false)

  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : ''
  const hasImage = Boolean(src && !errored)
  const accessibleAlt = alt ?? (name ? `${name}'s avatar` : 'User avatar')

  return (
    <div
      className={`dshFish__avatar ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-label={accessibleAlt}
    >
      {hasImage ? (
        <img
          src={src ?? undefined}
          alt={accessibleAlt}
          className="dshFish__avatarImg"
          onError={() => { setErrored(true) }}
        />
      ) : initial ? (
        <span className="dshFish__avatarInitial" aria-hidden="true">
          {initial}
        </span>
      ) : (
        <UserIcon size={Math.round(size * 0.55)} />
      )}
    </div>
  )
}
