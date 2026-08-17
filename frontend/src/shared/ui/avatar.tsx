// Avatar surface from beui's conversation primitives (beui.dev/components/
// agents/message → MessageAvatar), lifted into a standalone primitive: the
// same round, clipped, muted-fill slot, with an image layer on top.

import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/utils'

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps {
  /** Remote portrait. A missing or unreachable one falls back to initials. */
  src?: string | null
  /** The name the initials are derived from. */
  name: string
  size?: AvatarSize
  className?: string
}

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: 'size-7 text-[10px]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
  xl: 'size-16 text-base',
}

/** Up to two initials, so a long name still fits the circle. */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = (words.length > 1 ? [words[0], words[words.length - 1]] : [words[0]])
    .map((word) => word?.[0] ?? '')
    .join('')
  return letters.toUpperCase()
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const reduce = useReducedMotion()
  const imageRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  // A cached image can finish decoding before hydration attaches `onLoad`, so
  // the mounted element is asked directly rather than waiting for an event
  // that already fired.
  useEffect(() => {
    const image = imageRef.current
    setFailed(false)
    setLoaded(image?.complete === true && image.naturalWidth > 0)
  }, [src])

  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-muted font-medium text-muted-foreground select-none',
        SIZE_CLASS[size],
        className,
      )}
    >
      <span aria-hidden>{initialsOf(name)}</span>
      {src && !failed ? (
        <motion.img
          ref={imageRef}
          src={src}
          alt=""
          aria-hidden
          referrerPolicy="no-referrer"
          initial={false}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.2 }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
    </span>
  )
}
